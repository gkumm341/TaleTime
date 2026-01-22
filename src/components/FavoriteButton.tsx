'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  bookId: number;
  initialFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function FavoriteButton({
  bookId,
  initialFavorited = false,
  onToggle,
  size = 'md',
  showLabel = false,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if book is favorited on mount
    checkFavoriteStatus();
  }, [bookId]);

  async function checkFavoriteStatus() {
    try {
      const response = await fetch('/api/favorites');
      if (!response.ok) return;
      
      const data = await response.json();
      const favorited = data.results.some((fav: any) => fav.id === bookId);
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  }

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);
    const newState = !isFavorited;

    // Optimistic update
    setIsFavorited(newState);
    onToggle?.(newState);

    try {
      if (newState) {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
        });

        if (!response.ok) {
          throw new Error('Failed to add favorite');
        }
      } else {
        // Remove from favorites
        const response = await fetch(`/api/favorites?bookId=${bookId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove favorite');
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert optimistic update
      setIsFavorited(!newState);
      onToggle?.(!newState);
    } finally {
      setIsLoading(false);
    }
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center gap-2
        rounded-full
        transition-all duration-200
        bg-transparent
        ${isFavorited ? 'text-red-600 dark:text-red-400' : 'text-white dark:text-gray-400'}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-transform duration-200 ${isFavorited ? 'fill-current' : 'fill-none'} ${isLoading ? 'animate-pulse' : ''}`}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
}
