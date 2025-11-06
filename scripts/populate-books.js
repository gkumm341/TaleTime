/**
 * Script to populate the database with Project Gutenberg children's books
 * Fetches all pages of children's books from Gutendex and calculates reading time estimates
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || '.data/app.db';
const READ_ALOUD_WPM = parseInt(process.env.READ_ALOUD_WPM || '160', 10);
const GUTENDEX_BASE = 'https://gutendex.com/books';
const BATCH_SIZE = 4; // Process estimates in batches to avoid hammering servers
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

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

// Helper: Fetch with timeout
async function fetchWithTimeout(url, timeout = 10000) {
  try {
    const response = await fetch(url);
    return response;
  } catch (error) {
    throw error;
  }
}

// Helper: Estimate reading time from bytes
function estimateFromBytes(bytes) {
  const headerFooterBytes = 4096;
  const textBytes = Math.max(0, bytes - headerFooterBytes);
  const words = Math.floor(textBytes / 5.1);
  const minutes = Math.ceil(words / READ_ALOUD_WPM);
  return { minutes, words };
}

// Helper: Estimate from text sample
async function estimateFromSample(txtUrl) {
  try {
    const response = await fetchWithTimeout(txtUrl, 10000);
    if (!response.ok) return null;

    const range = response.headers.get('content-range');
    if (!range) return null;

    const match = range.match(/bytes \d+-\d+\/(\d+)/);
    if (!match) return null;

    const totalBytes = parseInt(match[1], 10);
    return estimateFromBytes(totalBytes);
  } catch (error) {
    console.error(`  ⚠️  Sample estimate failed: ${error.message}`);
    return null;
  }
}

// Helper: Calculate reading time estimate
async function calculateEstimate(txtUrl) {
  if (!txtUrl) return null;

  try {
    // Try HEAD request first
    const headResponse = await fetchWithTimeout(txtUrl, 5000);
    if (headResponse.ok) {
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        const bytes = parseInt(contentLength, 10);
        return estimateFromBytes(bytes);
      }
    }
  } catch (error) {
    // HEAD failed, try Range request
  }

  // Fallback to Range request
  try {
    const rangeResponse = await fetchWithTimeout(txtUrl, 10000);
    if (rangeResponse.ok) {
      const contentRange = rangeResponse.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
        if (match) {
          const totalBytes = parseInt(match[1], 10);
          return estimateFromBytes(totalBytes);
        }
      }
    }
  } catch (error) {
    console.error(`  ⚠️  Estimate failed for ${txtUrl}: ${error.message}`);
  }

  return null;
}

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

// Helper: Upsert estimate to database
function upsertEstimate(bookId, txtUrl, minutes, words) {
  const stmt = db.prepare(`
    INSERT INTO estimates (
      book_id, txt_url, minutes, words, calculated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(book_id) DO UPDATE SET
      txt_url = excluded.txt_url,
      minutes = excluded.minutes,
      words = excluded.words,
      calculated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(bookId, txtUrl, minutes, words);
}

// Helper: Check if book has estimate
function hasEstimate(bookId) {
  const stmt = db.prepare('SELECT 1 FROM estimates WHERE book_id = ?');
  return !!stmt.get(bookId);
}

// Helper: Delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      
      const response = await fetchWithTimeout(url, 30000);
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
        await delay(500);
      }
    } catch (error) {
      console.error(`   ❌ Error fetching page ${page}: ${error.message}`);
      break;
    }
  }

  console.log(`\n✅ Fetched ${books.length} children's books\n`);
  return books;
}

// Main: Process books and calculate estimates
async function processBooksWithEstimates(books) {
  console.log('💾 Saving books to database...\n');

  // First, save all books
  const insertStmt = db.prepare('BEGIN TRANSACTION');
  insertStmt.run();

  for (const book of books) {
    try {
      upsertBook(book);
    } catch (error) {
      console.error(`   ❌ Failed to save book ${book.id}: ${error.message}`);
    }
  }

  db.prepare('COMMIT').run();
  console.log(`✅ Saved ${books.length} books to database\n`);

  // Now calculate estimates for books that have text files
  const booksNeedingEstimates = books.filter(book => {
    const txtUrl = book.formats?.['text/plain; charset=utf-8'] || 
                   book.formats?.['text/plain'];
    return txtUrl && !hasEstimate(book.id);
  });

  if (booksNeedingEstimates.length === 0) {
    console.log('✅ All books already have estimates\n');
    return;
  }

  console.log(`📊 Calculating reading time estimates for ${booksNeedingEstimates.length} books...\n`);

  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < booksNeedingEstimates.length; i += BATCH_SIZE) {
    const batch = booksNeedingEstimates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (book) => {
        const txtUrl = book.formats?.['text/plain; charset=utf-8'] || 
                       book.formats?.['text/plain'];
        
        try {
          const estimate = await calculateEstimate(txtUrl);
          
          if (estimate) {
            upsertEstimate(book.id, txtUrl, estimate.minutes, estimate.words);
            successful++;
            console.log(`   ✓ ${book.id}: "${book.title.substring(0, 50)}..." - ${estimate.minutes} min (${estimate.words.toLocaleString()} words)`);
          } else {
            failed++;
            console.log(`   ⚠️  ${book.id}: "${book.title.substring(0, 50)}..." - estimate failed`);
          }
        } catch (error) {
          failed++;
          console.error(`   ❌ ${book.id}: ${error.message}`);
        }
        
        processed++;
      })
    );

    // Progress update
    const progress = ((processed / booksNeedingEstimates.length) * 100).toFixed(1);
    console.log(`   Progress: ${processed}/${booksNeedingEstimates.length} (${progress}%)\n`);

    // Delay between batches
    if (i + BATCH_SIZE < booksNeedingEstimates.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\n✅ Estimate calculation complete:`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total processed: ${processed}\n`);
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

    // Process and save books with estimates
    await processBooksWithEstimates(books);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🎉 Complete! Total time: ${duration}s\n`);

    // Summary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_books,
        COUNT(e.book_id) as books_with_estimates,
        AVG(e.minutes) as avg_minutes,
        SUM(e.words) as total_words
      FROM books b
      LEFT JOIN estimates e ON b.id = e.book_id
    `).get();

    console.log('📊 Database Summary:');
    console.log(`   Total books: ${stats.total_books}`);
    console.log(`   Books with estimates: ${stats.books_with_estimates}`);
    console.log(`   Average reading time: ${Math.round(stats.avg_minutes || 0)} minutes`);
    console.log(`   Total words: ${(stats.total_words || 0).toLocaleString()}`);
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
