'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/LanguageProvider';
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
import { ReaderQuickTips } from '@/components/ReaderQuickTips';
import {
  clearAbridgedBookmark,
  getAbridgedBookmark,
  setAbridgedBookmark,
  type AbridgedBookmark,
  type BookmarkSide,
} from '@/lib/bookmarks';
import FullStoryReader from '@/components/full-reader/FullStoryReader';
import FullBlockFlip from '@/components/full-reader/FullBlockFlip';

function chunkIntoBlocks(text: string, opts?: { maxChars?: number; minParas?: number; maxParas?: number }) {
  const maxChars = opts?.maxChars ?? 1800;     // tune this
  const minParas = opts?.minParas ?? 2;
  const maxParas = opts?.maxParas ?? 6;

  const paras = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/g)
    .map(p => p.trim())
    .filter(Boolean);

  const blocks: Array<{ id: string; text: string }> = [];
  let buf: string[] = [];

  const flush = () => {
    if (!buf.length) return;
    blocks.push({ id: `b${blocks.length + 1}`, text: buf.join("\n\n") });
    buf = [];
  };

  for (const p of paras) {
    const next = buf.length ? `${buf.join("\n\n")}\n\n${p}` : p;

    // if adding this paragraph makes it too big AND we already have enough paragraphs, flush first
    if ((next.length > maxChars && buf.length >= minParas) || buf.length >= maxParas) {
      flush();
      buf.push(p);
      continue;
    }

    buf.push(p);
  }

  flush();
  return blocks;
}


const TIME_OPTIONS = [
  { id: 'bedtime', label: 'Bedtime' },
  { id: 'full', label: 'Full version' },
] as const;

export type TimeOptionId = (typeof TIME_OPTIONS)[number]['id'];

const TIME_SELECTION_KEY = 'taletime-time-selection';
const MANUAL_PAGE_BREAK_REGEX = /\{\{\s*page[\s_-]*break\s*\}\}/i;

function splitOnManualPageBreaks(text: string): string[] {
  return text
    .split(MANUAL_PAGE_BREAK_REGEX)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
}

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
  pages?: PageData[] | null;
  sourceFormat?: 'txt' | 'story-json' | 'story-pages';
  mode: 'llm' | 'extractive' | 'local';
}

interface AuthMeResponse {
  user: {
    isPaid?: boolean;
  } | null;
}

function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybe = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    cause?: unknown;
  };

  if (maybe.name === 'AbortError') return true;
  if (maybe.code === 'ECONNRESET') return true;
  if (typeof maybe.message === 'string' && /\baborted\b|\bECONNRESET\b/i.test(maybe.message)) return true;

  const cause = maybe.cause;
  if (cause && typeof cause === 'object') {
    const causeObj = cause as { code?: unknown; message?: unknown; name?: unknown };
    if (causeObj.name === 'AbortError') return true;
    if (causeObj.code === 'ECONNRESET') return true;
    if (typeof causeObj.message === 'string' && /\baborted\b|\bECONNRESET\b/i.test(causeObj.message)) return true;
  }

  return false;
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

function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isTouchDevice;
}

function useFlipDimensions(isMobile: boolean, isTouchDevice: boolean, isFullscreen: boolean) {
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
      const isTabletTouchFullscreen = !isMobile && isTouchDevice && isFullscreen;

      // Leave space for headers/controls around the book.
      const availableH = Math.max(520, vh - (isMobile ? 160 : isTabletTouchFullscreen ? 110 : 190));
      const availableW = Math.max(320, vw - (isMobile ? 48 : 96));

      const height = Math.min(isMobile ? 740 : isTabletTouchFullscreen ? 940 : 880, availableH);
      const width = Math.min(isMobile ? 420 : 620, availableW);

      setDims({
        width,
        height,
        minWidth: isMobile ? 340 : 480,
        maxWidth: isMobile ? 460 : 760,
        minHeight: isMobile ? 600 : 700,
        maxHeight: isMobile ? 820 : isTabletTouchFullscreen ? 1040 : 980,
      });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [isMobile, isTouchDevice, isFullscreen]);

  return dims;
}

