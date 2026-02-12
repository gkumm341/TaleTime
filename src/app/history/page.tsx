'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Clock } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import {
  clearAbridgedBookmark,
  getBookmarkEventName,
  listAbridgedBookmarks,
  type AbridgedVariant,
} from '@/lib/bookmarks';

type UnifiedSource = 'db' | 'bookmark';

interface DbHistoryItem {
  id: number;
  title: string;
  authors: string;
  epubUrl?: string;
  lastReadAt: number;
  currentCfi?: string | null;
  progressPercent: number;
  totalReadingTime: number;
  estimatedMinutes?: number | null;
}

interface DbGroupedHistory {
  today: DbHistoryItem[];
  lastWeek: DbHistoryItem[];
  earlier: DbHistoryItem[];
}

interface UnifiedHistoryItem {
  key: string;
  bookId: number;
  title: string;
  authors: string;
  lastReadAt: number;
  variant: AbridgedVariant;
  source: UnifiedSource;
  progressPercent?: number;
  timeSpentMinutes?: number;
  estimatedMinutes?: number | null;
}

function getDateGroup(lastReadAtMs: number): 'today' | 'lastWeek' | 'earlier' {
  const now = Date.now();
  const age = now - lastReadAtMs;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;
  if (age < oneDayMs) return 'today';
  if (age < sevenDaysMs) return 'lastWeek';
  return 'earlier';
}

