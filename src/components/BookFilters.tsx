'use client';

import { useState } from 'react';
import { AGE_CATEGORIES, DURATION_FILTERS, LANGUAGES } from '@/lib/age-categories';
import { X } from 'lucide-react';

export interface FilterState {
  ageCategories: string[];
  durations: string[];
  languages: string[];
  offlineOnly: boolean;
}

interface BookFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function BookFilters({ filters, onChange }: BookFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAgeCategory = (categoryId: string) => {
    const newCategories = filters.ageCategories.includes(categoryId)
      ? filters.ageCategories.filter(id => id !== categoryId)
      : [...filters.ageCategories, categoryId];
    
    onChange({ ...filters, ageCategories: newCategories });
  };

  const toggleDuration = (durationId: string) => {
    const newDurations = filters.durations.includes(durationId)
      ? filters.durations.filter(id => id !== durationId)
      : [...filters.durations, durationId];
    
    onChange({ ...filters, durations: newDurations });
  };

  const toggleLanguage = (languageCode: string) => {
    const newLanguages = filters.languages.includes(languageCode)
      ? filters.languages.filter(code => code !== languageCode)
      : [...filters.languages, languageCode];
    
    onChange({ ...filters, languages: newLanguages });
  };

  const clearAll = () => {
    onChange({ ageCategories: [], durations: [], languages: [], offlineOnly: false });
  };

  const hasActiveFilters = 
    filters.ageCategories.length > 0 || 
    filters.durations.length > 0 || 
    filters.languages.length > 0 ||
    filters.offlineOnly;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-bold text-[#FF8B7B] hover:text-[#6BA8A9] transition-all flex items-center gap-2 group"
        >
          <span className="text-[#6BA8A9] text-base group-hover:scale-110 transition-transform">{isExpanded ? '▼' : '▶'}</span>
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FF8B7B] text-white rounded-full shadow-md animate-pulse">
              {filters.ageCategories.length + filters.durations.length + filters.languages.length + (filters.offlineOnly ? 1 : 0)}
            </span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-white bg-[#FF8B7B] hover:bg-[#6BA8A9] flex items-center gap-1 transition-all px-3 py-1.5 rounded-full hover:shadow-lg transform hover:scale-105"
          >
            <X size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Offline Only */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg bg-[#6BA8A9]/5 dark:from-[#6BA8A9]/10 dark:to-[#6BA8A9]/5 border border-[#6BA8A9]/20 dark:border-[#6BA8A9]/20 hover:border-[#6BA8A9]/40 dark:hover:border-[#6BA8A9]/30 transition-all hover:shadow-md">
              <input
                type="checkbox"
                checked={filters.offlineOnly}
                onChange={(e) => onChange({ ...filters, offlineOnly: e.target.checked })}
                className="rounded border-[#6BA8A9] text-[#6BA8A9] focus:ring-[#6BA8A9] focus:ring-offset-0 w-5 h-5"
              />
              <span className="text-sm font-semibold text-[#6BA8A9] transition-all flex items-center gap-2">
                <span className="text-base">📥</span>
                Available offline only
              </span>
            </label>
          </div>

          {/* Age Categories */}
          <div>
            <h3 className="text-xs font-bold text-[#FF8B7B] mb-2 flex items-center gap-1.5">
              <span className="text-sm">👶</span>
              Age Range
            </h3>
            <div className="space-y-1">
              {AGE_CATEGORIES.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer group px-3 py-2 rounded-lg hover:bg-[#B5CDA3]/10 dark:hover:from-[#B5CDA3]/20 dark:hover:to-[#B5CDA3]/10 transition-all border border-transparent hover:border-[#B5CDA3]/50 dark:hover:border-[#B5CDA3]/50 hover:shadow-sm">
                  <input
                    type="checkbox"
                    checked={filters.ageCategories.includes(category.id)}
                    onChange={() => toggleAgeCategory(category.id)}
                    className="rounded border-[#B5CDA3] text-[#6BA8A9] focus:ring-[#6BA8A9] focus:ring-offset-0 w-4 h-4 transition-all"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#6BA8A9] dark:group-hover:text-[#6BA8A9] transition-colors">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-xs font-bold text-[#6BA8A9] mb-2 flex items-center gap-1.5">
              <span className="text-sm">⏰</span>
              Reading Time
            </h3>
            <div className="space-y-1">
              {DURATION_FILTERS.map(duration => (
                <label key={duration.id} className="flex items-center gap-2 cursor-pointer group px-3 py-2 rounded-lg hover:bg-[#B5CDA3]/10 dark:hover:from-[#B5CDA3]/20 dark:hover:to-[#B5CDA3]/10 transition-all border border-transparent hover:border-[#B5CDA3]/50 dark:hover:border-[#B5CDA3]/50 hover:shadow-sm">
                  <input
                    type="checkbox"
                    checked={filters.durations.includes(duration.id)}
                    onChange={() => toggleDuration(duration.id)}
                    className="rounded border-[#B5CDA3] text-[#6BA8A9] focus:ring-[#6BA8A9] focus:ring-offset-0 w-4 h-4 transition-all"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#6BA8A9] dark:group-hover:text-[#6BA8A9] transition-colors">
                    {duration.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h3 className="text-xs font-bold text-[#B5CDA3] mb-2 flex items-center gap-1.5">
              <span className="text-sm">🌍</span>
              Language
            </h3>
            <div className="space-y-1">
              {LANGUAGES.map(language => (
                <label key={language.code} className="flex items-center gap-2 cursor-pointer group px-3 py-2 rounded-lg hover:bg-[#B5CDA3]/10 dark:hover:from-[#B5CDA3]/20 dark:hover:to-[#B5CDA3]/10 transition-all border border-transparent hover:border-[#B5CDA3]/50 dark:hover:border-[#B5CDA3]/50 hover:shadow-sm">
                  <input
                    type="checkbox"
                    checked={filters.languages.includes(language.code)}
                    onChange={() => toggleLanguage(language.code)}
                    className="rounded border-[#B5CDA3] text-[#6BA8A9] focus:ring-[#6BA8A9] focus:ring-offset-0 w-4 h-4 transition-all"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#6BA8A9] dark:group-hover:text-[#6BA8A9] transition-colors">
                    {language.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
