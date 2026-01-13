'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle, BookOpen } from 'lucide-react';

interface RecentBook {
  id: number;
  title: string;
  authors: string;
  coverUrl?: string;
  progressPercent: number;
  totalReadingTime: number;
  estimatedMinutes?: number;
}

export default function ContinueReading() {
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentBooks();
  }, []);

  async function loadRecentBooks() {
    try {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error('Failed to load history');
      
      const data = await response.json();
      // Get the 6 most recent books from today and last week
      const recent = [
        ...data.grouped.today,
        ...data.grouped.lastWeek,
      ]
        .filter((book: any) => book.progressPercent > 0 && book.progressPercent < 100)
        .slice(0, 6);
      
      setRecentBooks(recent);
    } catch (error) {
      console.error('Failed to load recent books:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || recentBooks.length === 0) {
    return null; // Don't show widget if no recent books
  }

  return (
    <div className="mb-12 animate-in fade-in slide-in-from-left duration-700 delay-150">
      <div className="bg-white dark:bg-gray-900 backdrop-blur-xl rounded-3xl p-6 border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#6BA8A9]/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🎨</span>
            <h2 className="text-2xl font-bold text-[#6BA8A9]">
              Continue Your Adventure
            </h2>
          </div>
          <Link 
            href="/history"
            className="text-sm font-semibold text-[#FF8B7B] hover:text-[#6BA8A9] transition-all flex items-center gap-1.5 group"
          >
            View all
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

      {/* Horizontal scrollable list */}
      <div className="overflow-x-auto -mx-2 px-2 pb-2 relative">
        <div className="flex gap-4 min-w-min">
          {recentBooks.map((book, index) => {
            const timeLeft = book.estimatedMinutes
              ? Math.ceil((book.estimatedMinutes * (100 - book.progressPercent)) / 100)
              : null;

            return (
              <Link
                key={book.id}
                href={`/story/${book.id}`}
                className="group flex-shrink-0 w-48 rounded-2xl border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 overflow-hidden hover:shadow-xl hover:shadow-[#6BA8A9]/10 dark:hover:shadow-[#6BA8A9]/5 transition-all duration-500 bg-white dark:bg-gray-900 hover:border-[#6BA8A9]/40 dark:hover:border-[#6BA8A9]/30 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-left duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {book.coverUrl && (
                  <div className="relative w-full h-56 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
                      sizes="192px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#6BA8A9]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    {/* Progress overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200/80 dark:bg-gray-600/80 backdrop-blur-sm overflow-hidden">
                      <div 
                        className="h-full bg-[#6BA8A9] transition-all duration-700 relative"
                        style={{ width: `${book.progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    {/* Progress badge */}
                    <div className="absolute top-2 right-2 bg-[#FF8B7B] backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg">
                      ✨ {book.progressPercent}%
                    </div>
                  </div>
                )}
                
                <div className="p-4 space-y-2 relative">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#6BA8A9]/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-[#6BA8A9] transition-all relative z-10">
                    {book.title}
                  </h3>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 relative z-10 font-medium">
                    {book.authors}
                  </p>
                  
                  {timeLeft && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold pt-1 relative z-10">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#6BA8A9]/20 dark:from-[#6BA8A9]/20 dark:to-[#6BA8A9]/10 text-[#6BA8A9] dark:text-[#6BA8A9] border border-[#6BA8A9]/30 dark:border-[#6BA8A9]/40">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {timeLeft}m left
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
