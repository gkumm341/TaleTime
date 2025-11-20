/**
 * Reading Session Tracker
 * Tracks reading sessions and calculates actual reading speed
 */

export interface ReadingSession {
  bookId: number;
  startCfi?: string;
  endCfi?: string;
  startTime: number;
  endTime: number;
  wordsRead?: number;
  calculatedWpm?: number;
}

export interface ReadingProgress {
  bookId: number;
  currentCfi: string;
  progressPercent: number;
  totalWords?: number;
  wordsRead?: number;
  timeSpentMinutes: number;
  averageWpm?: number;
}

/**
 * Start a reading session
 */
export function startReadingSession(bookId: number, cfi?: string): ReadingSession {
  return {
    bookId,
    startCfi: cfi,
    startTime: Date.now(),
    endTime: Date.now(), // Will be updated when session ends
  };
}

/**
 * End a reading session and calculate WPM
 */
export function endReadingSession(
  session: ReadingSession,
  endCfi?: string,
  wordsRead?: number
): ReadingSession {
  const endTime = Date.now();
  const durationMinutes = (endTime - session.startTime) / 1000 / 60;
  
  let calculatedWpm: number | undefined;
  if (wordsRead && durationMinutes > 0) {
    calculatedWpm = Math.round(wordsRead / durationMinutes);
  }

  return {
    ...session,
    endCfi,
    endTime,
    wordsRead,
    calculatedWpm,
  };
}

/**
 * Calculate reading progress from CFI
 * Note: This is an approximation. CFI doesn't directly give us percentage.
 * We'll need to track chapter progress or use epub.js locations.
 */
export function calculateProgress(
  currentLocation: any, // epub.js location object
  totalWords?: number
): number {
  if (!currentLocation) return 0;
  
  // If epub.js provides progress info
  if (currentLocation.start && currentLocation.end) {
    const { start, end } = currentLocation;
    if (end.total) {
      return (start.cfi / end.total) * 100;
    }
  }
  
  // Fallback: try to extract from percentage in location
  if (currentLocation.start?.percentage) {
    return currentLocation.start.percentage;
  }
  
  return 0;
}

/**
 * Estimate time to finish based on current progress and WPM
 */
export function estimateTimeToFinish(
  progressPercent: number,
  totalWords: number,
  wpm: number
): number {
  if (progressPercent >= 100) return 0;
  
  const remainingPercent = (100 - progressPercent) / 100;
  const wordsRemaining = totalWords * remainingPercent;
  const minutesRemaining = wordsRemaining / wpm;
  
  return Math.ceil(minutesRemaining);
}

/**
 * Calculate average WPM from reading sessions
 */
export function calculateAverageWpm(sessions: ReadingSession[]): number {
  const validSessions = sessions.filter(s => s.calculatedWpm && s.calculatedWpm > 0);
  
  if (validSessions.length === 0) return 160; // Default WPM
  
  const totalWpm = validSessions.reduce((sum, s) => sum + (s.calculatedWpm || 0), 0);
  return Math.round(totalWpm / validSessions.length);
}

/**
 * Estimate words read from CFI range
 * This is a rough approximation - actual implementation would need
 * to parse the epub content between CFI ranges
 */
export function estimateWordsFromCfi(
  startCfi: string,
  endCfi: string,
  totalWords: number
): number {
  // This is a placeholder - real implementation would need epub.js integration
  // For now, return 0 and we'll estimate based on time
  return 0;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Save reading session to localStorage
 */
export function saveSessionToStorage(session: ReadingSession): void {
  if (!isBrowser()) return;
  
  try {
    const sessions = getSessionsFromStorage(session.bookId);
    sessions.push(session);
    
    // Keep only last 50 sessions per book
    const recentSessions = sessions.slice(-50);
    
    localStorage.setItem(
      `reading_sessions_${session.bookId}`,
      JSON.stringify(recentSessions)
    );
  } catch (error) {
    console.error('Failed to save reading session:', error);
  }
}

/**
 * Update reading history in database
 */
export async function updateReadingHistory(
  bookId: number,
  currentCfi: string,
  progressPercent: number
): Promise<void> {
  try {
    const sessions = getSessionsFromStorage(bookId);
    const totalTimeMs = sessions.reduce(
      (sum, s) => sum + (s.endTime - s.startTime),
      0
    );
    const totalMinutes = Math.round(totalTimeMs / 1000 / 60);

    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        currentCfi,
        progressPercent: Math.round(progressPercent),
        totalReadingTime: totalMinutes,
      }),
    });
  } catch (error) {
    console.error('Failed to update reading history:', error);
  }
}

/**
 * Get reading sessions from localStorage
 */
export function getSessionsFromStorage(bookId: number): ReadingSession[] {
  if (!isBrowser()) return [];
  
  try {
    const data = localStorage.getItem(`reading_sessions_${bookId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load reading sessions:', error);
    return [];
  }
}

/**
 * Get reading stats for a book
 */
export function getReadingStats(bookId: number): {
  totalSessions: number;
  totalTimeMinutes: number;
  averageWpm: number;
  lastReadDate: Date | null;
} {
  const sessions = getSessionsFromStorage(bookId);
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalTimeMinutes: 0,
      averageWpm: 160,
      lastReadDate: null,
    };
  }
  
  const totalTimeMs = sessions.reduce(
    (sum, s) => sum + (s.endTime - s.startTime),
    0
  );
  const totalTimeMinutes = Math.round(totalTimeMs / 1000 / 60);
  
  const averageWpm = calculateAverageWpm(sessions);
  
  const lastSession = sessions[sessions.length - 1];
  const lastReadDate = new Date(lastSession.endTime);
  
  return {
    totalSessions: sessions.length,
    totalTimeMinutes,
    averageWpm,
    lastReadDate,
  };
}

/**
 * Clear old sessions (older than 90 days)
 */
export function clearOldSessions(): void {
  if (!isBrowser()) return;
  
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('reading_sessions_')) {
      try {
        const sessions: ReadingSession[] = JSON.parse(localStorage.getItem(key) || '[]');
        const recentSessions = sessions.filter(s => s.endTime > ninetyDaysAgo);
        
        if (recentSessions.length > 0) {
          localStorage.setItem(key, JSON.stringify(recentSessions));
        } else {
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Failed to clear old sessions:', error);
      }
    }
  }
}
