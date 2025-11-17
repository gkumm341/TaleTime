# TaleTime Development Roadmap
## 4-Phase Implementation Plan for AI Agents

**Vision**: Transform TaleTime into the ultimate kids' reading & storytelling companion: read, be read to, and create stories, online and offline.

**Current State**: Classic EPUB reader with offline support, reading time estimates, and SQLite catalog.

---

## 📋 Phase 1 – Core Reader MVP (Foundation)
**Goal**: Rock-solid, offline-first reader for classic children's books that families can use as their primary reading app.

**Timeline**: 2-3 weeks  
**Status**: 🟡 In Progress

### Product Objectives
- [ ] Prove core loop: Discover → Estimate time → Read → Resume later
- [ ] Validate offline-first value and basic reading UX
- [ ] Build technical foundations for personalization and AI features

---

### 1.1 Catalog Enhancement ✅ COMPLETED
**Location**: `src/app/page.tsx`, `src/components/HomeContent.tsx`, `src/app/api/catalog/route.ts`

#### Sort Functionality
- [x] **Task**: Add sort dropdown to HomeContent
  - [x] Create sort state: `popularity`, `length`, `title`, `author`
  - [x] Update API call to pass sort parameter
  - [x] Implement sorting logic in `/api/catalog` route
  - [x] Sort by `downloadCount` DESC for popularity
  - [x] Calculate length from `estimates` table join
  - [x] Add alphabetical sorting for title/author
  - [x] Update UI with sort dropdown component
  - [x] Test sorting with 200+ books

#### Filter System
- [x] **Task**: Implement age-appropriate filters
  - [x] Analyze existing `subjects` field in database
  - [x] Create mapping of subjects to age categories:
    - [x] "Early Readers" (Ages 3-5): nursery rhymes, simple tales
    - [x] "Beginning Readers" (Ages 6-8): fairy tales, fables
    - [x] "Middle Grade" (Ages 9-12): adventures, classics
  - [x] Create filter component with checkboxes
  - [x] Add filter state management
  - [x] Update API to accept filter parameters
  - [x] Implement SQL WHERE clauses for subjects
  - [x] Add language filter (English, French, German, etc.)
  - [x] Add "Clear all filters" button
  - [x] Persist filter preferences in localStorage (pending)
  - [x] Test filter combinations

#### UI Improvements
- [x] **Task**: Add visual indicators
  - [x] Show total book count with filters applied
  - [x] Display active filters as removable chips
  - [x] Add skeleton loading states for book cards
  - [x] Implement empty state when no books match filters

**Files to Create/Modify**:
- [x] `src/components/BookFilters.tsx` (NEW)
- [x] `src/components/ActiveFilters.tsx` (NEW)
- [x] `src/lib/age-categories.ts` (NEW)
- [x] `src/components/ui/skeleton.tsx` (NEW)
- [x] `src/app/api/catalog/route.ts` (MODIFY)
- [x] `src/components/HomeContent.tsx` (MODIFY)

---

### 1.2 Enhanced Reading Experience
**Location**: `src/app/book/[id]/page.tsx`

#### Time to Finish Feature
- [ ] **Task**: Show remaining reading time
  - [ ] Calculate current position percentage from CFI
  - [ ] Get total book word count from estimates table
  - [ ] Calculate words remaining: `totalWords * (1 - progress)`
  - [ ] Use stored WPM preference (default 160)
  - [ ] Display "X minutes remaining" in reader UI
  - [ ] Update estimate as user reads
  - [ ] Store reading speed data for adaptive WPM
  - [ ] Add toggle to show/hide reading stats
  - [ ] Test with various book lengths

#### Reading Stats Tracking
- [ ] **Task**: Track actual reading speed
  - [ ] Record timestamp when chapter/page starts
  - [ ] Record timestamp when user turns page
  - [ ] Calculate actual WPM from time spent
  - [ ] Store sessions in localStorage
  - [ ] Create `readingSessions` table schema:
    ```typescript
    {
      bookId, startCfi, endCfi, 
      startTime, endTime, wordsRead, 
      calculatedWpm
    }
    ```
  - [ ] Aggregate data for adaptive WPM suggestions

#### Reader UI Polish
- [ ] **Task**: Improve reader controls
  - [ ] Add progress bar showing position in book
  - [ ] Show chapter title in header
  - [ ] Add keyboard shortcuts documentation
  - [ ] Implement swipe gestures for mobile
  - [ ] Add fullscreen mode toggle
  - [ ] Save scroll position for custom pages
  - [ ] Test on mobile, tablet, desktop

**Files to Create/Modify**:
- [ ] `src/app/book/[id]/page.tsx` (MODIFY)
- [ ] `src/components/ReadingStats.tsx` (NEW)
- [ ] `db/schema.ts` (ADD readingSessions table)
- [ ] `src/lib/reading-tracker.ts` (NEW)

---

### 1.3 Offline Enhancements
**Location**: `public/sw.js`, `src/lib/cache-utils.ts`, `public/manifest.json`

#### PWA Shell Caching
- [ ] **Task**: Implement comprehensive service worker
  - [ ] Review current `sw.js` implementation
  - [ ] Add caching strategies:
    - [ ] Cache-first for static assets
    - [ ] Network-first for API routes
    - [ ] Stale-while-revalidate for book metadata
  - [ ] Implement offline fallback page
  - [ ] Add cache versioning
  - [ ] Implement cache cleanup on version change
  - [ ] Test offline mode thoroughly

#### Offline Badge System
- [ ] **Task**: Show which books are available offline
  - [ ] Query `cacheManifest` table for cached books
  - [ ] Add "Downloaded" badge to BookGrid cards
  - [ ] Show download icon when book is cached
  - [ ] Add "Available offline" filter option
  - [ ] Create download progress indicator
  - [ ] Implement manual download button per book
  - [ ] Show total offline storage used
  - [ ] Add "Manage downloads" section

#### IndexedDB Optimization
- [ ] **Task**: Improve caching efficiency
  - [ ] Implement cache size limits (e.g., 500MB max)
  - [ ] Add LRU eviction policy
  - [ ] Create cache health check on app load
  - [ ] Repair corrupted cache entries
  - [ ] Add manual cache clear option
  - [ ] Log cache hit/miss metrics
  - [ ] Test with large EPUB files (>10MB)

**Files to Create/Modify**:
- [ ] `public/sw.js` (MODIFY)
- [ ] `src/lib/cache-utils.ts` (MODIFY)
- [ ] `src/components/OfflineBadge.tsx` (NEW)
- [ ] `src/components/DownloadManager.tsx` (NEW)
- [ ] `public/manifest.json` (MODIFY)

---

### 1.4 Device-Local Preferences
**Location**: `src/contexts/ThemeContext.tsx`, `src/lib/preferences.ts`

#### Preferences System
- [ ] **Task**: Centralized preferences management
  - [ ] Create `PreferencesContext.tsx`
  - [ ] Define preferences interface:
    ```typescript
    {
      theme: 'light' | 'sepia' | 'dark',
      fontSize: number,
      defaultWpm: number,
      autoSave: boolean,
      showReadingStats: boolean
    }
    ```
  - [ ] Store in IndexedDB (not localStorage for larger data)
  - [ ] Implement get/set/reset methods
  - [ ] Add preferences page/modal
  - [ ] Apply preferences globally
  - [ ] Export/import preferences feature
  - [ ] Test preferences persistence

