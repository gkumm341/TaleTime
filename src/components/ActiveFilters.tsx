'use client';

import { X } from 'lucide-react';
import { AGE_CATEGORIES, DURATION_FILTERS, LANGUAGES } from '@/lib/age-categories';
import type { FilterState } from './BookFilters';

interface ActiveFiltersProps {
  filters: FilterState;
  onRemove: (type: 'age' | 'duration' | 'language' | 'offline', value: string) => void;
}

export function ActiveFilters({ filters, onRemove }: ActiveFiltersProps) {
  const hasActiveFilters = 
    filters.ageCategories.length > 0 || 
    filters.durations.length > 0 || 
    filters.languages.length > 0 ||
    filters.offlineOnly;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.ageCategories.map(categoryId => {
        const category = AGE_CATEGORIES.find(c => c.id === categoryId);
        if (!category) return null;
        
        return (
          <span
            key={`age-${categoryId}`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          >
            {category.label}
            <button
              onClick={() => onRemove('age', categoryId)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              aria-label={`Remove ${category.label} filter`}
            >
              <X size={14} />
            </button>
          </span>
        );
      })}

      {filters.durations.map(durationId => {
        const duration = DURATION_FILTERS.find(d => d.id === durationId);
        if (!duration) return null;
        
        return (
          <span
            key={`duration-${durationId}`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
          >
            {duration.label}
            <button
              onClick={() => onRemove('duration', durationId)}
              className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
              aria-label={`Remove ${duration.label} filter`}
            >
              <X size={14} />
            </button>
          </span>
        );
      })}

      {filters.languages.map(languageCode => {
        const language = LANGUAGES.find(l => l.code === languageCode);
        if (!language) return null;
        
        return (
          <span
            key={`language-${languageCode}`}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
          >
            {language.label}
            <button
              onClick={() => onRemove('language', languageCode)}
              className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
              aria-label={`Remove ${language.label} filter`}
            >
              <X size={14} />
            </button>
          </span>
        );
      })}

      {filters.offlineOnly && (
        <span
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
        >
          📥 Available offline
          <button
            onClick={() => onRemove('offline', '')}
            className="hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full p-0.5"
            aria-label="Remove offline filter"
          >
            <X size={14} />
          </button>
        </span>
      )}
    </div>
  );
}
