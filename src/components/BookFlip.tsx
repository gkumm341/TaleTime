"use client";

import React, { useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

import { Button } from "@/components/ui/button";

/**
 * Inline image mapping for illustrations within text.
 * The key is the placeholder (e.g., "1.png") and value is the full URL.
 */
export type InlineImageMap = Record<string, string>;

export type PageData = {
  id: string;
  title?: string;
  text?: string;
  imageSrc?: string;
  /** Maps image placeholders like "1.png" to their URLs for inline rendering */
  inlineImages?: InlineImageMap;
  /** When true, disables auto-pagination for this page */
  lockLayout?: boolean;
};

export type BookFlipProps = {
  appName?: string;
  storyTitle: string;
  author?: string;
  coverImageSrc?: string;
  pages: PageData[];
  showHeader?: boolean;
  showTip?: boolean;
  onPageChange?: (pageIndex: number, pageCount: number) => void;
  onNavigationReady?: (nav: {
    next: () => void;
    prev: () => void;
    goTo: (pageIndex: number) => void;
    getPageIndex: () => number;
    getPageCount: () => number;
  }) => void;
};

export type BookFlipHandle = {
  next: () => void;
  prev: () => void;
  getPageIndex: () => number;
  getPageCount: () => number;
};

const MAX_TEXT_LINES_PER_PAGE = 22;

type FlipBookApi = {
  flipNext: () => void;
  flipPrev: () => void;
  // react-pageflip exposes one of these depending on version.
  flip?: (pageIndex: number) => void;
  turnToPage?: (pageIndex: number) => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
};

type FlipBookRef = {
  pageFlip: () => FlipBookApi;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function srgbToLinear(v: number) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: [number, number, number]) {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHsl(rgb: [number, number, number]) {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(hsl: { h: number; s: number; l: number }):
  | [number, number, number]
  | [number, number, number] {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 1);
  const l = clamp(hsl.l, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function rgbCss(rgb: [number, number, number], alpha = 1) {
  const a = clamp(alpha, 0, 1);
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(
    rgb[2]
  )}, ${a})`;
}

function distSq(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function pickWeightedIndex(weights: number[]) {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function kmeansDominant(pixels: Array<[number, number, number]>, k = 4) {
  if (pixels.length === 0) return null;

  const kk = clamp(k, 1, 8);

  // k-means++ initialization for more stable, "state of the art" clustering.
  const centroids: Array<[number, number, number]> = [];
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

  while (centroids.length < kk) {
    const d2 = pixels.map((p) => {
      let best = Infinity;
      for (const c of centroids) best = Math.min(best, distSq(p, c));
      return best;
    });
    const idx = pickWeightedIndex(d2);
    centroids.push(pixels[idx]);
  }

  let assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    // Assign
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = distSq(pixels[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    // Update
    const sum = centroids.map(() => [0, 0, 0] as [number, number, number]);
    const count = centroids.map(() => 0);
    for (let i = 0; i < pixels.length; i++) {
      const a = assignments[i];
      const p = pixels[i];
      sum[a][0] += p[0];
      sum[a][1] += p[1];
      sum[a][2] += p[2];
      count[a] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (count[c] === 0) continue;
      centroids[c] = [
        sum[c][0] / count[c],
        sum[c][1] / count[c],
        sum[c][2] / count[c],
      ];
    }
  }

  const clusterCounts = centroids.map(() => 0);
  for (const a of assignments) clusterCounts[a] += 1;

  let bestCluster = 0;
  for (let c = 1; c < clusterCounts.length; c++) {
    if (clusterCounts[c] > clusterCounts[bestCluster]) bestCluster = c;
  }

  return centroids[bestCluster] as [number, number, number];
}

async function extractDominantColorFromImageSrc(src: string) {
  const img = new Image();
  img.decoding = "async";
  // Best-effort: prevents canvas tainting when the server sends CORS headers.
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load cover image"));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, size, size);
  } catch {
    // Canvas likely tainted (cross-origin). Fall back.
    return null;
  }

  const pixels: Array<[number, number, number]> = [];
  const step = 2; // sample stride
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const i = (y * size + x) * 4;
      const a = data.data[i + 3] / 255;
      if (a < 0.9) continue;
      const rgb: [number, number, number] = [
        data.data[i],
        data.data[i + 1],
        data.data[i + 2],
      ];
      const lum = relativeLuminance(rgb);
      // Drop near-white / near-black pixels so we don't pick page background.
      if (lum < 0.06 || lum > 0.96) continue;
      pixels.push(rgb);
    }
  }

  const dominant = kmeansDominant(pixels, 4);
  return dominant;
}

function computeBackdropStyle(
  dominant: [number, number, number],
  opts: { isDark: boolean }
): React.CSSProperties {
  const { h, s, l } = rgbToHsl(dominant);

  // Make a subtle, book-like paper backdrop: keep hue, reduce saturation, tune lightness.
  const sat = clamp(s * 0.35, 0.06, 0.22);
  const baseL = opts.isDark ? 0.14 : 0.92;
  const edgeL = opts.isDark ? 0.08 : 0.84;

  const base = hslToRgb({ h, s: sat, l: baseL });
  const edge = hslToRgb({ h, s: sat, l: edgeL });
  const edge2 = hslToRgb({ h: (h + 14) % 360, s: sat, l: edgeL });

  const highlight = opts.isDark
    ? rgbCss([255, 255, 255], 0.06)
    : rgbCss([255, 255, 255], 0.45);
  const vignette = opts.isDark ? rgbCss([0, 0, 0], 0.35) : rgbCss([0, 0, 0], 0.12);

  return {
    backgroundImage: [
      `radial-gradient(circle at 28% 22%, ${highlight}, transparent 55%)`,
      `radial-gradient(circle at 70% 85%, ${vignette}, transparent 60%)`,
      `linear-gradient(90deg, ${rgbCss(edge)}, ${rgbCss(base)}, ${rgbCss(edge2)})`,
    ].join(", "),
  };
}

function isFlipEvent(value: unknown): value is { data: number } {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { data?: unknown }).data === "number";
}

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpointPx);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpointPx]);

  return isMobile;
}

function useFlipDimensions(isMobile: boolean) {
  const [dims, setDims] = React.useState(() => ({
    width: isMobile ? 360 : 520,
    height: isMobile ? 620 : 720,
    minWidth: isMobile ? 340 : 480,
    maxWidth: isMobile ? 420 : 720,
    minHeight: isMobile ? 560 : 640,
    maxHeight: isMobile ? 720 : 900,
  }));

  React.useEffect(() => {
    const compute = () => {
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;

      // react-pageflip's `width` is the width of a *single page*.
      // In landscape mode the book is a 2-page spread, so total width is ~2x.
      const spreadPages = isMobile ? 1 : 2;

      // Keep a consistent page shape so typography/layout stays predictable.
      // (Matches the old 620x880-ish page size.)
      const PAGE_ASPECT = 880 / 620; // height / width

      // Leave space for headers/controls around the book.
      const availableH = Math.max(520, vh - (isMobile ? 150 : 190));
      const availableW = Math.max(320, vw - (isMobile ? 32 : 96));

      const minPageW = isMobile ? 320 : 440;
      const minPageH = isMobile ? 560 : 680;

      const maxPageW = Math.max(minPageW, Math.floor(availableW / spreadPages));
      const maxPageH = Math.max(minPageH, availableH);

      // Start from height, then derive width by aspect ratio, then clamp to width.
      // Finally recompute height from the chosen width.
      const targetH = clamp(
        maxPageH,
        minPageH,
        isMobile ? 920 : 1200
      );
      const targetWFromH = targetH / PAGE_ASPECT;
      const width = clamp(targetWFromH, minPageW, maxPageW);
      const height = clamp(width * PAGE_ASPECT, minPageH, maxPageH);

      setDims({
        width,
        height,
        minWidth: minPageW,
        maxWidth: maxPageW,
        minHeight: minPageH,
        maxHeight: maxPageH,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [isMobile]);

  return dims;
}

const Page = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className="tt-storybook-page relative h-full w-full rounded-2xl shadow-xl overflow-hidden"
      >
        <div aria-hidden="true" className="tt-storybook-corners">
          <div className="tt-storybook-corner tt-storybook-corner--tl" />
          <div className="tt-storybook-corner tt-storybook-corner--tr" />
          <div className="tt-storybook-corner tt-storybook-corner--bl" />
          <div className="tt-storybook-corner tt-storybook-corner--br" />
        </div>
        {children}
      </div>
    );
  }
);
Page.displayName = "Page";

function CoverPage({
  appName,
  storyTitle,
  author,
  coverImageSrc,
}: {
  appName?: string;
  storyTitle: string;
  author?: string;
  coverImageSrc?: string;
}) {
  const [backdropStyle, setBackdropStyle] = React.useState<
    React.CSSProperties | undefined
  >(undefined);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!coverImageSrc) {
        if (!cancelled) setBackdropStyle(undefined);
        return;
      }

      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");

      try {
        const dominant = await extractDominantColorFromImageSrc(coverImageSrc);
        if (cancelled) return;
        if (!dominant) {
          setBackdropStyle(undefined);
          return;
        }
        setBackdropStyle(computeBackdropStyle(dominant, { isDark }));
      } catch {
        if (!cancelled) setBackdropStyle(undefined);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [coverImageSrc]);

  return (
    <div
      className="tt-storybook-cover relative h-full w-full flex flex-col"
      style={backdropStyle}
    >
      {coverImageSrc ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="absolute inset-[16%]">
            <img
              src={coverImageSrc}
              alt={`${storyTitle} cover`}
              className="h-full w-full"
            />
          </div>

          <img
            src="/bookFrame.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full object-fill"
          />



        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-tt bg-tt-tertiary/20 flex items-center justify-center text-tt-tertiary font-bold">
            TT
          </div>
          <p className="mt-4 text-tt-primary dark:text-white font-medium">
            Add a cover image later
          </p>
          <p className="mt-1 text-tt-primary/70 dark:text-gray-300 text-sm">
            This is your book&apos;s cover page.
          </p>
        </div>
      )}

      {/* 
      <div className="mt-6 text-xs text-tt-primary/60 dark:text-gray-400">
        Tip: drag the page corner or use Next/Prev.
      </div> */}
    </div>
  );
}

/**
 * Parses text containing {{image.png}} placeholders and renders mixed content.
 * Images are displayed inline with the text flow, like a children's book.
 */
export function renderTextWithInlineImages(
  text: string,
  inlineImages?: InlineImageMap
): React.ReactNode {
  const normalizeProse = (raw: string) => {
    const cleaned = raw.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
    const paras = cleaned
      .split(/(?:\n\s*\n+|\u2029)+/g)
      .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
      .filter(Boolean);
    return {
      paragraphs: paras,
      // Use \n to represent paragraph breaks for measurement/pagination.
      normalized: paras.join("\n"),
    };
  };

  const renderBookParagraphs = (raw: string) => {
    const { paragraphs } = normalizeProse(raw);
    if (paragraphs.length === 0) return null;
    return paragraphs.map((p, idx) => (
      <p key={idx} className="tt-storybook-paragraph">
        {p}
      </p>
    ));
  };

  const hasPlaceholders = /\{\{([^{}]+)\}\}/.test(text);
  if (!hasPlaceholders) {
    return renderBookParagraphs(text);
  }

  if (!inlineImages || Object.keys(inlineImages).length === 0) {
    return renderBookParagraphs(text);
  }

  const extractImageFileName = (rawToken: string): string | null => {
    const token = rawToken.trim();
    // 1) Direct filename anywhere in the token (supports bare: 1.png, path: illustrations/1.png)
    const direct = token.match(/([A-Za-z0-9 _.-]+\.(?:png|jpe?g|webp|gif|svg))/i);
    if (direct?.[1]) {
      return direct[1].split(/[/\\]/).pop() ?? null;
    }
    // 2) Jinja-style helper call: illustration("1.png") / image('1.png') etc
    const quoted = token.match(/['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg))['"]/i);
    if (quoted?.[1]) {
      return quoted[1].split(/[/\\]/).pop() ?? null;
    }
    return null;
  };

  // Match {{anything}} pattern - use [^{}]+ to avoid matching nested braces
  const regex = /\{\{([^{}]+)\}\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      // Preserve whitespace/newlines exactly (important for child-book flow).
      parts.push(
        <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
          {textBefore}
        </span>
      );
    }

    // Add the image
    const placeholderExpr = match[1].trim();
    const imageName = extractImageFileName(placeholderExpr) ?? placeholderExpr;
    const imageUrl = inlineImages[imageName];
    if (imageUrl) {
      parts.push(
        <span key={`img-${keyIndex++}`} className="inline-block w-full my-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Story illustration"
            className="w-full object-contain rounded-xl border border-tt-border/20 dark:border-tt-border/10 bg-tt-secondary/30 dark:bg-gray-800"
            style={{ maxHeight: 'min(160px, 30vh)' }}
            loading="lazy"
          />
        </span>
      );
    } else {
      // If we don't have a URL for this placeholder, keep it as text so it's debuggable.
      parts.push(
        <span key={`ph-${keyIndex++}`} className="whitespace-pre-wrap">
          {match[0]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    parts.push(
      <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
        {textAfter}
      </span>
    );
  }

  return parts.length > 0 ? parts : text;
}

function getSinglePlaceholderName(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^\{\{([^{}]+)\}\}$/);
  if (!m) return null;
  const token = m[1].trim();
  const direct = token.match(/([A-Za-z0-9 _.-]+\.(?:png|jpe?g|webp|gif|svg))/i);
  if (direct?.[1]) return direct[1].split(/[/\\]/).pop() ?? token;
  const quoted = token.match(/['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg))['"]/i);
  if (quoted?.[1]) return quoted[1].split(/[/\\]/).pop() ?? token;
  return token;
}

function StoryPage({
  title,
  bookTitle,
  text,
  imageSrc,
  inlineImages,
  isSpreadStart,
}: {
  title?: string;
  bookTitle?: string;
  text?: string;
  imageSrc?: string;
  inlineImages?: InlineImageMap;
  isSpreadStart?: boolean;
}) {
  const singlePlaceholderName = useMemo(() => getSinglePlaceholderName(text ?? ''), [text]);
  const fullPageImageUrl = singlePlaceholderName ? inlineImages?.[singlePlaceholderName] : undefined;

  if (fullPageImageUrl) {
    return (
      <div className="h-full w-full p-6 sm:p-8 flex flex-col">
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullPageImageUrl}
            alt="Story illustration"
            className="w-auto h-full rounded-xl "
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // Detect if this is a "continuation" chunk (no header elements at all).
  const hasHeader = Boolean(bookTitle || title || isSpreadStart);

  return (
    <div className="h-full w-full p-6 sm:p-8 flex flex-col">
      {isSpreadStart ? (
        <div aria-hidden="true" className="tt-storybook-chapter-ornament" />
      ) : null}

      {bookTitle ? (
        <h1 className="text-tt-tertiary w-full text-center text-3xl font-extrabold tracking-tight mt-6">
          {bookTitle}
          <div className="border-b-4 border-tt-accent mt-4 dark:border-tt-border/10" />

        </h1>
      ) : null}
      {title ? (
        <h2 className="tt-storybook-title text-xl font-bold mt-2">{title}</h2>
      ) : hasHeader ? (
        <div className="h-6" />
      ) : null}

      {imageSrc ? (
        <div className="mt-4 rounded-tt border border-tt-border/20 dark:border-tt-border/10 overflow-hidden bg-tt-secondary/30 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={title ?? "Story illustration"}
            className="w-full h-44 object-cover"
          />
        </div>
      ) : null}

      <div className="mt-4 flex-1 overflow-hidden">
        <div className="h-full overflow-hidden pr-4 pb-6 box-border">
          <div className="tt-storybook-prose tt-storybook-prose-book leading-snug" lang="en">
            {renderTextWithInlineImages(text ?? "", inlineImages)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookFlip({
  appName,
  storyTitle,
  author,
  coverImageSrc,
  pages,
  showHeader = true,
  showTip = true,
  onPageChange,
  onNavigationReady,
}: BookFlipProps) {
  const bookRef = useRef<unknown>(null);
  const isMobile = useIsMobile(768);
  const [pageIndex, setPageIndex] = useState(0);
  const dims = useFlipDimensions(isMobile);

  const [paginatedPages, setPaginatedPages] = React.useState<PageData[] | null>(
    null
  );

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    // Build an off-screen DOM that mirrors the StoryPage text area. This lets us
    // measure pagination based on the real available height (instead of a fixed
    // line-count), making pages much more consistently filled.
    const measureShell = document.createElement("div");
    measureShell.setAttribute("data-tt-measure-shell", "storybook");
    measureShell.className = "h-full w-full p-6 sm:p-8 flex flex-col";
    Object.assign(measureShell.style, {
      position: "fixed",
      left: "-99999px",
      top: "0",
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      visibility: "hidden",
      pointerEvents: "none",
    } as Partial<CSSStyleDeclaration>);

    // Mirror StoryPage header elements so pagination doesn't under-fill pages.
    const ornamentEl = document.createElement("div");
    ornamentEl.className = "tt-storybook-chapter-ornament";
    ornamentEl.setAttribute("aria-hidden", "true");
    measureShell.appendChild(ornamentEl);

    const bookTitleEl = document.createElement("h1");
    bookTitleEl.className =
      "text-tt-tertiary w-full text-center text-3xl font-extrabold tracking-tight";
    const bookTitleDivider = document.createElement("div");
    bookTitleDivider.className =
      "border-b-4 border-tt-accent mt-4 dark:border-tt-border/10";
    bookTitleEl.appendChild(bookTitleDivider);
    measureShell.appendChild(bookTitleEl);

    const titleEl = document.createElement("h2");
    titleEl.className = "tt-storybook-title text-xl font-bold mt-2";
    measureShell.appendChild(titleEl);

    // StoryPage renders <div className="h-6" /> when there is no title.
    const titleSpacer = document.createElement("div");
    titleSpacer.className = "h-6";
    measureShell.appendChild(titleSpacer);

    const measureOuter = document.createElement("div");
    measureOuter.className = "mt-4 flex-1 overflow-hidden";
    const measureInner = document.createElement("div");
    measureInner.className = "h-full overflow-hidden pr-4 pb-6 box-border";
    const measureEl = document.createElement("div");
    measureEl.setAttribute("data-tt-measure", "storybook");
    measureEl.className =
      "tt-storybook-prose tt-storybook-prose-book leading-snug word-break-break-word overflow-wrap-anywhere";
    Object.assign(measureEl.style, {
      whiteSpace: "pre-line",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    } as Partial<CSSStyleDeclaration>);

    measureInner.appendChild(measureEl);
    measureOuter.appendChild(measureInner);
    measureShell.appendChild(measureOuter);
    document.body.appendChild(measureShell);

    const configureMeasureHeader = (opts: {
      showOrnament: boolean;
      bookTitle?: string;
      title?: string;
    }) => {
      const hasAnyHeader = opts.showOrnament || opts.bookTitle || opts.title;

      ornamentEl.style.display = opts.showOrnament ? "" : "none";

      if (opts.bookTitle && opts.bookTitle.trim().length > 0) {
        bookTitleEl.style.display = "";
        // Preserve divider child; set only the text node.
        bookTitleEl.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) bookTitleEl.removeChild(node);
        });
        bookTitleEl.insertBefore(
          document.createTextNode(opts.bookTitle),
          bookTitleDivider
        );
      } else {
        bookTitleEl.style.display = "none";
        // Ensure we don't accumulate text nodes.
        bookTitleEl.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) bookTitleEl.removeChild(node);
        });
      }

      if (opts.title && opts.title.trim().length > 0) {
        titleEl.style.display = "";
        titleEl.textContent = opts.title;
        titleSpacer.style.display = "none";
      } else {
        titleEl.style.display = "none";
        titleEl.textContent = "";
        // Only show the spacer if there's some other header element; 
        // continuation pages have no header at all.
        titleSpacer.style.display = hasAnyHeader ? "" : "none";
      }
    };

    const getLineHeightPx = () => {
      const style = window.getComputedStyle(measureEl);
      const lh = Number.parseFloat(style.lineHeight);
      if (Number.isFinite(lh) && lh > 0) return lh;
      const fs = Number.parseFloat(style.fontSize);
      return (Number.isFinite(fs) && fs > 0 ? fs : 16) * 1.2;
    };

    const lineHeightPx = getLineHeightPx();
    const getMaxHeightForCurrentLayout = () => {
      const innerStyle = window.getComputedStyle(measureInner);
      const padTop = Number.parseFloat(innerStyle.paddingTop) || 0;
      const padBottom = Number.parseFloat(innerStyle.paddingBottom) || 0;
      const measuredMaxHeight = measureInner.clientHeight - padTop - padBottom;
      const fallbackMaxHeight = lineHeightPx * MAX_TEXT_LINES_PER_PAGE + 0.5;
      return Number.isFinite(measuredMaxHeight) && measuredMaxHeight > 0
        ? measuredMaxHeight
        : fallbackMaxHeight;
    };

    const normalizeProseForPagination = (raw: string) => {
      const cleaned = raw.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
      const paras = cleaned
        .split(/\n\s*\n+/g)
        .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
        .filter(Boolean);
      // Use a sentinel for paragraph boundaries so rendering can keep indents
      // while measurement treats it as a single line break.
      return paras.join("\u2029");
    };

    const setMeasuredProse = (candidate: string) => {
      // Mirror `renderTextWithInlineImages` for non-placeholder text: a list of
      // <p class="tt-storybook-paragraph"> nodes. Measuring raw textContent
      // underestimates height because it ignores paragraph flow.
      const paras = candidate
        .replace(/\r\n?/g, "\n")
        .split(/\u2029+/g)
        .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
        .filter(Boolean);

      const frag = document.createDocumentFragment();
      for (let i = 0; i < paras.length; i++) {
        const p = document.createElement("p");
        p.className = "tt-storybook-paragraph";
        p.textContent = paras[i];
        frag.appendChild(p);
      }
      measureEl.replaceChildren(frag);
    };

    const measureHeight = (candidate: string) => {
      setMeasuredProse(candidate);
      return measureEl.scrollHeight;
    };

    const makeFindChunk = (maxHeight: number) => {
      const fits = (candidate: string) => measureHeight(candidate) <= maxHeight;

      // Fast path
      return (text: string) => {
        if (fits(text)) return { head: text, tail: "" };

        // First, find the maximum fitting index (hard limit).
        let low = 1;
        let high = text.length;
        let maxFit = 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const candidate = text.slice(0, mid);
          if (fits(candidate)) {
            maxFit = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        // Prefer breaking on whitespace so we don't split words.
        let breakIndex = maxFit;
        const before = text.slice(0, breakIndex);
        const lastWs = Math.max(
          before.lastIndexOf(" "),
          before.lastIndexOf("\n"),
          before.lastIndexOf("\t"),
          before.lastIndexOf("\u2029")
        );
        // Only snap to whitespace if it's reasonably close; otherwise we would
        // leave too much unused space on the page. Even when close, avoid
        // snapping if it would under-fill the page by a lot (common with short
        // paragraphs at the start of the next page).
        if (lastWs > 0 && breakIndex - lastWs <= 80) {
          const candidateMax = text.slice(0, maxFit);
          const candidateWs = text.slice(0, lastWs);
          const hMax = measureHeight(candidateMax);
          const hWs = measureHeight(candidateWs);

          // Keep the whitespace snap if it leaves at most ~1 line unused or
          // still fills most of the page.
          const nearFull = hWs >= maxHeight - lineHeightPx * 1.2;
          const mostlyFull = hWs / maxHeight >= 0.92;
          const isBetterFit = hWs >= hMax - lineHeightPx * 0.6;
          if (nearFull || mostlyFull || isBetterFit) breakIndex = lastWs;
        }

        const head = text.slice(0, breakIndex).trimEnd();
        const tail = text.slice(breakIndex).trimStart();
        return {
          head: head.length > 0 ? head : text.slice(0, maxFit).trimEnd(),
          tail,
        };
      };
    };

    const paginateTextOnlyPage = (p: PageData, pageIdx: number): PageData[] => {
      const text = p.text ?? "";
      if (text.trim().length === 0) return [p];

      if (p.lockLayout) return [p];

      // Avoid splitting pages that may contain inline images/placeholders.
      // NOTE: We *do* allow splitting when an inline image map exists but the text
      // doesn't actually contain placeholders, since many callers attach the map
      // universally.
      if (p.imageSrc || /\{\{[^{}]+\}\}/.test(text)) return [p];

      const normalized = normalizeProseForPagination(text);
      if (normalized.trim().length === 0) return [p];

      const out: PageData[] = [];
      let remaining = normalized;
      let chunkIndex = 0;
      while (remaining.trim().length > 0) {
        // Reconfigure header for EACH chunk: only the first chunk has title/bookTitle.
        // Continuation chunks have no header, so they get more text space.
        const isFirstChunk = chunkIndex === 0;
        configureMeasureHeader({
          // Mirror StoryPage usage: ornament on spread starts.
          showOrnament: isFirstChunk && (isMobile || pageIdx % 2 === 0),
          bookTitle: isFirstChunk && pageIdx === 0 ? storyTitle : undefined,
          title: isFirstChunk ? p.title : undefined,
        });
        const maxHeight = getMaxHeightForCurrentLayout();
        const findChunk = makeFindChunk(maxHeight);

        const { head, tail } = findChunk(remaining);
        const id = `${p.id}-chunk-${chunkIndex}`;
        out.push({
          ...p,
          id,
          // Keep title/image only on the first chunk.
          title: isFirstChunk ? p.title : undefined,
          imageSrc: isFirstChunk ? p.imageSrc : undefined,
          inlineImages: isFirstChunk ? p.inlineImages : undefined,
          text: head,
        });

        if (!tail || tail === remaining) break;
        remaining = tail;
        chunkIndex += 1;

        // Safety valve
        if (chunkIndex > 50) break;
      }

      return out.length > 0 ? out : [p];
    };

    try {
      const next = pages.flatMap((p, idx) => paginateTextOnlyPage(p, idx));
      setPaginatedPages(next);
    } finally {
      measureShell.remove();
    }
  }, [pages, dims.width, dims.height]);

  const storyPages = paginatedPages ?? pages;

  const endPageCount = 2; // blank end page + closed book image page
  const frontBlankPageCount = 0; // start story on the left page
  const pageCount = useMemo(
    () => storyPages.length + 1 + frontBlankPageCount + endPageCount,
    [storyPages.length]
  );

  const width = dims.width;
  const height = dims.height;

  const getFlipApi = (): FlipBookApi | null => {
    const ref = bookRef.current as FlipBookRef | null;
    if (!ref?.pageFlip) return null;
    return ref.pageFlip();
  };

  const goNext = React.useCallback(() => getFlipApi()?.flipNext(), []);
  const goPrev = React.useCallback(() => getFlipApi()?.flipPrev(), []);
  const goTo = React.useCallback((targetPageIndex: number) => {
    const attempt = (triesLeft: number) => {
      const api = getFlipApi();
      if (!api) {
        if (triesLeft > 0) {
          window.setTimeout(() => attempt(triesLeft - 1), 50);
        }
        return;
      }

      const pageCount = api.getPageCount?.() ?? 0;
      const safeIndex = clamp(targetPageIndex, 0, Math.max(0, pageCount - 1));
      try {
        if (typeof api.turnToPage === 'function') {
          api.turnToPage(safeIndex);
          return;
        }
        if (typeof api.flip === 'function') {
          api.flip(safeIndex);
        }
      } catch {
        // ignore
      }
    };

    if (typeof window === 'undefined') return;
    attempt(10);
  }, []);

  const getPageIndex = React.useCallback(() => getFlipApi()?.getCurrentPageIndex?.() ?? pageIndex, [pageIndex]);
  const getPageCount = React.useCallback(() => getFlipApi()?.getPageCount?.() ?? pageCount, [pageCount]);

  React.useEffect(() => {
    onNavigationReady?.({ next: goNext, prev: goPrev, goTo, getPageIndex, getPageCount });
  }, [onNavigationReady, goNext, goPrev, goTo, getPageIndex, getPageCount]);

  React.useEffect(() => {
    onPageChange?.(pageIndex, pageCount);
  }, [onPageChange, pageCount, pageIndex]);

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1));
  }, [pageCount, pageIndex]);

  return (
    <div className="py-4">
      {showHeader ? (
        <div className="w-full max-w-5xl flex items-center justify-between px-4">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-tt-primary dark:text-white">
              {storyTitle}
            </div>
            <div className="text-xs text-tt-primary/60 dark:text-gray-400">
              Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={goPrev}
              variant="outline"
              size="sm"
              disabled={pageIndex <= 0}
              type="button"
            >
              Prev
            </Button>
            <Button
              onClick={goNext}
              size="sm"
              disabled={pageIndex >= pageCount - 1}
              type="button"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <div className="w-full flex items-center justify-center">
        <HTMLFlipBook
          style={{}}
          width={width}
          height={height}
          size="fixed"
          startPage={0}
          minWidth={dims.minWidth}
          maxWidth={dims.maxWidth}
          minHeight={dims.minHeight}
          maxHeight={dims.maxHeight}
          drawShadow={true}
          flippingTime={700}
          usePortrait={isMobile}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.25}
          showCover={true}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          className="rounded-2xl"
          ref={bookRef as unknown as React.RefObject<unknown>}
          onFlip={(e: unknown) => setPageIndex(isFlipEvent(e) ? e.data : 0)}
        >
          {[
            <Page key="cover">
              <CoverPage
                appName={appName}
                storyTitle={storyTitle}
                author={author}
                coverImageSrc={coverImageSrc}
              />
            </Page>,
            ...(frontBlankPageCount > 0
              ? [
                  <Page key="front-blank">
                    <div className="h-full w-full" />
                  </Page>,
                ]
              : []),
            ...storyPages.map((p, idx) => (
              <Page key={p.id}>
                <StoryPage
                  title={p.title}
                  bookTitle={idx === 0 ? storyTitle : undefined}
                  text={p.text}
                  imageSrc={p.imageSrc}
                  inlineImages={p.inlineImages}
                  isSpreadStart={isMobile || idx % 2 === 0}
                />
                <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-tt-primary/60 dark:text-gray-400 tabular-nums">
                  {idx + 1}
                </div>
              </Page>
            )),
            <Page key="end-blank">
              <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-tt-tertiary dark:text-gray-400">
                THE END!
              </div>
              <div className="h-full w-full" />
            </Page>,
            <Page key="end-closed-book">
              <div className="flex items-center justify-center w-[750px] -ml-[86px] -mt-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/closedBook2.png"
                  alt="Closed book"
                  className="h-[935px] w-[650px]"
                />
              </div>
            </Page>,
          ]}
        </HTMLFlipBook>
      </div>

    </div>
  );
}
