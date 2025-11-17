// Age category mappings based on book subjects
export interface AgeCategory {
  id: string;
  label: string;
  keywords: string[];
  minAge?: number;
  maxAge?: number;
}

export const AGE_CATEGORIES: AgeCategory[] = [
  {
    id: 'early-readers',
    label: 'Early Readers (Ages 3-5)',
    minAge: 3,
    maxAge: 5,
    keywords: [
      'Nursery rhymes',
      'Picture books',
      'Board books',
      'Simple tales',
      'Very young',
    ],
  },
  {
    id: 'beginning-readers',
    label: 'Beginning Readers (Ages 6-8)',
    minAge: 6,
    maxAge: 8,
    keywords: [
      'Fairy tales',
      'Fables',
      'Children\'s stories',
      'Juvenile fiction',
      'Easy readers',
      'Short stories',
      'Animal stories',
    ],
  },
  {
    id: 'middle-grade',
    label: 'Middle Grade (Ages 9-12)',
    minAge: 9,
    maxAge: 12,
    keywords: [
      'Adventure',
      'Fantasy',
      'Bildungsromans',
      'Young adult',
      'Friendship',
      'Pirates',
      'Treasure',
      'Jungle',
      'Historical fiction',
    ],
  },
  {
    id: 'young-adult',
    label: 'Young Adult (Ages 13+)',
    minAge: 13,
    keywords: [
      'Young adult fiction',
      'Romance',
      'Coming of age',
      'Psychological',
      'Social issues',
      'Teen',
    ],
  },
];

export const DURATION_FILTERS = [
  { id: 'short', label: 'Short (< 10 min)', maxMinutes: 10 },
  { id: 'medium', label: 'Medium (10-25 min)', minMinutes: 10, maxMinutes: 25 },
  { id: 'long', label: 'Long (> 25 min)', minMinutes: 25 },
];

/**
 * Categorize a book based on its subjects
 */
export function categorizeBook(subjects: string[]): string[] {
  if (!subjects || subjects.length === 0) return [];
  
  const categories: Set<string> = new Set();
  const subjectsLower = subjects.map(s => s.toLowerCase());
  
  for (const category of AGE_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (subjectsLower.some(subject => subject.includes(keyword.toLowerCase()))) {
        categories.add(category.id);
        break;
      }
    }
  }
  
  // Default to beginning-readers if no category found
  if (categories.size === 0 && subjectsLower.some(s => 
    s.includes('fiction') || s.includes('stories') || s.includes('tale')
  )) {
    categories.add('beginning-readers');
  }
  
  return Array.from(categories);
}

/**
 * Get languages from books
 */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
];
