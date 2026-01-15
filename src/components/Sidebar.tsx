'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { X, Menu } from 'lucide-react';
import { AuthButtons } from '@/components/AuthButtons';

interface SidebarProps {
  activePage?: 'home' | 'bedtime' | 'browse' | 'continue' | 'favorites' | 'history' | 'settings';
  children?: ReactNode;
}

export function Sidebar({ activePage = 'home', children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 md:hidden p-3 bg-[#6BA8A9] hover:bg-[#5F9798] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
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
          fixed left-0 top-0 bottom-0 z-30 w-64 
          bg-white/95 
          dark:from-gray-900/95 dark:via-gray-900/95 dark:to-gray-900/95 
          backdrop-blur-xl border-r border-[#B5CDA3]/20 dark:border-[#B5CDA3]/10 
          shadow-xl overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 space-y-6">
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/30 rounded-full transition-colors mb-4"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo - desktop only */}
          <div className="hidden md:block text-center pb-4 border-b border-[#B5CDA3]/30 dark:border-[#B5CDA3]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6BA8A9]/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -top-2 -left-2 w-20 h-20 bg-[#FF8B7B]/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="relative animate-in fade-in slide-in-from-left duration-700 py-2">
              <div className="text-4xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
              <h2 className="logo-text text-4xl transform hover:scale-110 transition-transform duration-300 cursor-default">
                TaleTime
              </h2>
              <p className="text-xs font-bold text-[#B5CDA3] mt-2">Your story telling companion</p>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-[#6BA8A9] rounded-full shadow-lg"></div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <Link 
              href="/"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'home'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🏠</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'home'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Home</span>
            </Link>

            <Link 
              href="/bedtime"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'bedtime'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🌙</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'bedtime'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Bedtime</span>
            </Link>

            <Link 
              href="/search"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'browse'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🔍</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'browse'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Browse</span>
            </Link>
            <Link 
              href="/continue"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'continue'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">⏩</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'continue'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Continue</span>
            </Link>
            
            <Link 
              href="/favorites"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'favorites'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">❤️</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'favorites'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Favorites</span>
            </Link>
            
            <Link 
              href="/history"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'history'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">📚</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'history'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>History</span>
            </Link>

            <Link 
              href="/settings"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'settings'
                  ? 'bg-[#6BA8A9]/10 dark:bg-[#6BA8A9]/20 border border-[#6BA8A9]/50 dark:border-[#6BA8A9]/50'
                  : 'hover:bg-[#6BA8A9]/10 dark:hover:bg-[#6BA8A9]/20 border border-transparent hover:border-[#FF8B7B]/50 dark:hover:border-[#FF8B7B]/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">⚙️</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'settings'
                  ? 'text-[#6BA8A9]'
                  : 'text-[#3E3E3E] dark:text-gray-300 group-hover:text-[#6BA8A9]'
              }`}>Settings</span>
            </Link>
          </div>

          {/* Additional content (filters, storage info, etc.) */}
          {children}

     
        </div>
      </div>
    </>
  );
}
