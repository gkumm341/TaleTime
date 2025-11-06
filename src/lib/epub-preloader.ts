'use client';

import { get, set } from 'idb-keyval';

// Cache for tracking which books are being preloaded
const preloadingBooks = new Set<number>();

/**
 * Pre-download an EPUB in the background for faster loading
 * @param bookId - The book ID
 * @param epubUrl - The EPUB URL from the book metadata
 */
export async function preloadEpub(bookId: number, epubUrl: string) {
  // Skip if already preloading or cached
  if (preloadingBooks.has(bookId)) {
    return;
  }

  try {
    // Check if already cached
    const cached = await get(`epub:${bookId}`);
    if (cached) {
      console.log(`Book ${bookId} already cached`);
      return;
    }

    // Mark as preloading
    preloadingBooks.add(bookId);
    console.log(`Pre-downloading book ${bookId} in background...`);

    // Download via proxy
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(epubUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to preload: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Cache it
    await set(`epub:${bookId}`, blob);
    console.log(`Book ${bookId} pre-downloaded and cached`);

  } catch (error) {
    console.error(`Failed to preload book ${bookId}:`, error);
  } finally {
    preloadingBooks.delete(bookId);
  }
}

/**
 * Check if an EPUB is already cached
 */
export async function isEpubCached(bookId: number): Promise<boolean> {
  try {
    const cached = await get(`epub:${bookId}`);
    return !!cached;
  } catch {
    return false;
  }
}

/**
 * Pre-fetch book metadata to warm up the cache
 */
export async function prefetchBookMetadata(bookId: number) {
  try {
    await fetch(`/api/catalog?bookId=${bookId}`);
  } catch {
    // Silently fail - this is just a cache warmer
  }
}
