import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, Search } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <div className="min-h-screen bg-tt-gradient-soft flex items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur-md bg-tt-surface/80 shadow-2xl border border-white/50">
          <CardContent className="p-12 text-center">
            <div className="text-8xl mb-6">📖</div>
            <h1 className="text-4xl font-bold text-tt-primary mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-tt-muted mb-4">Page Not Found</h2>
            <p className="text-tt-muted mb-8 leading-relaxed">
              Looks like this page went on an adventure of its own. 
              Let's get you back to discovering amazing stories!
            </p>
            
            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full bg-gradient-to-r from-tt-tertiary to-tt-accent hover:from-tt-tertiary/90 hover:to-tt-accent/90 text-white py-3 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
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