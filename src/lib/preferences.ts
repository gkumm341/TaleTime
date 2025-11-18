/**
 * User Preferences Management
 * Stores user preferences in IndexedDB for persistence
 */

import { get, set, del } from 'idb-keyval';

export interface UserPreferences {
  theme: 'light' | 'sepia' | 'dark';
  fontSize: number; // Percentage: 80-150
  fontFamily: 'serif' | 'sans-serif';
  defaultWpm: number; // Words per minute for estimates
  autoSave: boolean; // Auto-save reading position
  showReadingStats: boolean; // Show stats panel by default
  lineHeight: number; // 1.2-2.0
  marginWidth: number; // 0-20 (percentage)
}

const PREFERENCES_KEY = 'user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 100,
  fontFamily: 'serif',
  defaultWpm: 160,
  autoSave: true,
  showReadingStats: false,
  lineHeight: 1.6,
  marginWidth: 10,
};

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get user preferences from IndexedDB
 */
export async function getPreferences(): Promise<UserPreferences> {
  if (!isBrowser()) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = await get<UserPreferences>(PREFERENCES_KEY);
    return stored ? { ...DEFAULT_PREFERENCES, ...stored } : DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save user preferences to IndexedDB
 */
export async function savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
  if (!isBrowser()) return;

  try {
    const current = await getPreferences();
    const updated = { ...current, ...preferences };
    await set(PREFERENCES_KEY, updated);
  } catch (error) {
    console.error('Failed to save preferences:', error);
    throw error;
  }
}

/**
 * Reset preferences to defaults
 */
export async function resetPreferences(): Promise<void> {
  if (!isBrowser()) return;

  try {
    await del(PREFERENCES_KEY);
  } catch (error) {
    console.error('Failed to reset preferences:', error);
    throw error;
  }
}

/**
 * Get a single preference value
 */
export async function getPreference<K extends keyof UserPreferences>(
  key: K
): Promise<UserPreferences[K]> {
  const prefs = await getPreferences();
  return prefs[key];
}

/**
 * Set a single preference value
 */
export async function setPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<void> {
  await savePreferences({ [key]: value } as Partial<UserPreferences>);
}

/**
 * Export preferences as JSON
 */
export async function exportPreferences(): Promise<string> {
  const prefs = await getPreferences();
  return JSON.stringify(prefs, null, 2);
}

/**
 * Import preferences from JSON
 */
export async function importPreferences(json: string): Promise<void> {
  try {
    const parsed = JSON.parse(json) as Partial<UserPreferences>;
    await savePreferences(parsed);
  } catch (error) {
    console.error('Failed to import preferences:', error);
    throw new Error('Invalid preferences format');
  }
}
