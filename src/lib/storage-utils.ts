/**
 * Storage Utilities
 * Calculate cache storage size and manage offline data
 */

import { keys, get } from 'idb-keyval';

export interface StorageInfo {
  totalBooks: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  books: Array<{
    id: number;
    sizeBytes: number;
    sizeMB: number;
  }>;
}

/**
 * Calculate total cache storage size from IndexedDB
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const allKeys = await keys();
    const epubKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('epub:')
    );

    const books: Array<{ id: number; sizeBytes: number; sizeMB: number }> = [];
    let totalSizeBytes = 0;

    for (const key of epubKeys) {
      const blob = await get<Blob>(key as string);
      if (blob && blob.size) {
        const bookId = parseInt((key as string).replace('epub:', ''));
        const sizeBytes = blob.size;
        const sizeMB = parseFloat((sizeBytes / (1024 * 1024)).toFixed(2));
        
        books.push({ id: bookId, sizeBytes, sizeMB });
        totalSizeBytes += sizeBytes;
      }
    }

    return {
      totalBooks: books.length,
      totalSizeBytes,
      totalSizeMB: parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2)),
      books,
    };
  } catch (error) {
    console.error('Failed to calculate storage info:', error);
    return {
      totalBooks: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      books: [],
    };
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if browser supports StorageManager API
 */
export async function getBrowserStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      
      return { usage, quota, percentUsed };
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      return null;
    }
  }
  return null;
}
