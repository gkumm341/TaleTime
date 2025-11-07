/**
 * Add a custom book from any EPUB source
 * Usage: node scripts/add-custom-book.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const SQLITE_PATH = process.env.SQLITE_PATH || '.data/app.db';

// Ensure the database directory exists
const dbDir = path.dirname(SQLITE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(SQLITE_PATH);
db.pragma('journal_mode = WAL');

console.log('📚 Add Custom Book to Database');
console.log('===============================\n');

// Example: Add a book from Standard Ebooks (they have clean, well-formatted EPUBs)
// You can find more at: https://standardebooks.org/ebooks

const customBooks = [
  {
    id: 99001, // Use high ID to avoid conflicts
    title: "Alice's Adventures in Wonderland",
    authors: "Lewis Carroll",
    epub_url: "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/dist/lewis-carroll_alices-adventures-in-wonderland.epub",
    cover_url: "https://standardebooks.org/ebooks/lewis-carroll/alices-adventures-in-wonderland/downloads/cover-thumbnail.jpg",
    subjects: JSON.stringify(["Fiction", "Fantasy", "Children's Literature"]),
    languages: JSON.stringify(["en"]),
    download_count: 10000
  },
  // Add more books here - some suggestions:
  // {
  //   id: 99002,
  //   title: "The Adventures of Sherlock Holmes",
  //   authors: "Arthur Conan Doyle",
  //   epub_url: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/dist/arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub",
  //   cover_url: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/downloads/cover-thumbnail.jpg",
  //   subjects: JSON.stringify(["Fiction", "Mystery", "Short Stories"]),
  //   languages: JSON.stringify(["en"]),
  //   download_count: 10000
  // },
];

// Insert books
const stmt = db.prepare(`
  INSERT INTO books (
    id, title, authors, epub_url, cover_url, subjects, 
    languages, download_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    authors = excluded.authors,
    epub_url = excluded.epub_url,
    cover_url = excluded.cover_url,
    subjects = excluded.subjects,
    languages = excluded.languages,
    download_count = excluded.download_count
`);

for (const book of customBooks) {
  stmt.run(
    book.id,
    book.title,
    book.authors,
    book.epub_url,
    book.cover_url,
    book.subjects,
    book.languages,
    book.download_count
  );
  
  console.log(`✅ Added: ${book.title} by ${book.authors}`);
}

db.close();

console.log('\n✨ Done! Books added to database.');
console.log('Visit http://localhost:3000 to see them.\n');
console.log('💡 To add more books:');
console.log('   1. Edit this file (scripts/add-custom-book.mjs)');
console.log('   2. Add book objects to the customBooks array');
console.log('   3. Run: node scripts/add-custom-book.mjs\n');
console.log('📖 Good EPUB sources:');
console.log('   - Standard Ebooks: https://standardebooks.org/ebooks (high quality, no boilerplate)');
console.log('   - Internet Archive: https://archive.org/details/texts');
console.log('   - Feedbooks: https://www.feedbooks.com/publicdomain');
