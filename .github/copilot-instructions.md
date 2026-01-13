# TaleTime AI Guide
- **Project**: Next.js 16 App Router app with TypeScript, Tailwind v4, and Webpack (`next.config.ts` disables Turbopack). SQLite via Drizzle + better-sqlite3 under `db/` powers book metadata, estimates, favorites, reading history.
- **Environments**: Copy `.env.local` template from `README.md` (`SQLITE_PATH`, `READ_ALOUD_WPM`, `ALLOW_HOSTS`). API routes require `export const runtime = 'nodejs'` to keep SQLite working in App Router edge defaults.

## Data & APIs
- **Database access**: `db/index.ts` opens `process.env.SQLITE_PATH || '.data/app.db'` in WAL mode. Use Drizzle schema from `db/schema.ts` when querying; migrations live in `db/migrations/` (run `yarn drizzle-kit migrate`).
- **Catalog pipeline**: `src/app/api/catalog/route.ts` joins `books`, `estimates`, `cacheManifest` and applies filters (age, duration, language, offline). When filtering client-side, mirror URL params from `HomeContent.tsx`.
- **Estimates**: `api/estimate` first tries HEAD on `books.txtUrl`, then falls back to Range fetch; batching in `BookGrid.tsx` hits 4 IDs at a time. Preserve that throttling when extending estimate logic.
- **Reading history mismatch**: `api/history` groups results into `{ today, lastWeek, earlier }`, but `history/page.tsx` expects `last7Days`. If you adjust either side, change both to avoid empty history views.
- **Proxy**: `api/proxy` checks host against `ALLOW_HOSTS` regex; remember to expand env if new ebook sources are needed.

## Client Patterns
- **Providers**: `src/components/Providers.tsx` wraps pages with `PreferencesProvider`, `ThemeProvider`, `CacheManager`, and PWA prompts. Any new global context should be added there.
- **Offline caching**: `BookGrid` prefetches metadata and schedules `preloadEpub` after 300 ms hover; `epub-preloader.ts` stores blobs in IndexedDB (`idb-keyval`). Respect these timers to avoid hammering upstream hosts.
- **Reader page**: `book/[id]/page.tsx` loads EPUB via `/api/proxy`, persists CFI positions (`idb-keyval`) and logs sessions through `reading-tracker.ts`. New reader controls should update `currentSessionRef` so `updateReadingHistory` keeps totals accurate.
- **Local storage hygiene**: `CacheManager.tsx` enforces versioned keys (`taletime-*`) and offers `Ctrl+Shift+C` clear shortcut in dev; reuse the prefix when storing user data.

## Tooling & Workflows
- **Tasks**: `yarn dev`, `yarn build`, `yarn start`, `yarn lint`; migrations with `yarn drizzle-kit generate` / `migrate`. Development server task is registered as “Next.js Dev Server”.
- **Database seeding**: `scripts/populate-books.(mjs|js)` pull Gutendex titles; scripts still reference legacy columns (`bookshelves`, `formats`). Align schema before running or strip extra fields.
- **Custom imports**: `scripts/add-custom-book.mjs` inserts high-ID EPUB records; keep IDs ≥99000 to avoid clashes with Gutendex IDs.
- **Generated stories**: `scripts/collect-stories.js` writes `src/lib/generated-stories.ts`, merged via `combineWithExistingStories`; do not hand-edit the generated file.

## UX & Styling
- **Tailwind theme**: Colors derive from CSS variables set in `src/app/globals.css`; shadcn-style components live in `src/components/ui/`. Follow existing gradients/animations when introducing new cards so they remain consistent.
- **PWA**: `public/sw.js` handles cache-first for static assets and registers push handlers. Any change to offline behavior should update both the service worker and the `OfflineBanner` logic in `PWAComponents.tsx`.
