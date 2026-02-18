'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { useI18n } from '@/components/LanguageProvider';

export function ReaderQuickTips() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, mounted]);

  const dismiss = () => setOpen(false);

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('reader.tips.show')}
          title={t('reader.tips.show')}
          className="fixed bottom-4 right-4 z-[2147483640] rounded-full border border-tt-border/20 bg-tt-surface/90 p-2 shadow-sm hover:bg-tt-surface"
        >
          <HelpCircle className="h-5 w-5 text-tt-primary" aria-hidden="true" />

        </button>,
        document.body
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483647] bg-black/60 p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={t('reader.tips.title')}
          >
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-tt-border/20 bg-tt-surface p-4 md:p-5 shadow-tt">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-tt-primary mb-6">{t('reader.tips.title')}</h2>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label={t('reader.tips.dismiss')}
                  className="rounded-md p-1 hover:bg-tt-border/10"
                >
                  <X className="h-4 w-4 text-tt-muted" />
                </button>
              </div>

              <ul className="space-y-2 text-sm text-tt-primary">
                <li>• {t('reader.tips.flip')}</li>
                <li>• {t('reader.tips.bookmark')}</li>
                <li>• {t('reader.tips.audio')}</li>
                <li>• {t('reader.tips.animated')}</li>
              </ul>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg bg-tt-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t('reader.tips.dismiss')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