#### Settings UI
- [ ] **Task**: Create settings page
  - [ ] Create `src/app/settings/page.tsx`
  - [ ] Add theme selector with preview
  - [ ] Add font size slider (80-150%)
  - [ ] Add WPM input with validation
  - [ ] Add toggle switches for features
  - [ ] Add "Reset to defaults" button
  - [ ] Show storage usage statistics
  - [ ] Add link from Navigation component

**Files to Create/Modify**:
- [ ] `src/contexts/PreferencesContext.tsx` (NEW)
- [ ] `src/lib/preferences.ts` (NEW)
- [ ] `src/app/settings/page.tsx` (NEW)
- [ ] `src/components/Navigation.tsx` (MODIFY - add settings link)

---

### 1.5 Nice-to-Have Features

#### Bedtime Mode
- [ ] **Task**: Quick access to short stories
  - [ ] Add "Bedtime Mode" toggle to home page
  - [ ] Filter books by duration: 5, 10, 15 minutes
  - [ ] Create preset duration buttons
  - [ ] Show "Good for bedtime" badge
  - [ ] Add moon icon visual indicator
  - [ ] Remember bedtime duration preference
  - [ ] Create dedicated `/bedtime` route
  - [ ] Test with actual story durations

**Files to Create/Modify**:
- [ ] `src/app/bedtime/page.tsx` (NEW)
- [ ] `src/components/BedtimeMode.tsx` (NEW)

#### Feedback System
- [ ] **Task**: Add feedback mechanism
  - [ ] Add "Send Feedback" link in Navigation
  - [ ] Create simple feedback form component
  - [ ] Options: Bug report, Feature request, General feedback
  - [ ] Collect browser/device info automatically
  - [ ] Email to configured address or external form
  - [ ] Show success message
  - [ ] Add to footer and settings page

**Files to Create/Modify**:
- [ ] `src/components/FeedbackForm.tsx` (NEW)
- [ ] `src/app/api/feedback/route.ts` (NEW)

---

### 1.6 Testing & Quality Assurance

#### Unit Tests
- [ ] **Task**: Write tests for core functionality
  - [ ] Test `/api/catalog` endpoint
    - [ ] Test pagination
    - [ ] Test sorting options
    - [ ] Test filtering
    - [ ] Test empty results
  - [ ] Test `/api/estimate` endpoint
    - [ ] Test cache hits
    - [ ] Test calculation logic
    - [ ] Test error handling
  - [ ] Test cache utilities
    - [ ] Test set/get/delete
    - [ ] Test cache size management
  - [ ] Set up Jest or Vitest
  - [ ] Aim for 70%+ code coverage

#### Integration Tests
- [ ] **Task**: Test user flows
  - [ ] Test: Browse → Open book → Read → Bookmark → Return
  - [ ] Test: Download book → Go offline → Read
  - [ ] Test: Change theme → Persist across sessions
  - [ ] Test: Filter books → Sort → Select book
  - [ ] Use Playwright or Cypress

#### Manual Testing Checklist
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iOS Safari (mobile)
- [ ] Test on Android Chrome
- [ ] Test on tablet (iPad/Android)
- [ ] Test offline mode thoroughly
- [ ] Test PWA installation
- [ ] Test with slow 3G network
- [ ] Test with large catalog (500+ books)

**Files to Create**:
- [ ] `__tests__/api/catalog.test.ts` (NEW)
- [ ] `__tests__/api/estimate.test.ts` (NEW)
- [ ] `__tests__/lib/cache-utils.test.ts` (NEW)
- [ ] `e2e/reading-flow.spec.ts` (NEW)

---

### 1.7 Documentation

- [ ] **Task**: Update README.md
  - [ ] Document all new features
  - [ ] Update screenshots
  - [ ] Add user guide section
  - [ ] Document API endpoints
- [ ] **Task**: Create user documentation
  - [ ] How to use offline mode
  - [ ] How to adjust reading preferences
  - [ ] Keyboard shortcuts reference
  - [ ] Troubleshooting guide
- [ ] **Task**: Developer documentation
  - [ ] Architecture overview
  - [ ] API documentation
  - [ ] Database schema documentation
  - [ ] Contributing guidelines

---

## 📋 Phase 2 – Engagement & Personalization
**Goal**: Transform from "nice reader" to habit-forming reading companion with memory, personalization, and analytics.

**Timeline**: 4-6 weeks  
**Status**: 🔴 Not Started

### Product Objectives
- [ ] Increase reading frequency and retention
- [ ] Make app remember user across sessions
- [ ] Collect minimum data for UX improvement
- [ ] Enable beta testing with real users

---

### 2.1 Library & History System
**Location**: `src/app/favorites/`, `src/app/history/`, `db/schema.ts`

#### Favorites Feature
- [ ] **Task**: Implement favorites functionality
  - [ ] Create `favorites` table in schema:
    ```typescript
    {
      id: serial,
      bookId: integer,
      userId: text (deviceId for now),
      addedAt: timestamp,
      notes: text (optional)
    }
    ```
  - [ ] Add migration for favorites table
  - [ ] Create `/api/favorites` endpoints:
    - [ ] GET /api/favorites - list all favorites
    - [ ] POST /api/favorites - add to favorites
    - [ ] DELETE /api/favorites/:bookId - remove favorite
  - [ ] Add heart icon to book cards
  - [ ] Implement toggle favorite functionality
  - [ ] Show filled/unfilled heart state
  - [ ] Implement `src/app/favorites/page.tsx`
  - [ ] Show favorites grid with offline indicators
  - [ ] Add "Remove from favorites" action
  - [ ] Sort favorites by: Recently added, Title, Last read
  - [ ] Show empty state with call-to-action
  - [ ] Add favorites count to Navigation
  - [ ] Test favorites sync across tabs

#### Reading History
- [ ] **Task**: Track and display reading history
  - [ ] Create `readingHistory` table:
    ```typescript
    {
      id: serial,
      bookId: integer,
      userId: text,
      lastReadAt: timestamp,
      currentCfi: text,
      progressPercent: float,
      totalReadingTime: integer (seconds)
    }
    ```
  - [ ] Add migration for reading history
  - [ ] Update history on book open
  - [ ] Update history on bookmark save
  - [ ] Track reading time per session
  - [ ] Create `/api/history` endpoint
  - [ ] Implement `src/app/history/page.tsx`
  - [ ] Group by: Today, Last 7 days, Earlier
  - [ ] Show progress bar per book
  - [ ] Show last read timestamp
  - [ ] Show total time spent per book
  - [ ] Add "Continue reading" button
  - [ ] Add "Remove from history" option
  - [ ] Limit history to 100 most recent

#### Continue Reading Widget
- [ ] **Task**: Add "Continue Reading" to home page
  - [ ] Query 3-6 most recently read books
  - [ ] Show horizontal scrollable row
  - [ ] Display cover, title, progress bar
  - [ ] Show "X% complete" or "X min left"
  - [ ] Click to resume at last position
  - [ ] Update in real-time as user reads
  - [ ] Add to `HomeContent.tsx` at top

