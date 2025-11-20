'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Clock } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface HistoryBook {
  id: number;
  bookId: number;
  lastReadAt: string;
  lastPosition?: string;
  progressPercent: number;
  timeSpent: number;
  book: {
    id: number;
    title: string;
    authors: string;
    coverUrl?: string;
    epubUrl?: string;
    estimatedMinutes?: number;
  };
}

interface GroupedHistory {
  today: HistoryBook[];
  last7Days: HistoryBook[];
  earlier: HistoryBook[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<GroupedHistory>({
    today: [],
    last7Days: [],
    earlier: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error('Failed to load history');
      
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFromHistory(historyId: number) {
    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });

      if (response.ok) {
        loadHistory();
      }
    } catch (error) {
      console.error('Failed to remove from history:', error);
    }
  }

  const totalBooks = history.today.length + history.last7Days.length + history.earlier.length;
  const totalMinutesRead = [...history.today, ...history.last7Days, ...history.earlier]
    .reduce((sum, item) => sum + item.timeSpent, 0);

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <img 
          src="/girl.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-pink-50/90 to-purple-50/85 dark:from-gray-900/90 dark:via-purple-900/80 dark:to-gray-900/90 backdrop-blur-sm"></div>
      </div>

      <Sidebar activePage="history" />

      <div className="relative z-10 ml-0 md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto space-y-8">
        
          {/* Mobile Header - TaleTime Logo */}
          <div className="md:hidden text-center mb-6 animate-in fade-in slide-in-from-top duration-700">
            <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
              TaleTime
            </h1>
            <p className="text-sm font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mt-2">Your story telling companion</p>
          </div>
        
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-pulse"></span>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
                Reading History
              </h1>
            </div>
            
            {totalBooks > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border border-purple-200 dark:border-purple-800 font-semibold shadow-md">
                   {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
                </div>
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 border border-rose-200 dark:border-rose-800 font-semibold shadow-md">
                   {Math.round(totalMinutesRead)} min total
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : totalBooks === 0 ? (
            <div className="text-center py-20 animate-in fade-in duration-700">
              <div className="inline-block bg-gradient-to-br from-white/90 via-pink-50/80 to-purple-50/80 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/80 backdrop-blur-xl rounded-2xl p-12 border-2 border-purple-300/50 dark:border-purple-900/50 shadow-2xl">
                <div className="text-6xl mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No reading history yet</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Start reading books to build your history!</p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-lg"></span>
                  Browse Stories
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {history.today.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700">
                  <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Today
                  </h2>
                  <div className="grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {history.today.map((item, index) => (
                      <HistoryCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeFromHistory}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </div>
              )}

              {history.last7Days.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-150">
                  <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Last 7 Days
                  </h2>
                  <div className="grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {history.last7Days.map((item, index) => (
                      <HistoryCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeFromHistory}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </div>
              )}

              {history.earlier.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                  <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                    <span className="text-2xl"></span>
                    Earlier
                  </h2>
                  <div className="grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {history.earlier.map((item, index) => (
                      <HistoryCard 
                        key={item.id} 
                        item={item} 
                        onRemove={removeFromHistory}
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
  item: HistoryBook;
  onRemove: (id: number) => void;
  animationDelay: number;
}

function HistoryCard({ item, onRemove, animationDelay }: HistoryCardProps) {
  const estimatedMinutes = item.book.estimatedMinutes || 0;
  const timeLeft = Math.ceil((estimatedMinutes * (100 - item.progressPercent)) / 100);
  const isCompleted = item.progressPercent >= 100;

  return (
    <div
      className="group rounded-2xl border-2 border-purple-200/50 dark:border-purple-900/50 overflow-hidden hover:shadow-2xl hover:shadow-purple-300/50 dark:hover:shadow-purple-900/50 transition-all duration-500 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 hover:border-purple-400 dark:hover:border-purple-600 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Link href={`/book/${item.bookId}`}>
        {item.book.coverUrl && (
          <div className="relative w-full h-32 bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
            <Image
              src={item.book.coverUrl}
              alt={item.book.title}
              fill
              className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
              sizes="20vw"
            />
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${item.progressPercent}%` }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        )}
      </Link>
      
      <div className="p-2 space-y-1 relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
        
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-10"
          title="Remove from history"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        
        <Link href={`/book/${item.bookId}`}>
          <h3 className="font-bold text-xs line-clamp-2 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all relative z-10 pr-6">
            {item.book.title}
          </h3>
        </Link>
        
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium relative z-10 lg:flex items-center gap-1.5">
          <span className="text-xs lg:text-base">✍️</span>
          {item.book.authors}
        </p>
        
        <div className="flex flex-wrap items-center gap-1 lg:gap-2 text-xs pt-1 lg:pt-2 relative z-10">
          {isCompleted ? (
            <span className="inline-flex items-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 text-green-800 dark:text-green-200 font-semibold shadow-md border border-green-200 dark:border-green-800 text-xs">
              <span className="lg:hidden">✓</span><span className="hidden lg:inline">✅ Completed</span>
            </span>
          ) : (
            <>
              <span className="inline-flex items-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-800 dark:text-purple-200 font-semibold shadow-md border border-purple-200 dark:border-purple-800 text-xs">
                <span className="lg:hidden">📊 </span>{item.progressPercent}%
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
            {Math.round(item.timeSpent)} min read
          </span>
          <span>
            {new Date(item.lastReadAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
