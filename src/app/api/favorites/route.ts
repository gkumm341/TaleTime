import { NextRequest, NextResponse } from 'next/server';
import { db, getDatabaseDisabledReason, isDatabaseEnabled } from '@/db';
import { favorites, books, estimates } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

const USER_ID = 'default'; // For now, single-user mode

function dbUnavailableResponse() {
  return NextResponse.json(
    {
      error: 'Favorites are unavailable in cloud-only mode',
      reason: getDatabaseDisabledReason(),
    },
    { status: 503 }
  );
}

// GET /api/favorites - List all favorites
export async function GET(req: NextRequest) {
  if (!isDatabaseEnabled()) return dbUnavailableResponse();
  try {
    const searchParams = req.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, title, author

    let orderByClause;
    switch (sortBy) {
      case 'title':
        orderByClause = books.title;
        break;
      case 'author':
        orderByClause = books.authors;
        break;
      case 'recent':
      default:
        orderByClause = desc(favorites.addedAt);
        break;
    }

    const favoriteBooks = await db
      .select({
        favoriteId: favorites.id,
        bookId: books.id,
        title: books.title,
        authors: books.authors,
        subjects: books.subjects,
        coverUrl: books.coverUrl,
        epubUrl: books.epubUrl,
        downloadCount: books.downloadCount,
        minutes: estimates.minutes,
        words: estimates.words,
        addedAt: favorites.addedAt,
        notes: favorites.notes,
      })
      .from(favorites)
      .innerJoin(books, eq(favorites.bookId, books.id))
      .leftJoin(estimates, eq(books.id, estimates.bookId))
      .where(eq(favorites.userId, USER_ID))
      .orderBy(orderByClause);

    const results = favoriteBooks.map((fav) => ({
      favoriteId: fav.favoriteId,
      id: fav.bookId,
      title: fav.title,
      authors: fav.authors,
      subjects: fav.subjects ? JSON.parse(fav.subjects) : [],
      coverUrl: fav.coverUrl,
      epubUrl: fav.epubUrl,
      downloadCount: fav.downloadCount,
      minutes: fav.minutes,
      words: fav.words,
      addedAt: fav.addedAt,
      notes: fav.notes,
    }));

    return NextResponse.json({
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add to favorites
export async function POST(req: NextRequest) {
  if (!isDatabaseEnabled()) return dbUnavailableResponse();
  try {
    const { bookId, notes } = await req.json();

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const existing = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.bookId, bookId),
          eq(favorites.userId, USER_ID)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Book already in favorites' },
        { status: 409 }
      );
    }

    // Add to favorites
    await db.insert(favorites).values({
      bookId,
      userId: USER_ID,
      addedAt: Date.now(),
      notes: notes || null,
    });

    return NextResponse.json(
      { success: true, message: 'Added to favorites' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites?bookId=123 - Remove from favorites
export async function DELETE(req: NextRequest) {
  if (!isDatabaseEnabled()) return dbUnavailableResponse();
  try {
    const searchParams = req.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    const result = await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.bookId, parseInt(bookId)),
          eq(favorites.userId, USER_ID)
        )
      );

    return NextResponse.json(
      { success: true, message: 'Removed from favorites' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
