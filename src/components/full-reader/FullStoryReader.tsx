'use client';

import { useEffect, useRef, useState } from 'react';

type Block = {
  id?: string;
  text?: string;
};

interface Props {
  bookId: number | string;
  title: string;
  author?: string;
  blocks?: Block[];
}

export default function FullStoryReader({
  bookId,
  title,
  author,
  blocks = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(30);

  // Load more blocks when near bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const remaining =
        el.scrollHeight - el.scrollTop - el.clientHeight;

      if (remaining < 800) {
        setVisibleCount((prev) =>
          Math.min(prev + 30, blocks.length)
        );
      }
    };

    el.addEventListener('scroll', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [blocks.length]);

  const visibleBlocks = blocks.slice(0, visibleCount);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-[#efe6d6]"
    >
      {/* Header */}
      <div className="max-w-3xl mx-auto pt-16 pb-8 px-6">
        <h1 className="text-3xl font-bold text-center">
          {title}
        </h1>

        {author && (
          <p className="text-center text-gray-600 mt-2">
            {author}
          </p>
        )}
      </div>

      {/* Story cards */}
      <div className="max-w-3xl mx-auto px-6 pb-32 space-y-6">
        {visibleBlocks.map((block, index) => (
          <div
            key={block.id ?? index}
            className="
              bg-white
              rounded-xl
              shadow-md
              p-6
              text-lg
              leading-relaxed
            "
          >
            {block.text}
          </div>
        ))}
      </div>
    </div>
  );
}