export default function HistoryPage() {
  const [history, setHistory] = useState<DbGroupedHistory>({
    today: [],
    lastWeek: [],
    earlier: []
  });
  const [bookmarkHistory, setBookmarkHistory] = useState<UnifiedHistoryItem[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([loadHistory(), loadBookmarkHistory()]).finally(() => setLoading(false));

    const handler = () => {
      void loadBookmarkHistory();
    };
    window.addEventListener(getBookmarkEventName(), handler);
    return () => window.removeEventListener(getBookmarkEventName(), handler);
  }, []);

  async function loadHistory() {
    try {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error('Failed to load history');
      
      const data = (await response.json()) as { grouped?: DbGroupedHistory };
      setHistory(
        data.grouped ?? {
          today: [],
          lastWeek: [],
          earlier: [],
        }
      );
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  async function loadBookmarkHistory() {
    try {
      const entries = await listAbridgedBookmarks();
      const uniqueIds = Array.from(new Set(entries.map((e) => e.bookId))).filter((n) => Number.isFinite(n) && n > 0);
      if (uniqueIds.length === 0) {
        setBookmarkHistory([]);
        return;
      }

      const res = await fetch(`/api/catalog?ids=${uniqueIds.join(',')}&limit=${uniqueIds.length}`);
      type CatalogBook = { id: number; title: string; authors: string; minutes?: number | null };
      const json = (await res.json()) as { results?: CatalogBook[] };
      const byId = new Map<number, CatalogBook>();
      for (const r of json.results ?? []) byId.set(r.id, r);

      const mapped = entries
        .map((e) => {
          const book = byId.get(e.bookId);
          if (!book) return null;
          const item: UnifiedHistoryItem = {
            key: `bookmark:${e.bookId}:${e.variant}`,
            bookId: e.bookId,
            title: book.title,
            authors: book.authors || '',
            lastReadAt: e.bookmark.updatedAt,
            variant: e.variant,
            source: 'bookmark',
            estimatedMinutes: book.minutes ?? null,
          };
          return item;
        })
        .filter((x): x is UnifiedHistoryItem => x !== null);

      setBookmarkHistory(mapped);
    } catch (error) {
      console.error('Failed to load bedtime/full bookmarks:', error);
      setBookmarkHistory([]);
    }
  }

  const unifiedByGroups = useMemo(() => {
    const dbItems: UnifiedHistoryItem[] = [
      ...history.today,
      ...history.lastWeek,
      ...history.earlier,
    ].map((b) => ({
      key: `db:${b.id}:full`,
      bookId: b.id,
      title: b.title,
      authors: b.authors || '',
      lastReadAt: b.lastReadAt,
      variant: 'full',
      source: 'db',
      progressPercent: Math.max(0, Math.min(100, b.progressPercent || 0)),
      timeSpentMinutes: Math.round((b.totalReadingTime || 0) as number),
      estimatedMinutes: b.estimatedMinutes ?? null,
    }));

    // De-dupe by stable key (source + bookId + variant). Some history sources can
    // emit duplicate rows for the same book; rendering duplicates causes React key warnings.
    const byKey = new Map<string, UnifiedHistoryItem>();
    for (const item of [...dbItems, ...bookmarkHistory]) {
      if (!Number.isFinite(item.lastReadAt)) continue;
      const existing = byKey.get(item.key);
      if (!existing) {
        byKey.set(item.key, item);
        continue;
      }

      const newer = item.lastReadAt >= existing.lastReadAt ? item : existing;
      const older = item.lastReadAt >= existing.lastReadAt ? existing : item;

      byKey.set(item.key, {
        ...older,
        ...newer,
        key: item.key,
        lastReadAt: Math.max(existing.lastReadAt, item.lastReadAt),
        progressPercent: Math.max(older.progressPercent ?? 0, newer.progressPercent ?? 0),
        timeSpentMinutes: Math.max(older.timeSpentMinutes ?? 0, newer.timeSpentMinutes ?? 0),
        estimatedMinutes: newer.estimatedMinutes ?? older.estimatedMinutes ?? null,
      });
    }

    const all = Array.from(byKey.values()).sort((a, b) => b.lastReadAt - a.lastReadAt);

    const grouped: { today: UnifiedHistoryItem[]; lastWeek: UnifiedHistoryItem[]; earlier: UnifiedHistoryItem[] } = {
      today: [],
      lastWeek: [],
      earlier: [],
    };

    for (const item of all) {
      grouped[getDateGroup(item.lastReadAt)].push(item);
    }

    return grouped;
  }, [history, bookmarkHistory]);

  useEffect(() => {
    const ids = Array.from(
      new Set([...unifiedByGroups.today, ...unifiedByGroups.lastWeek, ...unifiedByGroups.earlier].map((i) => i.bookId))
    ).filter((n) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      setRatings({});
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/ratings?bookIds=${ids.join(',')}`);
        if (!res.ok) return;
        const json = (await res.json()) as { ratings?: Record<string, number> };
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(json.ratings ?? {})) {
          const id = parseInt(k);
          if (!Number.isFinite(id)) continue;
          if (typeof v !== 'number') continue;
          next[id] = v;
        }
        setRatings(next);
      } catch {
        // ignore
      }
    })();
  }, [unifiedByGroups]);

  async function removeItem(item: UnifiedHistoryItem) {
    try {
      if (item.source === 'bookmark') {
        await clearAbridgedBookmark(item.bookId, item.variant);
        await loadBookmarkHistory();
        return;
      }

      const response = await fetch(`/api/history?bookId=${encodeURIComponent(String(item.bookId))}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadHistory();
      }
    } catch (error) {
      console.error('Failed to remove from history:', error);
    }
  }

  async function clearAllHistory() {
    try {
      await fetch('/api/history?clearAll=true', { method: 'DELETE' });
      const entries = await listAbridgedBookmarks();
      await Promise.all(entries.map((e) => clearAbridgedBookmark(e.bookId, e.variant)));
      await Promise.all([loadHistory(), loadBookmarkHistory()]);
    } catch (error) {
      console.error('Failed to clear all history:', error);
    }
  }

  function setBookRating(bookId: number, rating: number) {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    setRatings((prev) => ({ ...prev, [bookId]: clamped }));

    void (async () => {
      try {
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, rating: clamped }),
        });
      } catch {
        // ignore
      }
    })();
  }

  function clearBookRating(bookId: number) {
    setRatings((prev) => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });

    void (async () => {
      try {
        await fetch(`/api/ratings?bookId=${bookId}`, { method: 'DELETE' });
      } catch {
        // ignore
      }
    })();
  }

  const totalBooks =
    unifiedByGroups.today.length + unifiedByGroups.lastWeek.length + unifiedByGroups.earlier.length;
  const totalMinutesRead = [...unifiedByGroups.today, ...unifiedByGroups.lastWeek, ...unifiedByGroups.earlier]
    .reduce((sum, item) => sum + (item.timeSpentMinutes || 0), 0);

  return (
    <div className="min-h-screen relative bg-tt-surface dark:bg-gray-950">
      <Sidebar activePage="history" />

      <div className="relative z-10 ml-0 md:ml-72 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Mobile Header - TaleTime Logo */}
          <div className="md:hidden text-center mb-6 animate-in fade-in slide-in-from-top duration-700">
            <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
            <h1 className="text-4xl font-black text-tt-tertiary drop-shadow-lg">
              TaleTime
            </h1>
            <p className="text-sm font-bold text-tt-accent mt-2">Your story telling companion</p>
          </div>

          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-pulse"></span>
              <h1 className="text-2xl sm:text-4xl font-bold text-tt-tertiary">
                Reading History
              </h1>
            </div>
            {totalBooks > 0 && (
              <div className="flex flex-wrap gap-4 text-sm items-center">
                <div className="px-4 py-2 rounded-tt bg-tt-tertiary/20 dark:from-tt-tertiary/20 dark:to-tt-tertiary/10 border border-tt-tertiary/30 dark:border-tt-tertiary/40 font-semibold shadow-md">
                  {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
                </div>
                <div className="px-4 py-2 rounded-tt bg-tt-accent/20 dark:from-tt-accent/20 dark:to-tt-accent/10 border border-tt-accent/30 dark:border-tt-accent/40 font-semibold shadow-md">
                  {Math.round(totalMinutesRead)} min total
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow-md hover:bg-red-600 transition-all"
                  onClick={clearAllHistory}
                  title="Clear all history"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-tt-tertiary border-t-transparent"></div>
            </div>
          ) : totalBooks === 0 ? (
            <div className="text-center py-20 animate-in fade-in duration-700">
              <div className="inline-block bg-tt-surface dark:bg-gray-900 backdrop-blur-xl rounded-3xl p-12 border border-tt-border/20 dark:border-tt-border/10 shadow-lg">
                <div className="text-6xl mb-4"></div>
                <h2 className="text-2xl font-bold text-tt-primary dark:text-white mb-2">No reading history yet</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Start reading books to build your history!</p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-tt-tertiary hover:bg-tt-tertiary/90 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-lg"></span>
                  Browse Stories
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {unifiedByGroups.today.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700">
                  <h2 className="text-2xl font-bold mb-4 text-tt-tertiary flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Today
                  </h2>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {unifiedByGroups.today.map((item, index) => (
                      <HistoryCard 
                        key={item.key} 
                        item={item} 
                        rating={ratings[item.bookId]}
                        onRemove={removeItem}
                        onRate={setBookRating}
                        onClearRating={clearBookRating}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unifiedByGroups.lastWeek.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-150">
                  <h2 className="text-2xl font-bold mb-4 text-tt-tertiary flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Last 7 Days
                  </h2>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {unifiedByGroups.lastWeek.map((item, index) => (
                      <HistoryCard 
                        key={item.key} 
                        item={item} 
                        rating={ratings[item.bookId]}
                        onRemove={removeItem}
                        onRate={setBookRating}
                        onClearRating={clearBookRating}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unifiedByGroups.earlier.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                  <h2 className="text-2xl font-bold mb-4 text-tt-tertiary flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Earlier
                  </h2>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {unifiedByGroups.earlier.map((item, index) => (
                      <HistoryCard 
                        key={item.key} 
                        item={item} 
                        rating={ratings[item.bookId]}
                        onRemove={removeItem}
                        onRate={setBookRating}
                        onClearRating={clearBookRating}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryCardProps {
  item: UnifiedHistoryItem;
  rating?: number;
  onRemove: (item: UnifiedHistoryItem) => void;
  onRate: (bookId: number, rating: number) => void;
  onClearRating: (bookId: number) => void;
  animationDelay: number;
}

function HistoryCard({ item, rating, onRemove, onRate, onClearRating, animationDelay }: HistoryCardProps) {
  const [showRating, setShowRating] = useState(false);

  const estimatedMinutes = item.estimatedMinutes || 0;
  const progress = item.progressPercent ?? 0;
  const timeLeft = estimatedMinutes ? Math.ceil((estimatedMinutes * (100 - progress)) / 100) : 0;
  const isCompleted = progress >= 100;
  const href = `/book/${item.bookId}/abridged?variant=${item.variant}`;
  const variantLabel = item.variant === 'bedtime' ? 'Bedtime' : 'Full';

  return (
    <div
      className="group rounded-tt border border-tt-border/20 dark:border-tt-border/10 overflow-hidden hover:shadow-xl hover:shadow-tt-tertiary/10 dark:hover:shadow-tt-tertiary/5 transition-all duration-500 bg-tt-surface dark:bg-gray-900 hover:border-tt-tertiary/40 dark:hover:border-tt-tertiary/30 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Link href={href}>
        <div className="relative w-full h-32 bg-gray-50 dark:bg-gray-800 overflow-hidden">
          <Image
            src={`/api/local-image?title=${encodeURIComponent(item.title)}`}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
            sizes="20vw"
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-tt-tertiary transition-all duration-500"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-tt-tertiary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
      </Link>
      <div className="p-2 space-y-1 relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-tt-tertiary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        <button
          onClick={() => onRemove(item)}
          className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-10"
          title="Remove from history"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowRating((v) => !v)}
          className="absolute top-1 left-1 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-10"
          title="Rate this book"
        >
          ⭐
        </button>

        {showRating && (
          <div className="absolute left-2 top-10 z-20 rounded-xl bg-white/95 dark:bg-gray-950/95 backdrop-blur border border-black/10 dark:border-white/10 shadow-xl px-2 py-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onRate(item.bookId, n);
                    setShowRating(false);
                  }}
                  className={`h-8 w-8 rounded-lg text-lg transition-colors ${
                    (rating || 0) >= n ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  aria-label={`Rate ${n} stars`}
                  title={`Rate ${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>

            {typeof rating === 'number' && rating >= 1 && rating <= 5 && (
              <button
                type="button"
                className="mt-2 w-full h-8 rounded-lg text-[12px] font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors"
                onClick={() => {
                  onClearRating(item.bookId);
                  setShowRating(false);
                }}
              >
                Clear rating
              </button>
            )}
          </div>
        )}

        <Link href={href}>
          <h3 className="font-bold text-xs line-clamp-2 group-hover:text-tt-tertiary transition-all relative z-10 pr-6">
            {item.title}
          </h3>
        </Link>
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium relative z-10 lg:flex items-center gap-1.5">
          <span className="text-xs lg:text-base">✍️</span>
          {item.authors}
        </p>

        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1 relative z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tt-tertiary/10 text-tt-tertiary border border-tt-tertiary/20 font-semibold">
            {variantLabel}
          </span>
          {typeof rating === 'number' && rating >= 1 && rating <= 5 ? (
            <span className="text-yellow-700 dark:text-yellow-400 font-semibold">{'★'.repeat(rating)}</span>
          ) : (
            <span className="opacity-60">Not rated</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 lg:gap-2 text-xs pt-1 lg:pt-2 relative z-10">
          {isCompleted ? (
            <span className="inline-flex items-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 text-green-800 dark:text-green-200 font-semibold shadow-md border border-green-200 dark:border-green-800 text-xs">
              <span className="lg:hidden">✓</span><span className="hidden lg:inline">✅ Completed</span>
            </span>
          ) : (
            <>
              <span className="inline-flex items-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-800 dark:text-purple-200 font-semibold shadow-md border border-purple-200 dark:border-purple-800 text-xs">
                <span className="lg:hidden">📊 </span>{progress}%
              </span>
              {timeLeft > 0 && (
                <span className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 text-rose-800 dark:text-rose-200 font-semibold shadow-md border border-rose-200 dark:border-rose-800 text-xs">
                  ⏱️ {timeLeft} min left
                </span>
              )}
            </>
          )}
        </div>
        <div className="hidden lg:flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 relative z-10">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.round(item.timeSpentMinutes || 0)} min read
          </span>
          <span>
            {new Date(item.lastReadAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
