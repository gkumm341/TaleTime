# TaleTime

A Next.js web application for browsing, estimating reading times, and reading EPUB books with offline caching capabilities.

## Features

- **Book Catalog**: Browse classic children's books with cover images
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

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── catalog/     # Book catalog from local DB
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
CONTENT_MODE=local
NEXT_PUBLIC_CONTENT_MODE=local
# For CONTENT_MODE=cloud, point to your CDN base URL that serves the .data directory.
# Example: https://d123456abcdef8.cloudfront.net
CLOUDFRONT_BASE_URL=
# Optional prefix between base URL and .data files (no leading/trailing slash required).
# Example: ".data" if files are served as https://.../.data/texts/by-title/...
CLOUDFRONT_DATA_PREFIX=
# Optional explicit catalog URL override. If empty, app uses /texts/by-title/catalog.json under CloudFront base.
CLOUDFRONT_CATALOG_URL=
TRANSLATION_PROVIDER=libretranslate
LIBRETRANSLATE_URL=http://localhost:5000
# LIBRETRANSLATE_API_KEY=optional_if_your_server_requires_it
# Optional OpenAI fallback if provider is set to openai or auto-detected:
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4.1-mini
```

### Development-only

- `ENFORCE_PREMIUM_GATE` - Set to `1` to require sign-in + premium checks for abridged bedtime/timed variants.
- `ENFORCE_PREMIUM_IN_DEV` - Legacy flag; also enforces the premium gate when set to `1`.
- `BYPASS_PREMIUM` - Optional override (`0` disables bypass, `1` enables bypass). Current default is bypass enabled for UX testing.
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

To pre-populate the database with children's books:

```bash
# Using the provided script (requires Node 18+ for fetch)
node scripts/populate-books.mjs

# Or browse to http://localhost:3000 and wait for initial data sync
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

## Cloud Catalog (no SQLite in cloud mode)

- Run `node scripts/generate-local-metadata.mjs` to generate `metadata.json` files and `.data/texts/by-title/catalog.json`.
- Upload `.data/` to S3 so CloudFront serves `texts/by-title/catalog.json` and per-book metadata/files.
- Set `CONTENT_MODE=cloud`, `NEXT_PUBLIC_CONTENT_MODE=cloud`, and `CLOUDFRONT_*` env vars.

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
