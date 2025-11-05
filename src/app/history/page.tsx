'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/Navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { BookOpen, Clock, Trash2, Calendar } from 'lucide-react'
import { getStoryById, type Story } from '@/lib/stories'

interface HistoryEntry {
  storyId: string
  title: string
  startedAt: string
  progress: number
  lastReadAt?: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<(HistoryEntry & { story?: Story })[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Load reading history from localStorage
    const historyData = JSON.parse(localStorage.getItem('taletime-history') || '[]')
    const enrichedHistory = historyData.map((entry: HistoryEntry) => ({
      ...entry,
      story: getStoryById(entry.storyId)
    })).filter((entry: HistoryEntry & { story?: Story }) => entry.story)
    
    setHistory(enrichedHistory)
    setLoading(false)
  }, [])

  const removeFromHistory = (storyId: string) => {
    const historyData = JSON.parse(localStorage.getItem('taletime-history') || '[]')
    const newHistory = historyData.filter((entry: HistoryEntry) => entry.storyId !== storyId)
    localStorage.setItem('taletime-history', JSON.stringify(newHistory))
    
    setHistory(prev => prev.filter(entry => entry.storyId !== storyId))
  }

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear your entire reading history?')) {
      localStorage.removeItem('taletime-history')
      setHistory([])
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
        }`}>
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white/70 rounded-xl p-6 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="h-6 bg-gray-300 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
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
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Reading History
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Track your reading journey and continue where you left off
              </p>
            </div>
            
            {history.length > 0 && (
              <Button
                onClick={clearAllHistory}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {history.length > 0 ? (
            <>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {history.length} {history.length === 1 ? 'story' : 'stories'} in your reading history
              </p>
              
              <div className="space-y-4">
                {history.map((entry) => {
                  if (!entry.story) return null
                  
                  return (
                    <Card key={entry.storyId} className={`backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 border ${
                      isDarkMode 
                        ? 'bg-gray-800/80 border-gray-600' 
                        : 'bg-white/80 border-white/50'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent leading-tight mb-2">
                                  {entry.story.title}
                                </h3>
                                
                                <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {entry.story.teaser}
                                </p>

                                <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                      Started {formatDate(entry.startedAt)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                      {entry.story.time} min read
                                    </span>
                                  </div>

                                  <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs rounded-full">
                                    {entry.story.genre}
                                  </span>

                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {entry.story.author}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      Reading Progress
                                    </span>
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {Math.round(entry.progress)}%
                                    </span>
                                  </div>
                                  <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <div 
                                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${entry.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Button 
                              onClick={() => router.push(`/story/${entry.story!.id}`)}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              <BookOpen className="mr-2" size={14} /> 
                              {entry.progress > 0 ? 'Continue' : 'Start'}
                            </Button>
                            <Button
                              onClick={() => removeFromHistory(entry.storyId)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 px-2 py-1"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
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
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    No reading history yet
                  </h3>
                  <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Start reading stories to track your progress and build your reading history!
                  </p>
                  <Button 
                    onClick={() => router.push('/search')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <BookOpen className="mr-2" size={16} />
                    Start Reading
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