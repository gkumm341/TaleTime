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
  activePage?: 'home' | 'continue' | 'favorites' | 'history' | 'settings';
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
        className="fixed top-4 left-4 z-30 md:hidden p-3 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 bg-gradient-to-r from-[#ffb59f] to-[#ff7f76]"
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
            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/30 rounded-full transition-colors mb-4"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo */}
    <div className="text-center pb-4 border-b border-black/5 dark:border-white/10 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fff3e7] via-white to-[#eaf7f6] p-3 ring-1 ring-black/5">
  <div className="absolute top-0 right-0 w-28 h-28 bg-[#6BA8A9]/20 rounded-full blur-2xl"></div>
  <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#FF8B7B]/15 rounded-full blur-2xl"></div>

  <div className="relative">
    <Image
      src="/hat.png"
      alt=""
      width={80}
      height={80}
      className="absolute -top-10 left-12 animate-bounce-subtle"
      priority
    />

    <h2 className="tt-logo font-heading text-3xl mt-9">TaleTime</h2>
    <p className="text-xs font-medium text-slate-600 mt-1">Your storytelling companion</p>
  </div>
</div>


          {/* Navigation Links */}
          <div className="space-y-2">
            <Link 
              href="/"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 ${
                activePage === 'home'
                  ? 'bg-gradient-to-r from-[#fff3e7] to-[#eaf7f6] shadow-sm'
                  : 'bg-white/70 hover:bg-white/90'
              }`}
            >
              <Home
                className="h-5 w-5 drop-shadow-sm"
                strokeWidth={navIconStrokeWidth}
                style={{ color: '#2fbf8a' }}
                fill="currentColor"
                fillOpacity={0.18}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'home' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Home</span>
            </Link>

    
     
            <Link 
              href="/continue"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 ${
                activePage === 'continue'
                  ? 'bg-gradient-to-r from-[#fff3e7] to-[#eaf7f6] shadow-sm'
                  : 'bg-white/70 hover:bg-white/90'
              }`}
            >
              <CheckCircle2
                className="h-5 w-5 drop-shadow-sm"
                strokeWidth={navIconStrokeWidth}
                style={{ color: '#2fbf8a' }}
                fill="currentColor"
                fillOpacity={0.14}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'continue' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Continue</span>
            </Link>
            
            <Link 
              href="/favorites"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 ${
                activePage === 'favorites'
                  ? 'bg-gradient-to-r from-[#fff3e7] to-[#eaf7f6] shadow-sm'
                  : 'bg-white/70 hover:bg-white/90'
              }`}
            >
              <Heart
                className="h-5 w-5 drop-shadow-sm"
                strokeWidth={navIconStrokeWidth}
                style={{ color: '#ff6b6b' }}
                fill="currentColor"
                fillOpacity={0.16}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'favorites' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Favorites</span>
            </Link>
            
            <Link 
              href="/history"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 ${
                activePage === 'history'
                  ? 'bg-gradient-to-r from-[#fff3e7] to-[#eaf7f6] shadow-sm'
                  : 'bg-white/70 hover:bg-white/90'
              }`}
            >
              <Clock
                className="h-5 w-5 drop-shadow-sm"
                strokeWidth={navIconStrokeWidth}
                style={{ color: '#4a90e2' }}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'history' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>History</span>
            </Link>

            <Link 
              href="/settings"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ring-1 ring-black/5 hover:shadow-md hover:-translate-y-0.5 ${
                activePage === 'settings'
                  ? 'bg-gradient-to-r from-[#fff3e7] to-[#eaf7f6] shadow-sm'
                  : 'bg-white/70 hover:bg-white/90'
              }`}
            >
              <Settings
                className="h-5 w-5 drop-shadow-sm"
                strokeWidth={navIconStrokeWidth}
                style={{ color: '#a66dd4' }}
              />
              <span className={`text-sm font-semibold transition-all ${activePage === 'settings' ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>Settings</span>
            </Link>
          </div>

          {/* Find Your Story shortcut (scrolls to filters) */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('sidebar-filters');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="w-full mt-2 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-black/5 bg-white/70 hover:bg-white/90 text-slate-800 font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" strokeWidth={navIconStrokeWidth} style={{ color: '#ff6b6b' }} />
              <span className="text-sm">Find Your Story</span>
            </span>
            <span className="text-sm">›</span>
          </button>

          {/* Additional content (filters, storage info, etc.) */}
          <div className="space-y-4">
             {children}
          </div>

      
        </div>
      </div>
    </>
  );
}
