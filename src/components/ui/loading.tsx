'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  )
}

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-300 rounded ${className}`}
      style={{ width, height }}
    ></div>
  )
}

export function StoryCardSkeleton() {
  return (
    <div className="bg-white/70 rounded-3xl p-6 shadow-xl border border-white/50">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

interface LoadingPageProps {
  title?: string
  description?: string
}

export function LoadingPage({ title = "Loading...", description }: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E9DA] via-white to-[#F5E9DA] flex items-center justify-center p-4">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">{title}</h2>
        {description && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>
    </div>
  )
}