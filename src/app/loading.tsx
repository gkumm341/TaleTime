import { Navigation } from '@/components/Navigation'
import { LoadingPage } from '@/components/ui/loading'

export default function Loading() {
  return (
    <>
      <Navigation />
      <LoadingPage 
        title="Loading TaleTime..." 
        description="Preparing your storytelling experience"
      />
    </>
  )
}