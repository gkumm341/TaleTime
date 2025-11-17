# TaleTime Application Overview

## 📖 What is TaleTime?

TaleTime is a modern web application designed to browse, estimate reading times, and read classic children's books (EPUBs) directly in the browser. It focuses on providing offline-capable reading experiences with personalized preferences, making classic literature accessible and convenient.

## 🎯 Core Features

### Book Discovery & Catalog
- **Browse Classic Literature**: Access 200+ children's books from Project Gutenberg and similar public domain sources
- **Smart Filtering**: Books organized by download count, subjects, and languages
- **Cover Previews**: Visual book grid with cover images
- **Pagination**: Adjustable items per page (25/50/75/100 books)

### Reading Time Estimation
- **Pre-download Estimates**: Calculate reading time before downloading full EPUB files
- **Smart Sampling**: Uses HTTP HEAD/Range requests to sample text without full downloads
- **Customizable WPM**: Default 160 words per minute (configurable)
- **Database Caching**: Estimates stored in SQLite for instant retrieval

### EPUB Reader
- **In-browser Reading**: Full-featured EPUB reader using epub.js
- **Offline Support**: IndexedDB caching for downloaded books
- **Bookmark Persistence**: Saves reading position using CFI (Canonical Fragment Identifier)
- **Reader Controls**:
  - Theme switching (Light, Sepia, Dark)
  - Font size adjustment
  - Table of contents navigation
  - Page-by-page navigation
  - Custom cover, title, and TOC pages

### Progressive Web App (PWA)
- **Offline Capability**: Works without internet connection once books are cached
- **Service Worker**: Caches application shell and book data
- **Manifest**: Installable on mobile devices and desktops

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 16.0.0 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Component Library**: Radix UI (Select, Slider)
- **Icons**: Lucide React
- **EPUB Rendering**: epub.js 0.3.93

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: SQLite with better-sqlite3
- **ORM**: Drizzle ORM 0.44.7
- **Storage**: IndexedDB via idb-keyval

### Development Tools
- **Package Manager**: Yarn
- **Bundler**: Webpack (avoiding Turbopack issues)
- **Linting**: ESLint 9 with Next.js config
- **Build Tool**: Next.js Build System

### Database Schema
```typescript
// Books table - stores book metadata
books: {
  id, title, authors, languages, subjects,
  coverUrl, txtUrl, epubUrl, downloadCount, updatedAt
}

// Estimates table - cached reading time calculations
estimates: {
  bookId, source, bytes, sampleBytes, words,
  minutes, wpm, computedAt
}

// Cache manifest - tracks cached EPUBs in IndexedDB
cacheManifest: {
  bookId, epubBlobKey, txtBlobKey, lastChecked
}
```

## 📁 Project Structure

```
taletime/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── catalog/        # Book catalog endpoint (from SQLite)
│   │   │   ├── estimate/       # Reading time calculation
│   │   │   └── proxy/          # CORS-safe EPUB proxy
│   │   ├── book/[id]/          # EPUB reader page
│   │   ├── favorites/          # Favorites page (planned)
│   │   ├── history/            # Reading history (planned)
│   │   ├── search/             # Search page (planned)
│   │   └── page.tsx            # Home page (book browser)
│   ├── components/
│   │   ├── BookGrid.tsx        # Book grid with lazy estimate loading
│   │   ├── Navigation.tsx      # App navigation header
│   │   ├── HomeContent.tsx     # Home page content
│   │   ├── CacheManager.tsx    # Cache management UI
│   │   ├── DeveloperTools.tsx  # Dev tools panel
│   │   ├── PWAComponents.tsx   # PWA install prompts
│   │   └── ui/                 # Reusable UI components
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Global theme management
│   └── lib/
│       ├── cache-utils.ts      # IndexedDB cache utilities
│       ├── epub-preloader.ts   # EPUB prefetching logic
│       ├── stories.ts          # Story data structures
│       └── utils.ts            # Utility functions
├── db/
│   ├── schema.ts               # Drizzle ORM schema
│   ├── index.ts                # SQLite connection
│   └── migrations/             # Database migrations
├── scripts/
│   ├── populate-books.mjs      # Import books from Gutendex API
│   ├── collect-stories.js      # Story collection utility
│   └── check-db.js             # Database verification
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
└── docs/
    └── STORY_SOURCING_GUIDE.md # Guide for ethical content sourcing
```

## 🔄 Application Flow

### 1. Initial Load
1. User visits homepage (`/`)
2. `HomeContent` fetches books from `/api/catalog`
3. API queries SQLite database for book metadata
4. Books displayed in grid with cover images