**Files to Create/Modify**:
- [ ] `db/schema.ts` (ADD favorites & readingHistory tables)
- [ ] `db/migrations/` (NEW migration files)
- [ ] `src/app/api/favorites/route.ts` (NEW)
- [ ] `src/app/api/history/route.ts` (NEW)
- [ ] `src/app/favorites/page.tsx` (MODIFY - implement)
- [ ] `src/app/history/page.tsx` (MODIFY - implement)
- [ ] `src/components/ContinueReading.tsx` (NEW)
- [ ] `src/components/FavoriteButton.tsx` (NEW)
- [ ] `src/components/HomeContent.tsx` (MODIFY)

---

### 2.2 Search & Discovery
**Location**: `src/app/search/`, `src/app/api/search/`

#### Search Implementation
- [ ] **Task**: Full-text search functionality
  - [ ] Create search input component
  - [ ] Implement debounced search (300ms)
  - [ ] Create `/api/search` endpoint
  - [ ] Search across: title, authors, subjects
  - [ ] Use SQL LIKE or FTS if available:
    ```sql
    WHERE title LIKE '%query%' 
    OR authors LIKE '%query%' 
    OR subjects LIKE '%query%'
    ```
  - [ ] Return ranked results (title match first)
  - [ ] Implement `src/app/search/page.tsx`
  - [ ] Show search results in grid
  - [ ] Highlight matching terms
  - [ ] Show "No results" state
  - [ ] Add recent searches (localStorage)
  - [ ] Add search suggestions/autocomplete
  - [ ] Test with various queries

#### Autocomplete Feature
- [ ] **Task**: Add search autocomplete
  - [ ] Build suggestion list from catalog
  - [ ] Extract unique: titles, authors, subjects
  - [ ] Store in IndexedDB for fast access
  - [ ] Show dropdown as user types
  - [ ] Limit to 10 suggestions
  - [ ] Highlight matching portion
  - [ ] Navigate with keyboard arrows
  - [ ] Click or Enter to select
  - [ ] Test performance with large dataset

#### Advanced Filters
- [ ] **Task**: Duration-based filtering
  - [ ] Add duration filter buttons:
    - [ ] Short (<10 min)
    - [ ] Medium (10-25 min)
    - [ ] Long (>25 min)
  - [ ] Query estimates table for filtering
  - [ ] Allow multiple duration selections
  - [ ] Show count per duration category
  - [ ] Apply alongside text search

#### Age Tags/Curation
- [ ] **Task**: Age-appropriate categorization
  - [ ] Analyze subjects field across catalog
  - [ ] Create age mapping JSON:
    ```json
    {
      "early-readers": ["Nursery rhymes", "Simple tales"],
      "beginning-readers": ["Fairy tales", "Fables"],
      "middle-grade": ["Adventure", "Classics"]
    }
    ```
  - [ ] Add age filter UI
  - [ ] Tag books with age categories
  - [ ] Store tags in database
  - [ ] Allow filtering by age
  - [ ] Manual curation tool for admins

**Files to Create/Modify**:
- [ ] `src/app/search/page.tsx` (MODIFY - implement)
- [ ] `src/app/api/search/route.ts` (NEW)
- [ ] `src/components/SearchBar.tsx` (NEW)
- [ ] `src/components/SearchAutocomplete.tsx` (NEW)
- [ ] `src/components/DurationFilter.tsx` (NEW)
- [ ] `src/components/AgeFilter.tsx` (NEW)
- [ ] `src/lib/search-utils.ts` (NEW)
- [ ] `data/age-mappings.json` (NEW)

---

### 2.3 Preferences & Analytics
**Location**: `src/app/profile/`, `src/app/analytics/`

#### User Profile System
- [ ] **Task**: Device-local profile management
  - [ ] Create `profiles` table (multi-user per device):
    ```typescript
    {
      id: uuid,
      name: text,
      avatarColor: text,
      preferredWpm: integer,
      preferredTheme: text,
      preferredDuration: integer,
      createdAt: timestamp
    }
    ```
  - [ ] Create profile selector on home page
  - [ ] "Who's reading?" screen on first launch
  - [ ] Add/edit/delete profiles
  - [ ] Switch between profiles
  - [ ] Store active profile in localStorage
  - [ ] Associate favorites/history with profile
  - [ ] Avatar color picker
  - [ ] Age range per profile (optional)

#### Reading Stats Dashboard
- [ ] **Task**: Personal reading analytics
  - [ ] Create stats calculation utilities
  - [ ] Track daily reading time per profile
  - [ ] Count books started
  - [ ] Count books completed (>95% read)
  - [ ] Calculate reading streak:
    - [ ] Consecutive days with >5 min reading
    - [ ] Show current streak
    - [ ] Show longest streak
  - [ ] Create `src/app/stats/page.tsx`
  - [ ] Display stats with charts:
    - [ ] Reading time this week (bar chart)
    - [ ] Books finished this month
    - [ ] Current streak with fire emoji
    - [ ] Total reading time
  - [ ] Use chart library (recharts or chart.js)
  - [ ] Export stats as image

#### Onboarding Wizard
- [ ] **Task**: First-time user experience
  - [ ] Create multi-step onboarding modal
  - [ ] Step 1: Welcome message
  - [ ] Step 2: Create profile
    - [ ] Name input
    - [ ] Avatar color selection
    - [ ] Age range (optional)
  - [ ] Step 3: Reading preferences
    - [ ] Preferred reading length
    - [ ] Reading speed (slow/medium/fast → WPM)
    - [ ] Theme preference
  - [ ] Step 4: Get starter books
    - [ ] Auto-curate 6-10 books based on preferences
    - [ ] Show "Your starter shelf"
  - [ ] Save onboarding completion flag
  - [ ] Allow skipping onboarding
  - [ ] "Take tour again" option in settings

**Files to Create/Modify**:
- [ ] `db/schema.ts` (ADD profiles, stats tables)
- [ ] `src/app/profile/page.tsx` (NEW)
- [ ] `src/app/stats/page.tsx` (NEW)
- [ ] `src/components/ProfileSelector.tsx` (NEW)
- [ ] `src/components/OnboardingWizard.tsx` (NEW)
- [ ] `src/components/ReadingStatsChart.tsx` (NEW)
- [ ] `src/lib/stats-calculator.ts` (NEW)
- [ ] `src/lib/streak-tracker.ts` (NEW)

---

### 2.4 Light AI-Driven UX
**Location**: `src/app/api/ai/`, `src/lib/ai-utils.ts`

#### Adaptive WPM Suggestions
- [ ] **Task**: Smart reading speed detection
  - [ ] Collect actual reading data from sessions
  - [ ] Calculate average WPM per profile
  - [ ] Compare estimated vs actual time
  - [ ] Detect if user consistently reads faster/slower
  - [ ] Show suggestion toast:
    - [ ] "Looks like you read around 190 wpm, update?"
  - [ ] Allow accept/dismiss
  - [ ] Update profile WPM on accept
  - [ ] Don't show suggestion more than once/week
  - [ ] Test accuracy over multiple sessions