export default function AbridgedBookPage() {
  const { locale, t } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { preferences } = usePreferences();

  const isMobile = useIsMobile(768);
  const isCompactReaderLayout = useIsMobile(1180);
  const isTouchDevice = useIsTouchDevice();
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isTabletFullscreen = !isMobile && isFullscreen;
  const dims = useFlipDimensions(isMobile, isTouchDevice, isFullscreen);
  const useSideControls = !isCompactReaderLayout;

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
    // Debug metadata is opt-in only via query param.
    return searchParams.get('debug') === '1';
  }, [searchParams]);

  const showDebugCounters = useMemo(() => searchParams.get('debug') === '1', [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AbridgedResponse | null>(null);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [pages, setPages] = useState<PageData[]>([]);
  const [orphanStats, setOrphanStats] = useState<{ fixes: number; removed: number }>({ fixes: 0, removed: 0 });

  const pagedPages = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return null;
    if (!data.title) return null;

    const title = data.title;
    const imageExtractRegex = /\{\{([^{}]+)\}\}/g;

    const extractImageFileName = (rawToken: string): string | null => {
      const token = rawToken.trim();
      const direct = token.match(/([A-Za-z0-9 _.-]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|ogg))/i);
      if (direct?.[1]) return direct[1].split(/[/\\]/).pop() ?? null;
      const quoted = token.match(/['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|ogg))['"]/i);
      if (quoted?.[1]) return quoted[1].split(/[/\\]/).pop() ?? null;
      return null;
    };

    const resolveIllustrationUrl = (input: string): string => {
      if (/^https?:\/\//i.test(input) || input.startsWith('/')) return input;
      const file = input.split(/[/\\]/).pop() ?? input;
      return `/api/illustration?title=${encodeURIComponent(title)}&image=${encodeURIComponent(file)}`;
    };

    const imageMap: InlineImageMap = {};
    for (const p of data.pages) {
      if (typeof p.text === 'string') {
        let imageMatch: RegExpExecArray | null;
        while ((imageMatch = imageExtractRegex.exec(p.text)) !== null) {
          const token = imageMatch[1].trim();
          const imageName = extractImageFileName(token);
          if (imageName && !imageMap[imageName]) {
            imageMap[imageName] = resolveIllustrationUrl(imageName);
          }
        }
      }

      if (typeof p.imageSrc === 'string' && p.imageSrc.trim()) {
        const file = p.imageSrc.split(/[/\\]/).pop() ?? p.imageSrc;
        if (!imageMap[file]) imageMap[file] = resolveIllustrationUrl(file);
      }
    }

    return data.pages.map((p, idx) => {
      const rawPage = p as PageData & { paragraphs?: unknown };
      const paragraphs = Array.isArray(rawPage.paragraphs)
        ? rawPage.paragraphs.filter((v) => typeof v === 'string')
        : undefined;
      const textFromParagraphs = paragraphs && paragraphs.length > 0 ? paragraphs.join('\n\n') : undefined;

      return {
        id: p.id || `p${idx + 1}`,
        title: p.title,
        text: p.text ?? textFromParagraphs,
        imageSrc: p.imageSrc ? resolveIllustrationUrl(p.imageSrc) : undefined,
        inlineImages: Object.keys(imageMap).length > 0 ? imageMap : undefined,
        lockLayout: true,
      };
    });
  }, [data?.pages, data?.title]);



  const rawText = useMemo(() => {
    if (variant === 'bedtime' && pagedPages && pagedPages.length > 0) return '';
    return (
      (data?.blocks && Array.isArray(data.blocks)
        ? storyBlocksToLegacyText(data.blocks)
        : data?.content ?? '')
    ).trim();
  }, [data?.blocks, data?.content, pagedPages, variant]);

  const fullBlocks = useMemo(() => {
    if (variant !== 'full') return [];

    // Prefer canonical blocks if the API gave them to us
    if (Array.isArray(data?.blocks) && data.blocks.length > 0) return data.blocks;

    const manualSections = splitOnManualPageBreaks(rawText);

    const sectionInputs = manualSections.length > 0 ? manualSections : [rawText];

    let nextBlockId = 1;
    const blocks = sectionInputs.flatMap((section) =>
      chunkIntoBlocks(section, { maxChars: 1600, minParas: 2, maxParas: 5 }).map((chunk) => ({
        ...chunk,
        id: `b${nextBlockId++}`,
      }))
    );

    return blocks.map<StoryBlock>((b) => {
      const paragraphs = b.text
        .split(/\n{2,}/g)
        .map((p) => p.trim())
        .filter(Boolean);

      return {
        type: 'paragraph',
        id: b.id,
        paragraphs,
        text: paragraphs.join('\n\n'),
      };
    });
  }, [data?.blocks, rawText, variant]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load account');
        const json = (await res.json()) as AuthMeResponse;
        if (cancelled) return;
        setIsPaidUser(Boolean(json.user?.isPaid));
      } catch {
        if (cancelled) return;
        setIsPaidUser(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPremium = useCallback(() => {
    const next = `/book/${id}/abridged?variant=full`;
    router.push(`/premium?next=${encodeURIComponent(next)}`);
  }, [id, router]);

  const fullStoryIntroCard = useMemo(() => {
    if (variant !== 'full' || !authChecked || isPaidUser) return null;

    return (
      <div className="rounded-tt border border-tt-border/30 dark:border-tt-border/20 bg-gradient-to-br from-tt-secondary/45 via-white/85 to-tt-secondary/20 dark:from-gray-900/70 dark:via-gray-900/55 dark:to-gray-800/60 p-4 shadow-lg">
        <div className="text-center text-xs font-bold tracking-wide uppercase text-tt-tertiary dark:text-tt-secondary">
          Unlock More with Premium
        </div>

        <div className="mt-2 text-center text-sm text-tt-primary/85 dark:text-gray-200">
          Keep story time magical with extra features.
        </div>

        <ul className="mt-3 space-y-1 text-sm text-tt-primary/90 dark:text-gray-200">
          <li>• Full library access</li>
          <li>• Bedtime adaptations</li>
          <li>• Audio read-aloud tools</li>
          <li>• Early premium updates</li>
        </ul>

        <div className="mt-4">
          <Button type="button" className="w-full" onClick={openPremium}>
            Try Premium
          </Button>
        </div>
      </div>
    );
  }, [authChecked, isPaidUser, openPremium, variant]);



  const debugPreview = useMemo(() => rawText.slice(0, 300), [rawText]);
  const debugPlaceholderCount = useMemo(
    () => (rawText.match(/\{\{[^{}]+\}\}/g) || []).length,
    [rawText]
  );

  const measureScrollRef = useRef<HTMLDivElement | null>(null);
  const measureTextRef = useRef<HTMLDivElement | null>(null);

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
  const flipNavRef = useRef<typeof flipNav>(null);
  const flipMetaRef = useRef(flipMeta);
  const startOverTimerRef = useRef<number | null>(null);
  const startOverRunningRef = useRef(false);
  const [isStartingOver, setIsStartingOver] = useState(false);
  const rewindFlippingTime = isStartingOver ? 100 : 700;

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

  useEffect(() => {
    flipNavRef.current = flipNav;
  }, [flipNav]);

  useEffect(() => {
    flipMetaRef.current = flipMeta;
  }, [flipMeta]);

  const stopStartOver = useCallback(() => {
    startOverRunningRef.current = false;
    setIsStartingOver(false);
    if (startOverTimerRef.current !== null) {
      window.clearTimeout(startOverTimerRef.current);
      startOverTimerRef.current = null;
    }
  }, []);

  const queueStartOverStep = useCallback(
    (delayMs: number) => {
      if (!startOverRunningRef.current) return;
      if (startOverTimerRef.current !== null) {
        window.clearTimeout(startOverTimerRef.current);
      }

      startOverTimerRef.current = window.setTimeout(() => {
        startOverTimerRef.current = null;
        if (!startOverRunningRef.current) return;

        const nav = flipNavRef.current;
        const current = flipMetaRef.current.pageIndex;

        if (!nav || current <= 0) {
          stopStartOver();
          return;
        }

        nav.prev();
      }, delayMs);
    },
    [stopStartOver]
  );

  const handleStartOver = useCallback(() => {
    if (startOverRunningRef.current) return;
    const nav = flipNavRef.current;
    const current = flipMetaRef.current.pageIndex;
    if (!nav || current <= 0) return;

    startOverRunningRef.current = true;
    setIsStartingOver(true);
    queueStartOverStep(0);
  }, [queueStartOverStep]);

  const handleFlipNavReady = useCallback(
    (nav: { next: () => void; prev: () => void; goTo: (pageIndex: number) => void; getPageIndex: () => number; getPageCount: () => number }) => {
      setFlipNav(nav);
    },
    []
  );

  const handleFlipPageChange = useCallback((pageIndex: number, pageCount: number) => {
    setFlipMeta({ pageIndex, pageCount });

    if (!startOverRunningRef.current) return;

    if (pageIndex <= 0) {
      stopStartOver();
      return;
    }

    queueStartOverStep(0);
  }, [queueStartOverStep, stopStartOver]);

  useEffect(() => {
    return () => {
      if (startOverTimerRef.current !== null) {
        window.clearTimeout(startOverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    stopStartOver();
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
  }, [id, variant, stopStartOver]);

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
    return `/api/local-image?title=${encodeURIComponent(data.title)}&bookId=${id}`;
  }, [data?.title, id]);

  const coverBackdropUrl = useMemo(() => {
    if (variant !== 'bedtime') return null;
    if (!data?.title) return null;
    return `/api/local-image?title=${encodeURIComponent(data.title)}&bookId=${id}`;
  }, [variant, data?.title, id]);

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
    return `/api/local-audio?title=${encodeURIComponent(titleForLookup)}&bookId=${id}`;
  }, [data?.title, id]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const supported =
      typeof root.requestFullscreen === 'function' ||
      typeof root.webkitRequestFullscreen === 'function';

    setCanUseFullscreen(supported);

    const sync = () => {
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };

    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (typeof doc.exitFullscreen === 'function') {
          await doc.exitFullscreen();
        } else if (typeof doc.webkitExitFullscreen === 'function') {
          await doc.webkitExitFullscreen();
        }
        return;
      }

      if (typeof root.requestFullscreen === 'function') {
        await root.requestFullscreen();
      } else if (typeof root.webkitRequestFullscreen === 'function') {
        await root.webkitRequestFullscreen();
      }
    } catch {
      // ignore fullscreen rejection/errors
    }
  }, []);

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
    let cancelled = false;

    const check = async () => {
      try {
        setAudioStatus('checking');
        const res = await fetch(`/api/local-audio?title=${encodeURIComponent(safeTitle)}&bookId=${id}`, {
          method: 'HEAD',
        });
        if (cancelled) return;
        setAudioStatus(res.ok ? 'available' : 'unavailable');
      } catch (e: unknown) {
        if (cancelled || isAbortLikeError(e)) return;
        setAudioStatus('unavailable');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [variant, data?.title, id]);

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

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const requestAbridge = async (): Promise<AbridgedResponse> => {
        const wpm = preferences?.defaultWpm ?? 160;
        const res = await fetch('/api/abridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            variant === 'full'
              ? { bookId: id, variant: 'full', wpm, lang: locale }
              : { bookId: id, variant: 'bedtime', wpm, lang: locale }
          ),
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

        return (await res.json()) as AbridgedResponse;
      };

      try {
        let json: AbridgedResponse;
        try {
          json = await requestAbridge();
        } catch (firstError) {
          if (!cancelled && isAbortLikeError(firstError)) {
            json = await requestAbridge();
          } else {
            throw firstError;
          }
        }

        if (cancelled) return;
        setData(json);
      } catch (e: unknown) {
        if (cancelled || isAbortLikeError(e)) return;
        setError(e instanceof Error ? e.message : 'Failed to abridge');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, locale, minutes, variant, preferences?.defaultWpm]);

  useLayoutEffect(() => {
    if (variant === 'full') return;

    if (pagedPages && pagedPages.length > 0) {
      setPages(pagedPages);
      return;
    }

    if (!rawText) {
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

    const paragraphs = rawText
      .split(/\n{2,}/g)
      .map((p) => p.trim())
      .filter(Boolean);

    const applyMeasuredText = (textOnly: string) => {
      // Mirror StoryPage paragraph normalization to reduce underfilled pages.
      const cleaned = textOnly.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
      const paras = cleaned
        .split(/(?:\n\s*\n+|\u2029)+/g)
        .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean);

      textNode.innerHTML = '';
      for (const p of paras) {
        const el = document.createElement('p');
        el.className = 'tt-storybook-paragraph';
        el.textContent = p;
        textNode.appendChild(el);
      }
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
    const isImageOnlyChunk = (s: string) => isImageOnlyParagraph(s);

    const wordCount = (s: string) => {
      const m = s.trim().match(/\S+/g);
      return m ? m.length : 0;
    };

    const isTinyChunk = (s: string) => {
      if (isImageOnlyChunk(s)) return false;
      const trimmed = s.trim();
      if (!trimmed) return false;
      return wordCount(trimmed) <= 2 || trimmed.length <= 14;
    };

    const MIN_FILL_RATIO = 0.75;

    const getFillRatio = (candidate: string) => {
      const text = candidate.trim();
      if (!text) return 0;
      const imageMatches = text.match(imageRegex);
      const imageCount = imageMatches ? imageMatches.length : 0;
      const extraImageHeight = imageCount * IMAGE_HEIGHT_ESTIMATE;
      const textOnly = text.replace(imageRegex, '');
      applyMeasuredText(textOnly);
      const availableHeight = scrollBox.clientHeight - extraImageHeight;
      if (availableHeight <= 0) return 1;
      return scrollBox.scrollHeight / availableHeight;
    };

    const isUnderfilled = (s: string) => {
      if (isImageOnlyChunk(s)) return false;
      return getFillRatio(s) < MIN_FILL_RATIO;
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

    // Orphan cleanup: avoid tiny text chunks immediately before image-only chunks.
    let orphanFixes = 0;
    let orphanRemoved = 0;
    const tryLastResort = process.env.NODE_ENV !== 'production';

    let i = 0;
    while (i < chunks.length - 1) {
      const current = chunks[i];
      const next = chunks[i + 1];

      if (!current || !next || !isTinyChunk(current) || !isImageOnlyChunk(next)) {
        i += 1;
        continue;
      }

      // (a) Prefer merging tiny chunk into previous chunk if it fits.
      if (i - 1 >= 0) {
        const prev = chunks[i - 1];
        if (prev && !isImageOnlyChunk(prev)) {
          const prevCandidate = `${prev}\n\n${current}`;
          if (fits(prevCandidate)) {
            chunks[i - 1] = prevCandidate;
            chunks.splice(i, 1);
            orphanFixes += 1;
            orphanRemoved += 1;
            i = Math.max(0, i - 2);
            continue;
          }
        }
      }

      // (b) Move tiny chunk to next text chunk after the image-only chunk.
      if (i + 2 < chunks.length) {
        const afterImage = chunks[i + 2];
        if (afterImage && !isImageOnlyChunk(afterImage)) {
          const nextCandidate = `${current}\n\n${afterImage}`;
          if (fits(nextCandidate)) {
            chunks[i + 2] = nextCandidate;
            chunks.splice(i, 1);
            orphanFixes += 1;
            orphanRemoved += 1;
            i = Math.max(0, i - 1);
            continue;
          }
        }
      }

      // (c) Last resort: steal a short paragraph from the end of the previous chunk.
      if (tryLastResort && i - 1 >= 0) {
        const prev = chunks[i - 1];
        if (prev && !isImageOnlyChunk(prev)) {
          const prevParas = splitChunkParas(prev);
          const lastPara = prevParas[prevParas.length - 1];
          const rest = prevParas.slice(0, -1).join('\n\n').trim();

          if (lastPara && lastPara.length <= 120 && rest && !isTinyChunk(rest)) {
            const candidate = `${lastPara}\n\n${current}`;
            if (fits(candidate)) {
              chunks[i - 1] = rest;
              chunks[i] = candidate;
              orphanFixes += 1;
            }
          }
        }
      }

      i += 1;
    }

    if (showDebugCounters) {
      setOrphanStats({ fixes: orphanFixes, removed: orphanRemoved });
    } else {
      setOrphanStats({ fixes: 0, removed: 0 });
    }

    // Min-fill pass: keep text pages at least ~3/4 full by borrowing paragraphs.
    for (let i = 0; i < chunks.length - 1; i++) {
      const current = chunks[i];
      const next = chunks[i + 1];
      if (!current || !next) continue;
      if (isImageOnlyChunk(current) || isImageOnlyChunk(next)) continue;
      if (!isUnderfilled(current)) continue;

      let cur = current;
      let nextParas = splitChunkParas(next);
      let moved = false;

      while (nextParas.length > 0) {
        const candidate = `${cur}\n\n${nextParas[0]}`;
        if (!fits(candidate)) break;

        const remainingNext = nextParas.slice(1).join('\n\n').trim();
        if (remainingNext && getFillRatio(remainingNext) < MIN_FILL_RATIO) break;

        cur = candidate;
        nextParas = nextParas.slice(1);
        moved = true;

        if (getFillRatio(cur) >= MIN_FILL_RATIO) break;
      }

      if (moved) {
        chunks[i] = cur;
        const remaining = nextParas.join('\n\n').trim();
        if (remaining) {
          chunks[i + 1] = remaining;
        } else {
          chunks.splice(i + 1, 1);
          i -= 1;
        }
      }
    }

    for (let i = chunks.length - 1; i > 0; i--) {
      const current = chunks[i];
      const prev = chunks[i - 1];
      if (!current || !prev) continue;
      if (isImageOnlyChunk(current) || isImageOnlyChunk(prev)) continue;
      if (!isUnderfilled(current)) continue;

      let cur = current;
      let prevParas = splitChunkParas(prev);
      let moved = false;

      while (prevParas.length > 1) {
        const last = prevParas[prevParas.length - 1];
        const remainingPrev = prevParas.slice(0, -1).join('\n\n').trim();
        if (!remainingPrev) break;

        const candidate = `${last}\n\n${cur}`;
        if (!fits(candidate)) break;
        if (getFillRatio(remainingPrev) < MIN_FILL_RATIO) break;

        cur = candidate;
        prevParas = prevParas.slice(0, -1);
        moved = true;

        if (getFillRatio(cur) >= MIN_FILL_RATIO) break;
      }

      if (moved) {
        chunks[i] = cur;
        const remainingPrev = prevParas.join('\n\n').trim();
        if (remainingPrev) {
          chunks[i - 1] = remainingPrev;
        } else {
          chunks.splice(i - 1, 1);
          i = Math.min(i, chunks.length - 1);
        }
      }
    }

    // Cascade backfill: ensure later pages reach minimum fill by pulling from earlier pages.
    for (let i = chunks.length - 1; i > 0; i--) {
      const current = chunks[i];
      const prev = chunks[i - 1];
      if (!current || !prev) continue;
      if (isImageOnlyChunk(current) || isImageOnlyChunk(prev)) continue;
      if (!isUnderfilled(current)) continue;

      let cur = current;
      let prevParas = splitChunkParas(prev);
      let movedAny = false;

      while (prevParas.length > 0 && isUnderfilled(cur)) {
        const last = prevParas.pop();
        if (!last) break;
        const candidate = `${last}\n\n${cur}`;
        if (!fits(candidate)) {
          prevParas.push(last);
          break;
        }
        cur = candidate;
        movedAny = true;
      }

      if (movedAny) {
        chunks[i] = cur;
        const remainingPrev = prevParas.join('\n\n').trim();
        if (remainingPrev) {
          chunks[i - 1] = remainingPrev;
        } else {
          chunks.splice(i - 1, 1);
          i = Math.min(i, chunks.length - 1);
        }
      }
    }

    // Merge underfilled pages if combined content still fits.
    for (let i = 0; i < chunks.length; i++) {
      const current = chunks[i];
      if (!current || isImageOnlyChunk(current) || !isUnderfilled(current)) continue;

      if (i > 0) {
        const prev = chunks[i - 1];
        if (prev && !isImageOnlyChunk(prev)) {
          const merged = `${prev}\n\n${current}`;
          if (fits(merged)) {
            chunks[i - 1] = merged;
            chunks.splice(i, 1);
            i -= 1;
            continue;
          }
        }
      }

      if (i + 1 < chunks.length) {
        const next = chunks[i + 1];
        if (next && !isImageOnlyChunk(next)) {
          const merged = `${current}\n\n${next}`;
          if (fits(merged)) {
            chunks[i] = merged;
            chunks.splice(i + 1, 1);
            i -= 1;
          }
        }
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
      const direct = token.match(/([A-Za-z0-9 _.-]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|ogg))/i);
      if (direct?.[1]) return direct[1].split(/[/\\]/).pop() ?? null;
      const quoted = token.match(/['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|ogg))['"]/i);
      if (quoted?.[1]) return quoted[1].split(/[/\\]/).pop() ?? null;
      return null;
    };

    while ((imageMatch = imageExtractRegex.exec(rawText)) !== null) {
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
  }, [rawText, pagedPages, data?.title, preferences?.fontSize, preferences?.lineHeight, dims.width, dims.height, showDebugCounters, variant]);

const fullFlipPages = useMemo<PageData[]>(() => {
  if (variant !== "full") return [];

  const expandedTexts = fullBlocks.flatMap((b) => {
    const text =
      typeof b.text === "string"
        ? b.text
        : Array.isArray(b.paragraphs)
          ? b.paragraphs.join("\n\n")
          : "";

    const segments = splitOnManualPageBreaks(text);

    if (segments.length === 0) return [text];
    return segments;
  });

  const textPages: PageData[] = expandedTexts.map((text, idx) => {

    return {
      id: `full-${idx + 1}`,
      text,
      lockLayout: true, // treat each block as a "page"
    };
  });

  // 1) Add a cover page so BookFlip opens like a real book
  const cover: PageData = {
    id: "full-cover",
    title: data?.title ?? "",
    text: "", // optional: you can add intro text here if you want
    lockLayout: true,
  };

  return [cover, ...textPages];
}, [fullBlocks, variant, data?.title]);


  return (
    <div
      className={`min-h-screen flex flex-col bg-cover bg-center relative overflow-x-hidden ${isCompactReaderLayout ? 'bg-scroll overflow-y-visible' : 'bg-fixed overflow-y-hidden'
        }`}
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
            <div
              ref={measureTextRef}
              className="tt-storybook-prose tt-storybook-prose-book leading-snug word-break-break-word overflow-wrap-anywhere"
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
      <div className={`sticky top-0 z-20 dark:bg-gray-950/80 backdrop-blur border-b border-tt-border/20 dark:border-tt-border/10 ${isTouchDevice && isFullscreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center justify-start min-w-0">
              <button
                type="button"
                onClick={async () => {
                  const doc = document as Document & {
                    webkitFullscreenElement?: Element | null;
                    webkitExitFullscreen?: () => Promise<void> | void;
                  };

                  try {
                    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
                      if (typeof doc.exitFullscreen === 'function') {
                        await doc.exitFullscreen();
                      } else if (typeof doc.webkitExitFullscreen === 'function') {
                        await doc.webkitExitFullscreen();
                      }
                    }
                  } catch {
                    // Ignore fullscreen exit failures and continue home navigation.
                  }

                  router.push('/');
                }}
              >
                <div className="relative flex items-center">
                  <Image src="/owlFace2.png" alt="TaleTime Logo" width={40} height={40} className="h-10 w-10" />
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
                  {/* <Button
                    onClick={() => flipNav?.prev()}
                    variant="outline"
                    size="sm"
                    disabled={!flipNav || flipMeta.pageIndex <= 0 || isStartingOver}
                    type="button"
                  >
                    Prev
                  </Button> */}
                  {/* <Button
                    onClick={() => flipNav?.next()}
                    size="sm"
                    disabled={!flipNav || flipMeta.pageIndex >= flipMeta.pageCount - 1 || isStartingOver}
                    type="button"
                  >
                    Next
                  </Button> */}

                  <Button
                    variant={bookmark ? 'outline' : 'default'}
                    size="sm"
                    className="gap-2"
                    disabled={!flipNav || !bookmarkHydrated || isStartingOver}
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

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!flipNav || flipMeta.pageIndex <= 0 || isStartingOver}
                    onClick={handleStartOver}
                    title="Flip quickly back to the cover"
                    aria-label="Start over from the cover"
                    type="button"
                  >
                    <RotateCcw className={isStartingOver ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
                    {isStartingOver ? 'Starting over…' : 'Start over'}
                  </Button>

                  {canUseFullscreen ? (
                    <Button
                      onClick={toggleFullscreen}
                      variant="outline"
                      size="sm"
                      type="button"
                    >
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                  ) : null}

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
      <main className={`max-w-7xl mx-auto px-4 relative z-10 ${isTabletFullscreen ? 'py-2' : 'py-6'}`}>


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
                <Button variant="ghost" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="w-full">
            {/* {showDebugInfo && (
              <div className="mb-4 rounded-tt border border-tt-border/30 dark:border-tt-border/20 bg-white/70 dark:bg-gray-900/50 p-4 text-xs text-tt-primary/80 dark:text-gray-300/80">
                <div className="flex flex-wrap gap-3">
                  <div>sourceFormat: {data.sourceFormat ?? 'unknown'}</div>
                  <div>blocks: {Array.isArray(data.blocks) ? data.blocks.length : 0}</div>
                  <div>pages: {pages.length}</div>
                  <div>placeholders: {debugPlaceholderCount}</div>
                  {showDebugCounters && (
                    <>
                      <div>orphan fixes: {orphanStats.fixes}</div>
                      <div>chunks removed: {orphanStats.removed}</div>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-semibold text-tt-primary/70 dark:text-gray-300/70">raw preview</div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-tt-primary/70 dark:text-gray-300/70">
                    {debugPreview || '(empty)'}
                  </div>
                </div>
              </div>
            )} */}
            <div className="flex items-start justify-center gap-6 mr-36 xl:gap-12">
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
                          className="absolute -top-2 left-[360px] -translate-x-1/2 h-24 w-24 object-contain sm:-top-[71px] sm:h-[151px] sm:w-40"
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
                    pages={variant === "full" ? fullFlipPages : pages}
                    showEndPages={variant !== 'full'}
                    storyTextOffsetPx={variant === 'full' ? 18 : 0}
                    fullStoryIntroCard={fullStoryIntroCard}
                    fullscreenActive={isFullscreen}
                    flippingTime={rewindFlippingTime}
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
  {/* Bedtime-only controls */}
  {variant === "bedtime" && (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => flipNav?.prev()}
          variant="outline"
          size="sm"
          disabled={!flipNav || flipMeta.pageIndex <= 0 || isStartingOver}
          type="button"
          className="flex-1 shadow-lg"
        >
          Prev
        </Button>

        <Button
          onClick={() => flipNav?.next()}
          size="sm"
          disabled={!flipNav || flipMeta.pageIndex >= flipMeta.pageCount - 1 || isStartingOver}
          type="button"
          className="flex-1 shadow-lg"
        >
          Next
        </Button>
      </div>

      {/* Audio is bedtime-only already, keep it inside this block */}
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
              if (t > 0.25 && audio.currentTime < 0.25) {
                try {
                  audio.currentTime = t;
                } catch {
                  // ignore
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
          {/* your audio UI buttons go here (play/stop etc.) */}
        </>
      )}
    </>
  )}

  <Button
    variant={bookmark ? "outline" : "default"}
    size="sm"
    className="gap-2 justify-center shadow-lg"
    disabled={!flipNav || !bookmarkHydrated || isStartingOver}
    title={
      bookmark
        ? bookmark.pageIndex === flipMeta.pageIndex
          ? "Remove bookmark"
          : "Update bookmark to this page"
        : "Bookmark this page"
    }
    aria-pressed={Boolean(bookmark)}
    onClick={async () => {
      if (!flipNav) return;
      const current = flipMeta.pageIndex;
      if (!Number.isFinite(current) || current < 1) return;

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
    {bookmark ? "Bookmarked" : "Bookmark"}
  </Button>

  <Button
    variant="outline"
    size="sm"
    className="gap-2 justify-center shadow-lg"
    disabled={!flipNav || flipMeta.pageIndex <= 0 || isStartingOver}
    onClick={handleStartOver}
    title="Flip quickly back to the cover"
    aria-label="Start over from the cover"
    type="button"
  >
    <RotateCcw
      className={isStartingOver ? "h-4 w-4 animate-spin" : "h-4 w-4"}
      aria-hidden="true"
    />
    {isStartingOver ? "Starting over…" : "Start over"}
  </Button>

  {/* Fullscreen available in BOTH modes */}
  {canUseFullscreen ? (
    <Button
      onClick={toggleFullscreen}
      variant="outline"
      size="sm"
      className="justify-center shadow-lg"
      type="button"
    >
      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    </Button>
  ) : null}
</div>

                          

                        {shouldShowTaleTimeAudio && (
                          <>

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
              )}

            </div>

          </div>
        )}
        {!loading && !error && data && !isTabletFullscreen && variant !== 'full' && <ReaderQuickTips />}

        {!isTabletFullscreen && (
          <div className="text-xs text-tt-primary/60 dark:text-gray-400 text-center mt-4">
            {isMobile
              ? t('reader.hint.mobile')
              : t('reader.hint.desktop')}
          </div>
        )}
      </main>

    </div>
  );
}
