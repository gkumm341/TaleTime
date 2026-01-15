'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getPreferences, savePreferences, resetPreferences, UserPreferences } from '@/lib/preferences';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  loading: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  fontSize: 100,
  fontFamily: 'serif',
  defaultWpm: 160,
  autoSave: true,
  showReadingStats: false,
  lineHeight: 1.6,
  marginWidth: 10,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load preferences on mount
  useEffect(() => {
    if (!mounted) return;
    
    const loadPrefs = async () => {
      try {
        const prefs = await getPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [mounted]);

  // Apply preferences globally (font + layout variables).
  // Theme is handled by ThemeProvider, but these apply site-wide.
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;

    const root = document.documentElement;

    const fontScale = Math.max(0.8, Math.min(1.5, preferences.fontSize / 100));
    root.style.setProperty('--app-font-scale', String(fontScale));
    root.style.setProperty('--app-line-height', String(preferences.lineHeight));

    const fontFamily =
      preferences.fontFamily === 'serif'
        ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
        : 'system-ui, -apple-system, sans-serif';
    root.style.setProperty('--app-font-family', fontFamily);
  }, [preferences.fontSize, preferences.fontFamily, preferences.lineHeight, mounted]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      await savePreferences(updates);
      setPreferences(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  };

  const resetToDefaults = async () => {
    try {
      await resetPreferences();
      const defaults = await getPreferences();
      setPreferences(defaults);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      throw error;
    }
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreferences, resetToDefaults, loading }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