#### Chapter Summary Feature
- [ ] **Task**: AI-powered chapter explanations
  - [ ] Choose AI provider (OpenAI, Anthropic, local)
  - [ ] Set up API keys in environment
  - [ ] Create `/api/ai/summarize` endpoint
  - [ ] Accept: bookId, chapter text
  - [ ] Generate prompt:
    ```
    Summarize this chapter for a child in 2-3 sentences.
    Keep it simple and age-appropriate.
    Chapter: {chapterText}
    ```
  - [ ] Add "Explain this chapter" button in reader
  - [ ] Show loading state during generation
  - [ ] Display summary in modal or sidebar
  - [ ] Cache summaries in database:
    ```typescript
    {
      bookId, chapterIndex, summary, generatedAt
    }
    ```
  - [ ] Implement rate limiting (5 summaries/day for free)
  - [ ] Add usage counter to profile
  - [ ] Show "X summaries left today"
  - [ ] Test with various chapter lengths

#### AI Safety & Guardrails
- [ ] **Task**: Ensure safe AI outputs
  - [ ] Add content filter for AI responses
  - [ ] Validate output length (max 500 chars)
  - [ ] Check for inappropriate content
  - [ ] Fallback message if AI fails
  - [ ] Log AI interactions for review
  - [ ] Add parental controls toggle
  - [ ] Allow disabling AI features per profile

**Files to Create/Modify**:
- [ ] `src/app/api/ai/summarize/route.ts` (NEW)
- [ ] `src/lib/ai-client.ts` (NEW)
- [ ] `src/lib/ai-safety.ts` (NEW)
- [ ] `src/components/ChapterSummary.tsx` (NEW)
- [ ] `src/components/AdaptiveWpmPrompt.tsx` (NEW)
- [ ] `db/schema.ts` (ADD aiSummaries, aiUsage tables)
- [ ] `.env.local` (ADD AI API keys)

---

### 2.5 Decision Point: Storage Strategy

#### Option A: Device-Local Only (Faster)
- [ ] Keep all data in IndexedDB
- [ ] No user accounts needed
- [ ] No backend sync
- [ ] Pros: Privacy, simplicity, offline-first
- [ ] Cons: Data loss if device lost, no multi-device

#### Option B: Cloud Accounts (Future-Proof)
- [ ] **Task**: Implement user authentication
  - [ ] Choose auth provider (NextAuth, Clerk, Supabase)
  - [ ] Add email/password authentication
  - [ ] Add OAuth (Google, Apple)
  - [ ] Create user accounts system
  - [ ] Migrate SQLite to Postgres/MySQL
  - [ ] Implement data sync logic
  - [ ] Sync favorites, history, preferences
  - [ ] Handle conflict resolution
  - [ ] Test cross-device sync
  - [ ] Add "Sign in to sync" prompts

**Recommendation**: Start with Option A for Phase 2, move to Option B in Phase 3.

---

### 2.6 Testing & Beta Program

#### Beta Testing Setup
- [ ] **Task**: Recruit beta testers
  - [ ] Create beta signup form
  - [ ] Target: 20-50 families
  - [ ] Provide feedback channels
  - [ ] Set up user interview schedule
  - [ ] Create feedback collection system
  - [ ] Track key metrics:
    - [ ] Daily active users
    - [ ] Session duration
    - [ ] Books read per user
    - [ ] Feature usage rates

#### Analytics Implementation
- [ ] **Task**: Privacy-friendly analytics
  - [ ] Choose analytics tool (Plausible, Fathom, or custom)
  - [ ] Track anonymized events:
    - [ ] Book opened
    - [ ] Reading session completed
    - [ ] Feature used (favorites, search, etc.)
  - [ ] Don't track: personal info, reading content
  - [ ] Add analytics dashboard
  - [ ] GDPR compliance check

**Files to Create**:
- [ ] `src/lib/analytics.ts` (NEW)
- [ ] `docs/BETA_TESTING_GUIDE.md` (NEW)

---

## 📋 Phase 3 – Storytelling & Differentiation
**Goal**: Become a unique "storytelling companion" with interactive stories, narration, and safe creative tools.

**Timeline**: 8-12 weeks  
**Status**: 🔴 Not Started

### Product Objectives
- [ ] Maximize engagement and delight for kids & parents
- [ ] Introduce premium features for monetization
- [ ] Maintain safety and age-appropriateness
- [ ] Build competitive moat

---

### 3.1 Read-Aloud & Audio Layer
**Location**: `src/app/api/tts/`, `src/components/AudioPlayer.tsx`

#### Text-to-Speech Integration
- [ ] **Task**: Choose TTS provider
  - [ ] Research options:
    - [ ] Google Cloud TTS
    - [ ] Amazon Polly
    - [ ] Microsoft Azure TTS
    - [ ] ElevenLabs (premium quality)
    - [ ] Local TTS (browser API)
  - [ ] Compare pricing and voice quality
  - [ ] Select provider and set up API
  - [ ] Create TTS service wrapper

#### Audio Generation System
- [ ] **Task**: Pre-generate audio files
  - [ ] Create audio generation queue system
  - [ ] Split books into chapter segments
  - [ ] Generate audio for popular books first
  - [ ] Store audio files:
    - [ ] Cloud storage (S3, Cloudflare R2)
    - [ ] Or CDN
  - [ ] Create `audioFiles` table:
    ```typescript
    {
      id, bookId, chapterIndex,
      audioUrl, duration, generatedAt,
      voiceId, quality
    }
    ```
  - [ ] Build background worker for generation
  - [ ] Implement retry logic for failures
  - [ ] Monitor generation costs

#### Audio Player Component
- [ ] **Task**: Build read-aloud player
  - [ ] Create audio player UI component
  - [ ] Controls: play, pause, skip forward/back
  - [ ] Speed control (0.75x, 1x, 1.25x, 1.5x)
  - [ ] Volume control
  - [ ] Progress bar with seeking
  - [ ] Show current sentence being read
  - [ ] Sync highlighting with audio (CFI)
  - [ ] Auto-advance to next chapter
  - [ ] Remember playback position
  - [ ] Background playback (mobile)
  - [ ] Test on iOS/Android

#### Sentence Highlighting Sync
- [ ] **Task**: Highlight text as it's read
  - [ ] Generate word-level timestamps
  - [ ] Parse CFI for sentence boundaries
  - [ ] Apply highlight class to current sentence
  - [ ] Smooth scrolling to keep highlighted text visible
  - [ ] Remove highlight when audio pauses
  - [ ] Handle edge cases (page boundaries)
  - [ ] Test synchronization accuracy

#### Bedtime Playlist Feature
- [ ] **Task**: Queue multiple stories
  - [ ] Create playlist builder UI
  - [ ] Allow adding 2-5 stories/chapters
  - [ ] Show total duration target (20 min)
  - [ ] Auto-suggest stories to meet duration
  - [ ] Save playlists per profile
  - [ ] Name custom playlists
  - [ ] "Bedtime" preset playlists
  - [ ] Auto-play next item in playlist
  - [ ] Sleep timer (fade out after X minutes)
  - [ ] Test complete bedtime flow

