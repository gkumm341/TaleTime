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
  }, [storyId, storyData])

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
      <p key={index} className="mb-8 leading-loose text-lg text-justify" style={{ lineHeight: '2' }}>
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
        : 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 backdrop-blur-md border-b shadow-sm transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/90 border-gray-700' 
          : 'bg-white/90 border-amber-200'
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
              <div className={`w-full rounded-full h-2.5 ${isDarkMode ? 'bg-gray-700' : 'bg-amber-100'}`}>
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className={isDarkMode ? 'text-gray-400' : 'text-amber-700'}>{Math.round(readingProgress)}% complete</span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-amber-700'}>~{estimatedTimeLeft} min remaining</span>
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
          <Card className={`backdrop-blur-md shadow-2xl border transition-colors duration-300 rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-800/80 border-gray-600' 
              : 'bg-white/90 border-white/50'
          }`}>
            <CardContent className="p-10 sm:p-12">
              <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
                  {story.title}
                </h1>
                <p className="text-xl text-amber-700 mb-4">by {story.author}</p>
                
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-medium">
                    {story.genre}
                  </span>
                  <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full font-medium">
                    {story.age}
                  </span>
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                    {story.time} min read
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                    {story.mood}
                  </span>
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-medium">
                    {story.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <p className="text-xl text-gray-700 leading-relaxed mb-10 text-center italic">
                  {story.teaser}
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center mb-10">
                  {story.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-full font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button
                    onClick={startReading}
                    size="lg"
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-6 px-10 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    <BookOpen className="mr-3" size={24} />
                    Start Reading
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Reading View */
          <Card className={`backdrop-blur-md shadow-2xl border transition-colors duration-300 rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-800/90 border-gray-600' 
              : 'bg-white/95 border-white/50'
          }`}>
            <div 
              ref={scrollRef}
              className="max-h-screen overflow-y-auto p-10 sm:p-16"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              <div ref={contentRef} style={{ fontSize: `${fontSize}px` }}>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                  {story.title}
                </h1>
                <p className={`text-center mb-12 text-lg ${isDarkMode ? 'text-gray-400' : 'text-amber-600'}`}>by {story.author}</p>
                
                <div className="max-w-2xl mx-auto">
                  {formatContent(story.content)}
                </div>
                
                <div className={`text-center mt-16 pt-12 border-t ${isDarkMode ? 'border-gray-700' : 'border-amber-200'}`}>
                  <h3 className="text-3xl font-semibold mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">The End</h3>
                  <p className={`mb-8 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Thank you for reading "{story.title}"</p>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button onClick={resetReading} variant="outline" className="rounded-lg px-6 py-3">
                      <RotateCcw className="mr-2" size={18} />
                      Read Again
                    </Button>
                    <Button 
                      onClick={() => router.push('/search')}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg px-6 py-3"
                    >
                      <BookOpen className="mr-2" size={18} />
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