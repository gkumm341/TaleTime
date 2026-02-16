'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

export function CookieConsentBanner() {
  const { shouldShowBanner, acceptCookies, declineCookies } = useCookieConsent();

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:max-w-xl">
      <Card className="border border-white/50 bg-tt-surface/95 shadow-tt backdrop-blur-md animate-slide-up">
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-tt-primary">Cookie preferences</h3>
            <p className="text-sm text-tt-muted">
              TaleTime uses essential cookies for sign-in, language, and core app behavior. You can accept or decline
              non-essential cookies used for analytics and product improvements.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={declineCookies} variant="outline" size="sm">
                Decline non-essential
              </Button>
              <Button onClick={acceptCookies} size="sm" className="bg-tt-tertiary text-white hover:bg-tt-tertiary/90">
                Accept all cookies
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
