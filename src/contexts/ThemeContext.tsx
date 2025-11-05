'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('taletime-theme')
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark')
      } else {
        setIsDarkMode(systemPrefersDark)
      }
    }
    
    setMounted(true)
  }, [])

  // Apply theme changes to document
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode)
      localStorage.setItem('taletime-theme', isDarkMode ? 'dark' : 'light')
    }
  }, [isDarkMode, mounted])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const setTheme = (theme: 'light' | 'dark') => {
    setIsDarkMode(theme === 'dark')
  }

  // Always render the provider, but with default values until mounted
  const value = {
    isDarkMode: mounted ? isDarkMode : false,
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return default values instead of throwing error during SSR
    if (typeof window === 'undefined') {
      return {
        isDarkMode: false,
        toggleTheme: () => {},
        setTheme: () => {}
      }
    }
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}