'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import BookFlip, { type PageData, type InlineImageMap } from '@/components/BookFlip';
import { ChevronLeft, Clock, Loader2, RotateCcw, Home } from 'lucide-react';

const TIME_OPTIONS = [
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'full', label: 'Full version' },
] as const;

export type TimeOptionId = (typeof TIME_OPTIONS)[number]['id'];

const TIME_SELECTION_KEY = 'taletime-time-selection';

interface Book {
  id: number;
  title: string;
  authors: string;
  coverUrl?: string;
  epubUrl?: string;
  minutes?: number;
  words?: number;
  txtUrl?: string;
  isCached?: boolean;
  subjects?: string[];
}

interface AbridgedResponse {
  bookId: number;
  minutes: number;
  wpm: number;
  title: string;
  author: string;
  content: string;
  mode: 'llm' | 'extractive' | 'local';
}

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpointPx);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpointPx]);

  return isMobile;
}

function useFlipDimensions(isMobile: boolean) {
  const [dims, setDims] = useState(() => ({
    width: isMobile ? 360 : 520,
    height: isMobile ? 620 : 720,
    minWidth: isMobile ? 340 : 480,
    maxWidth: isMobile ? 420 : 720,
    minHeight: isMobile ? 560 : 640,
    maxHeight: isMobile ? 720 : 900,
  }));


  useEffect(() => {
    const compute = () => {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;

      // Leave space for headers/controls around the book.
      const availableH = Math.max(520, vh - (isMobile ? 160 : 190));
      const availableW = Math.max(320, vw - (isMobile ? 48 : 96));

      const height = Math.min(isMobile ? 740 : 880, availableH);
      const width = Math.min(isMobile ? 420 : 620, availableW);

      setDims({
        width,
        height,
        minWidth: isMobile ? 340 : 480,
        maxWidth: isMobile ? 460 : 760,
        minHeight: isMobile ? 600 : 700,
        maxHeight: isMobile ? 820 : 980,
      });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [isMobile]);

  return dims;
}

export default function AbridgedBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { preferences } = usePreferences();

  const isMobile = useIsMobile(768);
  const dims = useFlipDimensions(isMobile);

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

  const selectedTimeOptionId: TimeOptionId = variant;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AbridgedResponse | null>(null);

  const [pages, setPages] = useState<PageData[]>([]);

  const measureScrollRef = useRef<HTMLDivElement | null>(null);
  const measureTextRef = useRef<HTMLParagraphElement | null>(null);

  const [flipNav, setFlipNav] = useState<{ next: () => void; prev: () => void } | null>(null);
  const [flipMeta, setFlipMeta] = useState<{ pageIndex: number; pageCount: number }>({
    pageIndex: 0,
    pageCount: 0,
  });

  const handleFlipNavReady = useCallback(
    (nav: { next: () => void; prev: () => void }) => {
      setFlipNav(nav);
    },
    []
  );

  const handleFlipPageChange = useCallback((pageIndex: number, pageCount: number) => {
    setFlipMeta({ pageIndex, pageCount });
  }, []);

  const coverImageSrc = useMemo(() => {
    if (!data?.title) return undefined;
    return `/api/local-image?title=${encodeURIComponent(data.title)}`;
  }, [data?.title]);

  const coverBackdropUrl = useMemo(() => {
    if (variant !== 'bedtime') return null;
    if (!data?.title) return null;
    return `/api/local-image?title=${encodeURIComponent(data.title)}`;
  }, [variant, data?.title]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastStoredAudioSecondRef = useRef(-1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasAudioResumePoint, setHasAudioResumePoint] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const hasTaleTimeAudio = audioStatus === 'available';
  const isCheckingAudio = audioStatus === 'checking';
  const shouldShowTaleTimeAudio = useMemo(
    () => variant === 'bedtime' && (isCheckingAudio || hasTaleTimeAudio),
    [variant, isCheckingAudio, hasTaleTimeAudio]
  );
  const audioResumeKey = useMemo(() => `taletime-audio-resume:${id}:${variant}`, [id, variant]);
  const taleTimeAudioSrc = useMemo(() => {
    const titleForLookup = data?.title || '';
    return `/api/local-audio?title=${encodeURIComponent(titleForLookup)}`;
  }, [data?.title]);

  const readStoredResumeTime = useCallback(() => {
    try {
      const raw = localStorage.getItem(audioResumeKey);
      const t = raw ? Number(raw) : 0;
      return Number.isFinite(t) && t > 0 ? t : 0;
    } catch {
      return 0;
    }
  }, [audioResumeKey]);

  const writeStoredResumeTime = useCallback(
    (t: number) => {
      try {
        if (!Number.isFinite(t) || t <= 0) {
          localStorage.removeItem(audioResumeKey);
          setHasAudioResumePoint((prev) => (prev ? false : prev));
          return;
        }
        localStorage.setItem(audioResumeKey, String(t));
        setHasAudioResumePoint((prev) => {
          const next = t > 1;
          return prev === next ? prev : next;
        });
      } catch {
        // ignore storage errors
      }
    },
    [audioResumeKey]
  );

  useEffect(() => {
    // If user navigates away / variant changes, stop audio.
    if (!shouldShowTaleTimeAudio && audioRef.current) {
      // Persist position for quick resume if they return.
      writeStoredResumeTime(audioRef.current.currentTime);
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [shouldShowTaleTimeAudio, writeStoredResumeTime]);

  useEffect(() => {
    // Initialize resume state when switching books/variants.
    if (typeof window === 'undefined') return;
    setHasAudioResumePoint(readStoredResumeTime() > 1);
  }, [readStoredResumeTime]);

  useEffect(() => {
    // Persist position on unmount.
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      writeStoredResumeTime(audio.currentTime);
    };
  }, [writeStoredResumeTime]);

  useEffect(() => {
    // Auto-detect whether an MP3 exists for this bedtime story.
    if (variant !== 'bedtime') {
      setAudioStatus('idle');
      return;
    }

    const title = data?.title;
    if (!title) {
      setAudioStatus('idle');
      return;
    }

    const safeTitle: string = title;

    const controller = new AbortController();
    const check = async () => {
      try {
        setAudioStatus('checking');
        const res = await fetch(`/api/local-audio?title=${encodeURIComponent(safeTitle)}`, {
          method: 'HEAD',
          signal: controller.signal,
        });
        setAudioStatus(res.ok ? 'available' : 'unavailable');
      } catch (e: unknown) {
        const name = e && typeof e === 'object' && 'name' in e ? (e as { name?: unknown }).name : undefined;
        if (name === 'AbortError') return;
        setAudioStatus('unavailable');
      }
    };

    check();
    return () => controller.abort();
  }, [variant, data?.title]);

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

        if (res.status === 401 || res.status === 402) {
          const json = (await res.json().catch(() => null)) as unknown;
          const code =
            json && typeof json === 'object' && 'code' in json && typeof (json as { code?: unknown }).code === 'string'
              ? (json as { code: string }).code
              : undefined;
          const msg =
            json && typeof json === 'object' && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
              ? (json as { error: string }).error
              : res.status === 401
                ? 'Sign in required'
                : 'Upgrade required';
          const next = `/book/${id}/abridged?variant=${variant}`;
          const action =
            code === 'AUTH_REQUIRED'
              ? `\n\nGo to /signin?next=${encodeURIComponent(next)}`
              : `\n\nGo to /account?next=${encodeURIComponent(next)}`;
          throw new Error(`${msg}${action}`);
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Failed to abridge: ${res.status}`);
        }

        const json = (await res.json()) as AbridgedResponse;
        setData(json);
      } catch (e: unknown) {
        const name = e && typeof e === 'object' && 'name' in e ? (e as { name?: unknown }).name : undefined;
        if (name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to abridge');
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [id, minutes, variant, preferences?.defaultWpm]);

  useLayoutEffect(() => {
    const raw = (data?.content ?? '').trim();
    if (!raw) {
      setPages([]);
      return;
    }

    const scrollBox = measureScrollRef.current;
    const textNode = measureTextRef.current;
    if (!scrollBox || !textNode) return;

    // Image placeholder pattern
    const imageRegex = /\{\{[^}]+\}\}/g;
    // Estimated height per inline image. Keep it responsive so tiny viewports
    // don't force-split a single {{...}} token.
    const IMAGE_HEIGHT_ESTIMATE = Math.min(184, Math.floor(scrollBox.clientHeight * 0.32));

    const paragraphs = raw
      .split(/\n{2,}/g)
      .map((p) => p.trim())
      .filter(Boolean);

    const fits = (candidate: string) => {
      // Count image placeholders in the candidate
      const imageMatches = candidate.match(imageRegex);
      const imageCount = imageMatches ? imageMatches.length : 0;
      const extraImageHeight = imageCount * IMAGE_HEIGHT_ESTIMATE;

      // Remove image placeholders for text measurement
      const textOnly = candidate.replace(imageRegex, '');
      textNode.textContent = textOnly;
      
      // scrollHeight/clientHeight forces layout; add a small fudge for rounding.
      // Subtract image height from available space
      const availableHeight = scrollBox.clientHeight - extraImageHeight;
      return scrollBox.scrollHeight <= availableHeight + 1;
    };

    const isImageOnlyParagraph = (s: string) => /^\s*\{\{[^{}]+\}\}\s*$/.test(s);

    const wordCount = (s: string) => {
      const m = s.trim().match(/\S+/g);
      return m ? m.length : 0;
    };

    const splitStringToFit = (input: string): string[] => {
      let remaining = input.trim();
      if (!remaining) return [];

      const out: string[] = [];
      while (remaining.length > 0) {
        // Never split inside a placeholder token.
        // If the remaining chunk starts with {{...}}, take the whole token at once.
        if (remaining.startsWith('{{')) {
          const end = remaining.indexOf('}}');
          if (end !== -1) {
            const token = remaining.slice(0, end + 2).trim();
            if (token) out.push(token);
            remaining = remaining.slice(end + 2).trim();
            continue;
          }
        }

        if (fits(remaining)) {
          out.push(remaining);
          break;
        }

        // Find the largest prefix that fits using binary search.
        let lo = 1;
        let hi = remaining.length;
        let best = 0;

        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const cand = remaining.slice(0, mid);
          if (fits(cand)) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        // Safety: if nothing fits, force progress.
        if (best <= 0) {
          best = Math.min(remaining.length, 1);
        }

        // Prefer breaking on whitespace near the end of the fitting range.
        let cut = best;
        const lastSpace = remaining.lastIndexOf(' ', best - 1);
        if (lastSpace > Math.floor(best * 0.6)) {
          cut = lastSpace + 1;
        }

        // IMPORTANT: Never split inside an image placeholder {{...}}
        // Check if we're cutting inside a placeholder and adjust
        const beforeCut = remaining.slice(0, cut);
        const openBraces = (beforeCut.match(/\{\{/g) || []).length;
        const closeBraces = (beforeCut.match(/\}\}/g) || []).length;
        if (openBraces > closeBraces) {
          // We're inside an unclosed placeholder - find the previous complete placeholder or text
          const lastComplete = beforeCut.lastIndexOf('}}');
          if (lastComplete > 0) {
            cut = lastComplete + 2;
          } else {
            // No complete placeholder before, find the start of this placeholder
            const placeholderStart = beforeCut.lastIndexOf('{{');
            if (placeholderStart > 0) {
              cut = placeholderStart;
            }
          }
        }

        // Avoid creating a tiny trailing fragment (e.g., a single word on its own page).
        // If the remainder would be very short, move the cut earlier to keep the next chunk meaningful.
        const minRemainderChars = 24;
        const minRemainderWords = 4;
        let remainder = remaining.slice(cut).trim();

        if (remainder && remainder.length < minRemainderChars && wordCount(remainder) < minRemainderWords) {
          let prev = remaining.lastIndexOf(' ', Math.max(0, cut - 2));
          while (prev > 0) {
            const candidateCut = prev + 1;
            const candidateRemainder = remaining.slice(candidateCut).trim();
            if (!candidateRemainder) break;
            
            // Don't break inside a placeholder
            const candidateBefore = remaining.slice(0, candidateCut);
            const candOpenBraces = (candidateBefore.match(/\{\{/g) || []).length;
            const candCloseBraces = (candidateBefore.match(/\}\}/g) || []).length;
            if (candOpenBraces > candCloseBraces) {
              // This cut would be inside a placeholder, skip it
              prev = remaining.lastIndexOf(' ', prev - 1);
              continue;
            }
            
            if (candidateRemainder.length >= minRemainderChars || wordCount(candidateRemainder) >= minRemainderWords) {
              cut = candidateCut;
              remainder = candidateRemainder;
              break;
            }
            prev = remaining.lastIndexOf(' ', prev - 1);
          }
        }

        // Final safety: after all adjustments, never split inside a placeholder.
        // (The tiny-fragment adjustment above can move the cut, so re-check here.)
        {
          const finalBeforeCut = remaining.slice(0, cut);
          const finalOpen = (finalBeforeCut.match(/\{\{/g) || []).length;
          const finalClose = (finalBeforeCut.match(/\}\}/g) || []).length;
          if (finalOpen > finalClose) {
            const lastComplete = finalBeforeCut.lastIndexOf('}}');
            if (lastComplete > 0) {
              cut = lastComplete + 2;
            } else {
              const placeholderStart = finalBeforeCut.lastIndexOf('{{');
              if (placeholderStart > 0) cut = placeholderStart;
            }
          }
        }

        const chunk = remaining.slice(0, cut).trim();
        if (chunk) out.push(chunk);
        remaining = remaining.slice(cut).trim();
      }

      return out.filter(Boolean);
    };

    const splitToFit = (p: string): string[] => {
      const clean = p.trim();
      if (!clean) return [];
      if (fits(clean)) return [clean];

      const bySentence = clean
        .split(/(?<=[.!?…])\s+/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const units = bySentence.length > 1 ? bySentence : clean.split(/\s+/g);
      const parts: string[] = [];
      let buf = '';

      for (const unit of units) {
        const next = buf ? `${buf} ${unit}` : unit;
        if (buf && !fits(next)) {
          parts.push(buf);
          buf = unit;
        } else {
          buf = next;
        }
      }
      if (buf) parts.push(buf);

      // Ensure every returned piece truly fits; fall back to binary-splitting.
      const finalParts: string[] = [];
      for (const part of parts) {
        if (fits(part)) {
          finalParts.push(part);
        } else {
          finalParts.push(...splitStringToFit(part));
        }
      }

      return finalParts.filter(Boolean);
    };

    const chunks: string[] = [];
    let buf: string[] = [];

    const flush = () => {
      if (buf.length === 0) return;
      chunks.push(buf.join('\n\n'));
      buf = [];
    };

    for (const paragraph of paragraphs) {
      const pieces = splitToFit(paragraph);
      for (const piece of pieces) {
        // If a piece is ONLY an illustration placeholder like "{{1.png}}",
        // give it its own page so the renderer can size it to the full page.
        if (isImageOnlyParagraph(piece)) {
          flush();
          chunks.push(piece.trim());
          continue;
        }

        const candidate = buf.length > 0 ? `${buf.join('\n\n')}\n\n${piece}` : piece;
        if (buf.length > 0 && !fits(candidate)) flush();

        // After flushing, if the piece still doesn't fit, force it onto its own page(s).
        if (buf.length === 0 && !fits(piece)) {
          const forced = splitStringToFit(piece);
          for (const f of forced) {
            buf.push(f);
            flush();
          }
          continue;
        }

        buf.push(piece);
      }
    }
    flush();

    // Build inline image map from all {{image.png}} placeholders in the content
    const imageMap: InlineImageMap = {};
    const imageExtractRegex = /\{\{([^{}]+)\}\}/g;
    let imageMatch: RegExpExecArray | null;
    
    while ((imageMatch = imageExtractRegex.exec(raw)) !== null) {
      const imageName = imageMatch[1].trim();
      if (imageName && !imageMap[imageName] && data?.title) {
        imageMap[imageName] = `/api/illustration?title=${encodeURIComponent(data.title)}&image=${encodeURIComponent(imageName)}`;
      }
    }

    setPages(
      chunks.map((chunk, idx) => ({
        id: `p${idx + 1}`,
        text: chunk,
        inlineImages: Object.keys(imageMap).length > 0 ? imageMap : undefined,
      }))
    );
  }, [data?.content, data?.title, preferences?.fontSize, preferences?.lineHeight, dims.width, dims.height]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Offscreen measuring box used to paginate text precisely (no clipped/missing content). */}
      <div
        aria-hidden="true"
        className="fixed -left-[99999px] top-0 pointer-events-none opacity-0"
      >
        <div
          className="h-full w-full p-6 flex flex-col"
          style={{ width: dims.width, height: dims.height }}
        >
          <div className="h-6" />
          <div
            className="mt-4 flex-1 overflow-auto pr-2"
            ref={measureScrollRef}
          >
            <p
              ref={measureTextRef}
              className="text-[#3E3E3E] dark:text-gray-200 leading-relaxed whitespace-pre-wrap"
            />
          </div>
        </div>
      </div>
      {coverBackdropUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
        >
          <div
            className="absolute inset-0 bg-center bg-cover blur-3xl scale-110 opacity-40 dark:opacity-30"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
          <div className="absolute inset-0 bg-white/65 dark:bg-gray-950/55" />
        </div>
      )}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10">
        <div className="max-w-[1500px] mx-auto py-3">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
            <Button onClick={() => router.push('/')}>  
              <Home className="w-4 h-4" />
            </Button>

            <div className="min-w-0 flex items-center justify-center gap-3">
              <div className="min-w-0 text-lg font-semibold text-[#5f9798] dark:text-white truncate">
                {data?.title ?? 'Preparing story…'}
              </div>
              <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <Clock className="w-3.5 h-3.5" />
                {variant === 'full' ? 'Full story' : 'Bedtime adaptation'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 overflow-x-auto whitespace-nowrap">
              <Button
                onClick={() => flipNav?.prev()}
                variant="outline"
                size="sm"
                disabled={!flipNav || flipMeta.pageIndex <= 0}
                type="button"
              >
                Prev
              </Button>
              <Button
                onClick={() => flipNav?.next()}
                size="sm"
                disabled={!flipNav || flipMeta.pageIndex >= flipMeta.pageCount - 1}
                type="button"
              >
                Next
              </Button>

              {shouldShowTaleTimeAudio && (
                <>
                  <audio
                    ref={audioRef}
                    preload="none"
                    src={taleTimeAudioSrc}
                    onLoadedMetadata={() => {
                      const audio = audioRef.current;
                      if (!audio) return;
                      const t = readStoredResumeTime();
                      // Only apply if we're at the start; avoids jumping while already listening.
                      if (t > 0.25 && audio.currentTime < 0.25) {
                        try {
                          audio.currentTime = t;
                        } catch {
                          // ignore seek failures
                        }
                      }
                    }}
                    onPlay={() => setIsAudioPlaying(true)}
                    onPause={() => {
                      const audio = audioRef.current;
                      if (audio) writeStoredResumeTime(audio.currentTime);
                      setIsAudioPlaying(false);
                    }}
                    onTimeUpdate={() => {
                      const audio = audioRef.current;
                      if (!audio) return;
                      // Throttle-ish via coarse rounding to reduce storage churn.
                      const sec = Math.floor(audio.currentTime);
                      if (sec > 0 && sec !== lastStoredAudioSecondRef.current) {
                        lastStoredAudioSecondRef.current = sec;
                        writeStoredResumeTime(sec);
                      }
                    }}
                    onEnded={() => {
                      writeStoredResumeTime(0);
                      setIsAudioPlaying(false);
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isCheckingAudio}
                    aria-pressed={isAudioPlaying}
                    aria-label={
                      isCheckingAudio
                        ? 'Loading audio…'
                        : isAudioPlaying
                          ? 'Pause TaleTime audio'
                          : hasAudioResumePoint
                            ? 'Resume TaleTime audio'
                            : 'Play TaleTime audio'
                    }
                    title={
                      isCheckingAudio
                        ? 'Loading audio…'
                        : isAudioPlaying
                          ? 'Pause TaleTime audio'
                          : hasAudioResumePoint
                            ? 'Resume TaleTime audio'
                            : 'Play TaleTime audio'
                    }
                    onClick={async () => {
                      if (isCheckingAudio) return;
                      const audio = audioRef.current;
                      if (!audio) return;

                      try {
                        if (audio.paused) {
                          const t = readStoredResumeTime();
                          if (t > 0.25 && audio.currentTime < 0.25) {
                            try {
                              audio.currentTime = t;
                            } catch {
                              // ignore seek failures
                            }
                          }
                          await audio.play();
                        } else {
                          audio.pause();
                        }
                      } catch {
                        setIsAudioPlaying(!audio.paused);
                      }
                    }}
                  >
                    {isCheckingAudio && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isCheckingAudio
                      ? 'Audio Loading…'
                      : isAudioPlaying
                        ? 'Pause'
                        : hasAudioResumePoint
                          ? 'Resume'
                          : 'Audio'}
                  </Button>

                  {/* Restart from the beginning (clears saved resume point). */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCheckingAudio || !hasTaleTimeAudio}
                    title="Restart audio from the beginning"
                    aria-label="Restart audio from the beginning"
                    onClick={async () => {
                      const audio = audioRef.current;
                      if (!audio) return;

                      const wasPlaying = !audio.paused;
                      try {
                        audio.pause();
                        audio.currentTime = 0;
                      } catch {
                        // ignore seek failures
                      }
                      lastStoredAudioSecondRef.current = -1;
                      writeStoredResumeTime(0);
                      setIsAudioPlaying(false);

                      if (wasPlaying) {
                        try {
                          await audio.play();
                        } catch {
                          setIsAudioPlaying(!audio.paused);
                        }
                      }
                    }}
                    type="button"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </>
              )}
              {/* Version segmented control */}
              <div className="inline-flex rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-gray-950/40 p-1 shadow-sm shrink-0">
                {TIME_OPTIONS.map((opt) => {
                  const isSelected = selectedTimeOptionId === opt.id;
                  const label = opt.id === 'full' ? 'Full story' : 'Bedtime adaptation';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(TIME_SELECTION_KEY, opt.id);
                        }

                        const next = new URLSearchParams(searchParams.toString());
                        next.set('variant', opt.id);
                        router.push(`/book/${id}/abridged?${next.toString()}`);
                      }}
                      className={
                        isSelected
                          ? 'px-4 py-2 rounded-lg bg-[#6BA8A9] text-white text-sm font-semibold shadow'
                          : 'px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-900/60'
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {loading && (
          <div className="py-16 text-center text-gray-600 dark:text-gray-400">
            {variant === 'full' ? 'Loading full text…' : 'Loading bedtime version…'}
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
            <div className="font-semibold text-rose-800 dark:text-rose-200">{error}</div>
            <div className="mt-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {error.includes('/signin') && (
                  <Button
                    onClick={() => router.push(`/signin?next=${encodeURIComponent(`/book/${id}/abridged?variant=${variant}`)}`)}
                  >
                    Sign in
                  </Button>
                )}
                {error.includes('/signin') && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/register?next=${encodeURIComponent(`/book/${id}/abridged?variant=${variant}`)}`)}
                  >
                    Register
                  </Button>
                )}
                {error.includes('/account') && (
                  <Button
                    onClick={() => router.push(`/account?next=${encodeURIComponent(`/book/${id}/abridged?variant=${variant}`)}`)}
                  >
                    Go to Account
                  </Button>
                )}
                <Button variant="ghost" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="w-full flex justify-center">
            <BookFlip
              appName="TaleTime"
              storyTitle={data.title}
              author={data.author}
              coverImageSrc={coverImageSrc}
              pages={pages}
              showHeader={false}
              showTip={false}
              onNavigationReady={handleFlipNavReady}
              onPageChange={handleFlipPageChange}
            />
          </div>
        )}

        <div className="text-xs text-[#3E3E3E]/60 dark:text-gray-400 text-center mt-4">
          {isMobile
            ? "Tip: swipe/drag to flip pages."
            : "Tip: click/drag page corners to flip."}
        </div>
      </main>
    </div>
  );
}
