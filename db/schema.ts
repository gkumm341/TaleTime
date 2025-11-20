import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const books = sqliteTable('books', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  authors: text('authors'),
  languages: text('languages'),
  subjects: text('subjects'),
  coverUrl: text('cover_url'),
  txtUrl: text('txt_url'),
  epubUrl: text('epub_url'),
  downloadCount: integer('download_count').default(0),
  updatedAt: integer('updated_at'),
});

export const estimates = sqliteTable('estimates', {
  bookId: integer('book_id').primaryKey().references(() => books.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  bytes: integer('bytes'),
  sampleBytes: integer('sample_bytes'),
  words: integer('words'),
  minutes: integer('minutes').notNull(),
  wpm: integer('wpm').notNull().default(160),
  computedAt: integer('computed_at').notNull(),
});

export const cacheManifest = sqliteTable('cache_manifest', {
  bookId: integer('book_id').primaryKey().references(() => books.id),
  epubBlobKey: text('epub_blob_key'),
  txtBlobKey: text('txt_blob_key'),
  lastChecked: integer('last_checked'),
});

export const readingSessions = sqliteTable('reading_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().default('default'), // For future multi-user support
  startCfi: text('start_cfi'),
  endCfi: text('end_cfi'),
  startTime: integer('start_time').notNull(), // Unix timestamp
  endTime: integer('end_time').notNull(), // Unix timestamp
  wordsRead: integer('words_read'),
  calculatedWpm: integer('calculated_wpm'),
  createdAt: integer('created_at').notNull(),
});

export const favorites = sqliteTable('favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().default('default'), // For future multi-user support
  addedAt: integer('added_at').notNull(), // Unix timestamp
  notes: text('notes'),
});

export const readingHistory = sqliteTable('reading_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().default('default'), // For future multi-user support
  lastReadAt: integer('last_read_at').notNull(), // Unix timestamp
  currentCfi: text('current_cfi'),
  progressPercent: integer('progress_percent').default(0), // 0-100
  totalReadingTime: integer('total_reading_time').default(0), // seconds
});
