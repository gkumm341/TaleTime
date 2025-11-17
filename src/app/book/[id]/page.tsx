'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ePub, { Book, Rendition } from 'epubjs';
import { get, set } from 'idb-keyval';
import { Navigation } from '@/components/Navigation';
import { ReadingStats } from '@/components/ReadingStats';
import { Button } from '@/components/ui/button';
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

  // Reading tracker state
  const [showStats, setShowStats] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [totalWords, setTotalWords] = useState<number | undefined>();
  const [wordsRemaining, setWordsRemaining] = useState<number | undefined>();
  const [minutesRemaining, setMinutesRemaining] = useState<number | undefined>();
  const [readingWpm, setReadingWpm] = useState(160);
  const [totalReadTime, setTotalReadTime] = useState(0);
  const currentSessionRef = useRef<ReadingSession | null>(null);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('📚 Book reader useEffect triggered for book ID:', id);
    let mounted = true;

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

        // Get table of contents
        const navigation = await book.loaded.navigation;
        if (navigation && navigation.toc) {
          setToc(navigation.toc as NavItem[]);
        }

        // Render the book (hidden initially)
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '80vh',
          spread: 'none',
        });
        renditionRef.current = rendition;

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
          if (location && location.start && !isInCustomPages) {
            const cfi = location.start.cfi;
            set(`cfi:${id}`, cfi);
            setCurrentLocation(location.start.displayed.page + ' of ' + location.start.displayed.total);
            
            // Update progress tracking
            if (location.start.percentage !== undefined) {
              const percent = location.start.percentage * 100;
              setProgressPercent(percent);
              console.log('📈 Progress updated:', percent.toFixed(2) + '%');
              
              // Calculate time remaining
              if (totalWords && readingWpm) {
                const remaining = estimateTimeToFinish(percent, totalWords, readingWpm);
                setMinutesRemaining(remaining);
                setWordsRemaining(Math.round(totalWords * (100 - percent) / 100));
                console.log(`⏱️ Time remaining: ${remaining} minutes`);
              }
            }
            
            // Start a new session if not already tracking
            if (!currentSessionRef.current) {
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
          background: '#ffffff',
          color: '#000000',
        },
      },
      sepia: {
        body: {
          background: '#f4ecd8',
          color: '#5c4a33',
        },
      },
      dark: {
        body: {
          background: '#1a1a1a',
          color: '#e0e0e0',
        },
      },
    };

    rendition.themes.default(themes[themeName]);
    
    // Hide common Project Gutenberg boilerplate sections
    rendition.themes.default({
      'p': {
        'text-align': 'left !important',
      },
      // Hide elements containing "Project Gutenberg" or typical legal notices
      '.pgheader, .pglegal, .pgfooter': {
        'display': 'none !important',
      },
      // Hide paragraphs that are likely PG boilerplate (centered, small text)
      'p[style*="text-align: center"]': {
        'font-size': 'inherit !important',
      }
    });
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
      <Navigation />
      
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
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
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
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 ${loading || error ? 'invisible' : ''}`}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Combined Header and Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Title Section */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {title}
                </h1>
                {author && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    by {author}
                  </p>
                )}
              </div>

              {/* Controls Section */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Theme Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => changeTheme('light')}
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Sun className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => changeTheme('sepia')}
                    variant={theme === 'sepia' ? 'default' : 'outline'}
                    size="sm"
                    className={theme === 'sepia' ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : ''}
                  >
                    📖
                  </Button>
                  <Button
                    onClick={() => changeTheme('dark')}
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Moon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Font Size Controls */}
                <div className="flex items-center gap-1">
                  <Button onClick={() => changeFontSize(-10)} variant="outline" size="sm">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-center">
                    {fontSize}%
                  </span>
                  <Button onClick={() => changeFontSize(10)} variant="outline" size="sm">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                {/* TOC Button */}
                {toc.length > 0 && (
                  <Button
                    onClick={() => setShowToc(!showToc)}
                    variant="outline"
                    size="sm"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Contents
                  </Button>
                )}

                {/* Stats Button */}
                {!isInCustomPages && (
                  <Button
                    onClick={() => setShowStats(!showStats)}
                    variant={showStats ? 'default' : 'outline'}
                    size="sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Stats
                  </Button>
                )}

                {/* Home Button */}
                <Button onClick={() => router.push('/')} variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Button>
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

          {/* Reader Layout with Sidebar */}
          <div className="flex gap-4">
            {/* Chapter Sidebar - on the left */}
            {toc.length > 0 && !isInCustomPages && (
              <div className="hidden lg:block w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 overflow-y-auto flex-shrink-0" style={{ maxHeight: '80vh' }}>
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white sticky top-0 bg-white dark:bg-gray-800 pb-2">
                  Chapters
                </h3>
                <nav className="space-y-1">
                  {toc.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => goToChapter(item.href)}
                      className="block w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Main Reader Container - wider now */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-none">
              {/* Custom Pages (Cover, Title, TOC) - shown as overlay */}
              {isInCustomPages && (
                <div className="w-full p-8 md:p-16 flex items-center justify-center" style={{ minHeight: '80vh' }}>
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
                className={`w-full ${isInCustomPages ? 'hidden' : ''}`} 
                style={{ minHeight: '80vh' }} 
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4 pb-8">
            <Button onClick={goToPrevPage} size="lg" variant="outline">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </Button>
            <Button onClick={goToNextPage} size="lg" variant="outline">
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
