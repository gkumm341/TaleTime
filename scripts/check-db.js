const Database = require('better-sqlite3');
const db = new Database('.data/app.db');

console.log('=== Database Structure ===\n');

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check books columns
console.log('\n=== Books Table Columns ===');
const cols = db.prepare('PRAGMA table_info(books)').all();
cols.forEach(col => {
  console.log(`- ${col.name} (${col.type})`);
});

// Check sample data
console.log('\n=== Sample Book ===');
const book = db.prepare('SELECT * FROM books LIMIT 1').get();
if (book) {
  console.log('ID:', book.id);
  console.log('Title:', book.title);
  console.log('Authors:', book.authors);
  console.log('Has epub_url column:', 'epub_url' in book);
  console.log('epub_url value:', book.epub_url || 'NULL');
  console.log('Has formats column:', 'formats' in book);
  if (book.formats) {
    try {
      const formats = JSON.parse(book.formats);
      console.log('EPUB in formats:', formats['application/epub+zip'] || 'Not found');
    } catch (e) {
      console.log('formats not JSON');
    }
  }
}

db.close();
