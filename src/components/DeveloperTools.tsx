'use client'

import { useState, useEffect } from 'react'

export function DeveloperTools() {
  const [isOpen, setIsOpen] = useState(false)
  const [lastClearTime, setLastClearTime] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [isDev, setIsDev] = useState(false)

  // Ensure this only runs on client side
  useEffect(() => {
    setIsClient(true)
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])

  // Only show in development and on client side
  if (!isClient || !isDev) {
    return null
  }

  const clearTaleTimeCache = () => {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('taletime-')) {
        localStorage.removeItem(key)
      }
    })
    console.log('🧹 TaleTime cache cleared')
  }

  const handleClearCache = () => {
    clearTaleTimeCache()
    setLastClearTime(new Date().toLocaleTimeString())
    // Force page reload after cache clear
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleRefreshPage = () => {
    window.location.reload()
  }

  const handleHardRefresh = () => {
    // Clear browser cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('taletime')) {
            caches.delete(name)
          }
        })
      })
    }
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700 text-white shadow-lg border-0 cursor-pointer"
          title="Developer Tools"
        >
          🔧
        </button>
      ) : (
        <div className="w-64 bg-white dark:bg-gray-800 shadow-xl border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-red-600">Dev Tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 text-gray-500 hover:text-gray-700 border-0 bg-transparent cursor-pointer"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleClearCache}
              className="w-full text-xs bg-red-600 hover:bg-red-700 text-white p-2 rounded border-0 cursor-pointer"
            >
              🗑️ Clear Cache & Reload
            </button>
            
            <button
              onClick={handleRefreshPage}
              className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white p-2 rounded border-0 cursor-pointer"
            >
              🔄 Soft Refresh
            </button>
            
            <button
              onClick={handleHardRefresh}
              className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white p-2 rounded border-0 cursor-pointer"
            >
              💜 Hard Refresh
            </button>
          </div>
          
          {lastClearTime && (
            <div className="text-xs text-gray-500 mt-3">
              Last cleared: {lastClearTime}
            </div>
          )}
          
          <div className="text-xs text-gray-400 border-t pt-2 mt-3">
            🔧 Development Mode Only
          </div>
        </div>
      )}
    </div>
  )
}