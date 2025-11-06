'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, BookOpen, Clock, Heart, Share2, RotateCcw, Pause, Play, Settings } from 'lucide-react'
import { getStoryById, type Story } from '@/lib/stories'

interface StoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default function StoryPage({ params }: StoryPageProps) {
  const router = useRouter()
  
  // Unwrap params Promise using React.use()
  const resolvedParams = use(params)
  const storyId = resolvedParams.id
  
  // Get the story data
  const storyData = getStoryById(storyId)
  
  // Component state
  const [story, setStory] = useState<Story | null>(storyData || null)
  const [isReading, setIsReading] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(storyData?.time || 0)
  const [fontSize, setFontSize] = useState(16)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize component data
  useEffect(() => {
    if (storyData) {
      setStory(storyData)
      setEstimatedTimeLeft(storyData.time)
      
      // Check if bookmarked
      const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
      setIsBookmarked(bookmarks.includes(storyData.id))
    }
  }, [storyId]) // Only depend on storyId to avoid issues

  // Scroll tracking effect
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

  // Reading functions
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
    setEstimatedTimeLeft(story?.time || 0)
    setStartTime(null)
    setIsPaused(false)
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  const toggleBookmark = () => {
    if (!story) return
    
    const bookmarks = JSON.parse(localStorage.getItem('taletime-bookmarks') || '[]')
    let newBookmarks
    
    if (isBookmarked) {
      newBookmarks = bookmarks.filter((id: string) => id !== story.id)
    } else {
      newBookmarks = [...bookmarks, story.id]
    }
    
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
          url: window.location.href
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Format content with paragraphs
  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph.trim()}
      </p>
    ))
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Story Not Found</h1>
          <p className="text-gray-600 mb-6">The story you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2" size={16} />
            Back to Home
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-purple-50'
    }`}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-white/20 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back
          </Button>
          
          {isReading && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {Math.round(readingProgress)}% • {estimatedTimeLeft}min left
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {isReading && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={pauseReading}
                  className="hover:bg-white/50"
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="hover:bg-white/50"
                >
                  <Settings size={16} />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleBookmark}
              className="hover:bg-white/50"
            >
              <Heart className={isBookmarked ? "fill-red-500 text-red-500" : ""} size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={shareStory}
              className="hover:bg-white/50"
            >
              <Share2 size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="sticky top-16 z-10 backdrop-blur-md bg-white/90 border-b border-white/20 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">Font Size:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                >
                  A-
                </Button>
                <span className="text-sm">{fontSize}px</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                >
                  A+
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {!isReading ? (
          /* Story Preview */
          <Card className={`backdrop-blur-md shadow-2xl border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/90 border-gray-600' 
              : 'bg-white/90 border-white/50'
          }`}>
            <CardContent className="p-8 sm:p-12">
              <div className="text-center">
                <h1 className={`text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${
                  isDarkMode ? 'from-blue-400 to-purple-400' : ''
                }`}>
                  {story.title}
                </h1>
                
                <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  by {story.author}
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm">
                  <span className={`px-3 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-blue-900/50 text-blue-300' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {story.genre}
                  </span>
                  <span className={`px-3 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-purple-900/50 text-purple-300' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {story.age}
                  </span>
                  <span className={`flex items-center px-3 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-green-900/50 text-green-300' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <Clock className="mr-1" size={14} />
                    {story.time} min read
                  </span>
                </div>
                
                <p className={`text-lg mb-8 max-w-2xl mx-auto leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {story.teaser}
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {story.tags.map(tag => (
                    <span 
                      key={tag}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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