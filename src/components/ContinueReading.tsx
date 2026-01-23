'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Palette, Sparkles } from 'lucide-react';

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
      
      const data = (await response.json()) as {
        grouped?: {
          today?: RecentBook[];
          lastWeek?: RecentBook[];
        };
      };
      // Get the 6 most recent books from today and last week
      const recent = [
        ...(data.grouped?.today ?? []),
        ...(data.grouped?.lastWeek ?? []),
      ]
        .filter((book) => book.progressPercent > 0 && book.progressPercent < 100)
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
      <div className="tt-card p-6 shadow-tt rounded-tt-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-tt-tertiary/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-tt bg-gradient-to-br from-tt-secondary to-tt-accent ring-1 ring-tt-border/10 shadow-sm">
              <Palette className="h-6 w-6 text-tt-accent" />
            </span>
            <h2 className="text-2xl font-bold text-tt-tertiary">
              Continue Your Adventure
            </h2>
          </div>
          <Link 
            href="/history"
            className="text-sm font-semibold text-tt-accent hover:text-tt-tertiary transition-all flex items-center gap-1.5 group"
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
                className="group flex-shrink-0 w-48 rounded-tt border border-tt-border/20 dark:border-tt-border/10 overflow-hidden hover:shadow-lg hover:shadow-tt-tertiary/10 dark:hover:shadow-tt-tertiary/5 transition-all duration-500 bg-tt-surface dark:bg-tt-primary hover:border-tt-tertiary/40 dark:hover:border-tt-tertiary/30 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-left duration-700"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-tt-tertiary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    {/* Progress overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-tt-surface/80 dark:bg-tt-primary/80 backdrop-blur-sm overflow-hidden">
                      <div 
                        className="h-full bg-tt-tertiary transition-all duration-700 relative"
                        style={{ width: `${book.progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    {/* Progress badge */}
                    <div className="absolute top-2 right-2 bg-tt-accent backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-tt inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{book.progressPercent}%</span>
                    </div>
                  </div>
                )}
                
                <div className="p-4 space-y-2 relative">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-tt-tertiary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-tt-tertiary transition-all relative z-10">
                    {book.title}
                  </h3>
                  
                  <p className="text-xs text-tt-muted line-clamp-1 relative z-10 font-medium">
                    {book.authors}
                  </p>
                  
                  {timeLeft && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold pt-1 relative z-10">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-tt-tertiary/20 text-tt-tertiary border border-tt-tertiary/30 dark:border-tt-tertiary/40">
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
