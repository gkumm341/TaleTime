'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, BookOpen, Clock, Heart, Share2, RotateCcw, Pause, Play, Settings } from 'lucide-react'
import { getStoryById, type Story } from '@/lib/stories'

interface StoryPageProps {
  params: {
    id: string
  }
}

export default function StoryPage({ params }: StoryPageProps) {
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0)
  const [fontSize, setFontSize] = useState(16)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const foundStory = getStoryById(params.id)
    if (foundStory) {
      setStory(foundStory)
      setEstimatedTimeLeft(foundStory.time)
      
      // Check if bookmarked
      const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
      setIsBookmarked(bookmarks.includes(foundStory.id))
    }
  }, [params.id])

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current && isReading && !isPaused) {
        const element = scrollRef.current
        const scrollTop = element.scrollTop
        const scrollHeight = element.scrollHeight - element.clientHeight
        const progress = Math.min((scrollTop / scrollHeight) * 100, 100)
        setReadingProgress(progress)
        
        // Update estimated time left based on progress
        if (story && startTime) {
          const elapsedTime = (new Date().getTime() - startTime.getTime()) / (1000 * 60) // minutes
          const progressRatio = progress / 100
          if (progressRatio > 0) {
            const estimatedTotal = elapsedTime / progressRatio
            const timeLeft = Math.max(0, estimatedTotal - elapsedTime)
            setEstimatedTimeLeft(Math.round(timeLeft))
          }
        }
      }
    }

    const element = scrollRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [isReading, isPaused, story, startTime])

  const startReading = () => {
    setIsReading(true)
    setStartTime(new Date())
    setIsPaused(false)
    
    // Save to reading history
    const history = JSON.parse(localStorage.getItem('taletime-history') || '[]')
    const historyEntry = {
      storyId: story?.id,
      title: story?.title,
      startedAt: new Date().toISOString(),
      progress: 0
    }
    
    // Remove existing entry for this story and add new one
    const filteredHistory = history.filter((entry: any) => entry.storyId !== story?.id)
    filteredHistory.unshift(historyEntry)
    localStorage.setItem('taletime-history', JSON.stringify(filteredHistory.slice(0, 50))) // Keep last 50
  }

  const pauseReading = () => {
    setIsPaused(!isPaused)
  }

  const resetReading = () => {
    setIsReading(false)
    setReadingProgress(0)
    setStartTime(null)
    setIsPaused(false)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    if (story) {
      setEstimatedTimeLeft(story.time)
    }
  }

  const toggleBookmark = () => {
    if (!story) return
    
    const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
    const newBookmarks = isBookmarked 
      ? bookmarks.filter((id: string) => id !== story.id)
      : [...bookmarks, story.id]
    
    localStorage.setItem('taletime-bookmarks', JSON.stringify(newBookmarks))
    setIsBookmarked(!isBookmarked)
  }

  const shareStory = async () => {
    if (!story) return
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: story.teaser,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-6 leading-relaxed text-justify">
        {paragraph}
      </p>
    ))
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Story Not Found</h2>
            <p className="text-gray-600 mb-4">The story you're looking for doesn't exist.</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2" size={16} />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/90 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              {isReading && (
                <div className="flex items-center gap-4">
                  <Button
                    onClick={pauseReading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} />
                    ~{estimatedTimeLeft} min left
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                size="sm"
              >
                <Settings size={16} />
              </Button>
              <Button
                onClick={toggleBookmark}
                variant="outline"
                size="sm"
                className={isBookmarked ? 'text-pink-600 border-pink-300' : ''}
              >
                <Heart size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
              </Button>
              <Button
                onClick={shareStory}
                variant="outline"
                size="sm"
              >
                <Share2 size={16} />
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isReading && (
            <div className="mt-4">
              <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{Math.round(readingProgress)}% complete</span>
                <span>~{estimatedTimeLeft} min remaining</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`fixed top-20 right-4 z-40 p-4 rounded-xl shadow-xl border transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
        }`}>
          <h3 className="font-semibold mb-3">Reading Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                  variant="outline"
                  size="sm"
                >
                  A-
                </Button>
                <span className="text-sm w-8 text-center">{fontSize}</span>
                <Button
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                  variant="outline"
                  size="sm"
                >
                  A+
                </Button>
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(e) => setIsDarkMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Dark Mode</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isReading ? (
          /* Story Preview */
          <Card className={`backdrop-blur-md shadow-2xl border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/80 border-gray-600' 
              : 'bg-white/80 border-white/50'
          }`}>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  {story.title}
                </h1>
                <p className="text-xl text-gray-600 mb-2">by {story.author}</p>
                
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {story.genre}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                    {story.age}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                    {story.time} min read
                  </span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    {story.mood}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
                    {story.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-700 leading-relaxed mb-8 text-center italic">
                  {story.teaser}
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                  {story.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button
                    onClick={startReading}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-8 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    <BookOpen className="mr-3" size={20} />
                    Start Reading
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Reading View */
          <Card className={`backdrop-blur-md shadow-2xl border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/90 border-gray-600' 
              : 'bg-white/90 border-white/50'
          }`}>
            <div 
              ref={scrollRef}
              className="max-h-screen overflow-y-auto p-8 sm:p-12"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <div ref={contentRef} style={{ fontSize: `${fontSize}px` }}>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">
                  {story.title}
                </h1>
                <p className="text-center text-gray-600 mb-8">by {story.author}</p>
                
                <div className="max-w-3xl mx-auto leading-relaxed">
                  {formatContent(story.content)}
                </div>
                
                <div className="text-center mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-2xl font-semibold mb-4">The End</h3>
                  <p className="text-gray-600 mb-6">Thank you for reading "{story.title}"</p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button onClick={resetReading} variant="outline">
                      <RotateCcw className="mr-2" size={16} />
                      Read Again
                    </Button>
                    <Button onClick={() => router.push('/search')}>
                      <BookOpen className="mr-2" size={16} />
                      Find More Stories
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}