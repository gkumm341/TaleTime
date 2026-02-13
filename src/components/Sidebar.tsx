'use client';

import Image from 'next/image';
import { useState, ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Menu,
  Search,
  Settings,
  Sparkles,
  Moon,
  X,
} from 'lucide-react';
import { AuthButtons } from '@/components/AuthButtons';
import { StorageInfo } from './StorageInfo';

interface SidebarProps {
  activePage?: 'home' | 'continue' | 'favorites' | 'history' | 'settings' | 'browse' | 'bedtime';
  children?: ReactNode;
}

export function Sidebar({ activePage = 'home', children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navIconStrokeWidth = 2.25;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 md:hidden p-3 rounded-full text-white shadow-tt hover:shadow-lg transition-all duration-300 transform hover:scale-110 bg-gradient-to-r from-tt-secondary to-tt-accent"
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden animate-in fade-in duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 bottom-0 z-30 w-72 md:w-64
          md:top-6 md:bottom-6 md:left-6
          rounded-3xl 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 space-y-6 min-h-full flex flex-col ">
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-2 text-tt-muted hover:bg-tt-tertiary/10 dark:hover:bg-tt-tertiary/30 rounded-full transition-colors mb-4"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo */}
    <div className="text-center pb-4 border-b border-tt-border/5 dark:border-white/10 relative overflow-hidden rounded-tt tt-gradient-soft p-3 ring-1 ring-tt-border/10">
  <div className="absolute top-0 right-0 w-28 h-28 bg-tt-tertiary/20 rounded-full blur-2xl"></div>
  <div className="absolute -top-4 -left-4 w-24 h-24 bg-tt-accent/15 rounded-full blur-2xl"></div>

  <div className="relative">
    <Image
      src="/hatLogo.png"
      alt=""
      width={80}
      height={80}
      className="absolute -top-11 left-12 animate-bounce-slow"
      priority
    />

    <h2 className="tt-logo font-heading text-3xl mt-9">TaleTime</h2>
    <p className="text-xs font-medium text-tt-muted mt-1">Your storytelling companion</p>
  </div>
</div>


          {/* Navigation Links */}
          <div className="space-y-2">
            <Link 
              href="/"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-tt transition-all group ring-1 ring-tt-border/10 hover:shadow-tt hover:-translate-y-0.5 ${
                activePage === 'home'
                  ? 'tt-gradient-soft shadow-sm'
                  : 'bg-tt-surface/70 hover:bg-tt-surface/90'
              }`}
            >
              <Home
                className="h-5 w-5 drop-shadow-sm text-tt-tertiary"
                strokeWidth={navIconStrokeWidth}
                fill="currentColor"
                fillOpacity={0.18}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'home' ? 'text-tt-primary' : 'text-tt-muted group-hover:text-tt-primary'}`}>Home</span>
            </Link>

    
     
            <Link 
              href="/continue"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-tt transition-all group ring-1 ring-tt-border/10 hover:shadow-tt hover:-translate-y-0.5 ${
                activePage === 'continue'
                  ? 'tt-gradient-soft shadow-sm'
                  : 'bg-tt-surface/70 hover:bg-tt-surface/90'
              }`}
            >
              <CheckCircle2
                className="h-5 w-5 drop-shadow-sm text-tt-tertiary"
                strokeWidth={navIconStrokeWidth}
                fill="currentColor"
                fillOpacity={0.14}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'continue' ? 'text-tt-primary' : 'text-tt-muted group-hover:text-tt-primary'}`}>Continue</span>
            </Link>
            
            <Link 
              href="/favorites"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-tt transition-all group ring-1 ring-tt-border/10 hover:shadow-tt hover:-translate-y-0.5 ${
                activePage === 'favorites'
                  ? 'tt-gradient-soft shadow-sm'
                  : 'bg-tt-surface/70 hover:bg-tt-surface/90'
              }`}
            >
              <Heart
                className="h-5 w-5 drop-shadow-sm text-tt-accent"
                strokeWidth={navIconStrokeWidth}
                fill="currentColor"
                fillOpacity={0.16}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'favorites' ? 'text-tt-primary' : 'text-tt-muted group-hover:text-tt-primary'}`}>Favorites</span>
            </Link>
            
            <Link 
              href="/history"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-tt transition-all group ring-1 ring-tt-border/10 hover:shadow-tt hover:-translate-y-0.5 ${
                activePage === 'history'
                  ? 'tt-gradient-soft shadow-sm'
                  : 'bg-tt-surface/70 hover:bg-tt-surface/90'
              }`}
            >
              <Clock
                className="h-5 w-5 drop-shadow-sm text-tt-tertiary"
                strokeWidth={navIconStrokeWidth}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'history' ? 'text-tt-primary' : 'text-tt-muted group-hover:text-tt-primary'}`}>History</span>
            </Link>

            <Link 
              href="/settings"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-tt transition-all group ring-1 ring-tt-border/10 hover:shadow-tt hover:-translate-y-0.5 ${
                activePage === 'settings'
                  ? 'tt-gradient-soft shadow-sm'
                  : 'bg-tt-surface/70 hover:bg-tt-surface/90'
              }`}
            >
              <Settings
                className="h-5 w-5 drop-shadow-sm text-tt-tertiary"
                strokeWidth={navIconStrokeWidth}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'settings' ? 'text-tt-primary' : 'text-tt-muted group-hover:text-tt-primary'}`}>Settings</span>
            </Link>
          </div>

          {/* Build Your Story shortcut */}
          <Link
            href="/build-story"
            onClick={closeSidebar}
            className="w-full mt-2 flex items-center justify-between gap-3 px-4 py-3 rounded-tt border border-tt-border/10 bg-tt-surface/70 hover:bg-tt-surface/90 text-tt-primary font-semibold shadow-sm hover:shadow-tt transition-all"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-tt-accent" strokeWidth={navIconStrokeWidth} />
              <span className="text-sm">Build Your Story</span>
            </span>
            <span className="text-sm">›</span>
          </Link>

          {/* Additional content (filters, storage info, etc.) */}
          <div className="space-y-4">
             {children}
          </div>

      
        </div>
      </div>
    </>
  );
}
