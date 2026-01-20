'use client';

import { useEffect, useState } from 'react';

type Props = {
  alt: string;
  className?: string;
  title?: string;
};

let transparentBookmarkDataUrlPromise: Promise<string> | null = null;

function buildTransparentBookmarkDataUrl(): Promise<string> {
  // Cache the work so grids don't reprocess per-card.
  if (transparentBookmarkDataUrlPromise) return transparentBookmarkDataUrlPromise;

  transparentBookmarkDataUrlPromise = new Promise<string>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('BookmarkPng can only run in the browser'));
      return;
    }

    const img = new window.Image();
    // Same-origin, but set anyway for safety with canvas.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = '/bookmark2.png';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Remove near-white pixels (the baked background) by making them transparent.
        // Threshold is intentionally conservative to preserve texture.
        const maxDist = 28; // 0..~441, so this is very close to white
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          const dr = 255 - r;
          const dg = 255 - g;
          const db = 255 - b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist <= maxDist) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process bookmark image'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load /bookmark2.png'));
  });

  return transparentBookmarkDataUrlPromise;
}

export default function BookmarkPng({ alt, className, title }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildTransparentBookmarkDataUrl()
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        // If processing fails, fall back to the original image.
        if (!cancelled) setSrc('/bookmark2.png');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!src) return null;

  // Use a plain img because Next/Image doesn't consistently optimize data URLs.
  return <img src={src} alt={alt} title={title} className={className} draggable={false} />;
}
