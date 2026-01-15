'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';

export default function PremiumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkoutUrl = useMemo(() => {
    // Configure later (Stripe checkout, etc.) without changing the rest of the app.
    return process.env.NEXT_PUBLIC_WEB_CHECKOUT_URL || '';
  }, []);

  const canSimulate = process.env.NODE_ENV !== 'production';

  const simulatePurchase = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/entitlements/mock-grant', { method: 'POST' });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const errorText = json?.error ? String(json.error) : `Failed (${res.status})`;
        throw new Error(errorText);
      }

      setMessage('Premium unlocked (dev simulation).');
      setTimeout(() => router.push('/'), 600);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-950">
      <Sidebar activePage="home" />

      <div className="relative z-10 ml-0 md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-black text-[#6BA8A9]">Go Premium</h1>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              Premium unlocks narration, bedtime retellings, animations, videos, and AI-powered story creation.
            </p>
          </div>

          <div className="rounded-2xl border border-[#B5CDA3]/30 dark:border-[#B5CDA3]/20 bg-white/90 dark:bg-gray-900/60 p-6 shadow-xl">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">Premium</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Monthly subscription</div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">$5.99</div>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-gray-800 dark:text-gray-200">
              <li className="flex gap-2"><span>🎙️</span><span>Narration (read-aloud)</span></li>
              <li className="flex gap-2"><span>🌙</span><span>Bedtime retellings</span></li>
              <li className="flex gap-2"><span>✨</span><span>Animations</span></li>
              <li className="flex gap-2"><span>🎬</span><span>Videos</span></li>
              <li className="flex gap-2"><span>🧒</span><span>Kids can make stories + animations with AI</span></li>
            </ul>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" onClick={() => router.back()}>
                Not now
              </Button>

              {checkoutUrl ? (
                <a href={checkoutUrl}>
                  <Button>Continue to payment</Button>
                </a>
              ) : (
                <Button onClick={simulatePurchase} disabled={loading || !canSimulate}>
                  {loading ? 'Working…' : canSimulate ? 'Continue to payment (dev)' : 'Payment not configured'}
                </Button>
              )}
            </div>

            {message && (
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                {message}
              </div>
            )}

            <p className="mt-4 text-[11px] text-gray-500 dark:text-gray-400">
              For web payments, set `NEXT_PUBLIC_WEB_CHECKOUT_URL` later (e.g. Stripe). iOS/Android in-app purchases will be verified via
              dedicated endpoints without changing the rest of the app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
