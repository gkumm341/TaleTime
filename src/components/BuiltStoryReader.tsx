'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StoryOutput } from '../../types/story-builder';

interface BuiltStoryReaderProps {
  story: StoryOutput;
  authorLabel?: string;
}

const PARAGRAPHS_PER_PAGE = 2;

export default function BuiltStoryReader({
  story,
  authorLabel = 'Created with Ollie the Owl',
}: BuiltStoryReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);

  const pages = useMemo(() => {
    const chunks: string[][] = [];
    for (let index = 0; index < story.story.paragraphs.length; index += PARAGRAPHS_PER_PAGE) {
      const chunk = story.story.paragraphs.slice(index, index + PARAGRAPHS_PER_PAGE);
      if (chunk.length > 0) chunks.push(chunk);
    }
    return chunks;
  }, [story.story.paragraphs]);

  useEffect(() => {
    setPageIndex(0);
  }, [story.title, story.story.paragraphs.length]);

  const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const activePage = pages[safePageIndex] ?? [];

  const goPrev = () => setPageIndex((prev) => Math.max(0, prev - 1));
  const goNext = () => setPageIndex((prev) => Math.min(Math.max(0, pages.length - 1), prev + 1));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <Card className="border-tt-border/40 bg-tt-surface/95">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl text-tt-primary">{story.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-tt-muted">
            <span className="rounded-full border border-tt-border/40 px-3 py-1">Age {story.target_age}+</span>
            <span className="rounded-full border border-tt-border/40 px-3 py-1">{story.story_length_minutes} min</span>
            <span className="rounded-full border border-tt-border/40 px-3 py-1">{story.tone}</span>
            <span className="rounded-full border border-tt-border/40 px-3 py-1">{story.setting}</span>
            <span className="rounded-full border border-tt-border/40 px-3 py-1">{authorLabel}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <article className="min-h-[340px] space-y-4 rounded-tt border border-tt-border/30 bg-white/80 p-6">
            {activePage.map((paragraph, idx) => (
              <p key={`${safePageIndex}-${idx}`} className="text-base leading-8 text-tt-primary sm:text-lg">
                {paragraph}
              </p>
            ))}
          </article>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goPrev} disabled={safePageIndex <= 0}>
              Previous
            </Button>

            <p className="text-sm font-medium text-tt-muted">
              Page {pages.length === 0 ? 0 : safePageIndex + 1} of {pages.length}
            </p>

            <Button onClick={goNext} disabled={safePageIndex >= pages.length - 1}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
