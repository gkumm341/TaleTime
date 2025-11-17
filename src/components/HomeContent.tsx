'use client';

import { useState, useEffect } from 'react';
import { BookGrid } from '@/components/BookGrid';
import { BookFilters, FilterState } from '@/components/BookFilters';
import { ActiveFilters } from '@/components/ActiveFilters';
import { BookGridSkeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';

export function HomeContent() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('popularity');
  const [filters, setFilters] = useState<FilterState>({
    ageCategories: [],
    durations: [],
    languages: [],
  });

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

  const handleRemoveFilter = (type: 'age' | 'duration' | 'language', value: string) => {
    setFilters(prev => {
      if (type === 'age') {
        return { ...prev, ageCategories: prev.ageCategories.filter(v => v !== value) };
      } else if (type === 'duration') {
        return { ...prev, durations: prev.durations.filter(v => v !== value) };
      } else {
        return { ...prev, languages: prev.languages.filter(v => v !== value) };
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
            TaleTime
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Browse classic children's books with reading-time estimates. 
            Download and read EPUBs offline with your personalized reading preferences.
          </p>
        </div>

        {/* Filters */}
        <BookFilters filters={filters} onChange={setFilters} />

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
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && <BookGridSkeleton count={itemsPerPage} />}

        {/* Book Grid */}
        {!loading && !error && books.length > 0 && (
          <>
            <BookGrid initialBooks={books} />
            
            {/* Book Count */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Showing {books.length} book{books.length !== 1 ? 's' : ''}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No books found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filters.ageCategories.length > 0 || filters.durations.length > 0 || filters.languages.length > 0
                ? 'Try adjusting your filters to see more results.'
                : 'Try running the populate script to add books to your catalog.'}
            </p>
            {(filters.ageCategories.length > 0 || filters.durations.length > 0 || filters.languages.length > 0) && (
              <button
                onClick={() => setFilters({ ageCategories: [], durations: [], languages: [] })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
