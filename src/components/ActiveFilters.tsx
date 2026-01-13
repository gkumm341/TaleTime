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
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#FF8B7B]/20 dark:bg-[#FF8B7B]/20 text-[#3E3E3E] dark:text-[#FF8B7B]"
          >
            {category.label}
            <button
              onClick={() => onRemove('age', categoryId)}
              className="hover:bg-[#FF8B7B]/30 dark:hover:bg-[#FF8B7B]/30 rounded-full p-0.5"
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
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#6BA8A9]/20 dark:bg-[#6BA8A9]/20 text-[#3E3E3E] dark:text-[#6BA8A9]"
          >
            {duration.label}
            <button
              onClick={() => onRemove('duration', durationId)}
              className="hover:bg-[#6BA8A9]/30 dark:hover:bg-[#6BA8A9]/30 rounded-full p-0.5"
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
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#B5CDA3]/20 dark:bg-[#B5CDA3]/20 text-[#3E3E3E] dark:text-[#B5CDA3]"
          >
            {language.label}
            <button
              onClick={() => onRemove('language', languageCode)}
              className="hover:bg-[#B5CDA3]/30 dark:hover:bg-[#B5CDA3]/30 rounded-full p-0.5"
              aria-label={`Remove ${language.label} filter`}
            >
              <X size={14} />
            </button>
          </span>
        );
      })}

      {filters.offlineOnly && (
        <span
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#6BA8A9]/20 dark:bg-[#6BA8A9]/20 text-[#3E3E3E] dark:text-[#6BA8A9]"
        >
          📥 Available offline
          <button
            onClick={() => onRemove('offline', '')}
            className="hover:bg-[#6BA8A9]/30 dark:hover:bg-[#6BA8A9]/30 rounded-full p-0.5"
            aria-label="Remove offline filter"
          >
            <X size={14} />
          </button>
        </span>
      )}
    </div>
  );
}
