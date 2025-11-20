'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { FeedbackForm } from '@/components/FeedbackForm'
import { useTheme } from '@/contexts/ThemeContext'
import { Menu, X, BookOpen, Search, Heart, History, Home, Settings, Moon, MessageSquare } from 'lucide-react'

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { isDarkMode } = useTheme()

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development')
    setMounted(true)
  }, [])

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/bedtime', label: 'Bedtime', icon: Moon },
    { href: '/search', label: 'Browse', icon: Search },
    { href: '/favorites', label: 'Favorites', icon: Heart },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const clearCache = () => {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('taletime-')) {
        localStorage.removeItem(key)
      }
    })
    console.log('🧹 Cache cleared')
    alert('Cache cleared! Page will reload.')
    window.location.reload()
  }

  const handleNavigation = (href: string) => {
    router.push(href)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex items-center justify-between p-4 backdrop-blur-md border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/90 border-pink-900/50' 
          : 'bg-white/80 border-pink-200'
      } ${className}`}>
        <div className="flex items-center gap-8">
          <button
            onClick={() => handleNavigation('/')}
            className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
          >
            <BookOpen className="text-pink-600" size={24} />
            TaleTime
          </button>
          
          <div className="flex items-center gap-1">
            {navigationItems.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant={isActive(href) ? 'default' : 'ghost'}
                onClick={() => handleNavigation(href)}
                className={`flex items-center gap-2 ${
                  isActive(href) 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                    : ''
                }`}
              >
                <Icon size={16} />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mounted && isDev && (
            <Button
              onClick={clearCache}
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Clear Cache (Dev Mode)"
            >
              🧹
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2"
            title="Send Feedback"
          >
            <MessageSquare size={18} />
            <span className="hidden xl:inline">Feedback</span>
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className={`lg:hidden flex items-center justify-between p-4 backdrop-blur-md border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/90 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      } ${className}`}>
        <button
          onClick={() => handleNavigation('/')}
          className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        >
          <BookOpen className="text-blue-600" size={24} />
          TaleTime
        </button>

        <div className="flex items-center gap-2">
          {mounted && isDev && (
            <Button
              onClick={clearCache}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              title="Clear Cache (Dev Mode)"
            >
              🧹
            </Button>
          )}
          <ThemeToggle size="sm" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-64 z-50 lg:hidden transform transition-transform duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          } shadow-2xl`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
            
            <div className="p-4 space-y-2">
              {navigationItems.map(({ href, label, icon: Icon }) => (
                <Button
                  key={href}
                  variant={isActive(href) ? 'default' : 'ghost'}
                  onClick={() => handleNavigation(href)}
                  className={`w-full justify-start flex items-center gap-3 ${
                    isActive(href) 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                      : ''
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Button>
              ))}
            </div>
            
            <div className="absolute bottom-4 left-4 right-4">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Find your perfect story, no matter how much time you have.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Feedback Form Modal */}
      {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}
    </>
  )
}