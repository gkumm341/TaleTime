import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, estimates } from '@/db/schema';
import { eq, sql, like, and, or } from 'drizzle-orm';

export const runtime = 'nodejs'; // Required for SQLite

const DEFAULT_ITEMS_PER_PAGE = 100;
const MAX_ITEMS_PER_PAGE = 100;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const bookId = searchParams.get('bookId');
  const sortBy = searchParams.get('sortBy') || 'popularity';
  const languages = searchParams.get('languages')?.split(',').filter(Boolean) || [];
  const durations = searchParams.get('durations')?.split(',').filter(Boolean) || [];
  const ageCategories = searchParams.get('ageCategories')?.split(',').filter(Boolean) || [];
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_ITEMS_PER_PAGE)),
    MAX_ITEMS_PER_PAGE
  );

  try {
    // If bookId is provided, return single book
    if (bookId) {
      const book = await db
        .select({
          id: books.id,
          title: books.title,
          authors: books.authors,
          subjects: books.subjects,
          coverUrl: books.coverUrl,
          txtUrl: books.txtUrl,
          epubUrl: books.epubUrl,
          downloadCount: books.downloadCount,
          minutes: estimates.minutes,
          words: estimates.words,
        })
        .from(books)
        .leftJoin(estimates, eq(books.id, estimates.bookId))
        .where(eq(books.id, parseInt(bookId)))
        .limit(1);

      if (book.length === 0) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        );
      }

      const result = book[0];
      return NextResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: [{
          id: result.id,
          title: result.title,
          authors: result.authors,
          subjects: result.subjects ? JSON.parse(result.subjects) : [],
          coverUrl: result.coverUrl,
          txtUrl: result.txtUrl,
          epubUrl: result.epubUrl,
          downloadCount: result.downloadCount,
          minutes: result.minutes,
          words: result.words,
        }],
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(books.title, `%${search}%`),
          like(books.authors, `%${search}%`)
        )
      );
    }

    // Language filter
    if (languages.length > 0) {
      const languageConditions = languages.map(lang => 
        like(books.languages, `%${lang}%`)
      );
      conditions.push(or(...languageConditions));
    }

    // Age category filter (via subjects)
    if (ageCategories.length > 0) {
      const AGE_KEYWORDS: Record<string, string[]> = {
        'early-readers': ['Nursery rhymes', 'Picture books'],
        'beginning-readers': ['Fairy tales', 'Fables', 'Children\'s stories', 'Juvenile fiction'],
        'middle-grade': ['Adventure', 'Fantasy', 'Bildungsromans', 'Pirates', 'Treasure'],
        'young-adult': ['Young adult', 'Romance', 'Psychological'],
      };
      
      const subjectConditions = ageCategories.flatMap(category => 
        (AGE_KEYWORDS[category] || []).map(keyword => 
          like(books.subjects, `%${keyword}%`)
        )
      );
      
      if (subjectConditions.length > 0) {
        conditions.push(or(...subjectConditions));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    let orderByClause;
    switch (sortBy) {
      case 'title':
        orderByClause = sql`${books.title} ASC`;
        break;
      case 'author':
        orderByClause = sql`${books.authors} ASC`;
        break;
      case 'length':
        orderByClause = sql`${estimates.minutes} ASC`;
        break;
      case 'popularity':
      default:
        orderByClause = sql`${books.downloadCount} DESC`;
        break;
    }

    // Fetch books from database with estimates
    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        authors: books.authors,
        subjects: books.subjects,
        coverUrl: books.coverUrl,
        txtUrl: books.txtUrl,
        epubUrl: books.epubUrl,
        downloadCount: books.downloadCount,
        minutes: estimates.minutes,
        words: estimates.words,
      })
      .from(books)
      .leftJoin(estimates, eq(books.id, estimates.bookId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Count total for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Apply duration filter after fetching (since it depends on estimates)
    let filteredBooks = allBooks;
    if (durations.length > 0) {
      filteredBooks = allBooks.filter(book => {
        if (!book.minutes) return false;
        const minutes = book.minutes;
        
        return durations.some(duration => {
          switch (duration) {
            case 'short':
              return minutes < 10;
            case 'medium':
              return minutes >= 10 && minutes <= 25;
            case 'long':
              return minutes > 25;
            default:
              return true;
          }
        });
      });
    }

    // Format response similar to Gutendex
    const results = filteredBooks.map((book) => ({
      id: book.id,
      title: book.title,
      authors: book.authors,
      subjects: book.subjects ? JSON.parse(book.subjects) : [],
      coverUrl: book.coverUrl,
      txtUrl: book.txtUrl,
      epubUrl: book.epubUrl,
      downloadCount: book.downloadCount,
      minutes: book.minutes,
      words: book.words,
    }));

    return NextResponse.json({
      count: total,
      next: page < totalPages ? `?page=${page + 1}` : null,
      previous: page > 1 ? `?page=${page - 1}` : null,
      results,
    });
  } catch (error) {
    console.error('Catalog API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}
