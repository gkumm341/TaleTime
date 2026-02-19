'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryBlock } from '@/lib/story-blocks';

type Props = {
  blocks: StoryBlock[];
  initialIndex?: number;
  onIndexChange?: (i: number) => void;
  storageKey?: string; // for resume
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function FullBlockFlip({
  blocks,
  initialIndex = 0,
  onIndexChange,
  storageKey,
}: Props) {
  const count = blocks.length;

  const readStored = useCallback(() => {
    if (!storageKey) return initialIndex;
    try {
      const raw = localStorage.getItem(storageKey);
      const i = raw ? Number(raw) : initialIndex;
      return Number.isFinite(i) ? clamp(i, 0, Math.max(0, count - 1)) : initialIndex;
    } catch {
      return initialIndex;
    }
  }, [storageKey, initialIndex, count]);

const [index, setIndex] = useState(() => readStored());
const [isFlipping, setIsFlipping] = useState(false);
const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    onIndexChange?.(index);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, String(index));
    } catch {
      // ignore
    }
  }, [index, onIndexChange, storageKey]);

  // If blocks change (new book), reset safely
  useEffect(() => {
    setIndex((prev) => clamp(prev, 0, Math.max(0, count - 1)));
  }, [count]);

  const current = blocks[index];

const FLIP_MS = 360;

const goNext = useCallback(() => {
  if (isFlipping) return;
  setIndex((i) => {
    if (i >= count - 1) return i;
    setFlipDir('next');
    setIsFlipping(true);
    window.setTimeout(() => {
      setIsFlipping(false);
    }, FLIP_MS);
    return i + 1;
  });
}, [count, isFlipping]);

const goPrev = useCallback(() => {
  if (isFlipping) return;
  setIndex((i) => {
    if (i <= 0) return i;
    setFlipDir('prev');
    setIsFlipping(true);
    window.setTimeout(() => {
      setIsFlipping(false);
    }, FLIP_MS);
    return i - 1;
  });
}, [isFlipping]);


  // Keyboard (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (t as any)?.isContentEditable) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        setIndex(Math.max(0, count - 1));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, count]);

  const touchRef = useRef<{ x: number; y: number } | null>(null);

const onPointerDown = (e: React.PointerEvent) => {
  touchRef.current = { x: e.clientX, y: e.clientY };
};

const onPointerUp = (e: React.PointerEvent) => {
  const start = touchRef.current;
  touchRef.current = null;
  if (!start) return;

  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;

  // ignore mostly-vertical swipes
  if (Math.abs(dy) > Math.abs(dx)) return;

  // threshold
  if (dx <= -40) goNext();
  if (dx >= 40) goPrev();
};


const title = useMemo(() => {
  if (!current) return '';

  if ('text' in current && typeof current.text === 'string') {
    return current.text;
  }

  if ('paragraphs' in current && Array.isArray(current.paragraphs)) {
    return current.paragraphs.join('\n\n');
  }

  return '';
}, [current]);


  if (!current) return null;

return (
  <div
    className="relative w-full max-w-3xl mx-auto select-none"
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
  >
      {/* Card */}
<div
  className={[
    "relative rounded-2xl bg-white/90 shadow-xl border border-black/10 overflow-hidden",
    "tt-flip-wrap",
    isFlipping ? (flipDir === 'next' ? "tt-flip-next" : "tt-flip-prev") : "",
  ].join(" ")}
>
        <div className="p-8 leading-relaxed text-lg text-black">
          {/* basic rendering; swap with your existing block renderer if you have one */}
          {title.split('\n\n').map((p, i) => (
            <p key={i} className="mb-4 last:mb-0">
              {p}
            </p>
          ))}
        </div>

        {/* Click zones (corners) */}
 {/* Corner click zones */}
<button
  type="button"
  onClick={goPrev}
  disabled={index <= 0 || isFlipping}
  aria-label="Previous"
  className="absolute bottom-0 left-0 h-24 w-24 rounded-tr-[28px] cursor-w-resize disabled:cursor-not-allowed"
  style={{ background: 'transparent' }}
/>

<button
  type="button"
  onClick={goNext}
  disabled={index >= count - 1 || isFlipping}
  aria-label="Next"
  className="absolute bottom-0 right-0 h-24 w-24 rounded-tl-[28px] cursor-e-resize disabled:cursor-not-allowed"
  style={{ background: 'transparent' }}
/>


        {/* Corner hint (optional) */}
        <div className="pointer-events-none absolute bottom-3 right-4 text-xs text-black/40">
          click corner →
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3 text-center text-sm text-white/70">
        {index + 1} / {count}
      </div>

      <style jsx global>{`
  .tt-flip-wrap {
    transform-style: preserve-3d;
    perspective: 1400px;
    will-change: transform;
    transition: transform 360ms ease, filter 360ms ease;
  }

  .tt-flip-next {
    transform: rotateY(-10deg) rotateX(1deg);
    filter: brightness(0.98);
  }

  .tt-flip-prev {
    transform: rotateY(10deg) rotateX(1deg);
    filter: brightness(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    .tt-flip-wrap {
      transition: none !important;
      transform: none !important;
      filter: none !important;
    }
  }
`}</style>

    </div>
  );
}
