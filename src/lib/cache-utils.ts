/**
 * Cache utilities for development and production environments
 */

// Generate a cache-busting timestamp for development
export const getCacheBuster = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return `?t=${Date.now()}`
  }
  return ''
}

// Clear all TaleTime-related localStorage data
export const clearTaleTimeCache = (): void => {
  if (typeof window === 'undefined') return
  
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith('taletime-')) {
      localStorage.removeItem(key)
    }
  })
  console.log('🧹 TaleTime cache cleared')
}

// Force refresh component data in development
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

// Add version tracking for cache invalidation
const CACHE_VERSION = '2.0.0'
const CACHE_VERSION_KEY = 'taletime-cache-version'

export const checkCacheVersion = (): boolean => {
  if (typeof window === 'undefined') return false
  
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY)
    if (storedVersion !== CACHE_VERSION) {
      clearTaleTimeCache()
      localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION)
      console.log(`🔄 Cache updated to version ${CACHE_VERSION}`)
      return true // Cache was cleared
    }
    return false // Cache is current
  } catch (error) {
    console.warn('Cache version check failed:', error)
    return false
  }
}

// Force component re-render key for development
export const getComponentKey = (): string => {
  return isDevelopment() ? `dev-${Date.now()}` : 'prod'
}