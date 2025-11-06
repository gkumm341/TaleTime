'use client'

import { useEffect } from 'react'
import { checkCacheVersion, isDevelopment } from '@/lib/cache-utils'

export function CacheManager() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Check and update cache version
    const cacheWasCleared = checkCacheVersion()
    
    // In development, add additional cache busting
    if (isDevelopment()) {
      // Log cache status for debugging
      console.log('🔧 Development mode: Cache management active')
      console.log('🔧 Press Ctrl+Shift+C to clear cache')
      
      if (cacheWasCleared) {
        console.log('🧹 Stale cache detected and cleared')
      }

      // Add keyboard shortcut for cache clearing
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'C') {
          event.preventDefault()
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.startsWith('taletime-')) {
              localStorage.removeItem(key)
            }
          })
          console.log('🧹 Cache cleared via keyboard shortcut')
          alert('Cache cleared! Page will reload.')
          window.location.reload()
        }
      }

      window.addEventListener('keydown', handleKeyDown)

      // Force service worker update in development
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.update()
          })
        })
      }

      // Cleanup event listener
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [])

  // Don't render anything, this is just for side effects
  return null
}