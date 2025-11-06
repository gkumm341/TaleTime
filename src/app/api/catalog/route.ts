import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, estimates } from '@/db/schema';
import { eq, sql, like, and, or } from 'drizzle-orm';

export const runtime = 'nodejs'; // Required for SQLite

const ITEMS_PER_PAGE = 32;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const bookId = searchParams.get('bookId');

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
    const offset = (page - 1) * ITEMS_PER_PAGE;

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
      .orderBy(sql`${books.downloadCount} DESC`)
      .limit(ITEMS_PER_PAGE)
      .offset(offset);

    // Count total for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    // Format response similar to Gutendex
    const results = allBooks.map((book) => ({
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
