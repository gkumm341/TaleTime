# PowerShell script to populate books database
# Run with: powershell -ExecutionPolicy Bypass -File .\scripts\populate-books.ps1

Write-Host "📚 Project Gutenberg Children's Books Populator" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$GUTENDEX_BASE = "https://gutendex.com/books"
$page = 1
$allBooks = @()

Write-Host "📖 Fetching children's books from Gutendex...`n" -ForegroundColor Yellow

while ($true) {
    try {
        $url = "${GUTENDEX_BASE}?page=${page}&languages=en&topic=Children"
        Write-Host "   Fetching page $page..." -NoNewline
        
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 30 -ErrorAction Stop
        
        if ($response.results -and $response.results.Count -gt 0) {
            $allBooks += $response.results
            Write-Host " ✓ ($($response.results.Count) books, Total: $($allBooks.Count))" -ForegroundColor Green
        }
        
        if (-not $response.next) {
            break
        }
        
        $page++
        Start-Sleep -Milliseconds 500
    }
    catch {
        Write-Host " ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        break
    }
}

Write-Host "`n✅ Fetched $($allBooks.Count) children's books`n" -ForegroundColor Green

if ($allBooks.Count -eq 0) {
    Write-Host "❌ No books found. Exiting.`n" -ForegroundColor Red
    exit 1
}

# Save to JSON file for Node.js processing
$jsonPath = ".data\books.json"
$dir = Split-Path $jsonPath
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "💾 Saving books to $jsonPath..." -NoNewline
$allBooks | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
Write-Host " ✓`n" -ForegroundColor Green

# Now run Node.js script to process and save to database
Write-Host "💾 Saving books to database..." -ForegroundColor Yellow
node -e @"
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const SQLITE_PATH = process.env.SQLITE_PATH || '.data/app.db';
const db = new Database(SQLITE_PATH);
db.pragma('journal_mode = WAL');

const books = JSON.parse(fs.readFileSync('.data/books.json', 'utf8'));

console.log('   Processing ' + books.length + ' books...');

const insertStmt = db.prepare(``
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
    download_count = excluded.download_count
``);

db.prepare('BEGIN TRANSACTION').run();

let saved = 0;
for (const book of books) {
  try {
    const authors = book.authors?.map(a => a.name).join(', ') || 'Unknown';
    const subjects = JSON.stringify(book.subjects || []);
    const bookshelves = JSON.stringify(book.bookshelves || []);
    const languages = JSON.stringify(book.languages || []);
    const formats = JSON.stringify(book.formats || {});

    insertStmt.run(
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
    saved++;
  } catch (error) {
    console.error('   ❌ Failed to save book ' + book.id + ': ' + error.message);
  }
}

db.prepare('COMMIT').run();
db.close();

console.log('   ✓ Saved ' + saved + ' books to database');
"@

Write-Host "`n✅ Database population complete!`n" -ForegroundColor Green

# Show stats
Write-Host "📊 Database Summary:" -ForegroundColor Cyan
node -e @"
const Database = require('better-sqlite3');
const SQLITE_PATH = process.env.SQLITE_PATH || '.data/app.db';
const db = new Database(SQLITE_PATH);

const stats = db.prepare(``
  SELECT 
    COUNT(*) as total_books,
    COUNT(DISTINCT json_extract(formats, '$$.""application/epub+zip""')) as epub_books
  FROM books
  WHERE json_extract(formats, '$$.""application/epub+zip""') IS NOT NULL
``).get();

console.log('   Total books: ' + stats.total_books);
console.log('   Books with EPUB: ' + stats.epub_books);

db.close();
"@

Write-Host ""