**Files to Create/Modify**:
- [ ] `src/app/api/tts/generate/route.ts` (NEW)
- [ ] `src/app/api/tts/audio/[id]/route.ts` (NEW)
- [ ] `src/lib/tts-service.ts` (NEW)
- [ ] `src/lib/audio-sync.ts` (NEW)
- [ ] `src/components/AudioPlayer.tsx` (NEW)
- [ ] `src/components/PlaylistBuilder.tsx` (NEW)
- [ ] `src/components/SleepTimer.tsx` (NEW)
- [ ] `db/schema.ts` (ADD audioFiles, playlists tables)
- [ ] `workers/audio-generator.ts` (NEW)

---

### 3.2 StoryPaths – Interactive Stories
**Location**: `src/app/story/`, `data/story-paths/`

#### StoryPath Data Model
- [ ] **Task**: Design interactive story structure
  - [ ] Create StoryPath JSON schema:
    ```json
    {
      "id": "red-riding-hood-01",
      "title": "Little Red Riding Hood",
      "baseBookId": 123,
      "scenes": [
        {
          "id": "scene-01",
          "text": "...",
          "choices": [
            {
              "text": "Follow the path",
              "nextScene": "scene-02a"
            },
            {
              "text": "Take the shortcut",
              "nextScene": "scene-02b"
            }
          ]
        }
      ]
    }
    ```
  - [ ] Create database schema for StoryPaths
  - [ ] Support multiple story variations
  - [ ] Track user's chosen path
  - [ ] Calculate duration per path

#### StoryPath Reader
- [ ] **Task**: Build interactive reader
  - [ ] Create specialized StoryPath reader component
  - [ ] Display current scene text
  - [ ] Show choice buttons at decision points
  - [ ] Animate transitions between scenes
  - [ ] Track choices in reading history
  - [ ] Display path summary at end
  - [ ] "You chose to X, Y, Z"
  - [ ] Show alternative paths not taken
  - [ ] "Play again" with different choices
  - [ ] Share path results

#### Content Creation Tools
- [ ] **Task**: Build StoryPath authoring tool
  - [ ] Create admin interface for story creation
  - [ ] Visual story graph editor
  - [ ] Add/edit/delete scenes
  - [ ] Define choices and branches
  - [ ] Preview story flow
  - [ ] Validate story structure (no dead ends)
  - [ ] Export/import JSON
  - [ ] Version control for stories

#### Curated StoryPath Library
- [ ] **Task**: Create initial story collection
  - [ ] Adapt 5-10 public domain stories
  - [ ] Classic fairy tales with choices
  - [ ] Adventure stories with paths
  - [ ] Educational stories with outcomes
  - [ ] Test with beta users
  - [ ] Gather feedback on story quality

**Files to Create/Modify**:
- [ ] `src/app/storypath/[id]/page.tsx` (NEW)
- [ ] `src/app/api/storypaths/route.ts` (NEW)
- [ ] `src/components/StoryPathReader.tsx` (NEW)
- [ ] `src/components/ChoiceButton.tsx` (NEW)
- [ ] `src/components/PathSummary.tsx` (NEW)
- [ ] `src/app/admin/storypath-editor/page.tsx` (NEW)
- [ ] `db/schema.ts` (ADD storyPaths, pathProgress tables)
- [ ] `data/story-paths/*.json` (NEW - story data)
- [ ] `src/lib/storypath-validator.ts` (NEW)

---

### 3.3 AI-Assisted Story Companion
**Location**: `src/app/api/ai/story/`, `src/components/StoryCustomizer.tsx`

#### Safe Story Modifications
- [ ] **Task**: AI-powered story customization
  - [ ] Design modification interface (NOT free-form chat)
  - [ ] Predefined modification actions:
    - [ ] Change character name
    - [ ] Change setting (forest → space → ocean)
    - [ ] Change character traits (brave → clever)
  - [ ] Create modification presets per story
  - [ ] Generate AI prompts with constraints:
    ```
    Rewrite this scene with:
    - Character name: {newName}
    - Setting: {newSetting}
    - Keep: length, tone, age-appropriateness
    - Original: {sceneText}
    ```
  - [ ] Validate AI output before displaying
  - [ ] Cache modified versions
  - [ ] Show "Original" vs "Your version" toggle

#### Character Name Customization
- [ ] **Task**: Personalize character names
  - [ ] UI: "Make this story yours" button
  - [ ] Input field for character name
  - [ ] Preview modified excerpt
  - [ ] Replace name throughout story
  - [ ] Simple find-replace for basic version
  - [ ] AI enhancement for proper context
  - [ ] Save personalized version
  - [ ] Share personalized story

#### Setting Transformation
- [ ] **Task**: Change story setting
  - [ ] Preset setting options:
    - [ ] Forest → Enchanted forest
    - [ ] Village → Space station
    - [ ] Castle → Underwater palace
  - [ ] AI rewrites scene descriptions
  - [ ] Maintain story structure
  - [ ] Validate coherence
  - [ ] Preview before applying
  - [ ] Revert to original option

#### Context-Aware Q&A
- [ ] **Task**: "Ask the story" feature
  - [ ] Add "Ask about this" button per chapter
  - [ ] Predefined question templates:
    - [ ] "Why did [character] do that?"
    - [ ] "What happened before this?"
    - [ ] "What does [word] mean?"
  - [ ] Custom question input (with guardrails)
  - [ ] Send question + chapter context to AI
  - [ ] Generate kid-friendly explanation
  - [ ] Show answer in modal/sidebar
  - [ ] Track questions asked
  - [ ] Rate limit questions (10/day free)

#### "Explain Like I'm X" Feature
- [ ] **Task**: Age-appropriate explanations
  - [ ] Add age selector (7, 10, 12, 15)
  - [ ] "Explain this chapter" button
  - [ ] AI generates explanation at reading level
  - [ ] Vocabulary appropriate for age
  - [ ] Adjust complexity dynamically
  - [ ] Compare explanations side-by-side
  - [ ] Test with actual kids at target ages

#### AI Safety Guardrails
- [ ] **Task**: Ensure safe AI interactions
  - [ ] No open-ended chat interface
  - [ ] All AI actions are predefined
  - [ ] Input validation and sanitization
  - [ ] Output content filtering
  - [ ] Length limits on modifications
  - [ ] Inappropriate content detection
  - [ ] Fallback responses for failures
  - [ ] Parent dashboard to review AI usage
  - [ ] Disable AI per profile option
  - [ ] Age-gate advanced features

**Files to Create/Modify**:
- [ ] `src/app/api/ai/story/modify/route.ts` (NEW)
- [ ] `src/app/api/ai/story/question/route.ts` (NEW)
- [ ] `src/components/StoryCustomizer.tsx` (NEW)
- [ ] `src/components/StoryQuestions.tsx` (NEW)
- [ ] `src/components/AgeExplainer.tsx` (NEW)
- [ ] `src/lib/ai-safety-filters.ts` (NEW)
- [ ] `src/lib/story-modifier.ts` (NEW)
- [ ] `db/schema.ts` (ADD modifiedStories, questions tables)

---

### 3.4 Monetization Experiments
**Location**: `src/app/pricing/`, `src/app/api/subscriptions/`

