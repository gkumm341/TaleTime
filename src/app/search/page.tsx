'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Navigation } from '@/components/Navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { BookOpen, Clock, Heart, Filter, ArrowLeft, Search } from 'lucide-react'
import { filterStories, genres, ageGroups, moods, difficulties, type Story } from '@/lib/stories'
import { getComponentKey, isDevelopment } from '@/lib/cache-utils'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isDarkMode } = useTheme()
  
  // Initialize filters from URL params
  const [genre, setGenre] = useState(searchParams.get('genre') || 'any')
  const [age, setAge] = useState(searchParams.get('age') || 'any')
  const [time, setTime] = useState(parseInt(searchParams.get('time') || '2000'))
  const [mood, setMood] = useState(searchParams.get('mood') || 'any')
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || 'any')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [showFilters, setShowFilters] = useState(false)
  
  // Get filtered stories
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [componentKey, setComponentKey] = useState('initial')
  const [mounted, setMounted] = useState(false)
  
  // Initialize mounted state
  useEffect(() => {
    setMounted(true)
    if (isDevelopment()) {
      setComponentKey(getComponentKey())
    }
  }, [])
  
  // Force component refresh in development mode
  useEffect(() => {
    if (mounted && isDevelopment()) {
      setComponentKey(getComponentKey())
    }
  }, [genre, age, time, mood, difficulty, searchQuery, mounted])
  
  useEffect(() => {
    const filters = {
      genre: genre === 'any' ? undefined : genre,
      age: age === 'any' ? undefined : age,
      maxTime: time,
      mood: mood === 'any' ? undefined : mood,
      difficulty: difficulty === 'any' ? undefined : difficulty
    }
    
    let stories = filterStories(filters)
    
    console.log('🔍 SEARCH DEBUG: Total filtered stories:', stories.length)
    console.log('🔍 SEARCH DEBUG: First 5 story titles:', stories.slice(0, 5).map(s => s.title))
    
    // Apply search query if present
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      stories = stories.filter(story => 
        story.title.toLowerCase().includes(query) ||
        story.teaser.toLowerCase().includes(query) ||
        story.author.toLowerCase().includes(query) ||
        story.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    setFilteredStories(stories)
  }, [genre, age, time, mood, difficulty, searchQuery])

  const updateURL = () => {
    const params = new URLSearchParams()
    if (genre !== 'any') params.set('genre', genre)
    if (age !== 'any') params.set('age', age)
    params.set('time', time.toString())
    if (mood !== 'any') params.set('mood', mood)
    if (difficulty !== 'any') params.set('difficulty', difficulty)
    if (searchQuery) params.set('q', searchQuery)
    
    router.push(`/search?${params.toString()}`)
  }

  return (
    <>
      <Navigation />
      <main className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
      }`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
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
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Story Search
            </h1>
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Filters
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search stories by title, author, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 shadow-xl border border-white/50 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {['any', ...genres].map((genreOption) => (
                    <button
                      key={genreOption}
                      onClick={() => setGenre(genreOption)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                        genre === genreOption
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {genreOption === 'any' ? 'All Genres' : genreOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age Group</label>
                <div className="flex flex-wrap gap-2">
                  {['any', ...ageGroups].map((ageOption) => (
                    <button
                      key={ageOption}
                      onClick={() => setAge(ageOption)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                        age === ageOption
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {ageOption === 'any' ? 'All Ages' : ageOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mood</label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Mood</SelectItem>
                    {moods.map(moodOption => (
                      <SelectItem key={moodOption} value={moodOption}>
                        {moodOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Difficulty</SelectItem>
                    {difficulties.map(diffOption => (
                      <SelectItem key={diffOption} value={diffOption}>
                        {diffOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Filter */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reading Time: Up to {time} minutes
                </label>
                <Slider
                  min={5}
                  max={2000}
                  step={5}
                  value={[time]}
                  onValueChange={(val) => setTime(val[0])}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={updateURL} className="bg-gradient-to-r from-blue-600 to-purple-600">
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Found {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
          </p>
        </div>

        {/* Stories Grid */}
        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <Card key={story.id} className="group backdrop-blur-md bg-white/70 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/50 hover:scale-105 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight flex-1 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                      {story.title}
                    </h3>
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Clock className="text-white" size={16} />
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-sm leading-relaxed mb-4 group-hover:text-gray-800 transition-colors duration-300 line-clamp-3">
                    {story.teaser}
                  </p>

                  <div className="flex items-center justify-between mb-4 text-xs">
                    <span className="text-gray-600">by {story.author}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {story.mood}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 font-medium text-sm rounded-full border border-blue-200/50">
                      {story.genre}
                    </span>
                    <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium text-sm rounded-full border border-green-200/50">
                      {story.time} min
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {story.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => router.push(`/story/${story.id}`)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center group-hover:shadow-blue-500/50"
                    >
                      <BookOpen className="mr-2 group-hover:rotate-12 transition-transform duration-300" size={16} /> 
                      Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50"
                    >
                      <Heart size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="backdrop-blur-md bg-white/60 rounded-3xl p-12 shadow-xl border border-white/50 max-w-md mx-auto">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No stories found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search terms to discover new tales!
              </p>
              <Button 
                onClick={() => {
                  setGenre('any')
                  setAge('any')
                  setTime(20)
                  setMood('any')
                  setDifficulty('any')
                  setSearchQuery('')
                }}
                variant="outline"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-64 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white/70 rounded-3xl p-6 shadow-xl">
                    <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-300 rounded-full w-20"></div>
                      <div className="h-8 bg-gray-300 rounded-full w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    }>
      <SearchContent />
    </Suspense>
  )
}