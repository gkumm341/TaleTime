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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          {isExpanded ? '▼' : '▶'} Filters
          {hasActiveFilters && (
            <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
              ({filters.ageCategories.length + filters.durations.length + filters.languages.length + (filters.offlineOnly ? 1 : 0)} active)
            </span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X size={16} />
            Clear all
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Offline Only */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.offlineOnly}
                onChange={(e) => onChange({ ...filters, offlineOnly: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📥 Available offline only
              </span>
            </label>
          </div>

          {/* Age Categories */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Age Range
            </h3>
            <div className="space-y-2">
              {AGE_CATEGORIES.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.ageCategories.includes(category.id)}
                    onChange={() => toggleAgeCategory(category.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reading Time
            </h3>
            <div className="space-y-2">
              {DURATION_FILTERS.map(duration => (
                <label key={duration.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.durations.includes(duration.id)}
                    onChange={() => toggleDuration(duration.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {duration.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </h3>
            <div className="space-y-2">
              {LANGUAGES.map(language => (
                <label key={language.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.languages.includes(language.code)}
                    onChange={() => toggleLanguage(language.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
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
