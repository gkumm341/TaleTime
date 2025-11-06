'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { preloadEpub, prefetchBookMetadata } from '@/lib/epub-preloader';

interface Book {
  id: number;
  title: string;
  authors: string;
  coverUrl?: string;
  epubUrl?: string;
  minutes?: number;
  words?: number;
  txtUrl?: string;
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book) => (
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
          className="group rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800"
        >
          {book.coverUrl && (
            <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700">
              <Image
                src={book.coverUrl}
                alt={book.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
          )}
          
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {book.title}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {book.authors}
            </p>
            
            <div className="flex items-center gap-2 text-xs pt-2">
              {book.minutes ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium">
                  📖 {book.minutes} min
                </span>
              ) : loading.has(book.id) ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 animate-pulse">
                  ⏳ Estimating...
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
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
