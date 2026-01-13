'use client';

import { useState, useEffect } from 'react';
import { BookGrid } from '@/components/BookGrid';
import { BookFilters, FilterState } from '@/components/BookFilters';
import { ActiveFilters } from '@/components/ActiveFilters';
import { StorageInfo } from '@/components/StorageInfo';
import { BookGridSkeleton } from '@/components/ui/skeleton';
import ContinueReading from '@/components/ContinueReading';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { ChevronDown, Clock } from 'lucide-react';

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
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [selectedTimeOptionId, setSelectedTimeOptionId] = useState<TimeOptionId | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    ageCategories: [],
    durations: [],
    languages: [],
    offlineOnly: false,
  });

  const selectedTimeLabel = selectedTimeOptionId
    ? TIME_OPTIONS.find((o) => o.id === selectedTimeOptionId)?.label
    : null;

  // Load persisted selection (client only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(TIME_SELECTION_KEY);
    if (!raw) return;
    if (TIME_OPTIONS.some((o) => o.id === raw)) {
      setSelectedTimeOptionId(raw as TimeOptionId);
    }
  }, []);

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
    <div className="min-h-screen relative bg-white dark:bg-gray-950">
      {/* Responsive Sidebar Navigation */}
      <Sidebar activePage="home">
        {/* Filters */}
        <div className="pt-4 border-t border-[#B5CDA3]/30 dark:border-[#B5CDA3]/20">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-sm font-semibold text-[#6BA8A9]">Find Your Story</h3>
          </div>
          <BookFilters filters={filters} onChange={setFilters} />
        </div>
        
        {/* Storage Info */}
        <div className="pt-4 border-t border-[#B5CDA3]/30 dark:border-[#B5CDA3]/20 bg-[#6BA8A9]/5 dark:from-[#6BA8A9]/10 dark:to-[#B5CDA3]/5 p-3 rounded-lg">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base">📚</span>
            <h3 className="text-xs font-semibold text-[#6BA8A9]">Your Library</h3>
          </div>
          <StorageInfo />
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="relative z-10 ml-0 md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Mobile Header - TaleTime Logo */}
        <div className="md:hidden text-center mb-6 animate-in fade-in slide-in-from-top duration-700">
          <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
          <h1 className="text-4xl font-black text-[#6BA8A9] drop-shadow-lg">
            TaleTime
          </h1>
          <p className="text-sm font-bold text-[#FF8B7B] mt-2">Your story telling companion</p>
        </div>

        {/* Hero Action: Time Selector */}
        <div className="relative flex justify-center md:justify-end">
          <div className="flex flex-col items-center md:items-end gap-1">
            <div className="text-xs font-semibold text-[#6BA8A9]">Choose a version</div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTimeMenuOpen((v) => !v)}
            className="gap-2"
            aria-haspopup="menu"
            aria-expanded={isTimeMenuOpen}
          >
            <Clock className="w-4 h-4" />
            {selectedTimeLabel ?? 'Choose version'}
            <ChevronDown className={`w-4 h-4 transition-transform ${isTimeMenuOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isTimeMenuOpen && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsTimeMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-[#B5CDA3]/30 dark:border-[#B5CDA3]/20 py-2 z-50">
                {TIME_OPTIONS.map((opt) => {
                  const isSelected = selectedTimeOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedTimeOptionId(opt.id);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(TIME_SELECTION_KEY, opt.id);
                        }
                        setIsTimeMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm ${
                        isSelected ? 'bg-[#6BA8A9]/10' : ''
                      }`}
                      role="menuitem"
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>

        {/* Active Filters */}
        <ActiveFilters filters={filters} onRemove={handleRemoveFilter} />

        {/* Sort and Items Per Page Selector */}
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-pink-200 dark:border-pink-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-400 focus:border-transparent shadow-sm"
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
              className="px-4 py-2 rounded-lg border border-[#B5CDA3] dark:border-[#B5CDA3] bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6BA8A9] focus:border-transparent shadow-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center shadow-sm">
            <p className="text-rose-800 dark:text-rose-200 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && <BookGridSkeleton count={itemsPerPage} />}

        {/* Book Grid */}
        {!loading && !error && books.length > 0 && (
          <>
            <BookGrid initialBooks={books} timeSelection={selectedTimeOptionId} />
            
            {/* Book Count */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Showing {books.length} book{books.length !== 1 ? 's' : ''}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center shadow-lg border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10">
            <div className="text-6xl mb-4">📚</div>
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
                className="px-6 py-3 bg-[#6BA8A9] text-white rounded-lg hover:bg-[#5F9798] transition-all shadow-md hover:shadow-lg"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
