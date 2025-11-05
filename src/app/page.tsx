'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { BookOpen, Clock } from 'lucide-react'

export default function TaleTimeHome() {
  const [genre, setGenre] = useState('any')
  const [age, setAge] = useState('any')
  const [time, setTime] = useState(20)

  const stories = [
    { title: 'The Midnight Forest', genre: 'Fantasy', age: 'Teens', time: 10, teaser: 'A young traveler uncovers a glowing secret deep in the woods.' },
    { title: 'Cup of Courage', genre: 'Inspiration', age: 'Adults', time: 5, teaser: 'A quick tale about bravery found in unexpected places.' },
    { title: 'Moonlight Parade', genre: 'Adventure', age: 'Kids', time: 15, teaser: 'Animals gather for a secret midnight celebration.' },
  ]

  const filteredStories = stories.filter(
    s => (genre === 'any' || s.genre === genre) &&
      (age === 'any' || s.age === age) &&
      s.time <= time
  )

  return (
    <main className="min-h-screen bg-[#fbfbf3] bg-[url('/girl.jpg')] bg-no-repeat bg-left bg-center bg-fixed p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decoration - responsive sizes */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 animate-pulse"></div>
      <div className="absolute top-5 left-5 sm:top-10 sm:left-10 w-32 h-32 sm:w-48 sm:h-48 lg:w-72 lg:h-72 bg-blue-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-5 right-5 sm:bottom-10 sm:right-10 w-40 h-40 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-purple-300/20 rounded-full blur-3xl"></div>

      {/* Responsive header container */}
      <div className='mt-8 sm:mt-16 lg:mt-28 ml-0 sm:ml-[200px] md:ml-[400px] lg:ml-[600px] xl:ml-[1000px]'>
        <header className="relative lg:absolute z-20 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4 sm:mb-6 tracking-tight">
            TaleTime
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-900 font-semibold leading-relaxed max-w-xs sm:max-w-md lg:max-w-2xl mx-auto lg:mx-0">
            Find your perfect story, no matter how much time you have to escape reality.
          </p>
        </header>

        {/* Responsive content container */}
        <div className="flex flex-col pt-8 sm:pt-16 lg:pt-64 ml-0 sm:-ml-12 md:-ml-24 lg:-ml-48 relative z-10">
          <section className="flex flex-col items-center gap-6 sm:gap-8 mb-12 sm:mb-20 px-2 sm:px-4">
            <div className="backdrop-blur-md bg-white/30 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/50 w-full max-w-sm sm:max-w-md lg:max-w-none">
              <div className="flex flex-col gap-6 sm:gap-8">
                <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                  {['any', 'Fantasy', 'Adventure', 'Inspiration', 'Mystery'].map((genreOption) => (
                    <button
                      key={genreOption}
                      onClick={() => setGenre(genreOption)}
                      className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm ${genre === genreOption
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-500/50'
                        : 'bg-white/80 text-gray-700 hover:bg-white/90 hover:shadow-xl border border-gray-200/50'
                        }`}
                    >
                      {genreOption === 'any' ? '✨ Any Genre' : genreOption}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                  {['any', 'Kids', 'Teens', 'Adults'].map((ageOption) => (
                    <button
                      key={ageOption}
                      onClick={() => setAge(ageOption)}
                      className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm ${age === ageOption
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/50'
                        : 'bg-white/80 text-gray-700 hover:bg-white/90 hover:shadow-xl border border-gray-200/50'
                        }`}
                    >
                      {ageOption === 'any' ? '👥 All Ages' :
                        ageOption === 'Kids' ? '👶 Kids' :
                          ageOption === 'Teens' ? '🧒 Teens' : '👨 Adults'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-6">
                <div className="flex flex-col items-center w-full sm:w-80 backdrop-blur-md bg-white/40 p-4 sm:p-6 rounded-2xl shadow-xl border border-white/50">
                  <span className="text-xs sm:text-sm text-gray-800 mb-3 sm:mb-4 font-semibold flex items-center gap-2">
                    ⏱️ Up to {time}-min reads
                  </span>
                  <Slider
                    min={5}
                    max={60}
                    step={5}
                    value={[time]}
                    onValueChange={(val) => setTime(val[0])}
                    className="w-full"
                  />
                </div>
                
                <Button onClick={() => {
                    const params = new URLSearchParams({
                      genre: genre,
                      age: age,
                      time: time.toString()
                    });
                    window.open(`/search?${params.toString()}`, '_blank');
                  }}
                    className="mt-4 sm:mt-0 sm:ml-6 lg:ml-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 sm:py-4 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 backdrop-blur-sm w-full sm:w-auto"
                  >
                    <BookOpen className="rotate-12 transition-transform duration-300" size={20} />
                    <span className="text-sm sm:text-lg">Let's Read</span>
                  </Button>
                </div>
              </div>


            </div>
          </section>
        </div>

        {/* <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
          {filteredStories.map((story, i) => (
            <Card key={i} className="group backdrop-blur-md bg-white/70 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden border border-white/50 hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight flex-1 group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {story.title}
                  </h3>
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Clock className="text-white" size={20} />
                  </div>
                </div>
                
                <p className="text-gray-700 text-base leading-relaxed mb-6 group-hover:text-gray-800 transition-colors duration-300">
                  {story.teaser}
                </p>
                
                <div className="flex justify-between items-center mb-8">
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 font-semibold text-sm rounded-full border border-blue-200/50">
                    {story.genre}
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-semibold text-sm rounded-full border border-green-200/50">
                    {story.time} min
                  </span>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center group-hover:shadow-blue-500/50">
                  <BookOpen className="mr-3 group-hover:rotate-12 transition-transform duration-300" size={20} /> 
                  <span className="text-lg">Read Story</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section> */}

        {filteredStories.length === 0 && (
          <div className="text-center mt-8 sm:mt-12 lg:mt-16 px-4">
            <div className="backdrop-blur-md bg-white/40 rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border border-white/50 max-w-xs sm:max-w-md mx-auto">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4">📚</div>
              <p className="text-lg sm:text-xl text-gray-700 font-medium mb-2">
                No stories found
              </p>
              <p className="text-sm sm:text-base text-gray-600">
                Try adjusting your filters to discover new tales!
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
