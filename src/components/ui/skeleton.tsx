export function BookCardSkeleton() {
  return (
    <div className="bg-tt-surface dark:bg-tt-primary/20 rounded-tt shadow-tt overflow-hidden animate-pulse">
      {/* Cover Image Skeleton */}
      <div className="w-full h-64 bg-tt-border/20 dark:bg-tt-border/30" />
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-6 bg-tt-border/20 dark:bg-tt-border/30 rounded w-3/4" />
        
        {/* Author */}
        <div className="h-4 bg-tt-border/20 dark:bg-tt-border/30 rounded w-1/2" />
        
        {/* Reading Time */}
        <div className="h-4 bg-tt-border/20 dark:bg-tt-border/30 rounded w-1/3" />
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <BookCardSkeleton key={index} />
      ))}
    </div>
  );
}
