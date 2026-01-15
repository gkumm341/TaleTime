'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { usePreferences } from '@/contexts/PreferencesContext'

interface ThemeContextType {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preferences, updatePreferences, loading } = usePreferences()
  const theme = loading ? 'light' : preferences.theme
  const isDarkMode = theme === 'dark'

  // Apply theme to document based on PreferencesContext.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('sepia', theme === 'sepia')
    localStorage.setItem('taletime-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    void updatePreferences({ theme: theme === 'dark' ? 'light' : 'dark' })
  }

  const setTheme = (nextTheme: 'light' | 'dark') => {
    void updatePreferences({ theme: nextTheme })
  }

  const value = { isDarkMode, toggleTheme, setTheme }

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