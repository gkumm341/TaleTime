'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
      }
    }
    
    checkInstalled()

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Don't show immediately, wait a bit
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('taletime-install-prompt-seen')
        if (!hasSeenPrompt && !isInstalled) {
          setShowInstallPrompt(true)
        }
      }, 5000) // Show after 5 seconds
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const dismissPrompt = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('taletime-install-prompt-seen', 'true')
  }

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <Card className="backdrop-blur-md bg-tt-surface/95 shadow-tt border border-white/50 animate-slide-up">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-tt-tertiary rounded-lg p-2">
                <Smartphone className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-tt-primary">Install TaleTime</h3>
                <p className="text-sm text-tt-muted">Get the app for a better experience</p>
              </div>
            </div>
            <Button
              onClick={dismissPrompt}
              variant="ghost"
              size="sm"
              className="p-1"
            >
              <X size={16} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <ul className="text-xs text-tt-muted space-y-1">
              <li>• Works offline</li>
              <li>• Faster loading</li>
              <li>• Push notifications</li>
            </ul>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1 bg-tt-tertiary hover:bg-tt-tertiary/90 text-white"
              >
                <Download className="mr-1" size={14} />
                Install
              </Button>
              <Button
                onClick={dismissPrompt}
                variant="outline"
                size="sm"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Service Worker Registration Hook
export function useServiceWorker() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production'

    // In development, unregister any existing SW to prevent caching dev bundles.
    if (!isProd) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister()
          })
        })
      }
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      }
    } else {
      // Register service worker (production only)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            setSwRegistration(registration)
            console.log('SW registered:', registration)
          })
          .catch((registrationError) => {
            console.log('SW registration failed:', registrationError)
          })
      }
    }

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { swRegistration, isOnline }
}

// Offline Banner
export function OfflineBanner() {
  const { isOnline } = useServiceWorker()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-2 px-4 text-sm font-medium z-50">
      📱 You're offline. Some features may be limited.
    </div>
  )
}