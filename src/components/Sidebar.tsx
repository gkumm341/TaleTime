'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { X, Menu } from 'lucide-react';

interface SidebarProps {
  activePage?: 'home' | 'favorites' | 'history';
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
        className="fixed top-4 left-4 z-30 md:hidden p-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
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
          bg-gradient-to-b from-white/95 via-pink-50/95 to-purple-50/95 
          dark:from-gray-800/95 dark:via-gray-900/95 dark:to-gray-900/95 
          backdrop-blur-xl border-r border-pink-300/30 dark:border-pink-900/50 
          shadow-2xl overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 space-y-6">
          {/* Close button for mobile */}
          <button
            onClick={closeSidebar}
            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-full transition-colors mb-4"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo - desktop only */}
          <div className="hidden md:block text-center pb-4 border-b border-pink-300/30 dark:border-pink-900/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -top-2 -left-2 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-rose-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="relative animate-in fade-in slide-in-from-left duration-700 py-2">
              <div className="text-4xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>✨</div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg transform hover:scale-110 transition-transform duration-300 cursor-default">
                TaleTime
              </h2>
              <p className="text-xs font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mt-2">Your story telling companion</p>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 rounded-full shadow-lg"></div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <Link 
              href="/"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'home'
                  ? 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-pink-300/50 dark:border-pink-800/50'
                  : 'hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 border border-transparent hover:border-pink-300/50 dark:hover:border-pink-800/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">🏠</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'home'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent'
                  : 'text-gray-700 dark:text-gray-300 group-hover:bg-gradient-to-r group-hover:from-rose-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent'
              }`}>Home</span>
            </Link>
            
            <Link 
              href="/favorites"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'favorites'
                  ? 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-pink-300/50 dark:border-pink-800/50'
                  : 'hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 border border-transparent hover:border-pink-300/50 dark:hover:border-pink-800/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">❤️</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'favorites'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent'
                  : 'text-gray-700 dark:text-gray-300 group-hover:bg-gradient-to-r group-hover:from-rose-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent'
              }`}>Favorites</span>
            </Link>
            
            <Link 
              href="/history"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:shadow-md group ${
                activePage === 'history'
                  ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-300/50 dark:border-purple-800/50'
                  : 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 border border-transparent hover:border-purple-300/50 dark:hover:border-purple-800/50'
              }`}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">📚</span>
              <span className={`text-sm font-semibold transition-all ${
                activePage === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'
                  : 'text-gray-700 dark:text-gray-300 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent'
              }`}>History</span>
            </Link>
          </div>

          {/* Additional content (filters, storage info, etc.) */}
          {children}
        </div>
      </div>
    </>
  );
}
