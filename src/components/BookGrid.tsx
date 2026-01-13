'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { preloadEpub, prefetchBookMetadata } from '@/lib/epub-preloader';
import type { TimeOptionId } from './HomeContent';

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

function timeOptionToVariant(timeSelection: TimeOptionId): 'bedtime' | 'full' {
  return timeSelection === 'bedtime' ? 'bedtime' : 'full';
}

export function BookGrid({
  initialBooks,
  timeSelection,
}: {
  initialBooks: Book[];
  timeSelection?: TimeOptionId | null;
}) {
  const isLocalContent = process.env.NEXT_PUBLIC_CONTENT_MODE === 'local';
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isLocalContent) return;
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
      {books.map((book, index) => {
        const variant = timeSelection ? timeOptionToVariant(timeSelection) : null;
        const href = isLocalContent
          ? `/book/${book.id}/abridged?variant=${variant ?? 'full'}`
          : variant === 'bedtime'
            ? `/book/${book.id}/abridged?variant=bedtime`
            : `/book/${book.id}`;

        return (
          <Link
            key={book.id}
            href={href}
            prefetch={true}
            onMouseEnter={() => {
              // Pre-warm metadata and start EPUB download on hover
              if (!isLocalContent && typeof window !== 'undefined' && book.epubUrl) {
                // Prefetch metadata immediately
                prefetchBookMetadata(book.id);

                // Start EPUB preload after a short delay (user must hover for 300ms)
                const timer = window.setTimeout(() => {
                  preloadEpub(book.id, book.epubUrl!);
                }, 300);

                // Store timer to cancel if user moves away
                (window as any)[`preload-${book.id}`] = timer;
              }
            }}
            onMouseLeave={() => {
              // Cancel preload if user moves away before 300ms
              if (!isLocalContent && typeof window !== 'undefined') {
                const timer = (window as any)[`preload-${book.id}`];
                if (timer) {
                  clearTimeout(timer);
                  delete (window as any)[`preload-${book.id}`];
                }
              }
            }}
            className="group rounded-2xl border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 overflow-hidden hover:shadow-xl hover:shadow-[#6BA8A9]/10 dark:hover:shadow-[#6BA8A9]/5 transition-all duration-500 bg-white dark:bg-gray-900 hover:border-[#6BA8A9]/40 dark:hover:border-[#6BA8A9]/30 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Custom book image from .data/texts/by-title/<Title>/<Title>.png */}
            <div className="relative w-full aspect-[2/3] bg-gray-50 dark:bg-gray-800 overflow-hidden">

              {/* Foreground cover */}
              <div className="absolute inset-2">
                <Image
                  src={`/api/local-image?title=${encodeURIComponent(book.title)}`}
                  alt={book.title}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-500"
                  sizes="20vw"
                  unoptimized
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  priority={false}
                />
              </div>
            </div>
            <div className="p-2 space-y-1 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#6BA8A9]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <h3 className="font-bold text-xs lg:text-lg line-clamp-2 group-hover:text-[#6BA8A9] transition-all relative z-10">
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#FF8B7B]/20 dark:from-[#FF8B7B]/20 dark:to-[#FF8B7B]/10 text-[#3E3E3E] dark:text-[#FF8B7B] font-semibold shadow-md hover:shadow-lg transition-shadow border border-[#FF8B7B]/30 dark:border-[#FF8B7B]/40">
                    📖 {book.minutes} min
                  </span>
                ) : loading.has(book.id) ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#6BA8A9]/20 dark:bg-[#6BA8A9]/20 text-[#6BA8A9] dark:text-[#6BA8A9] animate-pulse font-semibold">
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
        );
      })}
    </div>
  );
}