#### Premium Tier Definition
- [ ] **Task**: Define free vs premium features
  - [ ] **Free Tier**:
    - [ ] Browse all books
    - [ ] Read EPUBs unlimited
    - [ ] Basic reading stats
    - [ ] 3 audio chapters/day
    - [ ] 5 AI summaries/day
    - [ ] 3 StoryPaths
  - [ ] **Premium Tier**:
    - [ ] Unlimited audio narration
    - [ ] All StoryPaths library
    - [ ] Unlimited AI features
    - [ ] Advanced reading stats
    - [ ] Multi-device sync
    - [ ] Download all books
    - [ ] Parent dashboard
    - [ ] Priority support
  - [ ] Document feature matrix

#### Pricing Strategy
- [ ] **Task**: Set pricing structure
  - [ ] Research competitor pricing
  - [ ] Set price points:
    - [ ] Monthly: $4.99-$7.99
    - [ ] Annual: $49.99-$79.99 (save 20-30%)
    - [ ] Family plan: +$2/month per extra profile
  - [ ] 14-day free trial
  - [ ] Cancel anytime
  - [ ] Consider educational discounts

#### Payment Integration
- [ ] **Task**: Implement subscription system
  - [ ] Choose payment provider (Stripe recommended)
  - [ ] Set up Stripe account
  - [ ] Create subscription products
  - [ ] Implement Stripe Checkout
  - [ ] Create `/api/subscriptions/create` endpoint
  - [ ] Handle webhook events:
    - [ ] Payment succeeded
    - [ ] Subscription updated
    - [ ] Subscription cancelled
  - [ ] Update user subscription status in DB
  - [ ] Add `subscriptions` table:
    ```typescript
    {
      id, userId, stripeSubscriptionId,
      status, tier, startDate, endDate,
      cancelAtPeriodEnd
    }
    ```
  - [ ] Test full payment flow in test mode

#### Premium Feature Gating
- [ ] **Task**: Implement feature access control
  - [ ] Create middleware to check subscription
  - [ ] Show "Upgrade to Premium" prompts
  - [ ] Soft paywalls (preview then gate)
  - [ ] Usage counters for free tier
  - [ ] Disable premium features gracefully
  - [ ] Clear value communication
  - [ ] Test free → premium flow

#### In-App Marketing
- [ ] **Task**: Promote premium features
  - [ ] Create pricing page
  - [ ] Feature comparison table
  - [ ] Testimonials (after beta)
  - [ ] "Upgrade" button in Navigation
  - [ ] Premium badge on features
  - [ ] Trial ending notifications
  - [ ] Cancellation flow with retention offers

**Files to Create/Modify**:
- [ ] `src/app/pricing/page.tsx` (NEW)
- [ ] `src/app/api/subscriptions/create/route.ts` (NEW)
- [ ] `src/app/api/subscriptions/webhook/route.ts` (NEW)
- [ ] `src/app/api/subscriptions/manage/route.ts` (NEW)
- [ ] `src/lib/stripe-client.ts` (NEW)
- [ ] `src/lib/subscription-utils.ts` (NEW)
- [ ] `src/middleware/subscription-check.ts` (NEW)
- [ ] `src/components/UpgradePrompt.tsx` (NEW)
- [ ] `src/components/PricingTable.tsx` (NEW)
- [ ] `db/schema.ts` (ADD subscriptions table)

---

### 3.5 Testing & Iteration

#### A/B Testing Setup
- [ ] **Task**: Test conversion and engagement
  - [ ] Test pricing page variants
  - [ ] Test trial length (7 vs 14 days)
  - [ ] Test feature messaging
  - [ ] Track conversion rates
  - [ ] Analyze churn reasons

#### User Feedback Collection
- [ ] **Task**: Gather qualitative feedback
  - [ ] Post-trial survey
  - [ ] Cancellation survey
  - [ ] Feature request voting
  - [ ] User interviews
  - [ ] Support ticket analysis

---

## 📋 Phase 4 – Go Live v1.0 (Production)
**Goal**: Production-ready, polished product ready for full market launch with compliance, scalability, and growth.

**Timeline**: 8-10 weeks  
**Status**: 🔴 Not Started

### Product Objectives
- [ ] Production-ready reliability and security
- [ ] GDPR and privacy compliance
- [ ] Clear subscription offering
- [ ] Strong app store presence
- [ ] Sustainable growth loops

---

### 4.1 Production Hardening & Compliance
**Location**: `src/app/api/`, `infrastructure/`

#### Architecture Migration
- [ ] **Task**: Move to production infrastructure
  - [ ] Migrate from local SQLite to managed database:
    - [ ] Option 1: Postgres on Railway/Render
    - [ ] Option 2: PlanetScale (MySQL)
    - [ ] Option 3: Supabase (Postgres + Auth)
  - [ ] Update database connection code
  - [ ] Migrate all tables and data
  - [ ] Keep local SQLite for dev environment
  - [ ] Set up staging environment
  - [ ] Configure connection pooling
  - [ ] Database backups (daily)
  - [ ] Point-in-time recovery setup

#### Background Workers
- [ ] **Task**: Implement job queue system
  - [ ] Choose queue system (BullMQ, pg-boss, Inngest)
  - [ ] Set up Redis if needed
  - [ ] Create workers for:
    - [ ] Audio file generation
    - [ ] Cache cleanup/maintenance
    - [ ] Email sending
    - [ ] Analytics aggregation
    - [ ] Database maintenance
  - [ ] Implement retry logic
  - [ ] Add worker monitoring
  - [ ] Set up dead letter queue
  - [ ] Test worker failures and recovery

#### GDPR Compliance
- [ ] **Task**: Implement data privacy regulations
  - [ ] Create privacy policy
  - [ ] Create terms of service
  - [ ] Add cookie consent banner
  - [ ] Implement data export (DSR):
    - [ ] User can download all their data
    - [ ] JSON format with all tables
    - [ ] Include reading history, favorites, etc.
  - [ ] Implement data deletion (Right to be forgotten):
    - [ ] Full account deletion endpoint
    - [ ] Cascade delete all user data
    - [ ] Keep minimal records for accounting
  - [ ] Parental consent for children <13 (COPPA)
  - [ ] Age verification on signup
  - [ ] Data Processing Agreement with AI providers
  - [ ] Data retention policies (auto-delete after X years)
  - [ ] Audit logs for compliance

#### Security Hardening
- [ ] **Task**: Implement security best practices
  - [ ] Add rate limiting on all API endpoints
  - [ ] Implement CSRF protection
  - [ ] Add input sanitization everywhere
  - [ ] Use parameterized SQL queries (Drizzle handles this)
  - [ ] Add Content Security Policy headers
  - [ ] Enable HTTPS only (HSTS)
  - [ ] Secure cookie settings
  - [ ] API authentication with JWT tokens
  - [ ] Implement password hashing (bcrypt/argon2)
  - [ ] Add 2FA for accounts (optional)
  - [ ] Security headers (helmet.js)
  - [ ] Vulnerability scanning (Snyk, Dependabot)
  - [ ] Penetration testing

