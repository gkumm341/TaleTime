'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function ThemeToggle({ variant = 'outline', size = 'default', className }: ThemeToggleProps) {
  const { isDarkMode, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only render after component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder that matches the button structure to prevent layout shift
    return (
      <Button
        variant={variant}
        size={size}
        className={`transition-all duration-300 ${className}`}
        disabled
      >
        <Sun className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Theme</span>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`transition-all duration-300 ${className}`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <>
          <Sun className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </Button>
  )
}