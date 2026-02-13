import { Sidebar } from '@/components/Sidebar';
import { redirect } from 'next/navigation';

interface DemoReaderRedirectProps {
  searchParams?: Promise<{ generated?: string }>;
}

export default async function DemoReaderPage({ searchParams }: DemoReaderRedirectProps) {
  const params = searchParams ? await searchParams : undefined;
  const generated = params?.generated;

  redirect(
    generated
      ? `/build-story/read?generated=${encodeURIComponent(generated)}`
      : '/build-story/read'
  );
  return (
    <Sidebar />
  )
}

