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
