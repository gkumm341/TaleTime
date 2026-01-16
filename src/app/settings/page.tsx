'use client';

import { useState } from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Sidebar } from '@/components/Sidebar';
import { exportPreferences, importPreferences } from '@/lib/preferences';
import { getStorageInfo, getBrowserStorageEstimate, formatBytes } from '@/lib/storage-utils';
import { Save, RotateCcw, Download, Upload, HardDrive } from 'lucide-react';

export default function SettingsPage() {
  const { preferences, updatePreferences, resetToDefaults, loading } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Preferences are already saved via updatePreferences
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      await resetToDefaults();
      setMessage({ type: 'success', text: 'Settings reset to defaults' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportPreferences();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taletime-preferences.json';
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Preferences exported' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export preferences' });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importPreferences(text);
        window.location.reload(); // Reload to apply imported preferences
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to import preferences' });
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-gray-50 dark:bg-gray-900">
        <Sidebar activePage="settings" />
        <div className="relative z-10 ml-0 md:ml-72 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gray-50 dark:bg-gray-900">
      <Sidebar activePage="settings" />

      <div className="relative z-10 ml-0 md:ml-72 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your reading experience
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Reading Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Reading Preferences
          </h2>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex gap-3">
              {(['light', 'sepia', 'dark'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updatePreferences({ theme })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    preferences.theme === theme
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div
                    className={`w-full h-8 rounded mb-2 ${
                      theme === 'light'
                        ? 'bg-white border border-gray-300'
                        : theme === 'sepia'
                        ? 'bg-amber-50'
                        : 'bg-gray-900'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {theme}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Size: {preferences.fontSize}%
            </label>
            <input
              type="range"
              min="80"
              max="150"
              step="5"
              value={preferences.fontSize}
              onChange={(e) => updatePreferences({ fontSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Family
            </label>
            <div className="flex gap-3">
              {(['serif', 'sans-serif'] as const).map((family) => (
                <button
                  key={family}
                  onClick={() => updatePreferences({ fontFamily: family })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    preferences.fontFamily === family
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      family === 'serif' ? 'font-serif' : 'font-sans'
                    }`}
                  >
                    {family === 'serif' ? 'Serif (Traditional)' : 'Sans-serif (Modern)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Line Height: {preferences.lineHeight}
            </label>
            <input
              type="range"
              min="1.2"
              max="2.0"
              step="0.1"
              value={preferences.lineHeight}
              onChange={(e) => updatePreferences({ lineHeight: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Compact</span>
              <span>Spacious</span>
            </div>
          </div>

          {/* Reading Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reading Speed (Words Per Minute)
            </label>
            <input
              type="number"
              min="80"
              max="300"
              step="10"
              value={preferences.defaultWpm}
              onChange={(e) => updatePreferences({ defaultWpm: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Average adult reading speed is 200-250 WPM. Children typically read 80-160 WPM.
            </p>
          </div>
        </div>

        {/* App Behavior */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            App Behavior
          </h2>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Auto-save position</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Automatically save your reading position
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoSave}
              onChange={(e) => updatePreferences({ autoSave: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Show reading stats</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Display reading progress panel by default
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.showReadingStats}
              onChange={(e) => updatePreferences({ showReadingStats: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Storage Info */}
        <StorageInfoCard />

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Data Management
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              Export Preferences
            </button>

            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Upload size={18} />
              Import Preferences
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RotateCcw size={18} />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function StorageInfoCard() {
  const [storageInfo, setStorageInfo] = useState<{
    totalBooks: number;
    totalSizeMB: number;
  } | null>(null);
  const [browserEstimate, setBrowserEstimate] = useState<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null>(null);

  useState(() => {
    const loadInfo = async () => {
      const info = await getStorageInfo();
      const estimate = await getBrowserStorageEstimate();
      setStorageInfo({ totalBooks: info.totalBooks, totalSizeMB: info.totalSizeMB });
      setBrowserEstimate(estimate);
    };
    loadInfo();
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <HardDrive size={24} />
        Storage Usage
      </h2>

      {storageInfo && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Cached Books:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {storageInfo.totalBooks} ({storageInfo.totalSizeMB.toFixed(1)} MB)
            </span>
          </div>

          {browserEstimate && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Storage Used:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatBytes(browserEstimate.usage)} of {formatBytes(browserEstimate.quota)}
                </span>
              </div>

              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all"
                  style={{ width: `${Math.min(browserEstimate.percentUsed, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
