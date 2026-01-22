import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const PURCHASE_SOURCES = ['web', 'ios_iap', 'android_iap'] as const;
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

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

export const bookRatings = sqliteTable(
  'book_ratings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookId: integer('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().default('default'), // For future multi-user support
    rating: integer('rating').notNull(), // 1-5
    updatedAt: integer('updated_at').notNull(), // Unix timestamp (ms)
  },
  (t) => ({
    userBookUnique: uniqueIndex('book_ratings_user_book_unique').on(t.userId, t.bookId),
  })
);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // Payment/subscription flag for MVP; later replace with a proper subscriptions table.
  isPaid: integer('is_paid').notNull().default(0),
  createdAt: integer('created_at').notNull(), // Unix timestamp
});

export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(), // Unix timestamp
  expiresAt: integer('expires_at').notNull(), // Unix timestamp
});

// Provider-agnostic premium entitlements.
// Verify endpoints (web/ios/android) should insert purchase events and upsert entitlements.
export const premiumEntitlements = sqliteTable('premium_entitlements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purchaseSource: text('purchase_source', { enum: PURCHASE_SOURCES }).notNull(),
  plan: text('plan').notNull(),
  expiresAt: integer('expires_at').notNull(), // Unix timestamp (ms)
  providerRef: text('provider_ref'), // e.g., Stripe subscription id / platform transaction id
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Audit trail of purchase/verification events (useful for later iOS/Android receipt verification).
export const premiumPurchaseEvents = sqliteTable('premium_purchase_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purchaseSource: text('purchase_source', { enum: PURCHASE_SOURCES }).notNull(),
  plan: text('plan').notNull(),
  expiresAt: integer('expires_at').notNull(),
  providerTransactionId: text('provider_transaction_id'),
  rawReceipt: text('raw_receipt'),
  createdAt: integer('created_at').notNull(),
});