#### Observability
- [ ] **Task**: Implement monitoring and logging
  - [ ] Choose logging service (Datadog, LogRocket, Sentry)
  - [ ] Implement error tracking:
    - [ ] Frontend errors
    - [ ] API errors
    - [ ] Worker failures
  - [ ] Add performance monitoring (APM):
    - [ ] API response times
    - [ ] Database query times
    - [ ] Page load times
  - [ ] Set up alerts:
    - [ ] High error rate
    - [ ] Slow API responses
    - [ ] Failed audio generation
    - [ ] Database connection issues
  - [ ] Create status page (StatusPage.io or self-hosted)
  - [ ] Set up uptime monitoring (UptimeRobot)

**Files to Create/Modify**:
- [ ] `src/lib/db-connection.ts` (MODIFY for production DB)
- [ ] `src/middleware/rate-limit.ts` (NEW)
- [ ] `src/middleware/auth.ts` (NEW)
- [ ] `src/middleware/security-headers.ts` (NEW)
- [ ] `workers/audio-generator.ts` (MODIFY)
- [ ] `workers/cache-maintenance.ts` (NEW)
- [ ] `src/app/api/user/export/route.ts` (NEW - GDPR export)
- [ ] `src/app/api/user/delete/route.ts` (NEW - GDPR deletion)
- [ ] `src/lib/logger.ts` (NEW)
- [ ] `src/lib/error-tracker.ts` (NEW)
- [ ] `docs/PRIVACY_POLICY.md` (NEW)
- [ ] `docs/TERMS_OF_SERVICE.md` (NEW)

---

### 4.2 Polished UX & Accessibility
**Location**: `src/components/`, `src/app/`

#### Accessibility Audit & Fixes
- [ ] **Task**: WCAG 2.1 AA compliance
  - [ ] Run accessibility audit (axe DevTools, Lighthouse)
  - [ ] Fix all critical issues:
    - [ ] Add ARIA labels to all interactive elements
    - [ ] Proper heading hierarchy (h1 → h2 → h3)
    - [ ] Alt text for all images
    - [ ] Focus indicators on all focusable elements
    - [ ] Keyboard navigation for all features
    - [ ] Skip to main content link
    - [ ] Color contrast ratio ≥ 4.5:1
  - [ ] Test with screen readers:
    - [ ] NVDA (Windows)
    - [ ] JAWS (Windows)
    - [ ] VoiceOver (Mac/iOS)
  - [ ] Add high contrast theme option
  - [ ] Test with keyboard only (no mouse)

#### Dyslexia-Friendly Features
- [ ] **Task**: Support readers with dyslexia
  - [ ] Add OpenDyslexic font option
  - [ ] Increase line spacing option (1.5x, 2x)
  - [ ] Increase letter spacing option
  - [ ] Increase word spacing option
  - [ ] Add reading ruler (highlight current line)
  - [ ] Add reading mask (dim other text)
  - [ ] Test with dyslexic users

#### Onboarding Polish
- [ ] **Task**: Create compelling first experience
  - [ ] Redesign onboarding flow based on feedback
  - [ ] Add animations and illustrations
  - [ ] Reduce steps if possible (3 max)
  - [ ] Show value immediately
  - [ ] Add tutorial tooltips for key features
  - [ ] Create video walkthrough
  - [ ] A/B test onboarding variants

#### Localization (i18n)
- [ ] **Task**: Multi-language support
  - [ ] Set up i18n framework (next-i18next)
  - [ ] Extract all UI strings to translation files
  - [ ] Translate to priority languages:
    - [ ] English (default)
    - [ ] German/Deutsch
    - [ ] Spanish/Español
    - [ ] French/Français
  - [ ] Use professional translators
  - [ ] Add language selector
  - [ ] Persist language preference
  - [ ] Test RTL languages (future: Arabic, Hebrew)
  - [ ] Localize date/time formats
  - [ ] Currency localization for pricing

#### Curated Language Shelves
- [ ] **Task**: Curate books by language
  - [ ] Create "German Classics" collection
  - [ ] Create "French Stories" collection
  - [ ] Create "Spanish Tales" collection
  - [ ] Language-specific homepage
  - [ ] Filter catalog by language
  - [ ] Show language badges on books

**Files to Create/Modify**:
- [ ] `src/lib/i18n-config.ts` (NEW)
- [ ] `public/locales/en/*.json` (NEW)
- [ ] `public/locales/de/*.json` (NEW)
- [ ] `public/locales/es/*.json` (NEW)
- [ ] `public/locales/fr/*.json` (NEW)
- [ ] `src/components/LanguageSelector.tsx` (NEW)
- [ ] `src/components/DyslexiaSettings.tsx` (NEW)
- [ ] All components (MODIFY for i18n)

---

### 4.3 Growth Loops & Distribution
**Location**: `src/app/`, `public/`, `marketing/`

#### SEO Optimization
- [ ] **Task**: Optimize for search engines
  - [ ] Add metadata to all pages
  - [ ] Generate sitemap.xml
  - [ ] Add robots.txt
  - [ ] Implement structured data (Schema.org):
    - [ ] Book schema
    - [ ] Organization schema
    - [ ] BreadcrumbList
  - [ ] Create public book landing pages:
    - [ ] `/books/[slug]` with static metadata
    - [ ] SSG for popular books
    - [ ] "Read online free" CTA
  - [ ] Optimize images (WebP, lazy loading)
  - [ ] Core Web Vitals optimization:
    - [ ] LCP < 2.5s
    - [ ] FID < 100ms
    - [ ] CLS < 0.1
  - [ ] Submit to Google Search Console
  - [ ] Create Google Business Profile

#### Mobile Apps
- [ ] **Task**: Package for app stores
  - [ ] **Option A: TWA (Trusted Web Activity)**
    - [ ] Create Android TWA wrapper
    - [ ] Add PWA manifest with all icons
    - [ ] Create Play Store listing
    - [ ] Screenshots for all device sizes
    - [ ] App description and keywords
    - [ ] Submit for review
  - [ ] **Option B: React Native/Capacitor**
    - [ ] Set up Capacitor project
    - [ ] Test all features in native wrapper
    - [ ] Add native features (notifications, etc.)
    - [ ] Build iOS version
    - [ ] Create App Store listing
    - [ ] Submit to both stores
  - [ ] App Store Optimization (ASO)
  - [ ] Localized store listings

#### Landing Page
- [ ] **Task**: Create marketing website
  - [ ] Design compelling hero section
  - [ ] Showcase key features with screenshots
  - [ ] Add testimonials from beta users
  - [ ] Clear CTA: "Start Reading Free"
  - [ ] Pricing section
  - [ ] FAQ section
  - [ ] Press kit / media assets
  - [ ] Blog for content marketing
  - [ ] Optimize landing page conversion

#### Referral Program
- [ ] **Task**: Implement viral growth loop
  - [ ] Generate unique referral links per user
  - [ ] Track referral signups
  - [ ] Reward system:
    - [ ] Referrer: 1 week premium free
    - [ ] Referee: 1 week premium free
  - [ ] Create shareable cards:
    - [ ] "I've read X books on TaleTime"
    - [ ] Reading stats image
  - [ ] Social sharing buttons
  - [ ] Email invites
  - [ ] Track referral metrics

