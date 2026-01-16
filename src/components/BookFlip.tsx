"use client";

import React, { useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";

import { Button } from "@/components/ui/button";

export type PageData = {
  id: string;
  title?: string;
  text?: string;
  imageSrc?: string;
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
  onNavigationReady?: (nav: { next: () => void; prev: () => void }) => void;
};

export type BookFlipHandle = {
  next: () => void;
  prev: () => void;
  getPageIndex: () => number;
  getPageCount: () => number;
};

type FlipBookApi = {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
  getPageCount: () => number;
};

type FlipBookRef = {
  pageFlip: () => FlipBookApi;
};

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
        className="h-full w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10"
        style={{
          backgroundImage:
            "radial-gradient(rgba(62,62,62,0.04) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
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
  return (
    <div className="h-full w-full p-6 flex flex-col">
      <div className="text-xs font-semibold text-[#B5CDA3]">
        {appName ?? "TaleTime"}
      </div>

      <div className="">
        <h1 className="text-3xl font-extrabold text-[#3E3E3E] dark:text-white leading-tight">
          {storyTitle}
        </h1>
        {author ? (
          <p className="text-[#3E3E3E]/70 dark:text-gray-300">by {author}</p>
        ) : (
          <p className="text-[#3E3E3E]/70 dark:text-gray-300">A short story</p>
        )}
      </div>

      <div className="mt-6 flex-1 rounded-2xl border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 bg-[#F5E9DA]/30 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {coverImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageSrc}
            alt={`${storyTitle} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#6BA8A9]/20 flex items-center justify-center text-[#6BA8A9] font-bold">
              TT
            </div>
            <p className="mt-4 text-[#3E3E3E] dark:text-white font-medium">
              Add a cover image later
            </p>
            <p className="mt-1 text-[#3E3E3E]/70 dark:text-gray-300 text-sm">
              This is your book&apos;s cover page.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-[#3E3E3E]/60 dark:text-gray-400">
        Tip: drag the page corner or use Next/Prev.
      </div>
    </div>
  );
}

function StoryPage({
  title,
  text,
  imageSrc,
}: {
  title?: string;
  text?: string;
  imageSrc?: string;
}) {
  return (
    <div className="h-full w-full p-6 flex flex-col">
      {title ? (
        <h2 className="text-xl font-bold text-[#3E3E3E] dark:text-white">{title}</h2>
      ) : (
        <div className="h-6" />
      )}

      {imageSrc ? (
        <div className="mt-4 rounded-2xl border border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 overflow-hidden bg-[#F5E9DA]/30 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={title ?? "Story illustration"}
            className="w-full h-44 object-cover"
          />
        </div>
      ) : null}

      <div className="mt-4 flex-1 overflow-hidden">
        <div className="h-full overflow-hidden pr-2">
          <p className="text-[#3E3E3E] dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {text ?? ""}
          </p>
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

  const pageCount = useMemo(() => pages.length + 1, [pages.length]);

  const width = dims.width;
  const height = dims.height;

  const getFlipApi = (): FlipBookApi | null => {
    const ref = bookRef.current as FlipBookRef | null;
    if (!ref?.pageFlip) return null;
    return ref.pageFlip();
  };

  const goNext = React.useCallback(() => getFlipApi()?.flipNext(), []);
  const goPrev = React.useCallback(() => getFlipApi()?.flipPrev(), []);

  React.useEffect(() => {
    onNavigationReady?.({ next: goNext, prev: goPrev });
  }, [onNavigationReady, goNext, goPrev]);

  React.useEffect(() => {
    onPageChange?.(pageIndex, pageCount);
  }, [onPageChange, pageCount, pageIndex]);

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center gap-4">
      {showHeader ? (
        <div className="w-full max-w-5xl flex items-center justify-between px-4">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-[#3E3E3E] dark:text-white">
              {storyTitle}
            </div>
            <div className="text-xs text-[#3E3E3E]/60 dark:text-gray-400">
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
          <Page>
            <CoverPage
              appName={appName}
              storyTitle={storyTitle}
              author={author}
              coverImageSrc={coverImageSrc}
            />
          </Page>

          {pages.map((p) => (
            <Page key={p.id}>
              <StoryPage title={p.title} text={p.text} imageSrc={p.imageSrc} />
            </Page>
          ))}
        </HTMLFlipBook>
      </div>

      {showTip ? (
        <div className="text-xs text-[#3E3E3E]/60 dark:text-gray-400">
          {isMobile
            ? "Tip: swipe/drag to flip pages."
            : "Tip: click/drag page corners to flip."}
        </div>
      ) : null}
    </div>
  );
}
