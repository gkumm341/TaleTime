'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { AuthButtons } from '@/components/AuthButtons';
import { PremiumBenefits } from '@/components/PremiumBenefits';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd9b5] to-[#ffb7b0] shadow-sm ring-1 ring-black/5">
            <Sparkles className="h-5 w-5 text-[#ff7b6b]" />
          </span>
          <span className="tt-logo text-2xl">TaleTime</span>
        </Link>

        <div className="flex items-center gap-3">
          <AuthButtons compact />
          <PremiumBenefits fixed={false} className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}
