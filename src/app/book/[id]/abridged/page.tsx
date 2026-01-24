'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import BookFlip, { type PageData, type InlineImageMap } from '@/components/BookFlip';
import { storyBlocksToLegacyText, type StoryBlock } from '@/lib/story-blocks';
import { ChevronLeft, Clock, Loader2, RotateCcw, Home } from 'lucide-react';
import Image from 'next/image';
import { PiSpeakerHighDuotone } from "react-icons/pi";
import { TbPlayerStop } from "react-icons/tb";
import { CiPlay1 } from "react-icons/ci";
import { BsMoonStarsFill } from 'react-icons/bs';
import { GiBookCover } from 'react-icons/gi';
import { FaPauseCircle, FaPlay, FaPlayCircle, FaStop, FaStopCircle } from 'react-icons/fa';
import BookmarkPng from '@/components/BookmarkPng';
import {
  clearAbridgedBookmark,
  getAbridgedBookmark,
  setAbridgedBookmark,
  type AbridgedBookmark,
  type BookmarkSide,
} from '@/lib/bookmarks';

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
  blocks?: StoryBlock[] | null;
  sourceFormat?: 'txt' | 'story-json';
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
  const useSideControls = !isMobile;

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

  const showDebugInfo = useMemo(() => {
    // Always show in dev; allow opt-in via ?debug=1 for other envs.
    return process.env.NODE_ENV !== 'production' || searchParams.get('debug') === '1';
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AbridgedResponse | null>(null);

  const [pages, setPages] = useState<PageData[]>([]);

  const measureScrollRef = useRef<HTMLDivElement | null>(null);
  const measureTextRef = useRef<HTMLParagraphElement | null>(null);

  const [flipNav, setFlipNav] = useState<{
    next: () => void;
    prev: () => void;
    goTo: (pageIndex: number) => void;
    getPageIndex: () => number;
    getPageCount: () => number;
  } | null>(null);
  const [flipMeta, setFlipMeta] = useState<{ pageIndex: number; pageCount: number }>({
    pageIndex: 0,
    pageCount: 0,
  });

  const [bookmark, setBookmark] = useState<AbridgedBookmark | null>(null);
  const [bookmarkHydrated, setBookmarkHydrated] = useState(false);
  const didRestoreBookmarkRef = useRef(false);

  const bookAreaRef = useRef<HTMLDivElement | null>(null);
  const bookmarkDragRef = useRef<HTMLDivElement | null>(null);
  const bookmarkDragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    moved: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, dx: 0, dy: 0, moved: false });
  const [isDraggingBookmark, setIsDraggingBookmark] = useState(false);

  const getVisibleSpread = useCallback((currentPageIndex: number) => {
    // react-pageflip exposes a single current page index; in 2-page mode this typically alternates.
    // Common behavior: even -> left page index, odd -> right page index.
    if (!Number.isFinite(currentPageIndex) || currentPageIndex <= 0) {
      // When the book is closed (cover), treat the visible spread as only the cover page.
      // This ensures an active bookmark shows as a top marker (on the right), rather than a
      // full bookmark overlay on the current spread.
      const coverIndex = Math.max(0, currentPageIndex);
      return { left: coverIndex, right: coverIndex };
    }

    if (currentPageIndex % 2 === 0) {
      return { left: currentPageIndex, right: currentPageIndex + 1 };
    }
    return { left: currentPageIndex - 1, right: currentPageIndex };
  }, []);

  const visibleSpread = useMemo(() => getVisibleSpread(flipMeta.pageIndex), [flipMeta.pageIndex, getVisibleSpread]);
  const bookmarkPageIndex = bookmark?.pageIndex ?? null;
  const isBookmarkVisibleOnCurrentSpread =
    typeof bookmarkPageIndex === 'number' &&
    (bookmarkPageIndex === visibleSpread.left || bookmarkPageIndex === visibleSpread.right);

  const bookmarkSide: BookmarkSide | null = useMemo(() => {
    if (!bookmark) return null;
    if (bookmark.side === 'left' || bookmark.side === 'right') return bookmark.side;
    if (typeof bookmarkPageIndex !== 'number') return null;
    if (bookmarkPageIndex === visibleSpread.left) return 'left';
    if (bookmarkPageIndex === visibleSpread.right) return 'right';
    return null;
  }, [bookmark, bookmarkPageIndex, visibleSpread.left, visibleSpread.right]);

  const shouldShowBigBookmark = Boolean(bookmark) && isBookmarkVisibleOnCurrentSpread;
  const shouldShowDockedBookmark = !bookmark;
  const shouldShowTopMarkers = Boolean(bookmark) && !isDraggingBookmark && !isBookmarkVisibleOnCurrentSpread;

  const topMarkerSide: 'left' | 'right' | null = useMemo(() => {
    if (!shouldShowTopMarkers) return null;
    if (typeof bookmarkPageIndex !== 'number') return null;
    if (bookmarkPageIndex < visibleSpread.left) return 'left';
    if (bookmarkPageIndex > visibleSpread.right) return 'right';
    return null;
  }, [bookmarkPageIndex, shouldShowTopMarkers, visibleSpread.left, visibleSpread.right]);

  const applyBookmarkDragTransform = useCallback((dx: number, dy: number) => {
    const el = bookmarkDragRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotate(6deg)`;
  }, []);

  const resetBookmarkDragTransform = useCallback(() => {
    const el = bookmarkDragRef.current;
    if (!el) return;
    el.style.transform = 'translate3d(0px, 0px, 0px) rotate(6deg)';
  }, []);

  const isPointInBookArea = useCallback((clientX: number, clientY: number) => {
    const r = bookAreaRef.current?.getBoundingClientRect();
    if (!r) return false;
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }, []);

  const handleBookmarkDrop = useCallback(
    async (clientX: number, clientY: number) => {
      if (!bookmarkHydrated) return;

      const current = flipMeta.pageIndex;
      if (!Number.isFinite(current) || current < 1) {
        return;
      }

      const droppedOnBook = isPointInBookArea(clientX, clientY);

      try {
        if (droppedOnBook) {
          const rect = bookAreaRef.current?.getBoundingClientRect();
          const midX = rect ? rect.left + rect.width / 2 : clientX;
          const side: BookmarkSide = clientX < midX ? 'left' : 'right';
          const spread = getVisibleSpread(current);
          const targetPageIndex = side === 'left' ? spread.left : spread.right;

          // Prevent bookmarking cover/invalid pages.
          if (!Number.isFinite(targetPageIndex) || targetPageIndex < 1) return;

          if (bookmark?.pageIndex === targetPageIndex) return;
          const next = await setAbridgedBookmark(id, variant, targetPageIndex, side);
          setBookmark(next);
        } else {
          if (!bookmark) return;
          await clearAbridgedBookmark(id, variant);
          setBookmark(null);
        }
      } catch {
        // ignore
      }
    },
    [bookmark, bookmarkHydrated, flipMeta.pageIndex, getVisibleSpread, id, isPointInBookArea, variant]
  );

  const onBookmarkPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!bookmarkHydrated) return;
      if (e.button !== 0) return;

      const el = bookmarkDragRef.current;
      if (!el) return;

      bookmarkDragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        dy: 0,
        moved: false,
      };

      setIsDraggingBookmark(true);

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      e.preventDefault();
      e.stopPropagation();
    },
    [bookmarkHydrated]
  );

  const onBookmarkPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = bookmarkDragStateRef.current;
      if (state.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      state.dx = dx;
      state.dy = dy;
      if (!state.moved && Math.hypot(dx, dy) > 6) state.moved = true;

      applyBookmarkDragTransform(dx, dy);

      e.preventDefault();
      e.stopPropagation();
    },
    [applyBookmarkDragTransform]
  );

  const onBookmarkPointerUp = useCallback(
    async (e: React.PointerEvent) => {
      const state = bookmarkDragStateRef.current;
      if (state.pointerId !== e.pointerId) return;

      bookmarkDragStateRef.current.pointerId = null;
      setIsDraggingBookmark(false);
      resetBookmarkDragTransform();

      // Only treat as a drag-drop interaction if the user actually moved it.
      if (!state.moved) return;

      await handleBookmarkDrop(e.clientX, e.clientY);

      e.preventDefault();
      e.stopPropagation();
    },
    [handleBookmarkDrop, resetBookmarkDragTransform]
  );

  const onBookmarkPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const state = bookmarkDragStateRef.current;
      if (state.pointerId !== e.pointerId) return;
      bookmarkDragStateRef.current.pointerId = null;
      setIsDraggingBookmark(false);
      resetBookmarkDragTransform();
    },
    [resetBookmarkDragTransform]
  );

  const handleFlipNavReady = useCallback(
    (nav: { next: () => void; prev: () => void; goTo: (pageIndex: number) => void; getPageIndex: () => number; getPageCount: () => number }) => {
      setFlipNav(nav);
    },
    []
  );

  const handleFlipPageChange = useCallback((pageIndex: number, pageCount: number) => {
    setFlipMeta({ pageIndex, pageCount });
  }, []);

  useEffect(() => {
    let cancelled = false;
    didRestoreBookmarkRef.current = false;
    setBookmarkHydrated(false);
    (async () => {
      try {
        const stored = await getAbridgedBookmark(id, variant);
        if (cancelled) return;
        setBookmark(stored);
      } catch {
        if (cancelled) return;
        setBookmark(null);
      } finally {
        if (!cancelled) setBookmarkHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, variant]);

  useEffect(() => {
    if (!bookmarkHydrated) return;
    if (!flipNav) return;
    if (didRestoreBookmarkRef.current) return;
    if (!bookmark) return;
    didRestoreBookmarkRef.current = true;
    // Restore only once on initial load.
    flipNav.goTo(bookmark.pageIndex);
  }, [bookmark, bookmarkHydrated, flipNav]);

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

  const handleAudioPlay = useCallback(async () => {
    if (isCheckingAudio) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const t = readStoredResumeTime();
      if (t > 0.25 && audio.currentTime < 0.25) {
        try {
          audio.currentTime = t;
        } catch {
          // ignore seek failures
        }
      }
      await audio.play();
    } catch {
      setIsAudioPlaying(!audio.paused);
    }
  }, [isCheckingAudio, readStoredResumeTime]);

  const handleAudioPause = useCallback(() => {
    if (isCheckingAudio) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      writeStoredResumeTime(audio.currentTime);
    } catch {
      // ignore
    }
    setIsAudioPlaying(false);
  }, [isCheckingAudio, writeStoredResumeTime]);

  const handleAudioStop = useCallback(() => {
    if (isCheckingAudio) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore seek failures
    }
    lastStoredAudioSecondRef.current = -1;
    writeStoredResumeTime(0);
    setIsAudioPlaying(false);
  }, [isCheckingAudio, writeStoredResumeTime]);

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
    const raw = (data?.blocks && Array.isArray(data.blocks)
      ? storyBlocksToLegacyText(data.blocks)
      : data?.content ?? '').trim();
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

    const applyMeasuredText = (textOnly: string) => {
      textNode.textContent = textOnly;
    };

    const fits = (candidate: string) => {
      // Count image placeholders in the candidate
      const imageMatches = candidate.match(imageRegex);
      const imageCount = imageMatches ? imageMatches.length : 0;
      const extraImageHeight = imageCount * IMAGE_HEIGHT_ESTIMATE;

      // Remove image placeholders for text measurement
      const textOnly = candidate.replace(imageRegex, '');
      applyMeasuredText(textOnly);

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

    // Post-pass: avoid starting a page with a tiny "bridge" line like "And in another moment…"
    // If the previous page can fit it (and optionally the next short sentence), pull it back.
    const splitChunkParas = (chunk: string) =>
      chunk
        .split(/\n{2,}/g)
        .map((p) => p.trim())
        .filter(Boolean);

    const isBridgePara = (p: string) => {
      const s = p.trim();
      if (!s) return false;
      if (isImageOnlyParagraph(s)) return false;
      if (s.length > 56) return false;
      return /(?:\.{3}|…)\s*$/.test(s);
    };

    const isShortFollow = (p: string) => {
      const s = p.trim();
      if (!s) return false;
      if (isImageOnlyParagraph(s)) return false;
      return s.length <= 72 && wordCount(s) <= 10;
    };

    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1];
      const cur = chunks[i];
      if (!prev || !cur) continue;
      if (isImageOnlyParagraph(prev.trim())) continue;

      const curParas = splitChunkParas(cur);
      if (curParas.length === 0) continue;

      const first = curParas[0];
      if (!isBridgePara(first)) continue;

      const group: string[] = [first];
      const second = curParas[1];
      if (second && isShortFollow(second)) group.push(second);

      const prevCandidate = `${prev}\n\n${group.join('\n\n')}`;
      if (!fits(prevCandidate)) continue;

      chunks[i - 1] = prevCandidate;
      chunks[i] = curParas.slice(group.length).join('\n\n').trim();
      if (!chunks[i]) {
        chunks.splice(i, 1);
        i -= 1;
      }
    }

    // Build inline image map from all {{...}} placeholders in the content.
    // Supports:
    // - {{1.png}}
    // - {{ illustration("1.png") }} / {{ image('1.png') }}
    const imageMap: InlineImageMap = {};
    const imageExtractRegex = /\{\{([^{}]+)\}\}/g;
    let imageMatch: RegExpExecArray | null;

    const extractImageFileName = (rawToken: string): string | null => {
      const token = rawToken.trim();
      const direct = token.match(/([A-Za-z0-9 _.-]+\.(?:png|jpe?g|webp|gif|svg))/i);
      if (direct?.[1]) return direct[1].split(/[/\\]/).pop() ?? null;
      const quoted = token.match(/['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg))['"]/i);
      if (quoted?.[1]) return quoted[1].split(/[/\\]/).pop() ?? null;
      return null;
    };

    while ((imageMatch = imageExtractRegex.exec(raw)) !== null) {
      const token = imageMatch[1].trim();
      const imageName = extractImageFileName(token);
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
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed relative overflow-x-hidden overflow-y-hidden"
      style={{ backgroundImage: "url('/abridgeBacground.png')" }}
    >
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
              className="tt-storybook-prose tt-storybook-prose-book leading-snug whitespace-pre-wrap"
            />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-center bg-cover blur-xl scale-110 opacity-70 dark:opacity-45"
          style={{ backgroundImage: "url('/abridgeBacground.png')" }}
        />

        {coverBackdropUrl && (
          <div
            className="absolute inset-0 bg-center bg-cover blur-3xl scale-110 opacity-25 dark:opacity-20"
            style={{ backgroundImage: `url(${coverBackdropUrl})` }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-l from-tt-secondary/25 to-tt-secondary/25 dark:from-gray-950/45 dark:to-gray-950/45" />
      </div>
      <div className="sticky top-0 z-20  dark:bg-gray-950/80 backdrop-blur border-b border-tt-border/20 dark:border-tt-border/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center justify-start min-w-0">
              <button onClick={() => router.push('/')}>
                <div className="relative flex items-center">
                  <Image src="/owlFace2.png" alt="TaleTime Logo" width={64} height={64} />
                  <h2 className="tt-logo font-heading text-3xl">TaleTime</h2>
                </div>
              </button>
            </div>

            <div className="min-w-0 flex flex-col items-center justify-center">
              <div className="min-w-0 text-2xl font-semibold text-tt-tertiary dark:text-white truncate">
                {data?.title ?? 'Preparing story…'}
              </div>
              {showDebugInfo && data && (
                <div className="min-w-0 text-[11px] text-tt-primary/60 dark:text-gray-300/60 truncate">
                  {data.mode}
                  {data.sourceFormat ? ` • ${data.sourceFormat}` : ''}
                  {Array.isArray(data.blocks) ? ` • ${data.blocks.length} blocks` : ''}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 overflow-x-auto whitespace-nowrap">
              {/* On desktop, these controls move to the right-side blank area under the bookmark. */}
              {!useSideControls && (
                <>
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

                  <Button
                    variant={bookmark ? 'outline' : 'default'}
                    size="sm"
                    className="gap-2"
                    disabled={!flipNav || !bookmarkHydrated}
                    title={
                      bookmark
                        ? (bookmark.pageIndex === flipMeta.pageIndex ? 'Remove bookmark' : 'Update bookmark to this page')
                        : 'Bookmark this page'
                    }
                    aria-pressed={Boolean(bookmark)}
                    onClick={async () => {
                      if (!flipNav) return;
                      const current = flipMeta.pageIndex;

                      // Prevent bookmarking cover/invalid pages.
                      if (!Number.isFinite(current) || current < 1) {
                        return;
                      }

                      try {
                        if (bookmark && bookmark.pageIndex === current) {
                          await clearAbridgedBookmark(id, variant);
                          setBookmark(null);
                        } else {
                          const next = await setAbridgedBookmark(id, variant, current);
                          setBookmark(next);
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    type="button"
                  >
                    <BookmarkPng alt="Bookmark" className="h-7 w-7 object-contain " />
                    {bookmark ? 'Bookmarked' : 'Bookmark'}
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

                      <div className="flex flex-col gap-2 w-40">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-semibold text-tt-muted dark:text-gray-200">Audio</span>
                          {isCheckingAudio && <Loader2 className="w-4 h-4 animate-spin text-gray-500" aria-hidden="true" />}
                        </div>

                        <div className="flex items-center justify-start gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className={
                              isAudioPlaying
                                ? 'border-0 rounded-tt bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900 dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/45'
                                : 'border-0 rounded-tt bg-emerald-100 text-emerald-800 hover:bg-emerald-200 hover:text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45'
                            }
                            disabled={isCheckingAudio || !hasTaleTimeAudio}
                            title={
                              isAudioPlaying
                                ? 'Pause audio'
                                : hasAudioResumePoint
                                  ? 'Resume audio'
                                  : 'Play audio'
                            }
                            aria-label={
                              isAudioPlaying
                                ? 'Pause audio'
                                : hasAudioResumePoint
                                  ? 'Resume audio'
                                  : 'Play audio'
                            }
                            onClick={isAudioPlaying ? handleAudioPause : handleAudioPlay}
                            type="button"
                          >
                            {isAudioPlaying ? (
                              <FaPauseCircle className="h-6 w-6" aria-hidden="true" />
                            ) : (
                              <FaPlayCircle className="h-6 w-6" aria-hidden="true" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="border-0 rounded-tt bg-rose-100 text-rose-800 hover:bg-rose-200 hover:text-rose-900 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/45"
                            disabled={isCheckingAudio || !hasTaleTimeAudio}
                            title="Stop audio and reset to the beginning"
                            aria-label="Stop audio and reset to the beginning"
                            onClick={handleAudioStop}
                            type="button"
                          >
                            <FaStopCircle className="h-6 w-6" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              {/* Version segmented control */}
              <div className="inline-flex rounded-tt border border-black/10 dark:border-white/10 bg-tt-surface/70 dark:bg-gray-950/40 p-1 shadow-sm shrink-0">
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
                          ? 'px-4 py-2 rounded-lg bg-tt-accent text-white text-sm font-semibold shadow'
                          : 'px-4 py-2 rounded-lg text-sm font-semibold text-tt-muted dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-900/60'
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        {opt.id === 'bedtime' && <BsMoonStarsFill className="h-4 w-4" aria-hidden="true" />}
                        {opt.id === 'full' && <GiBookCover className="h-6 w-6" aria-hidden="true" />}
                        {label}
                      </span>
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
          <div className="py-16 text-center text-tt-muted dark:text-gray-400">
            {variant === 'full' ? 'Loading full text…' : 'Loading bedtime version…'}
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-tt p-6 text-center">
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
          <div className="w-full">
            <div className="flex items-start justify-center gap-12">
              {useSideControls && <div className="w-40 shrink-0" aria-hidden="true" />}
              <div className="relative overflow-visible">
                {/* Draggable bookmark: drop ON the book to activate/update; drop OFF to deactivate. */}
                {shouldShowBigBookmark && (
                  <div
                    ref={bookmarkDragRef}
                    className={
                      bookmarkSide === 'right'
                        ? 'absolute -top-28 left-[54%] z-30 drop-shadow-2xl sm:-top-36 sm:left-[52%]'
                        : 'absolute -top-28 left-[44%] z-30 drop-shadow-2xl sm:-top-36 sm:left-[52%]'
                    }
                    style={{ touchAction: 'none', transform: 'translate3d(0px, 0px, 0px) rotate(6deg)' }}
                    role="img"
                    aria-label="Bookmark (drag off to remove)"
                    title="Drag off the book to remove bookmark"
                    onPointerDown={onBookmarkPointerDown}
                    onPointerMove={onBookmarkPointerMove}
                    onPointerUp={onBookmarkPointerUp}
                    onPointerCancel={onBookmarkPointerCancel}
                  >
                    <div className={isDraggingBookmark ? 'cursor-grabbing' : 'cursor-grab'}>
                      <BookmarkPng
                        alt="Bookmark"
                        className="h-72 w-52 object-contain sm:h-[44rem] sm:w-[17rem]"
                      />
                    </div>
                  </div>
                )}

                <div ref={bookAreaRef} className="relative">
                  {/* Top markers: show only on non-bookmarked spreads */}
                  {shouldShowTopMarkers && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
                      {topMarkerSide === 'left' && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src="/bookmarktopleft.png"
                          alt=""
                          className="absolute -top-2 left-[500px] -translate-x-1/2 h-24 w-24 object-contain sm:-top-[70px] sm:h-[151px] sm:w-40"
                          draggable={false}
                        />
                      )}
                      {topMarkerSide === 'right' && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src="/bookmarktop.png"
                          alt=""
                          className="absolute -top-2 left-[760px] -translate-x-1/2 h-24 w-24 object-contain sm:-top-[70px] sm:h-[150px] sm:w-40"
                          draggable={false}
                        />
                      )}
                    </div>
                  )}

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
              </div>

              {/* Desktop: controls live in a real right-hand column so the whole layout stays centered. */}
              {useSideControls && (
                <div className="flex flex-col items-center gap-4 shrink-0 w-40">
                  {shouldShowDockedBookmark ? (
                    <div
                      ref={bookmarkDragRef}
                      className="drop-shadow-xl opacity-80 scale-90"
                      style={{ touchAction: 'none', transform: 'translate3d(0px, 0px, 0px) rotate(6deg)' }}
                      role="img"
                      aria-label="Bookmark (drag onto book to add)"
                      title="Drag onto the book to add bookmark"
                      onPointerDown={onBookmarkPointerDown}
                      onPointerMove={onBookmarkPointerMove}
                      onPointerUp={onBookmarkPointerUp}
                      onPointerCancel={onBookmarkPointerCancel}
                    >
                      <div className={isDraggingBookmark ? 'cursor-grabbing' : 'cursor-grab'}>
                        <BookmarkPng
                          alt="Bookmark"
                          className="h-44 w-32 object-contain sm:h-56 sm:w-40 sm:mb-6 sm:mt-8"
                        />
                      </div>
                    </div>
                  ) : (
                    // Keep a consistent vertical anchor so controls stay "under" where the bookmark sits.
                    <div className="h-56 w-40" aria-hidden="true" />
                  )}

                  <div className="flex flex-col gap-2 w-40">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => flipNav?.prev()}
                        variant="outline"
                        size="sm"
                        disabled={!flipNav || flipMeta.pageIndex <= 0}
                        type="button"
                        className="flex-1 shadow-lg"
                      >
                        Prev
                      </Button>
                      <Button
                        onClick={() => flipNav?.next()}
                        size="sm"
                        disabled={!flipNav || flipMeta.pageIndex >= flipMeta.pageCount - 1}
                        type="button"
                        className="flex-1 shadow-lg"
                      >
                        Next
                      </Button>
                    </div>

                    <Button
                      variant={bookmark ? 'outline' : 'default'}
                      size="sm"
                      className="gap-2 justify-center shadow-lg"
                      disabled={!flipNav || !bookmarkHydrated}
                      title={
                        bookmark
                          ? (bookmark.pageIndex === flipMeta.pageIndex ? 'Remove bookmark' : 'Update bookmark to this page')
                          : 'Bookmark this page'
                      }
                      aria-pressed={Boolean(bookmark)}
                      onClick={async () => {
                        if (!flipNav) return;
                        const current = flipMeta.pageIndex;

                        // Prevent bookmarking cover/invalid pages.
                        if (!Number.isFinite(current) || current < 1) {
                          return;
                        }

                        try {
                          if (bookmark && bookmark.pageIndex === current) {
                            await clearAbridgedBookmark(id, variant);
                            setBookmark(null);
                          } else {
                            const next = await setAbridgedBookmark(id, variant, current);
                            setBookmark(next);
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      type="button"
                    >
                      <BookmarkPng alt="Bookmark" className="h-7 w-7 object-contain" />
                      {bookmark ? 'Bookmarked' : 'Bookmark'}
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

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-center mt-10 -ml-1">
                            <div className='flex items-center gap-2'><PiSpeakerHighDuotone className='h-5 w-5 text-gray-500' />
                              <span className="text-xl font-semibold tt-logo dark:text-gray-200">Audio</span></div>

                            {isCheckingAudio && <Loader2 className="w-4 h-4 animate-spin text-gray-500" aria-hidden="true" />}
                          </div>
                          <div className="border-4 bg-blue-100 shadow-lg border-blue-100 rounded-tt dark:border-tt-muted p-4">
                            <div className="flex items-center justify-center gap-6 ">
                              <Button
                                variant="outline"
                                size="icon"
                                className={
                                  isAudioPlaying
                                    ? 'border-0 rounded-tt shadow-lg bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900 dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/45'
                                    : 'border-0 rounded-tt shadow-lg bg-tt-tertiary text-white hover:bg-emerald-200 hover:text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/45'
                                }
                                disabled={isCheckingAudio || !hasTaleTimeAudio}
                                title={
                                  isAudioPlaying
                                    ? 'Pause audio'
                                    : hasAudioResumePoint
                                      ? 'Resume audio'
                                      : 'Play audio'
                                }
                                aria-label={
                                  isAudioPlaying
                                    ? 'Pause audio'
                                    : hasAudioResumePoint
                                      ? 'Resume audio'
                                      : 'Play audio'
                                }
                                onClick={isAudioPlaying ? handleAudioPause : handleAudioPlay}
                                type="button"
                              >
                                {isAudioPlaying ? (
                                  <FaPauseCircle className="h-6 w-6" aria-hidden="true" />
                                ) : (
                                  <FaPlay className="h-5 w-5" aria-hidden="true" />
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="border-0 rounded-tt bg-tt-accent text-white hover:bg-rose-200 hover:text-rose-900 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/45"
                                disabled={isCheckingAudio || !hasTaleTimeAudio}
                                title="Stop audio and reset to the beginning"
                                aria-label="Stop audio and reset to the beginning"
                                onClick={handleAudioStop}
                                type="button"
                              >
                                <FaStop className="h-5 w-5 shadow-lg" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-tt-primary/60 dark:text-gray-400 text-center mt-4">
          {isMobile
            ? "Tip: swipe/drag to flip pages."
            : "Tip: click/drag page corners to flip."}
        </div>
      </main>
    </div>
  );
}
