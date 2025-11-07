'use client';

import { useState, useEffect } from 'react';
import { BookGrid } from '@/components/BookGrid';
import { Select } from '@/components/ui/select';

export function HomeContent() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/catalog?page=1&limit=${itemsPerPage}`, { 
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
  }, [itemsPerPage]);

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

        {/* Items Per Page Selector */}
        <div className="flex justify-end items-center gap-3">
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

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading books...</p>
          </div>
        )}

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
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No books found. Try running the populate script to add books.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
