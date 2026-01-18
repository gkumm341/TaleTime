'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookGrid } from '@/components/BookGrid';
import { BookFilters, FilterState } from '@/components/BookFilters';
import { ActiveFilters } from '@/components/ActiveFilters';
import { StorageInfo } from '@/components/StorageInfo';
import { BookGridSkeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { BookOpen, Library, SlidersHorizontal, Target, Search, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';

const TIME_OPTIONS = [
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'full', label: 'Full version' },
] as const;

export type TimeOptionId = (typeof TIME_OPTIONS)[number]['id'];

const TIME_SELECTION_KEY = 'taletime-time-selection';

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

export function HomeContent() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('popularity');
  const [selectedTimeOptionId, setSelectedTimeOptionId] = useState<TimeOptionId>('full');
  const [filters, setFilters] = useState<FilterState>({
    ageCategories: [],
    durations: [],
    languages: [],
    offlineOnly: false,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load persisted selection (client only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(TIME_SELECTION_KEY);
    if (!raw) return;
    if (TIME_OPTIONS.some((o) => o.id === raw)) {
      setSelectedTimeOptionId(raw as TimeOptionId);
    }
  }, []);

  // Search handler
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&content=true`);
      if (response.ok) {
        const data = await response.json();
        // Transform search results to Book format
        const transformedResults: Book[] = data.results.map((r: any) => ({
          id: r.id,
          title: r.title,
          authors: r.authors,
          coverUrl: r.coverUrl,
          minutes: r.minutes,
          words: r.words,
          subjects: r.subjects,
          // Include extra search info for display
          _matchedFields: r.matchedFields,
          _characters: r.characters,
          _keywords: r.keywords,
          _description: r.description,
        }));
        setSearchResults(transformedResults);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          page: '1',
          limit: itemsPerPage.toString(),
          sortBy: sortBy,
        });

        if (filters.ageCategories.length > 0) {
          params.set('ageCategories', filters.ageCategories.join(','));
        }
        if (filters.durations.length > 0) {
          params.set('durations', filters.durations.join(','));
        }
        if (filters.languages.length > 0) {
          params.set('languages', filters.languages.join(','));
        }
        if (filters.offlineOnly) {
          params.set('offlineOnly', 'true');
        }

        const response = await fetch(`/api/catalog?${params.toString()}`, {
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          setBooks(data.results);
        } else {
          setError(`Failed to fetch catalog: ${response.status}`);
        }
      } catch (e) {
        setError(`Error fetching catalog: ${e}`);
        console.error('Catalog fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [itemsPerPage, sortBy, filters]);

  const handleRemoveFilter = (type: 'age' | 'duration' | 'language' | 'offline', value: string) => {
    setFilters(prev => {
      if (type === 'age') {
        return { ...prev, ageCategories: prev.ageCategories.filter(v => v !== value) };
      } else if (type === 'duration') {
        return { ...prev, durations: prev.durations.filter(v => v !== value) };
      } else if (type === 'language') {
        return { ...prev, languages: prev.languages.filter(v => v !== value) };
      } else if (type === 'offline') {
        return { ...prev, offlineOnly: false };
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-r from-[#c7cdc8] via-[#fdf7f4] to-[#c7cdc8] dark:bg-gray-950 overflow-hidden">

      {/* Soft overlay to keep text readable */}
      <div
        className="pointer-events-none absolute inset-0 bg-white/70 dark:bg-gray-950/70"
        aria-hidden="true"
      />
      {/* Responsive Sidebar Navigation */}
      <Sidebar activePage="home">
     

        {/* Storage Info */}
        <div className="pt-4 border-t border-black/5 bg-white/60 p-3 rounded-2xl ring-1 ring-black/5">
          <div className="mb-2 flex items-center gap-2">
            <Library className="h-4 w-4 text-[#6BA8A9]" />
            <h3 className="text-xs font-semibold text-slate-800">Your Library</h3>
          </div>
          <StorageInfo />
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="relative z-10 ml-0 md:ml-[17.5rem] min-h-screen">


        <div className="w-full mx-auto space-y-6 px-4 md:px-8 py-6">
          <Hero />

          {/* Search Bar */}
          <div className="relative">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.querySelector('input[type="text"]') as HTMLInputElement | null;
                const value = input?.value ?? searchQuery;
                handleSearch(value);
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      clearSearch();
                    }
                  }}
                  placeholder="Search by title, author, character, keyword..."
                  className="w-full pl-12 pr-10 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#6BA8A9]/40 focus:border-transparent shadow-sm backdrop-blur"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6BA8A9] to-[#5F9798] text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
            {searchResults !== null && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {searchResults.length > 0 ? (
                  <span>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</span>
                ) : (
                  <span>No results found for &quot;{searchQuery}&quot;</span>
                )}
                <button
                  type="button"
                  onClick={clearSearch}
                  className="ml-2 text-[#6BA8A9] hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Active Filters */}
          <ActiveFilters filters={filters} onRemove={handleRemoveFilter} />

          {/* Controls Row */}
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/50 backdrop-blur px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sort by:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF8B7B]/40 focus:border-transparent shadow-sm"
                  >
                    <option value="popularity">Most Popular</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="author">Author (A-Z)</option>
                    <option value="length">Shortest First</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Books per page:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6BA8A9]/40 focus:border-transparent shadow-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-between lg:justify-end">
                {/* Version segmented control */}
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-700 dark:text-gray-300"> </div>
                  <div className="inline-flex rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 p-1 shadow-sm">
                    {TIME_OPTIONS.map((opt) => {
                      const isSelected = selectedTimeOptionId === opt.id;
                      const label = opt.id === 'full' ? 'Full story' : 'Bedtime adaptation';
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedTimeOptionId(opt.id);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem(TIME_SELECTION_KEY, opt.id);
                            }
                          }}
                          className={
                            isSelected
                              ? 'px-4 py-2 rounded-lg bg-[#6BA8A9] text-white text-sm font-semibold shadow'
                              : 'px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-900/60'
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

      <div className="">

      
          {/* Error State */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd9b5] to-[#ffb7b0] ring-1 ring-black/5">
                <BookOpen className="h-7 w-7 text-[#ff7b6b]" />
              </div>
              <p className="text-rose-800 dark:text-rose-200 font-semibold">
                {error}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && !searchResults && <BookGridSkeleton count={itemsPerPage} />}

          {/* Search Results */}
          {searchResults !== null && searchResults.length > 0 && (
            <>
              <div className="">
                <BookGrid initialBooks={searchResults} timeSelection={selectedTimeOptionId} displayMode="covers" />
              </div>
            </>
          )}

          {/* Book Grid (when not searching) */}
          {!loading && !error && books.length > 0 && searchResults === null && (
            <>
              {/* Background image */}

              <div className="">
                <BookGrid initialBooks={books} timeSelection={selectedTimeOptionId} displayMode="covers" />
              </div>

              {/* Book Count */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Showing {books.length} book{books.length !== 1 ? 's' : ''}
              </div>
            </>
          )}

          {/* Empty State */}
          {!loading && !error && books.length === 0 && searchResults === null && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center shadow-lg border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd9b5] to-[#ffb7b0] ring-1 ring-black/5">
                <BookOpen className="h-7 w-7 text-[#ff7b6b]" />
              </div>
              <h3 className="text-xl font-semibold text-[#6BA8A9] mb-2">
                No books found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {filters.ageCategories.length > 0 || filters.durations.length > 0 || filters.languages.length > 0 || filters.offlineOnly
                  ? 'Try adjusting your filters to see more results.'
                  : 'Try running the populate script to add books to your catalog.'}
              </p>
              {(filters.ageCategories.length > 0 || filters.durations.length > 0 || filters.languages.length > 0 || filters.offlineOnly) && (
                <button
                  onClick={() => setFilters({ ageCategories: [], durations: [], languages: [], offlineOnly: false })}
                  className="px-6 h-11 rounded-full bg-gradient-to-r from-[#ffb59f] to-[#ff7f76] text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
        </div>
        </div>
      </div>
    
  );
}
