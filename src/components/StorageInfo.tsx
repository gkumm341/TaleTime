'use client';

import { useEffect, useState } from 'react';
import { HardDrive, Download } from 'lucide-react';
import { getStorageInfo, getBrowserStorageEstimate, formatBytes } from '@/lib/storage-utils';

export function StorageInfo() {
  const [storageInfo, setStorageInfo] = useState<{
    totalBooks: number;
    totalSizeMB: number;
  } | null>(null);
  const [browserEstimate, setBrowserEstimate] = useState<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageInfo = async () => {
      setLoading(true);
      
      try {
        const info = await getStorageInfo();
        setStorageInfo({
          totalBooks: info.totalBooks,
          totalSizeMB: info.totalSizeMB,
        });

        const estimate = await getBrowserStorageEstimate();
        setBrowserEstimate(estimate);
      } catch (error) {
        console.error('Failed to load storage info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStorageInfo();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <HardDrive className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading storage info...</span>
        </div>
      </div>
    );
  }

  if (!storageInfo || storageInfo.totalBooks === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Offline Storage
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <Download className="w-4 h-4" />
              <span>
                {storageInfo.totalBooks} {storageInfo.totalBooks === 1 ? 'book' : 'books'}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span>{storageInfo.totalSizeMB.toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        {browserEstimate && (
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            <div>Total used: {formatBytes(browserEstimate.usage)}</div>
            <div>of {formatBytes(browserEstimate.quota)}</div>
            <div className="mt-1">
              <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 dark:bg-green-400 rounded-full"
                  style={{ width: `${Math.min(browserEstimate.percentUsed, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
