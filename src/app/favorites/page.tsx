'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/Navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { BookOpen, Clock, Trash2, Heart } from 'lucide-react'
import { getStoryById, type Story } from '@/lib/stories'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Load favorites from localStorage
    const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
    const favoriteStories = bookmarks
      .map((id: string) => getStoryById(id))
      .filter((story: Story | undefined): story is Story => story !== undefined)
    
    setFavorites(favoriteStories)
    setLoading(false)
  }, [])

  const removeFromFavorites = (storyId: string) => {
    const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
    const newBookmarks = bookmarks.filter((id: string) => id !== storyId)
    localStorage.setItem('taletime-bookmarks', JSON.stringify(newBookmarks))
    
    setFavorites(prev => prev.filter(story => story.id !== storyId))
  }

  const clearAllFavorites = () => {
    if (confirm('Are you sure you want to remove all favorites?')) {
      localStorage.removeItem('taletime-bookmarks')
      setFavorites([])
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'
        }`}>
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white/70 rounded-3xl p-6 shadow-xl">
                    <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 via-white to-purple-50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Favorite Stories
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your bookmarked tales for later reading
              </p>
            </div>
            
            {favorites.length > 0 && (
              <Button
                onClick={clearAllFavorites}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {favorites.length > 0 ? (
            <>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {favorites.length} {favorites.length === 1 ? 'story' : 'stories'} in your favorites
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((story) => (
                  <Card key={story.id} className={`group backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border hover:scale-105 hover:-translate-y-1 ${
                    isDarkMode 
                      ? 'bg-gray-800/80 border-gray-600' 
                      : 'bg-white/70 border-white/50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-pink-800 to-purple-800 bg-clip-text text-transparent leading-tight flex-1 group-hover:from-pink-600 group-hover:to-purple-600 transition-all duration-300">
                          {story.title}
                        </h3>
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Clock className="text-white" size={16} />
                        </div>
                      </div>
                      
                      <p className={`text-sm leading-relaxed mb-4 group-hover:text-opacity-80 transition-colors duration-300 line-clamp-3 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {story.teaser}
                      </p>

                      <div className="flex items-center justify-between mb-4 text-xs">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          by {story.author}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {story.mood}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 font-medium text-sm rounded-full border border-pink-200/50">
                          {story.genre}
                        </span>
                        <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium text-sm rounded-full border border-green-200/50">
                          {story.time} min
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {story.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`px-2 py-1 text-xs rounded-full ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => router.push(`/story/${story.id}`)}
                          className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center group-hover:shadow-pink-500/50"
                        >
                          <BookOpen className="mr-2 group-hover:rotate-12 transition-transform duration-300" size={16} /> 
                          Read
                        </Button>
                        <Button
                          onClick={() => removeFromFavorites(story.id)}
                          variant="outline"
                          size="sm"
                          className="p-2 text-pink-600 border-pink-300 hover:bg-pink-50"
                        >
                          <Heart size={16} fill="currentColor" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Card className={`backdrop-blur-md shadow-xl border max-w-md mx-auto ${
                isDarkMode 
                  ? 'bg-gray-800/60 border-gray-600' 
                  : 'bg-white/60 border-white/50'
              }`}>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">💖</div>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    No favorites yet
                  </h3>
                  <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Start bookmarking stories you love to build your personal collection!
                  </p>
                  <Button 
                    onClick={() => router.push('/search')}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                  >
                    <BookOpen className="mr-2" size={16} />
                    Discover Stories
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  )
}