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
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 p-1">
        <HardDrive className="w-4 h-4 animate-pulse" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!storageInfo || storageInfo.totalBooks === 0) {
    return null;
  }

  return (
    <div className="p-1">
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        <div>
          <h3 className="text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Offline Storage
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
            <Download className="w-3 h-3" />
            <span>
              {storageInfo.totalBooks} {storageInfo.totalBooks === 1 ? 'book' : 'books'}
            </span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span>{storageInfo.totalSizeMB.toFixed(1)} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
