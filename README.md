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
ALLOW_HOSTS=
CONTENT_MODE=local
# Required when CONTENT_MODE=cloud:
# CLOUDFRONT_BASE_URL=https://dxxxxxxxxxxxx.cloudfront.net
# Optional prefix if your S3 objects are under a subfolder (example: .data):
# CLOUDFRONT_DATA_PREFIX=.data
TRANSLATION_PROVIDER=libretranslate
LIBRETRANSLATE_URL=http://localhost:5000
# LIBRETRANSLATE_API_KEY=optional_if_your_server_requires_it
# Optional OpenAI fallback if provider is set to openai or auto-detected:
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4.1-mini
```

### Development-only

- `ENFORCE_PREMIUM_IN_DEV` - Set to `1` to keep premium paywalls enabled in dev.
- `BYPASS_PREMIUM` - Set to `1` to bypass premium checks (useful for local testing). In `NODE_ENV=development`, the abridged bedtime/timed paywall is bypassed by default unless `ENFORCE_PREMIUM_IN_DEV` is set.

### Local vs Cloud content

- `CONTENT_MODE=local` (default): reads story/image/audio assets from local `.data/texts`.
- `CONTENT_MODE=cloud`: reads those assets from CloudFront (`CLOUDFRONT_BASE_URL`) and keeps API paths unchanged (`/api/local-image`, `/api/local-audio`, `/api/illustration`, `/api/story-pages`, `/api/abridge`).
- Use `CLOUDFRONT_DATA_PREFIX` if your bucket keeps files under a folder (for example `.data`), otherwise leave it unset.

### Vercel deployment notes

- For Vercel, set `SQLITE_PATH=/tmp/app.db` (ephemeral per deployment/cold start).
- Keep `CONTENT_MODE=cloud` and set `CLOUDFRONT_BASE_URL` to your distribution domain.
- If CloudFront origin path is already `/.data`, leave `CLOUDFRONT_DATA_PREFIX` unset.
- Set `NEXT_PUBLIC_BASE_URL` to your deployed URL (for custom domain, `https://www.spectra-usa.com`).
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

3. **Populate the database** (optional):

If you have a metadata source or import script for your own books:

```bash
# Using the provided script (requires Node 18+ for fetch)
node scripts/populate-books.mjs

# Or browse to http://localhost:3000 and wait for initial data sync
```

The populate script can:
- Save book metadata to SQLite database
- Prepare records for local/cloud story assets
- Reading time estimates are calculated on-demand when browsing

4. **Start the development server**:
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## API Routes

### GET /api/catalog
Fetch books from SQLite and return catalog entries with available estimates.

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

1. **Book Discovery**: Home page fetches from `/api/catalog`, which reads your catalog metadata from SQLite
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
