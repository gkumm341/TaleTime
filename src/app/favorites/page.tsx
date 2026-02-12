'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface FavoriteBook {
  favoriteId: number;
  id: number; // bookId
  title: string;
  authors: string;
  coverUrl?: string;
  epubUrl?: string;
  minutes?: number;
  words?: number;
  addedAt: number;
  notes?: string | null;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');
  const [ratingsById, setRatingsById] = useState<Record<number, number>>({});

  useEffect(() => {
    loadFavorites();
  }, [sortBy]);

  useEffect(() => {
    let cancelled = false;
    const ids = favorites.map((f) => f.id).filter((id) => Number.isFinite(id));
    if (ids.length === 0) {
      setRatingsById({});
      return;
    }

    const loadRatings = async () => {
      try {
        const res = await fetch(`/api/ratings?bookIds=${ids.join(',')}`);
        if (!res.ok) {
          if (!cancelled) setRatingsById({});
          return;
        }
        const json = (await res.json()) as { ratings?: Record<string, number> };
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(json.ratings ?? {})) {
          const bookId = Number(k);
          if (!Number.isFinite(bookId)) continue;
          if (typeof v !== 'number') continue;
          if (v < 1 || v > 5) continue;
          next[bookId] = v;
        }
        if (!cancelled) setRatingsById(next);
      } catch {
        if (!cancelled) setRatingsById({});
      }
    };

    void loadRatings();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  async function loadFavorites() {
    try {
      const response = await fetch(`/api/favorites?sortBy=${sortBy}`);
      if (!response.ok) throw new Error('Failed to load favorites');
      
      const data = await response.json();
      setFavorites(data.results ?? []);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(bookId: number) {
    try {
      const response = await fetch(`/api/favorites?bookId=${bookId}`, { method: 'DELETE' });

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== bookId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  }

  return (
    <div className="min-h-screen relative bg-tt-surface dark:bg-gray-900 transition-colors duration-500">
      <Image src="/flowers_background.png" alt="Favorites Background" layout="fill" objectFit="cover" quality={75} />
      {/* Responsive Sidebar Navigation */}
      <Sidebar activePage="favorites" />

      {/* Main Content */}
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
        
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-bold text-tt-tertiary">
                Your Favorite Books
              </h1>
            </div>
            
            {favorites.length > 0 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'title')}
                className="px-4 py-2 rounded-tt border border-tt-border dark:border-tt-border bg-tt-surface/90 dark:bg-gray-800/90 backdrop-blur-sm text-tt-primary dark:text-white focus:ring-2 focus:ring-tt-tertiary focus:border-transparent shadow-sm font-medium"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A-Z)</option>
              </select>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-tt-tertiary border-t-transparent"></div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20 animate-in fade-in duration-700">
              <div className="inline-block bg-tt-surface dark:bg-gray-900 backdrop-blur-xl rounded-3xl p-12 border border-tt-border/20 dark:border-tt-border/10 shadow-lg">
                <div className="text-6xl mb-4">💔</div>
                <h2 className="text-2xl font-bold text-tt-primary dark:text-white mb-2">No favorites yet</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Start adding books to your favorites by clicking the heart icon!</p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-tt-tertiary hover:bg-tt-tertiary/90 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-lg">🏠</span>
                  Browse Stories
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {favorites.map((favorite, index) => (
                <div
                  key={favorite.favoriteId}
                  className="group rounded-2xl border-2 border-pink-200/50 dark:border-pink-900/50 overflow-hidden hover:shadow-2xl hover:shadow-pink-300/50 dark:hover:shadow-pink-900/50 transition-all duration-500 bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 hover:border-pink-400 dark:hover:border-pink-600 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Link href={`/book/${favorite.id}/abridged?variant=full`}>
                    <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
                      <Image
                        src={`/api/local-image?title=${encodeURIComponent(favorite.title)}`}
                        alt={favorite.title}
                        fill
                        className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
                        sizes="20vw"
                        unoptimized
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      {typeof ratingsById[favorite.id] === 'number' && ratingsById[favorite.id] >= 1 && ratingsById[favorite.id] <= 5 && (
                        <div className="pointer-events-none absolute top-2 left-2 rounded-full bg-yellow-100/90 text-yellow-800 text-[11px] font-extrabold px-2 py-1 shadow-md ring-1 ring-yellow-300/50">
                          {'★'.repeat(ratingsById[favorite.id])}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </Link>
                  
                  <div className="p-2 space-y-1 relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-400/10 to-purple-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeFavorite(favorite.id)}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-10"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    
                    <Link href={`/book/${favorite.id}/abridged?variant=full`}>
                      <h3 className="font-bold text-xs line-clamp-2 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all relative z-10 pr-6">
                        {favorite.title}
                      </h3>
                    </Link>
                    
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium relative z-10">
                      <span className="text-xs lg:text-base">✍️</span> {favorite.authors}
                    </p>
                    
              
                    
                    <p className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 pt-2 relative z-10">
                      Added {new Date(favorite.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}