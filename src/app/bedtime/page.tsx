'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookGrid } from '@/components/BookGrid';
import { Sidebar } from '@/components/Sidebar';
import { BookGridSkeleton } from '@/components/ui/skeleton';
import { Moon, Clock, Sparkles } from 'lucide-react';

export default function BedtimeModePage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<5 | 10 | 15>(10);
  const router = useRouter();

  useEffect(() => {
    const fetchBedtimeStories = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch books with appropriate duration filter
        const params = new URLSearchParams({
          page: '1',
          limit: '50',
          sortBy: 'popularity',
          durations: 'short', // Stories under 10 minutes
        });

        // Adjust filter based on selected duration
        if (selectedDuration === 5) {
          params.set('durations', 'short');
        } else if (selectedDuration === 10) {
          params.set('durations', 'short,medium');
        } else {
          params.set('durations', 'short,medium');
        }

        // Filter for kid-friendly content
        params.set('ageCategories', 'early-readers,beginning-readers');

        const response = await fetch(`/api/catalog?${params.toString()}`, { 
          cache: 'no-store' 
        });
        
        if (response.ok) {
          const data = await response.json();
          // Further filter by exact duration
          const filtered = data.results.filter((book: any) => {
            if (!book.minutes) return false;
            if (selectedDuration === 5) return book.minutes <= 5;
            if (selectedDuration === 10) return book.minutes <= 10;
            return book.minutes <= 15;
          });
          setBooks(filtered);
        } else {
          setError(`Failed to fetch stories: ${response.status}`);
        }
      } catch (e) {
        setError(`Error fetching stories: ${e}`);
        console.error('Bedtime stories fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBedtimeStories();
  }, [selectedDuration]);

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-gray-900 via-tt-primary to-gray-950">
      <Sidebar activePage="bedtime" />

      <div className="relative z-10 ml-0 md:ml-72 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Moon className="w-12 h-12 text-yellow-300 animate-pulse" />
            <h1 className="text-4xl sm:text-5xl font-bold text-white">
              Bedtime Stories
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
          <p className="text-lg text-tt-border max-w-2xl mx-auto">
            Perfect stories for winding down. Choose your reading time and drift into dreamland.
          </p>
        </div>

        {/* Duration Selector */}
        <div className="bg-white/10 backdrop-blur-lg rounded-tt border border-white/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-tt-border" />
            <h2 className="text-lg font-semibold text-white">
              How much time before sleep?
            </h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[5, 10, 15].map((duration) => (
              <button
                key={duration}
                onClick={() => setSelectedDuration(duration as 5 | 10 | 15)}
                className={`relative px-6 py-8 rounded-tt border-2 transition-all transform hover:scale-105 ${
                  selectedDuration === duration
                    ? 'border-tt-tertiary bg-tt-tertiary/20 shadow-lg shadow-tt-tertiary/50'
                    : 'border-white/30 bg-white/5 hover:border-tt-border hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl font-bold text-white">
                    {duration}
                  </span>
                  <span className="text-sm text-tt-border">
                    minutes
                  </span>
                  {selectedDuration === duration && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-tt-tertiary rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Book Count */}
        {!loading && (
          <div className="text-center">
            <p className="text-tt-border">
              Found <span className="font-bold text-tt-tertiary">{books.length}</span> bedtime {books.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <BookGridSkeleton count={12} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && books.length > 0 && (
          <div className="pb-8">
            <BookGrid initialBooks={books} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && books.length === 0 && (
          <div className="text-center py-12">
            <Moon className="w-16 h-16 mx-auto text-tt-border mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No stories found for this duration
            </h3>
            <p className="text-tt-border mb-4">
              Try selecting a longer duration or check back later.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-tt-tertiary text-white rounded-tt hover:bg-tt-tertiary transition-colors"
            >
              Browse All Stories
            </button>
          </div>
        )}

        {/* Bedtime Tips */}
        <div className="bg-white/10 backdrop-blur-lg rounded-tt border border-white/20 p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            Bedtime Reading Tips
          </h3>
          <ul className="space-y-2 text-tt-border text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-300">✨</span>
              <span>Dim the lights to create a relaxing atmosphere</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-300">✨</span>
              <span>Read in a comfortable, cozy spot</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-300">✨</span>
              <span>Use the sepia or dark theme for easier reading before bed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-300">✨</span>
              <span>Make it a nightly routine for better sleep</span>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}