### 2. Reading Time Estimation
1. `BookGrid` lazily loads estimates for visible books
2. `/api/estimate` checks database cache first
3. If not cached, makes HEAD/Range request to text file
4. Calculates words/minutes based on WPM
5. Stores result in database for future use

### 3. Book Reading
1. User clicks book → navigates to `/book/[id]`
2. Reader checks IndexedDB for cached EPUB
3. If not cached, fetches via `/api/proxy`
4. epub.js renders book in browser
5. Reading position saved to localStorage
6. Theme/font preferences applied from state

### 4. Offline Usage
1. Service worker caches app shell
2. EPUBs stored in IndexedDB
3. Book metadata cached in SQLite
4. Works fully offline after initial setup

## 🚀 Current State & Status

### ✅ Completed Features
- [x] Next.js project scaffolding with TypeScript
- [x] Tailwind CSS v4 styling
- [x] SQLite database with Drizzle ORM
- [x] Book catalog API with pagination
- [x] Reading time estimation with caching
- [x] Full EPUB reader with epub.js
- [x] Theme switching (light/sepia/dark)
- [x] Font size adjustment
- [x] Table of contents navigation
- [x] Bookmark/position persistence
- [x] IndexedDB offline caching
- [x] CORS proxy for external EPUBs
- [x] Custom cover, title, and TOC pages
- [x] Responsive design (mobile/tablet/desktop)
- [x] VS Code task configuration
- [x] Development server setup

### 🔧 In Progress / Planned
- [ ] Favorites functionality (page exists, needs implementation)
- [ ] Reading history (page exists, needs implementation)
- [ ] Search functionality (page exists, needs implementation)
- [ ] PWA installation flow
- [ ] Service worker optimization
- [ ] Advanced filtering/sorting
- [ ] User preferences persistence
- [ ] Reading statistics/analytics
- [ ] Multi-language support
- [ ] Accessibility improvements

### 📊 Database State
- **Books Table**: Can hold 200+ books from Gutendex API
- **Estimates Table**: Caches reading time calculations
- **Cache Manifest**: Tracks offline EPUB storage
- **Population Script**: Available to import books from Project Gutenberg

## 🎨 Design Philosophy

### User Experience
- **Simplicity First**: Clean, distraction-free reading interface
- **Offline-First**: Works without constant internet connection
- **Performance**: Lazy loading, caching, and optimized rendering
- **Accessibility**: Readable fonts, adjustable sizes, theme options

### Technical Decisions
- **SQLite over Remote DB**: Fast local queries, no network latency
- **IndexedDB over LocalStorage**: Large EPUB files need more storage
- **Webpack over Turbopack**: Stability and compatibility
- **epub.js**: Industry-standard EPUB rendering library
- **Drizzle ORM**: Type-safe database queries with TypeScript

## 🌐 Content Sources

### Current
- **Project Gutenberg**: Primary source via Gutendex API
- **Public Domain**: Pre-1928 works (US copyright law)
- **Children's Literature**: Focus on classic fairy tales and stories

### Ethical Sourcing
- Documentation in `docs/STORY_SOURCING_GUIDE.md`
- Emphasis on public domain and Creative Commons content
- No copyright infringement
- Proper attribution maintained

## 🔒 Environment Configuration

```env
SQLITE_PATH=.data/app.db              # Database file location
READ_ALOUD_WPM=160                    # Words per minute for estimates
ALLOW_HOSTS=gutenberg.org,standardebooks.org  # Proxy whitelist
```

## 🚀 Getting Started

```bash
# Install dependencies
yarn install

# Run database migrations
yarn drizzle-kit migrate

# Populate books (optional)
node scripts/populate-books.mjs

# Start development server
yarn dev
# or use VS Code task: "Next.js Dev Server"

# Visit http://localhost:3000
```

## 📈 Future Enhancements

### Short Term
- Complete favorites and history features
- Implement search functionality
- Enhance PWA capabilities
- Add user onboarding

### Medium Term
- User accounts and cloud sync
- Reading challenges/goals
- Social sharing features
- Book recommendations

### Long Term
- Mobile native apps
- Audio narration integration
- Multi-user libraries
- Community features

## 📝 Notes

- **Webpack Configuration**: Uses `--webpack` flag to avoid Turbopack stability issues
- **React 19**: Running latest React with concurrent features
- **TypeScript**: Strict type checking throughout
- **Responsive**: Tested on mobile, tablet, and desktop viewports
- **Browser Support**: Modern browsers with IndexedDB and Service Worker support

---

**Last Updated**: November 17, 2025  
**Version**: 0.1.0  
**Status**: Active Development
