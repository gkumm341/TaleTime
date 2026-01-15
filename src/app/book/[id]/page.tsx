'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ePub, { Book, Rendition } from 'epubjs';
import { get, set } from 'idb-keyval';
import { ReadingStats } from '@/components/ReadingStats';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import './epub-styles.css';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  List, 
  Sun, 
  Moon,
  ZoomIn,
  ZoomOut,
  BookOpen,
  BarChart3
} from 'lucide-react';
import {
  startReadingSession,
  endReadingSession,
  saveSessionToStorage,
  getReadingStats,
  estimateTimeToFinish,
  updateReadingHistory,
  type ReadingSession,
} from '@/lib/reading-tracker';

interface NavItem {
  label: string;
  href: string;
  subitems?: NavItem[];
}

export default function BookReader() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { preferences } = usePreferences();
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [title, setTitle] = useState('Loading...');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [fontSize, setFontSize] = useState(100);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0: cover, 1: title, 2: toc, 3+: book content
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isInCustomPages, setIsInCustomPages] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Reading tracker state
  const [showStats, setShowStats] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [totalWords, setTotalWords] = useState<number | undefined>();
  const [wordsRemaining, setWordsRemaining] = useState<number | undefined>();
  const [minutesRemaining, setMinutesRemaining] = useState<number | undefined>();
  const [readingWpm, setReadingWpm] = useState(160);
  const [totalReadTime, setTotalReadTime] = useState(0);
  const currentSessionRef = useRef<ReadingSession | null>(null);

  // Apply preferences on load
  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      setFontSize(preferences.fontSize);
      setShowStats(preferences.showReadingStats);
      setReadingWpm(preferences.defaultWpm);
    }
  }, [preferences]);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('� Book reader useEffect triggered for book ID:', id);
    let mounted = true;
    let resizeHandler: (() => void) | null = null;

    const loadBook = async () => {
      // Give a brief moment for the ref to attach
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (!viewerRef.current) {
        console.error('Viewer ref is null - this should not happen!');
        setError('Failed to initialize book viewer');
        setLoading(false);
        return;
      }

      try {
        console.log('Starting book load for ID:', id);
        setLoading(true);
        
        // Fetch book metadata from local database (fast!)
        console.log('Fetching metadata from /api/catalog...');
        const metaRes = await fetch(`/api/catalog?bookId=${id}`);
        if (!metaRes.ok) {
          throw new Error(`Failed to fetch book metadata: ${metaRes.status}`);
        }
        
        const data = await metaRes.json();
        console.log('Metadata received:', data);
        if (!mounted) return;
        
        const meta = data.results?.[0];
        if (!meta) {
          throw new Error('Book not found in database');
        }
        
        console.log('Book found:', meta.title);
        setTitle(meta.title);
        setAuthor(meta.authors || 'Unknown');
        
        // Set total words for progress tracking
        if (meta.words) {
          setTotalWords(meta.words);
        }
        
        // Load reading stats
        const stats = getReadingStats(parseInt(id));
        console.log('📊 Reading stats loaded:', stats);
        setTotalReadTime(stats.totalTimeMinutes);
        setReadingWpm(stats.averageWpm);
        
        // Set cover image from metadata
        if (meta.coverUrl) {
          setCoverImage(meta.coverUrl);
        }

        const epubUrl = meta.epubUrl;
        if (!epubUrl) {
          throw new Error('EPUB format not available for this book');
        }

        console.log('EPUB URL:', epubUrl);

        // Try to load from IndexedDB cache
        let blob: Blob | undefined = await get(`epub:${id}`);
        
        if (!blob) {
          console.log('Downloading EPUB...');
          setDownloadProgress(0);
          
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(epubUrl)}`;
          const res = await fetch(proxyUrl);
          
          if (!res.ok) {
            throw new Error(`Failed to fetch EPUB: ${res.status}`);
          }
          
          // Get total size for progress tracking
          const contentLength = res.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          
          // Read the response body with progress tracking
          const reader = res.body?.getReader();
          const chunks: Uint8Array[] = [];
          let receivedLength = 0;
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              chunks.push(value);
              receivedLength += value.length;
              
              if (total > 0) {
                const progress = (receivedLength / total) * 100;
                setDownloadProgress(Math.round(progress));
              }
            }
            
            // Combine chunks into blob
            blob = new Blob(chunks as BlobPart[]);
          } else {
            blob = await res.blob();
          }
          
          // Cache for next time
          setDownloadProgress(100);
          await set(`epub:${id}`, blob);
          console.log('EPUB cached to IndexedDB');
        } else {
          console.log('Loaded EPUB from IndexedDB cache');
        }

        if (!mounted) return;

        // Create object URL for epub.js
        console.log('Creating blob URL and initializing ePub...');
        const url = URL.createObjectURL(blob);
        console.log('Blob URL created:', url);
        
        // Initialize epub.js with the blob URL and openAs option
        const book = ePub(url, { openAs: 'epub' });
        bookRef.current = book;
        console.log('ePub instance created');

        // Open and load the book
        console.log('Opening book...');
        await book.opened;
        console.log('Book opened!');
        
        console.log('Waiting for book.ready...');
        await book.ready;
        console.log('Book ready!');
        
        if (!mounted) return;

        // Generate locations for cumulative progress tracking
        console.log('Generating locations for progress tracking...');
        await book.locations.generate(1024); // Generate locations with 1024 characters per page
        console.log('Locations generated:', book.locations.length());

        // Get table of contents
        const navigation = await book.loaded.navigation;
        if (navigation && navigation.toc) {
          setToc(navigation.toc as NavItem[]);
        }

        // Determine spread mode based on screen size
        const getSpreadMode = () => {
          if (typeof window === 'undefined') return 'none';
          const width = window.innerWidth;
          // Desktop and tablet: two pages side by side
          // Mobile: single page
          return width >= 768 ? 'auto' : 'none';
        };

        // Render the book (hidden initially)
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: 'calc(100vh - 140px)',
          spread: getSpreadMode(),
          minSpreadWidth: 768,
          flow: 'paginated',
        });
        renditionRef.current = rendition;

        // Handle window resize to adjust spread mode
        const handleResize = () => {
          if (renditionRef.current) {
            const newSpread = getSpreadMode();
            renditionRef.current.spread(newSpread);
          }
        };
        resizeHandler = handleResize;
        window.addEventListener('resize', handleResize);

        // Apply theme
        applyTheme(rendition, theme);

        // Hook to clean Project Gutenberg references from rendered content
        rendition.hooks.content.register((contents: any) => {
          const doc = contents.document;
          if (doc) {
            const nodesToRemove: any[] = [];
            
            // Remove elements containing Project Gutenberg text
            const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const text = node.textContent || '';
              
              // Look for common PG boilerplate patterns
              if (
                /project gutenberg/i.test(text) ||
                /gutenberg™/i.test(text) ||
                /gutenberg license/i.test(text) ||
                /end of.*project gutenberg/i.test(text) ||
                /produced by/i.test(text) && text.length < 200 ||
                /transcriber.*note/i.test(text) ||
                /\*\*\*\s*START OF/i.test(text) ||
                /\*\*\*\s*END OF/i.test(text)
              ) {
                let parent = node.parentElement;
                if (parent) {
                  nodesToRemove.push(parent);
                }
              }
            }
            
            // Remove marked elements
            nodesToRemove.forEach(node => {
              try {
                if (node && node.parentElement) {
                  node.parentElement.removeChild(node);
                }
              } catch (e) {
                // Ignore removal errors
              }
            });
          }
        });

        // Restore last reading position or start at first chapter
        const lastCfi = await get<string>(`cfi:${id}`);
        
        // Always go straight to book content
        setIsInCustomPages(false);
        setCurrentPage(3);
        
        if (lastCfi) {
          // Resume from where they left off
          await rendition.display(lastCfi);
        } else {
          // First time reading - skip to Chapter 1 if available
          if (navigation && navigation.toc && navigation.toc.length > 0) {
            // Find the first chapter (skip preface, introduction, etc.)
            const firstChapter = navigation.toc.find((item: any) => 
              /chapter\s+(?:i\b|1\b|one\b)/i.test(item.label)
            ) || navigation.toc[0]; // Fallback to first TOC item
            
            console.log('Starting at first chapter:', firstChapter?.label);
            await rendition.display(firstChapter.href);
          } else {
            // No TOC available, start at beginning
            await rendition.display();
          }
        }

        // Save position on navigation (only when in book content)
        rendition.on('relocated', (location: any) => {
          console.log('🔄 Relocated event fired:', location);
          
          if (location && location.start) {
            const cfi = location.start.cfi;
            set(`cfi:${id}`, cfi);
            
            // Calculate cumulative progress across the entire book
            let percent = 0;
            
            // Use epub.js locations to get book-wide progress
            if (bookRef.current && location.start.location !== undefined) {
              const locations = bookRef.current.locations;
              if (locations && locations.length() > 0) {
                const currentLocation = location.start.location;
                const totalLocations = locations.length();
                percent = (currentLocation / totalLocations) * 100;
                setProgressPercent(percent);
                console.log('📈 Cumulative progress from locations:', percent.toFixed(2) + '%', `(${currentLocation}/${totalLocations})`);
              }
            }
            
            // Fallback to percentage API if locations not available
            if (percent === 0 && location.start.percentage !== undefined) {
              percent = location.start.percentage * 100;
              setProgressPercent(percent);
              console.log('📈 Progress from percentage:', percent.toFixed(2) + '%');
            }
            
            // Update page display (chapter-relative page numbers for user)
            if (location.start.displayed && location.start.displayed.page && location.start.displayed.total) {
              const currentPage = location.start.displayed.page;
              const totalPages = location.start.displayed.total;
              setCurrentLocation(`${currentPage} of ${totalPages}`);
            }
            
            console.log('📍 Relocated details:', {
              cfi,
              percentage: location.start.percentage,
              page: location.start.displayed?.page,
              total: location.start.displayed?.total,
              calculatedPercent: percent,
            });
              
            // Update current session with new position
            if (currentSessionRef.current) {
              currentSessionRef.current.endCfi = cfi;
              currentSessionRef.current.endTime = Date.now();
              const durationSeconds = Math.round((currentSessionRef.current.endTime - currentSessionRef.current.startTime) / 1000);
              console.log('✏️ Updated session:', {
                duration: durationSeconds + 's',
                startCfi: currentSessionRef.current.startCfi,
                endCfi: cfi,
              });
              
              // Periodically save the session (every page turn)
              const sessionCopy = { ...currentSessionRef.current };
              saveSessionToStorage(sessionCopy);
              console.log('💾 Session saved to storage');
              
              // Recalculate stats from all sessions
              const updatedStats = getReadingStats(parseInt(id));
              console.log('📊 Stats recalculated:', updatedStats);
              setTotalReadTime(updatedStats.totalTimeMinutes);
              setReadingWpm(updatedStats.averageWpm);
              
              // Update reading history in database
              if (percent > 0) {
                updateReadingHistory(
                  parseInt(id),
                  cfi,
                  Math.round(percent),
                ).catch(err => console.error('Failed to update history:', err));
              }
            }
            
            // Calculate time remaining with current stats
            if (totalWords && readingWpm && percent > 0) {
              const remaining = estimateTimeToFinish(percent, totalWords, readingWpm);
              setMinutesRemaining(remaining);
              setWordsRemaining(Math.round(totalWords * (100 - percent) / 100));
              console.log(`⏱️ Time remaining: ${remaining} minutes (${readingWpm} WPM, ${totalWords} words)`);
            } else {
              console.log('⚠️ Cannot calculate time: totalWords =', totalWords, 'readingWpm =', readingWpm);
            }
            
            // Start a new session if not already tracking
            if (!currentSessionRef.current) {
              console.log('🆕 Starting new reading session');
              currentSessionRef.current = startReadingSession(parseInt(id), cfi);
            }
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading book:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load book');
          setLoading(false);
        }
      }
    };

    console.log('📖 Calling loadBook()...');
    loadBook();

    // Cleanup and save session
    return () => {
      mounted = false;
      
      // Remove resize listener
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      
      // Save current reading session
      if (currentSessionRef.current) {
        const completedSession = endReadingSession(currentSessionRef.current);
        saveSessionToStorage(completedSession);
        currentSessionRef.current = null;
      }
      
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [id]);

  const applyTheme = (rendition: Rendition, themeName: 'light' | 'sepia' | 'dark') => {
    const themes = {
      light: {
        body: {
          background: '#fafafa',
          color: '#212121',
        },
      },
      sepia: {
        body: {
          background: '#f5ead6',
          color: '#4a4034',
        },
      },
      dark: {
        body: {
          background: '#1e1e1e',
          color: '#e0e0e0',
        },
      },
    };

    rendition.themes.default(themes[themeName]);
    
    // Apply font preferences - ReadEra style with Literata (Bookerly-like font)
    const fontFamily = preferences.fontFamily === 'serif' 
      ? 'Literata, Georgia, Palatino, "Book Antiqua", serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    
    rendition.themes.default({
      '*': {
        'font-family': `${fontFamily} !important`,
      },
      'body': {
        'font-family': `${fontFamily} !important`,
        'line-height': '1.8 !important',
        'padding': `3rem 6% !important`,
        'font-size': '1.15rem !important',
        'max-width': '100% !important',
        'margin': '0 auto !important',
      },
      'p': {
        'text-align': 'justify !important',
        'font-family': `${fontFamily} !important`,
        'margin-bottom': '1.5em !important',
        'margin-top': '0 !important',
        'line-height': '1.8 !important',
        'text-indent': '2em !important',
        'hyphens': 'auto !important',
        'word-spacing': '0.05em !important',
      },
      'p:first-of-type, h1 + p, h2 + p, h3 + p': {
        'text-indent': '0 !important',
      },
      'div': {
        'text-align': 'justify !important',
        'font-family': `${fontFamily} !important`,
        'line-height': '1.8 !important',
      },
      'section': {
        'font-family': `${fontFamily} !important`,
      },
      'h1, h2, h3, h4, h5, h6': {
        'text-align': 'left !important',
        'margin-top': '2.5em !important',
        'margin-bottom': '1em !important',
        'line-height': '1.3 !important',
        'font-weight': '600 !important',
        'font-family': `${fontFamily} !important`,
      },
      'h1': {
        'font-size': '1.8em !important',
        'text-align': 'center !important',
      },
      'h2': {
        'font-size': '1.5em !important',
      },
      'blockquote': {
        'margin': '1.5em 2em !important',
        'font-style': 'italic !important',
      },
      'em, i': {
        'font-style': 'italic !important',
      },
      'strong, b': {
        'font-weight': '600 !important',
      },
      // Hide common Project Gutenberg boilerplate sections
      '.pgheader, .pglegal, .pgfooter': {
        'display': 'none !important',
      },
      // Hide paragraphs that are likely PG boilerplate
      'p[style*="text-align: center"]': {
        'font-size': 'inherit !important',
      }
    });
    
    // Apply font size
    rendition.themes.fontSize(`${fontSize}%`);
  };

  const changeTheme = (newTheme: 'light' | 'sepia' | 'dark') => {
    setTheme(newTheme);
    if (renditionRef.current) {
      applyTheme(renditionRef.current, newTheme);
    }
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(80, Math.min(150, fontSize + delta));
    setFontSize(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`);
    }
  };

  const goToPrevPage = () => {
    if (isInCustomPages) {
      if (currentPage > 0) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        set(`page:${id}`, newPage);
      }
    } else {
      renditionRef.current?.prev();
    }
  };

  const goToNextPage = async () => {
    if (isInCustomPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      set(`page:${id}`, newPage);
      
      // Transition from TOC (page 2) to book content (page 3)
      if (newPage === 3) {
        setIsInCustomPages(false);
        // Start at the beginning of the book
        if (renditionRef.current) {
          await renditionRef.current.display();
        }
      }
    } else {
      renditionRef.current?.next();
    }
  };

  const goToChapter = async (href: string) => {
    if (renditionRef.current) {
      // Navigate to chapter and exit custom pages
      setIsInCustomPages(false);
      setCurrentPage(3);
      await renditionRef.current.display(href);
      setShowToc(false);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-6 max-w-md mx-auto p-8">
            <BookOpen className="w-16 h-16 mx-auto text-blue-600 animate-pulse" />
            <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              {downloadProgress > 0 && downloadProgress < 100 
                ? `Downloading book... ${downloadProgress}%`
                : 'Loading book...'}
            </div>
            {downloadProgress > 0 && downloadProgress < 100 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-[#6BA8A9] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {title !== 'Loading...' && title}
            </div>
            {downloadProgress === 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                First-time downloads may take a moment. The book will be cached for instant access next time.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md">
            <div className="text-red-600 text-xl font-semibold">Error Loading Book</div>
            <div className="text-gray-600 dark:text-gray-400">{error}</div>
            <Button onClick={() => router.push('/')} className="mt-4">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - Always rendered so viewerRef can attach */}
      <div className={`min-h-screen bg-white dark:bg-gray-900 ${loading || error ? 'invisible' : ''}`}>
        <div className="max-w-full mx-auto">
          {/* Combined Header with Navigation and Controls */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 sticky top-0 z-50">
            <div className="flex items-center justify-between gap-3 max-w-[1920px] mx-auto">
              {/* Left: Logo and Navigation */}
              <div className="flex items-center gap-3 relative">
                <div className="flex items-center">
                  <Button
                    onClick={() => router.push('/')}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-2.5 py-1.5"
                  >
                    <BookOpen className="w-4 h-4 text-[#6BA8A9]" />
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">TaleTime</span>
                  </Button>
                  <Button
                    onClick={() => setShowMenu(!showMenu)}
                    variant="ghost"
                    size="sm"
                    className="px-1.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Menu"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-90' : ''}`} />
                  </Button>
                </div>
                
                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-[#B5CDA3] dark:border-gray-700 py-2 z-50">
                      <button
                        onClick={() => { router.push('/'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        <Home className="w-4 h-4" />
                        Home
                      </button>
                      <button
                        onClick={() => { router.push('/bedtime'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        <Moon className="w-4 h-4" />
                        Bedtime
                      </button>
                      <button
                        onClick={() => { router.push('/search'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        Browse
                      </button>
                      <button
                        onClick={() => { router.push('/favorites'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        ❤️ <span className="ml-1">Favorites</span>
                      </button>
                      <button
                        onClick={() => { router.push('/history'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        📚 <span className="ml-1">History</span>
                      </button>
                      <button
                        onClick={() => { router.push('/settings'); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        ⚙️ <span className="ml-1">Settings</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* Center: Book Title */}
              <div className="flex-1 min-w-0 text-center px-4">
                <h1 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {title}
                </h1>
                {author && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate hidden sm:block">
                    by {author}
                  </p>
                )}
              </div>

              {/* Right: Reading Controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Theme Controls */}
                <div className="hidden md:flex items-center gap-0.5">
                  <Button
                    onClick={() => changeTheme('light')}
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    title="Light theme"
                    className="px-2 py-1.5"
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => changeTheme('sepia')}
                    variant={theme === 'sepia' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-2 py-1.5 ${theme === 'sepia' ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}`}
                    title="Sepia theme"
                  >
                    📖
                  </Button>
                  <Button
                    onClick={() => changeTheme('dark')}
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    title="Dark theme"
                    className="px-2 py-1.5"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="hidden md:block border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>

                {/* Font Size Controls */}
                <div className="hidden sm:flex items-center gap-0.5">
                  <Button onClick={() => changeFontSize(-10)} variant="outline" size="sm" title="Decrease font size" className="px-2 py-1.5">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-12 text-center">
                    {fontSize}%
                  </span>
                  <Button onClick={() => changeFontSize(10)} variant="outline" size="sm" title="Increase font size" className="px-2 py-1.5">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="hidden sm:block border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>

                {/* TOC Button */}
                {toc.length > 0 && (
                  <Button
                    onClick={() => setShowToc(!showToc)}
                    variant="outline"
                    size="sm"
                    title="Table of contents"
                    className="px-2.5 py-1.5"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline ml-1.5 text-sm">Contents</span>
                  </Button>
                )}

                {/* Stats Button */}
                {!isInCustomPages && (
                  <Button
                    onClick={() => setShowStats(!showStats)}
                    variant={showStats ? 'default' : 'outline'}
                    size="sm"
                    title="Reading stats"
                    className="px-2.5 py-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline ml-1.5 text-sm">Stats</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Reading Stats Panel */}
          {showStats && !isInCustomPages && (
            <ReadingStats
              progressPercent={progressPercent}
              minutesRemaining={minutesRemaining}
              totalTimeMinutes={totalReadTime}
              averageWpm={readingWpm}
              totalWords={totalWords}
              wordsRemaining={wordsRemaining}
            />
          )}

          {/* Table of Contents Drawer */}
          {showToc && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Table of Contents
              </h3>
              <nav className="space-y-2">
                {toc.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => goToChapter(item.href)}
                    className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Reader Layout - Full Width */}
          <div className="flex">
            {/* Main Reader Container - Clean, minimal like ReadEra */}
            <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
              {/* Custom Pages (Cover, Title, TOC) - shown as overlay */}
              {isInCustomPages && (
                <div className="w-full p-8 md:p-16 flex items-center justify-center" style={{ minHeight: '90vh' }}>
                  {currentPage === 0 && (
                    // Cover Page
                    <div className="text-center space-y-8 max-w-2xl">
                      {coverImage && (
                        <img 
                          src={coverImage} 
                          alt={title}
                          className="w-64 h-96 object-cover mx-auto rounded-lg shadow-2xl"
                        />
                      )}
                      {!coverImage && (
                        <div className="w-64 h-96 bg-gradient-to-br from-blue-500 to-purple-600 mx-auto rounded-lg shadow-2xl flex items-center justify-center">
                          <BookOpen className="w-24 h-24 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  {currentPage === 1 && (
                    // Title Page
                    <div className="text-center space-y-8 max-w-2xl">
                      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                        {title}
                      </h1>
                      {author && (
                        <p className="text-2xl md:text-3xl text-gray-600 dark:text-gray-400">
                          by {author}
                        </p>
                      )}
                    </div>
                  )}

                  {currentPage === 2 && (
                    // Table of Contents Page
                    <div className="w-full max-w-3xl space-y-6">
                      <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-8">
                        Contents
                      </h2>
                      <nav className="space-y-3">
                        {toc.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => goToChapter(item.href)}
                            className="block w-full text-left px-6 py-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-lg text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-600"
                          >
                            <span className="font-semibold mr-4">{index + 1}.</span>
                            {item.label}
                          </button>
                        ))}
                        {toc.length === 0 && (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No table of contents available. Click Next to start reading.
                          </p>
                        )}
                      </nav>
                    </div>
                  )}
                </div>
              )}

              {/* EPUB Viewer - always rendered but hidden when showing custom pages */}
              <div 
                ref={viewerRef} 
                className={`w-full epub-reader ${isInCustomPages ? 'hidden' : ''}`} 
                style={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }} 
              />
            </div>
          </div>

          {/* Navigation Buttons - Minimal, bottom fixed */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-4 z-40">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Button onClick={goToPrevPage} variant="ghost" className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex flex-col items-center gap-1">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progressPercent > 0 ? `${Math.round(progressPercent)}%` : '0%'}
                </div>
                {currentLocation && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentLocation}
                  </div>
                )}
              </div>
              <Button onClick={goToNextPage} variant="ghost" className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
