'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import BuiltStoryReader from '@/components/BuiltStoryReader';
import type { StoryOutput } from '../../../../types/story-builder';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

const FALLBACK_STORY: StoryOutput = {
  version: 1,
  title: 'Story Preview',
  target_age: 7,
  story_length_minutes: 5,
  tone: 'Magical',
  setting: 'Forest',
  characters: [{ name: 'Sam', type: 'Child', traits: ['Curious', 'Kind'] }],
  story: {
    paragraphs: [
      'Once upon a time, a brother and sister lived near a great forest. They loved stories and followed tiny clues that led to wonder.',
      'They followed a path of crumbs until the birds found them first, and then they learned to solve their problem together.',
      'Deep in the woods stood a cottage that smelled like sugar and spice, where one clever idea turned fear into laughter.',
      'At bedtime they walked home smiling, knowing brave hearts and kind choices can light the darkest trail.',
    ],
  },
};

export default function BuiltStoryReadPage() {
  const searchParams = useSearchParams();
  const generatedKey = searchParams.get('generated');

  const generatedStory = useMemo(() => {
    if (!generatedKey || typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`taletime-generated-story:${generatedKey}`);
      if (!raw) return null;
      return JSON.parse(raw) as StoryOutput;
    } catch {
      return null;
    }
  }, [generatedKey]);

  const storyToRender = useMemo(() => generatedStory || FALLBACK_STORY, [generatedStory]);

  return (
    <main className="min-h-screen bg-tt-terciary dark:bg-gray-950 p-6">
        <div className="absolute inset-0 -z-10 opacity-50">
         <img
           src="/owlface2.png"
           alt="Ollie the Owl Background"
           className="w-full h-full object-cover animate-float"
         />
       </div>
        <Sidebar />
        <Header />
      <BuiltStoryReader
        story={storyToRender}
        authorLabel={generatedStory ? 'Created with Ollie the Owl' : 'Story Preview'}
      />
    </main>
  );
}
