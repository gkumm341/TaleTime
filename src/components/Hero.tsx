'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PremiumBenefits } from './PremiumBenefits';
import { AuthButtons } from './AuthButtons';

export function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative rounded-3xl overflow-hidden border border-black/5 bg-gradient-to-br from-[#fff3e7] via-white to-[#eaf7f6] shadow-xl shadow-black/5"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: 'url(/flowers_background.png)' }}
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative p-6 lg:p-8">
          <div className="absolute inset-0" />
          <div className="relative rounded-3xl overflow-hidden shadow-md">
            <video
              src="/mascot_video.mp4"
              autoPlay
              muted
              playsInline
              className="w-full h-[240px] lg:h-[380px] object-cover"
              aria-label="TaleTime owl mascot"
            />
          </div>
        </div>

        <div className="relative p-6 lg:p-10 flex items-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative max-w-xl">
            <h1 className="font-heading text-4xl lg:text-5xl font-bold text-slate-800">
              Welcome to <span className="tt-logo">TaleTime</span>
            </h1>
            <p className="mt-4 font-body text-base lg:text-lg text-slate-600 leading-relaxed">
              Discover captivating stories tailored to your available time. Enjoy full versions or calming bedtime adaptations.
            </p>

            <div className="flex items-center gap-3 mt-10 ml-8">
              <AuthButtons compact />
              <PremiumBenefits fixed={false} className="hidden sm:inline-flex" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
