'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { preloadEpub, prefetchBookMetadata } from '@/lib/epub-preloader';
import FavoriteButton from './FavoriteButton';

interface Book {
  id: number;
  title: string;
  authors: string;
  coverUrl?: string;
  epubUrl?: string;
  minutes?: number;
  words?: number;
  txtUrl?: string;
  isCached?: boolean;
  subjects?: string[];
}

export function BookGrid({ initialBooks }: { initialBooks: Book[] }) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Load estimates for books that don't have them yet
    const booksNeedingEstimates = initialBooks.filter(b => !b.minutes && b.txtUrl);
    
    if (booksNeedingEstimates.length === 0) return;

    // Process 4 at a time to avoid hammering the server
    const processEstimates = async () => {
      for (let i = 0; i < booksNeedingEstimates.length; i += 4) {
        const batch = booksNeedingEstimates.slice(i, i + 4);
        
        await Promise.all(
          batch.map(async (book) => {
            if (loading.has(book.id)) return;
            
            setLoading(prev => new Set(prev).add(book.id));
            
            try {
              const res = await fetch(`/api/estimate?bookId=${book.id}`);
              if (res.ok) {
                const data = await res.json();
                setBooks(prevBooks => 
                  prevBooks.map(b => 
                    b.id === book.id 
                      ? { ...b, minutes: data.minutes, words: data.words }
                      : b
                  )
                );
              }
            } catch (error) {
              console.error(`Failed to estimate book ${book.id}:`, error);
            } finally {
              setLoading(prev => {
                const next = new Set(prev);
                next.delete(book.id);
                return next;
              });
            }
          })
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    processEstimates();
  }, [initialBooks]);

  return (
    <div className="grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {books.map((book, index) => (
        <Link
          key={book.id}
          href={`/book/${book.id}`}
          prefetch={true}
          onMouseEnter={() => {
            // Pre-warm metadata and start EPUB download on hover
            if (typeof window !== 'undefined' && book.epubUrl) {
              // Prefetch metadata immediately
              prefetchBookMetadata(book.id);
              
              // Start EPUB preload after a short delay (user must hover for 300ms)
              const timer = setTimeout(() => {
                preloadEpub(book.id, book.epubUrl!);
              }, 300);
              
              // Store timer to cancel if user moves away
              (window as any)[`preload-${book.id}`] = timer;
            }
          }}
          onMouseLeave={() => {
            // Cancel preload if user moves away before 300ms
            if (typeof window !== 'undefined') {
              const timer = (window as any)[`preload-${book.id}`];
              if (timer) {
                clearTimeout(timer);
                delete (window as any)[`preload-${book.id}`];
              }
            }
          }}
          className="group rounded-2xl border-2 border-pink-200/50 dark:border-pink-900/50 overflow-hidden hover:shadow-2xl hover:shadow-pink-300/50 dark:hover:shadow-pink-900/50 transition-all duration-500 bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 hover:border-pink-400 dark:hover:border-pink-600 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {book.coverUrl && (
            <div className="relative w-full h-32 bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
                sizes="20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {book.isCached && (
                <div className="absolute top-1 right-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full p-1.5 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all" title="Available offline">
                  <Download className="w-3 h-3" />
                </div>
              )}
              {/* Favorite button - top left */}
              <div className="absolute top-1 left-1 z-10" onClick={(e) => e.preventDefault()}>
                <FavoriteButton bookId={book.id} size="sm" />
              </div>
            </div>
          )}
          
          <div className="p-2 space-y-1 relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-400/10 to-purple-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="font-bold text-xs lg:text-lg line-clamp-2 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all relative z-10">
              {book.title}
            </h3>
            
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium relative z-10 lg:flex items-center gap-1.5">
              <span className="text-xs lg:text-base">✍️</span>
              {book.authors}
            </p>
            
            {book.subjects && book.subjects.length > 0 && (
              <p className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 line-clamp-2 relative z-10 pt-1">
                {book.subjects.slice(0, 2).join(', ')}
              </p>
            )}
            
            <div className="hidden lg:flex items-center gap-2 text-xs pt-2 relative z-10">
              {book.minutes ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 text-rose-800 dark:text-rose-200 font-semibold shadow-md hover:shadow-lg transition-shadow border border-rose-200 dark:border-rose-800">
                  📖 {book.minutes} min
                </span>
              ) : loading.has(book.id) ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 animate-pulse font-semibold">
                  ⏳ Estimating...
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                  📖 Estimate pending
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
