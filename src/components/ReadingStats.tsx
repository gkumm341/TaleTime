'use client';

import { Clock, BookOpen, TrendingUp } from 'lucide-react';

interface ReadingStatsProps {
  progressPercent: number;
  minutesRemaining?: number;
  totalTimeMinutes?: number;
  averageWpm?: number;
  totalWords?: number;
  wordsRemaining?: number;
}

export function ReadingStats({
  progressPercent,
  minutesRemaining,
  totalTimeMinutes = 0,
  averageWpm = 160,
  totalWords,
  wordsRemaining,
}: ReadingStatsProps) {
  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="bg-tt-surface dark:bg-gray-800 rounded-lg p-4 shadow-md space-y-3">
      <h3 className="text-sm font-semibold text-tt-primary dark:text-white mb-3">
        Reading Progress
      </h3>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-tt-muted dark:text-gray-400">
          <span>{Math.round(progressPercent)}% complete</span>
          {minutesRemaining !== undefined && (
            <span className="font-medium text-tt-tertiary dark:text-tt-tertiary">
              {formatTime(minutesRemaining)} left
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-tt-tertiary dark:bg-tt-tertiary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {/* Time Remaining */}
        {minutesRemaining !== undefined && (
          <div className="flex flex-col items-center text-center">
            <Clock size={16} className="text-gray-500 dark:text-gray-400 mb-1" />
            <div className="text-sm font-semibold text-tt-primary dark:text-white">
              {formatTime(minutesRemaining)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              to finish
            </div>
          </div>
        )}

        {/* Total Reading Time */}
        {totalTimeMinutes > 0 && (
          <div className="flex flex-col items-center text-center">
            <BookOpen size={16} className="text-gray-500 dark:text-gray-400 mb-1" />
            <div className="text-sm font-semibold text-tt-primary dark:text-white">
              {formatTime(totalTimeMinutes)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              read
            </div>
          </div>
        )}

        {/* Reading Speed */}
        {averageWpm && (
          <div className="flex flex-col items-center text-center">
            <TrendingUp size={16} className="text-gray-500 dark:text-gray-400 mb-1" />
            <div className="text-sm font-semibold text-tt-primary dark:text-white">
              {averageWpm}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              wpm
            </div>
          </div>
        )}
      </div>

      {/* Words Info */}
      {totalWords && wordsRemaining && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
          {wordsRemaining.toLocaleString()} of {totalWords.toLocaleString()} words remaining
        </div>
      )}
    </div>
  );
}
