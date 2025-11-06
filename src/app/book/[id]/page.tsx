'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ePub, { Book, Rendition } from 'epubjs';
import { get, set } from 'idb-keyval';
import { Navigation } from '@/components/Navigation';
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
  BookOpen
} from 'lucide-react';

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

        // Render the book
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '80vh',
          spread: 'none',
        });
        renditionRef.current = rendition;

        // Apply theme
        applyTheme(rendition, theme);

        // Restore last reading position
        const lastCfi = await get<string>(`cfi:${id}`);
        await rendition.display(lastCfi || undefined);

        // Save position on navigation
        rendition.on('relocated', (location: any) => {
          if (location && location.start) {
            set(`cfi:${id}`, location.start.cfi);
            setCurrentLocation(location.start.displayed.page + ' of ' + location.start.displayed.total);
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

    return () => {
      mounted = false;
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
    renditionRef.current?.prev();
  };

  const goToNextPage = () => {
    renditionRef.current?.next();
  };

  const goToChapter = async (href: string) => {
    if (renditionRef.current) {
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
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {author && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    by {author}
                  </p>
                )}
              </div>
              
              <Button onClick={() => router.push('/')} variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Theme Controls */}
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <Button onClick={() => changeFontSize(-10)} variant="outline" size="sm">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-center">
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
                  <List className="w-4 h-4 mr-2" />
                  Contents
                </Button>
              )}

              {/* Location */}
              {currentLocation && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {currentLocation}
                </div>
              )}
            </div>
          </div>

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

          {/* Reader Container */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div ref={viewerRef} className="w-full" style={{ minHeight: '80vh' }} />
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
