'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PremiumBenefits() {
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

  return (
    <>
      <div className="fixed top-4 right-4 z-40">
        <Button
          type="button"
          variant="secondary"
          className="shadow-lg hover:shadow-xl"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Enjoy Premium Benefits
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-[#B5CDA3]/30 dark:border-[#B5CDA3]/20 shadow-2xl">
            <div className="p-6 border-b border-[#B5CDA3]/20 dark:border-[#B5CDA3]/20 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-xl font-black text-[#6BA8A9]">
                  Premium Benefits
                </h2>
                <p id={descriptionId} className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  Unlock more ways to enjoy stories.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 text-gray-700 dark:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 p-4 border border-[#6BA8A9]/20">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Only $5.99 / month
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  Cancel anytime.
                </div>
              </div>

              <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                <li className="flex gap-3">
                  <span className="mt-0.5">🎙️</span>
                  <span><span className="font-semibold">Narration</span> — listen to stories read aloud.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5">🌙</span>
                  <span><span className="font-semibold">Bedtime retellings</span> — gentler, shorter versions for sleep.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5">✨</span>
                  <span><span className="font-semibold">Animation</span> — bring scenes to life.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5">🎬</span>
                  <span><span className="font-semibold">Videos</span> — story moments in motion.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5">🧒</span>
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
        </div>
      )}
    </>
  );
}
