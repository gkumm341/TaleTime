# TaleTime - Project Gutenberg Bedtime Reader

A Next.js web application for browsing, estimating reading times, and reading EPUB books from Project Gutenberg with offline caching capabilities.

## Features

- **Book Catalog**: Browse Project Gutenberg children's books with cover images
- **Reading Time Estimation**: Pre-download estimates using HEAD/Range requests on text files
- **EPUB Reader**: In-browser reading with epub.js
- **Offline Support**: IndexedDB caching for downloaded EPUBs
- **Bookmark Persistence**: CFI (Canonical Fragment Identifier) position saving
- **Reader Controls**: 
  - Theme switching (light/sepia/dark)
  - Font size adjustment
  - Table of contents navigation
  - Page-by-page navigation
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Framework**: Next.js 16.0.0 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Package Manager**: Yarn
- **Bundler**: Webpack (configured to avoid Turbopack issues)
- **Database**: SQLite with Drizzle ORM (better-sqlite3)
- **EPUB Rendering**: epub.js
- **Offline Storage**: IndexedDB via idb-keyval
- **API Data**: Gutendex (Project Gutenberg metadata API)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── catalog/     # Fetch Gutenberg books, upsert to DB
│   │   ├── estimate/    # Calculate reading time
│   │   └── proxy/       # CORS-safe proxy for EPUBs
│   ├── book/[id]/       # EPUB reader page
│   ├── page.tsx         # Home page (book browser)
│   └── globals.css      # Global styles
├── components/
│   ├── BookGrid.tsx     # Book grid with lazy estimate loading
│   ├── Navigation.tsx   # App navigation
│   └── ui/             # UI components
├── lib/
│   └── utils.ts        # Utility functions
└── contexts/
    └── ThemeContext.tsx # Theme management

db/
├── schema.ts           # Drizzle schema (books, estimates, cache_manifest)
├── index.ts           # SQLite connection
└── migrations/        # Database migrations
```

## Environment Variables

Create a `.env.local` file:

```env
SQLITE_PATH=.data/app.db
READ_ALOUD_WPM=160
ALLOW_HOSTS=gutenberg.org,standardebooks.org
```

## Getting Started

1. **Install dependencies**:
```bash
yarn install
```

2. **Run database migrations**:
```bash
yarn drizzle-kit migrate
```

3. **Populate the database** (optional but recommended):

The app can work in two modes:
- **On-demand mode**: Fetches books from Gutendex when you visit the homepage (slower, 30-40s load time)
- **Pre-populated mode**: Uses local database with pre-fetched books (instant load)

To pre-populate the database with all Project Gutenberg children's books:

```bash
# Option 1: Using the provided script (requires Node 18+ for fetch)
node scripts/populate-books.mjs

# Option 2: Let the app populate automatically on first visit
# Just browse to http://localhost:3000 and wait ~40s for initial load
# Books will be cached in SQLite for subsequent visits
```

The populate script will:
- Fetch all children's books from Gutendex (~200+ books)
- Save metadata to SQLite database
- Take about 2-3 minutes to complete
- Reading time estimates are calculated on-demand when browsing

4. **Start the development server**:
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## API Routes

### GET /api/catalog
Fetch books from Gutendex, upsert to SQLite, return with estimates if available.

Query params:
- `topic` - Filter by topic (e.g., "Children")
- `languages` - Filter by language codes (e.g., "en")

### GET /api/estimate
Calculate reading time for a book using HEAD/Range requests on text file.

Query params:
- `bookId` - Book ID to estimate

### GET /api/proxy
CORS-safe proxy for EPUB downloads with allowlist.

Query params:
- `url` - URL to proxy (must match ALLOW_HOSTS)

## Development Commands

- `yarn dev` - Start development server (uses Webpack)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn drizzle-kit generate` - Generate migrations
- `yarn drizzle-kit migrate` - Apply migrations

## How It Works

1. **Book Discovery**: Home page fetches from `/api/catalog`, which queries Gutendex and stores metadata in SQLite
2. **Lazy Estimates**: BookGrid component loads reading-time estimates in batches of 4 (to avoid server overload)
3. **EPUB Caching**: When opening a book, reader checks IndexedDB first, then downloads via `/api/proxy` and caches
4. **Position Persistence**: epub.js CFI positions saved to IndexedDB on each page turn
5. **Resume Reading**: On return, last CFI position restored from IndexedDB

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
