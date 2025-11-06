/**
 * Simple script to populate the database with Project Gutenberg children's books
 * Just fetches and saves books - estimates can be calculated later on-demand
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || '.data/app.db';
const GUTENDEX_BASE = 'https://gutendex.com/books';

// Ensure the database directory exists
const dbDir = path.dirname(SQLITE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(SQLITE_PATH);
db.pragma('journal_mode = WAL');

console.log('📚 Project Gutenberg Children\'s Books Populator');
console.log('================================================\n');

// Helper: Upsert book to database
function upsertBook(book) {
  const stmt = db.prepare(`
    INSERT INTO books (
      id, title, authors, subjects, bookshelves, languages,
      copyright, media_type, formats, download_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      authors = excluded.authors,
      subjects = excluded.subjects,
      bookshelves = excluded.bookshelves,
      languages = excluded.languages,
      copyright = excluded.copyright,
      media_type = excluded.media_type,
      formats = excluded.formats,
      download_count = excluded.download_count
  `);

  const authors = book.authors?.map(a => a.name).join(', ') || 'Unknown';
  const subjects = JSON.stringify(book.subjects || []);
  const bookshelves = JSON.stringify(book.bookshelves || []);
  const languages = JSON.stringify(book.languages || []);
  const formats = JSON.stringify(book.formats || {});

  stmt.run(
    book.id,
    book.title,
    authors,
    subjects,
    bookshelves,
    languages,
    book.copyright ? 1 : 0,
    book.media_type || '',
    formats,
    book.download_count || 0
  );
}

// Main: Fetch all children's books from Gutendex
async function fetchAllChildrensBooks() {
  const books = [];
  let page = 1;
  let hasMore = true;

  console.log('📖 Fetching children\'s books from Gutendex...\n');

  while (hasMore) {
    try {
      const url = `${GUTENDEX_BASE}?page=${page}&languages=en&topic=Children`;
      console.log(`   Fetching page ${page}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`   ❌ Failed to fetch page ${page}: ${response.status}`);
        break;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        books.push(...data.results);
        console.log(`   ✓ Page ${page}: ${data.results.length} books (Total: ${books.length})`);
      }

      hasMore = !!data.next;
      page++;

      // Small delay to be nice to the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`   ❌ Error fetching page ${page}: ${error.message}`);
      break;
    }
  }

  console.log(`\n✅ Fetched ${books.length} children's books\n`);
  return books;
}

// Main execution
async function main() {
  try {
    const startTime = Date.now();

    // Fetch all children's books
    const books = await fetchAllChildrensBooks();

    if (books.length === 0) {
      console.log('❌ No books found. Exiting.\n');
      process.exit(1);
    }

    // Save books to database
    console.log('💾 Saving books to database...\n');
    
    db.prepare('BEGIN TRANSACTION').run();

    let saved = 0;
    for (const book of books) {
      try {
        upsertBook(book);
        saved++;
      } catch (error) {
        console.error(`   ❌ Failed to save book ${book.id}: ${error.message}`);
      }
    }

    db.prepare('COMMIT').run();
    console.log(`✅ Saved ${saved} books to database\n`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🎉 Complete! Total time: ${duration}s\n`);

    // Summary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_books,
        COUNT(CASE WHEN json_extract(formats, '$."application/epub+zip"') IS NOT NULL THEN 1 END) as epub_books
      FROM books
    `).get();

    console.log('📊 Database Summary:');
    console.log(`   Total books: ${stats.total_books}`);
    console.log(`   Books with EPUB: ${stats.epub_books}`);
    console.log(`\n💡 Tip: Reading time estimates will be calculated on-demand when you browse books.`);
    console.log();

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the script
main();
