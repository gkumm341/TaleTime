'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { ChevronLeft, BookOpen, Clock } from 'lucide-react';

interface AbridgedResponse {
  bookId: number;
  minutes: number;
  wpm: number;
  title: string;
  author: string;
  content: string;
  mode: 'llm' | 'extractive' | 'local';
}

export default function AbridgedBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { preferences } = usePreferences();

  const id = useMemo(() => Number(params.id), [params.id]);
  const minutes = useMemo(() => Number(searchParams.get('minutes') || '0'), [searchParams]);
  const variant = useMemo(() => {
    const v = searchParams.get('variant');
    if (v === 'full') return 'full' as const;
    if (v === 'bedtime') return 'bedtime' as const;
    // Back-compat for old links: minutes implies a timed/bedtime version.
    if (Number.isFinite(minutes) && minutes > 0) return 'bedtime' as const;
    return 'full' as const;
  }, [searchParams, minutes]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AbridgedResponse | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError('Missing or invalid parameters');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const wpm = preferences?.defaultWpm ?? 160;
        const res = await fetch('/api/abridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            variant === 'full'
              ? { bookId: id, variant: 'full', wpm }
              : { bookId: id, variant: 'bedtime', wpm }
          ),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to abridge: ${res.status}`);
        }

        const json = (await res.json()) as AbridgedResponse;
        setData(json);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to abridge');
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [id, minutes, variant, preferences?.defaultWpm]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {variant === 'full' ? 'Full text' : 'Bedtime version'}
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {data?.title ?? 'Preparing abridged story…'}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/book/${id}`)}
            className="gap-2"
            title="Open full book"
          >
            <BookOpen className="w-4 h-4" />
            Full
          </Button>
        </div>
      </div>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="py-16 text-center text-gray-600 dark:text-gray-400">
            {variant === 'full' ? 'Loading full text…' : 'Loading bedtime version…'}
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
            <div className="font-semibold text-rose-800 dark:text-rose-200">{error}</div>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <article
            className="bg-white dark:bg-gray-900 border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 rounded-2xl shadow-sm p-6"
            style={{
              fontSize: `${(preferences?.fontSize ?? 100) / 100}rem`,
              lineHeight: preferences?.lineHeight ?? 1.6,
            }}
          >
            <h1 className="text-2xl font-bold text-[#6BA8A9] mb-1">{data.title}</h1>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">{data.author}</div>

            <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
              {data.content}
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              Mode: {data.mode}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
