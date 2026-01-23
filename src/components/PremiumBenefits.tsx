'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Film, Mic, Moon, Sparkles, Wand2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PremiumBenefits({
  fixed = true,
  className,
}: {
  fixed?: boolean;
  className?: string;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Slight delay ensures the element exists for focus.
      queueMicrotask(() => closeButtonRef.current?.focus());
    }
  }, [open]);

  const wrapperClass = fixed ? 'fixed top-4 right-4 z-40' : (className ?? 'inline-flex');
  const btnClass = fixed
    ? 'shadow-tt hover:shadow-lg'
    : 'h-9 px-3 rounded-md font-semibold text-sm bg-tt-accent text-white shadow-md hover:bg-tt-accent/90 transition-all flex items-center gap-2';

  return (
    <>
      <div className={wrapperClass}>
        <Button
          type="button"
          variant="secondary"
          className={btnClass}
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          <span className="whitespace-nowrap">Enjoy Premium Benefits</span>
        </Button>
      </div>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
            >
              {/* Backdrop */}
              <button
                type="button"
                className="absolute inset-0 bg-black/60"
                aria-label="Close premium benefits dialog"
                onClick={() => setOpen(false)}
              />

              {/* Dialog */}
              <div
                className="relative w-full max-w-lg rounded-tt bg-tt-surface dark:bg-gray-900 border border-tt-border/30 dark:border-tt-border/20 shadow-tt flex flex-col overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
              >
                <div className="p-6 border-b border-tt-border/20 dark:border-tt-border/20 flex items-start justify-between gap-4">
                  <div>
                    <h2 id={titleId} className="text-xl font-black text-tt-tertiary">
                      Premium Benefits
                    </h2>
                    <p id={descriptionId} className="mt-1 text-sm text-tt-muted dark:text-gray-300">
                      Unlock more ways to enjoy stories.
                    </p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-full hover:bg-tt-tertiary/10 dark:hover:bg-tt-tertiary/20 text-tt-muted dark:text-gray-300"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                  <div className="rounded-xl bg-tt-tertiary/10 dark:bg-tt-tertiary/20 p-4 border border-tt-tertiary/20">
                    <div className="text-sm font-semibold text-tt-primary dark:text-white">
                      Only $5.99 / month
                    </div>
                    <div className="text-xs text-tt-muted dark:text-gray-300 mt-1">
                      Cancel anytime.
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm text-tt-primary dark:text-gray-200">
                    <li className="flex gap-3">
                      <Mic className="mt-0.5 h-4 w-4 text-tt-tertiary" />
                      <span><span className="font-semibold">Narration</span> — listen to stories read aloud.</span>
                    </li>
                    <li className="flex gap-3">
                      <Moon className="mt-0.5 h-4 w-4 text-tt-tertiary" />
                      <span><span className="font-semibold">Bedtime retellings</span> — gentler, shorter versions for sleep.</span>
                    </li>
                    <li className="flex gap-3">
                      <Sparkles className="mt-0.5 h-4 w-4 text-tt-accent" />
                      <span><span className="font-semibold">Animation</span> — bring scenes to life.</span>
                    </li>
                    <li className="flex gap-3">
                      <Film className="mt-0.5 h-4 w-4 text-tt-accent" />
                      <span><span className="font-semibold">Videos</span> — story moments in motion.</span>
                    </li>
                    <li className="flex gap-3">
                      <Wand2 className="mt-0.5 h-4 w-4 text-yellow-400" />
                      <span><span className="font-semibold">Create your own</span> — kids can make their own stories and animations with AI.</span>
                    </li>
                  </ul>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push('/premium');
                      }}
                      aria-label="Continue to payment"
                    >
                      Sounds good
                    </Button>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Note: Premium is informational for now; purchase flow can be added next.
                  </p>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