#### Content Marketing
- [ ] **Task**: Create content for discovery
  - [ ] Blog posts:
    - [ ] "Best Classic Children's Books"
    - [ ] "How to Get Kids to Read More"
    - [ ] "Bedtime Reading Routines"
  - [ ] Guest posts on parenting blogs
  - [ ] Social media presence:
    - [ ] Instagram: book recommendations
    - [ ] Twitter: reading tips
    - [ ] Facebook: parent community
  - [ ] Email newsletter
  - [ ] YouTube: app tutorials

**Files to Create/Modify**:
- [ ] `src/app/books/[slug]/page.tsx` (NEW - public book pages)
- [ ] `src/app/blog/page.tsx` (NEW)
- [ ] `src/app/blog/[slug]/page.tsx` (NEW)
- [ ] `public/sitemap.xml` (NEW)
- [ ] `public/robots.txt` (NEW)
- [ ] `src/app/api/referral/route.ts` (NEW)
- [ ] `src/components/ShareCard.tsx` (NEW)
- [ ] `src/components/ReferralLink.tsx` (NEW)
- [ ] `marketing/landing-page/` (NEW)
- [ ] `marketing/press-kit/` (NEW)

---

### 4.4 Business & Pricing

#### Launch Pricing
- [ ] **Task**: Finalize pricing strategy
  - [ ] **Free Tier (Keep forever)**:
    - [ ] Unlimited reading
    - [ ] Basic reader features
    - [ ] Limited premium features
  - [ ] **Premium Family ($6.99/month or $59.99/year)**:
    - [ ] Everything in free
    - [ ] Unlimited audio
    - [ ] All interactive stories
    - [ ] Unlimited AI features
    - [ ] Up to 5 family profiles
    - [ ] Cross-device sync
  - [ ] **Lifetime Deal (Launch special: $149)**
    - [ ] Limited time offer
    - [ ] Creates early adopter community

#### KPI Dashboard
- [ ] **Task**: Track business metrics
  - [ ] Build admin dashboard
  - [ ] Track key metrics:
    - [ ] **Activation**: % users who read 10+ min in first 3 days
    - [ ] **Retention**: D7, D30 retention rates
    - [ ] **Engagement**: Weekly reading minutes per user
    - [ ] **Conversion**: Free → Premium rate
    - [ ] **Revenue**: MRR, ARR, LTV
    - [ ] **Churn**: Monthly churn rate
    - [ ] **Growth**: New signups per day
  - [ ] Set up weekly metrics email
  - [ ] Create public metrics page (optional)

#### Customer Support
- [ ] **Task**: Set up support system
  - [ ] Choose support tool (Intercom, Zendesk, or email)
  - [ ] Create help center / FAQ
  - [ ] Write support documentation
  - [ ] Set up support email (help@taletime.app)
  - [ ] Create canned responses
  - [ ] Set SLA for response times
  - [ ] Train support team (if hiring)

**Files to Create**:
- [ ] `src/app/admin/metrics/page.tsx` (NEW)
- [ ] `src/app/help/page.tsx` (NEW)
- [ ] `src/lib/metrics-tracker.ts` (NEW)
- [ ] `docs/SUPPORT_GUIDE.md` (NEW)

---

### 4.5 Launch Checklist

#### Pre-Launch
- [ ] All Phase 4 features complete
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Legal documents finalized
- [ ] Payment system tested
- [ ] Beta user feedback incorporated
- [ ] App store submissions approved
- [ ] Marketing materials ready
- [ ] Press outreach prepared
- [ ] Support system ready
- [ ] Monitoring and alerts active

#### Launch Day
- [ ] Deploy to production
- [ ] Verify all systems operational
- [ ] Send launch email to beta users
- [ ] Post on social media
- [ ] Submit to Product Hunt
- [ ] Submit to Hacker News (Show HN)
- [ ] Post in relevant communities
- [ ] Monitor metrics closely
- [ ] Be ready for support requests

#### Post-Launch
- [ ] Daily metric reviews (first week)
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Iterate on onboarding based on data
- [ ] Continue content marketing
- [ ] Plan v1.1 features
- [ ] Celebrate! 🎉

---

## 📊 Success Metrics by Phase

### Phase 1 Success Criteria
- [ ] 20+ books downloaded by test users
- [ ] Average session duration > 10 minutes
- [ ] 90%+ offline mode success rate
- [ ] <2s load time for book catalog
- [ ] Zero critical bugs

### Phase 2 Success Criteria
- [ ] 50+ beta users actively using app
- [ ] 40%+ weekly retention rate
- [ ] 3+ favorites per active user
- [ ] 5+ books in average reading history
- [ ] Adaptive WPM accepted by 30%+ users

### Phase 3 Success Criteria
- [ ] 10+ hours of audio content generated
- [ ] 5+ interactive StoryPaths available
- [ ] 10%+ trial → paid conversion
- [ ] 20+ paying subscribers
- [ ] 4+ star average rating

### Phase 4 Success Criteria
- [ ] 1000+ registered users in first month
- [ ] 60%+ D7 retention rate
- [ ] $1000+ MRR within 3 months
- [ ] <5% monthly churn
- [ ] 4.5+ star rating in app stores
- [ ] Featured in app store (stretch goal)

---

## 🛠️ AI Agent Implementation Tips

### For Each Task:
1. **Read Context**: Review related files before making changes
2. **Check Dependencies**: Ensure required features/files exist
3. **Test Incrementally**: Test each feature as it's built
4. **Document Changes**: Update relevant docs
5. **Error Handling**: Add proper error handling for all edge cases
6. **User Feedback**: Add loading states, error messages, success confirmations
7. **Responsive Design**: Test on mobile, tablet, desktop
8. **Accessibility**: Add ARIA labels, keyboard navigation
9. **Performance**: Optimize queries, add caching where appropriate
10. **Security**: Validate inputs, sanitize outputs, check permissions

### Code Quality Checklist:
- [ ] TypeScript types defined
- [ ] Error boundaries added
- [ ] Loading states shown
- [ ] Empty states handled
- [ ] Success/error messages displayed
- [ ] Responsive CSS
- [ ] Accessibility attributes
- [ ] Code commented where complex
- [ ] No console.logs in production
- [ ] Environment variables used for secrets

---

## 📚 Resources

### Documentation to Create:
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Component library documentation (Storybook)
- [ ] User guide
- [ ] Developer setup guide
- [ ] Deployment guide
- [ ] Troubleshooting guide

### External Dependencies to Research:
- [ ] AI providers (OpenAI, Anthropic, Cohere)
- [ ] TTS providers (Google, Amazon, Microsoft, ElevenLabs)
- [ ] Payment processor (Stripe)
- [ ] Analytics (Plausible, Fathom)
- [ ] Error tracking (Sentry)
- [ ] Email service (SendGrid, Postmark)
- [ ] Cloud storage (S3, Cloudflare R2)
- [ ] CDN (Cloudflare, Fastly)

---

**Last Updated**: November 17, 2025  
**Version**: 1.0  
**Status**: Ready for AI Agent Implementation

**Next Step**: Begin with Phase 1, Task 1.1 - Catalog Enhancement
