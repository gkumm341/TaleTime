import { Navigation } from '@/components/Navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, Search } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-md bg-white/80 shadow-2xl border border-white/50">
          <CardContent className="p-12 text-center">
            <div className="text-8xl mb-6">📖</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Looks like this page went on an adventure of its own. 
              Let's get you back to discovering amazing stories!
            </p>
            
            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  <Home className="mr-2" size={18} />
                  Go Home
                </Button>
              </Link>
              
              <Link href="/search" className="block">
                <Button variant="outline" className="w-full py-3 font-semibold hover:bg-gray-50">
                  <Search className="mr-2" size={18} />
                  Browse Stories
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}