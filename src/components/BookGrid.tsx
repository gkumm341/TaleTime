'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { preloadEpub, prefetchBookMetadata } from '@/lib/epub-preloader';
import type { TimeOptionId } from './HomeContent';
import { getAbridgedBookmarkVariantMap, getAnyAbridgedBookmarkMap, getBookmarkEventName } from '@/lib/bookmarks';
import BookmarkPng from '@/components/BookmarkPng';

const AUTHOR_OVERRIDES_KEY = 'taletime-author-overrides-v1';

const MISSING_AUTHOR_VALUES = new Set([
  '',
  'unknown',
  'unknown author',
  'author unknown',
  'n/a',
  'na',
  'none',
]);

function isMissingAuthor(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return MISSING_AUTHOR_VALUES.has(normalized);
}

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
  displayMode = 'detailed',
}: {
  initialBooks: Book[];
  timeSelection?: TimeOptionId | null;
  displayMode?: 'detailed' | 'covers';
}) {
  const isLocalContent = process.env.NEXT_PUBLIC_CONTENT_MODE === 'local';
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState<Set<number>>(new Set());

  useEffect(() => {
    setBooks(initialBooks);
  }, [initialBooks]);

  const [authorOverrides, setAuthorOverrides] = useState<Record<number, string>>({});
  const [editingAuthorForId, setEditingAuthorForId] = useState<number | null>(null);
  const [authorDraft, setAuthorDraft] = useState('');
  const preloadTimersRef = useRef<Record<number, number>>({});
  const [hasBookmarkById, setHasBookmarkById] = useState<Record<number, boolean>>({});
  const [bookmarkVariantById, setBookmarkVariantById] = useState<Record<number, 'full' | 'bedtime' | null>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const bookIds = books.map((b) => b.id);

    const refresh = async () => {
      try {
        const [anyMap, variantMap] = await Promise.all([
          getAnyAbridgedBookmarkMap(bookIds),
          getAbridgedBookmarkVariantMap(bookIds),
        ]);
        if (cancelled) return;
        setHasBookmarkById(anyMap);
        setBookmarkVariantById(variantMap);
      } catch {
        if (cancelled) return;
        setHasBookmarkById({});
        setBookmarkVariantById({});
      }
    };

    refresh();

    const handler = () => refresh();
    window.addEventListener(getBookmarkEventName(), handler as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(getBookmarkEventName(), handler as EventListener);
    };
  }, [books]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTHOR_OVERRIDES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return;

      const next: Record<number, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const id = Number(key);
        if (!Number.isFinite(id)) continue;
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        next[id] = trimmed;
      }
      setAuthorOverrides(next);
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  const persistAuthorOverrides = (next: Record<number, string>) => {
    setAuthorOverrides(next);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUTHOR_OVERRIDES_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota / permissions errors
    }
  };

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

  const displayedAuthorsById = useMemo(() => {
    const map = new Map<number, string>();
    for (const book of books) {
      const override = authorOverrides[book.id];
      const base = (override ?? book.authors ?? '').trim();
      map.set(book.id, base);
    }
    return map;
  }, [books, authorOverrides]);

  const isCoverOnly = displayMode === 'covers';

  return (
    <div className={isCoverOnly ? 'grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}>
      {books.map((book, index) => {
        const variant = timeSelection ? timeOptionToVariant(timeSelection) : null;
        const bookmarkedVariant = bookmarkVariantById[book.id] ?? null;
        const variantToOpen = bookmarkedVariant ?? variant ?? 'full';
        const href = isLocalContent
          ? `/book/${book.id}/abridged?variant=${variantToOpen}`
          : variantToOpen === 'bedtime'
            ? `/book/${book.id}/abridged?variant=bedtime`
            : `/book/${book.id}/abridged?variant=full`;

        const overrideAuthors = authorOverrides[book.id]?.trim() ?? '';
        const fetchedAuthors = (book.authors ?? '').trim();
        const missingFetchedAuthors = isMissingAuthor(fetchedAuthors);

        const displayedAuthors = overrideAuthors || (missingFetchedAuthors ? '' : (displayedAuthorsById.get(book.id) ?? fetchedAuthors));
        const hasAuthors = Boolean(displayedAuthors);
        const canManuallySetAuthor = missingFetchedAuthors || Boolean(overrideAuthors);
        const isEditingAuthor = editingAuthorForId === book.id;

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
                preloadTimersRef.current[book.id] = timer;
              }
            }}
            onMouseLeave={() => {
              // Cancel preload if user moves away before 300ms
              if (!isLocalContent && typeof window !== 'undefined') {
                const timer = preloadTimersRef.current[book.id];
                if (timer) {
                  clearTimeout(timer);
                  delete preloadTimersRef.current[book.id];
                }
              }
            }}
            className={
              isCoverOnly
                ? 'group rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm hover:shadow-xl hover:shadow-black/10 transition-all duration-500 transform hover:-translate-y-1'
                : 'group rounded-2xl border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 overflow-hidden hover:shadow-xl hover:shadow-[#6BA8A9]/10 dark:hover:shadow-[#6BA8A9]/5 transition-all duration-500 bg-white dark:bg-gray-900 hover:border-[#6BA8A9]/40 dark:hover:border-[#6BA8A9]/30 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700'
            }
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Custom book image from .data/texts/by-title/<Title>/<Title>.png */}
            <div className={isCoverOnly ? 'relative w-full aspect-[2/3] bg-white/60 dark:bg-gray-800/60 overflow-hidden' : 'relative w-full aspect-[2/3] bg-gray-50 dark:bg-gray-800 overflow-hidden'}>
              <Image
                src={`/api/local-image?title=${encodeURIComponent(book.title)}`}
                alt={book.title}
                fill
                className={isCoverOnly ? 'object-cover group-hover:scale-[1.02] transition-transform duration-500' : 'object-contain group-hover:scale-105 transition-transform duration-500'}
                sizes={isCoverOnly ? '20vw' : '20vw'}
                unoptimized
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                priority={false}
              />

              {hasBookmarkById[book.id] && (
                <div className="pointer-events-none absolute -top-2 -right-2 h-14 w-14 drop-shadow-md">
                  <BookmarkPng alt="Bookmarked" className="h-full w-full object-contain" />

                  {bookmarkVariantById[book.id] && (
                    <div className="absolute bottom-1 right-1 h-5 min-w-5 px-1 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center justify-center ring-1 ring-white/30">
                      {bookmarkVariantById[book.id] === 'bedtime' ? 'B' : 'F'}
                    </div>
                  )}
                </div>
              )}

              {isCoverOnly && (
                <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />
              )}
            </div>

            {!isCoverOnly && (
              <div className="p-2 space-y-1 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#6BA8A9]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <h3 className="font-bold text-xs lg:text-lg line-clamp-2 group-hover:text-[#6BA8A9] transition-all relative z-10">
                  {book.title}
                </h3>

              {!isEditingAuthor ? (
                <div className="relative z-10">
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium lg:flex items-center gap-1.5">
                    <span className="text-xs lg:text-base">✍️</span>
                    <span className={hasAuthors ? '' : 'text-gray-400 dark:text-gray-500 italic'}>
                      {hasAuthors ? displayedAuthors : 'Author unknown'}
                    </span>
                  </p>

                  {canManuallySetAuthor && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingAuthorForId(book.id);
                        setAuthorDraft(displayedAuthors);
                      }}
                      className={`mt-1 text-[11px] font-semibold text-[#6BA8A9] hover:text-[#5F9798] transition-colors ${
                        hasAuthors ? 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100' : ''
                      }`}
                      aria-label={hasAuthors ? 'Edit author' : 'Add author'}
                    >
                      {hasAuthors ? 'Edit author' : 'Add author'}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="relative z-10"
                  onClick={(e) => {
                    // Prevent card navigation while editing
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div className="text-[11px] font-semibold text-[#6BA8A9]">Author</div>
                  <input
                    value={authorDraft}
                    onChange={(e) => setAuthorDraft(e.target.value)}
                    placeholder="e.g., Jane Austen"
                    className="mt-1 w-full px-2 py-1 rounded-md border border-[#B5CDA3]/60 dark:border-[#B5CDA3]/30 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6BA8A9]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingAuthorForId(null);
                        setAuthorDraft('');
                      }
                      if (e.key === 'Enter') {
                        const trimmed = authorDraft.trim();
                        const next = { ...authorOverrides };
                        if (trimmed) next[book.id] = trimmed;
                        else delete next[book.id];
                        persistAuthorOverrides(next);
                        setEditingAuthorForId(null);
                        setAuthorDraft('');
                      }
                    }}
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[#6BA8A9] hover:text-[#5F9798] transition-colors"
                      onClick={() => {
                        const trimmed = authorDraft.trim();
                        const next = { ...authorOverrides };
                        if (trimmed) next[book.id] = trimmed;
                        else delete next[book.id];
                        persistAuthorOverrides(next);
                        setEditingAuthorForId(null);
                        setAuthorDraft('');
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      onClick={() => {
                        setEditingAuthorForId(null);
                        setAuthorDraft('');
                      }}
                    >
                      Cancel
                    </button>
                    {authorOverrides[book.id] != null && (
                      <button
                        type="button"
                        className="ml-auto text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                        onClick={() => {
                          const next = { ...authorOverrides };
                          delete next[book.id];
                          persistAuthorOverrides(next);
                          setEditingAuthorForId(null);
                          setAuthorDraft('');
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
