'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface FavoriteBook {
  id: number;
  bookId: number;
  addedAt: string;
  notes?: string;
  book: {
    id: number;
    title: string;
    authors: string;
    coverUrl?: string;
    epubUrl?: string;
    estimatedMinutes?: number;
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');

  useEffect(() => {
    loadFavorites();
  }, [sortBy]);

  async function loadFavorites() {
    try {
      const response = await fetch(`/api/favorites?sortBy=${sortBy}`);
      if (!response.ok) throw new Error('Failed to load favorites');
      
      const data = await response.json();
      setFavorites(data.favorites);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(favoriteId: number) {
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteId }),
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  }

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950">
      {/* Responsive Sidebar Navigation */}
      <Sidebar activePage="favorites" />

      {/* Main Content */}
      <div className="relative z-10 ml-0 md:ml-72 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto space-y-8">
        
          {/* Mobile Header - TaleTime Logo */}
          <div className="md:hidden text-center mb-6 animate-in fade-in slide-in-from-top duration-700">
            <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
            <h1 className="text-4xl font-black text-[#6BA8A9] drop-shadow-lg">
              TaleTime
            </h1>
            <p className="text-sm font-bold text-[#FF8B7B] mt-2">Your story telling companion</p>
          </div>
        
          {/* Header */}
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom duration-700">
            <div className="flex items-center gap-3">
              <span className="text-4xl animate-pulse">❤️</span>
              <h1 className="text-4xl font-bold text-[#6BA8A9]">
                Your Favorites
              </h1>
            </div>
            
            {favorites.length > 0 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'title')}
                className="px-4 py-2 rounded-lg border border-[#B5CDA3] dark:border-[#B5CDA3] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6BA8A9] focus:border-transparent shadow-sm font-medium"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A-Z)</option>
              </select>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#6BA8A9] border-t-transparent"></div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20 animate-in fade-in duration-700">
              <div className="inline-block bg-white dark:bg-gray-900 backdrop-blur-xl rounded-3xl p-12 border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 shadow-lg">
                <div className="text-6xl mb-4">💔</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No favorites yet</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Start adding books to your favorites by clicking the heart icon!</p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#6BA8A9] hover:bg-[#5F9798] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <span className="text-lg">🏠</span>
                  Browse Stories
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {favorites.map((favorite, index) => (
                <div
                  key={favorite.id}
                  className="group rounded-2xl border-2 border-pink-200/50 dark:border-pink-900/50 overflow-hidden hover:shadow-2xl hover:shadow-pink-300/50 dark:hover:shadow-pink-900/50 transition-all duration-500 bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 hover:border-pink-400 dark:hover:border-pink-600 transform hover:-translate-y-2 hover:scale-105 animate-in fade-in slide-in-from-bottom duration-700"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Link href={`/book/${favorite.bookId}`}>
                    {favorite.book.coverUrl && (
                      <div className="relative w-full h-32 bg-gradient-to-br from-rose-100 via-pink-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
                        <Image
                          src={favorite.book.coverUrl}
                          alt={favorite.book.title}
                          fill
                          className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-700"
                          sizes="20vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                    )}
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
                    
                    <Link href={`/book/${favorite.bookId}`}>
                      <h3 className="font-bold text-xs line-clamp-2 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all relative z-10 pr-6">
                        {favorite.book.title}
                      </h3>
                    </Link>
                    
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium relative z-10">
                      <span className="text-xs lg:text-base">✍️</span> {favorite.book.authors}
                    </p>
                    
                    <div className="hidden lg:flex items-center gap-2 text-xs pt-2 relative z-10">
                      {favorite.book.estimatedMinutes && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 text-rose-800 dark:text-rose-200 text-xs font-semibold shadow-sm border border-rose-200 dark:border-rose-800">
                          📖 {favorite.book.estimatedMinutes} min
                        </span>
                      )}
                    </div>
                    
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