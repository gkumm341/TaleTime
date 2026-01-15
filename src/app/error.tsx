'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-md bg-white/80 shadow-2xl border border-white/50">
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-6">
              <AlertTriangle size={64} className="mx-auto" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Oops!</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Something went wrong</h2>
            
            <p className="text-gray-600 mb-8 leading-relaxed">
              We encountered an unexpected error while loading this page. 
              Don't worry, it happens to the best of us!
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left mb-6 p-4 bg-gray-100 rounded-lg">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={reset}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <RefreshCw className="mr-2" size={18} />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="w-full py-3 font-semibold hover:bg-gray-50"
              >
                <Home className="mr-2" size={18} />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}