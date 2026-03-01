'use client';

import { useEffect, useCallback } from 'react';

interface CountdownOverlayProps {
  /** Current countdown value (e.g., 5, 4, 3, 2, 1) */
  value: number;
  /** The filename that was just auto-downloaded */
  downloadedFilename: string;
  /** Called each second with the decremented value */
  onCountdownTick: (newValue: number) => void;
  /** Called when the countdown reaches 0 */
  onCountdownComplete: () => void;
  /** Called when the user cancels (button, Escape, or backdrop click) */
  onCancel: () => void;
}

export default function CountdownOverlay({
  value,
  downloadedFilename,
  onCountdownTick,
  onCountdownComplete,
  onCancel,
}: CountdownOverlayProps) {

  // --- Countdown timer ---
  useEffect(() => {
    if (value <= 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      onCountdownTick(value - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, onCountdownTick, onCountdownComplete]);

  // --- Escape key handler ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleBackdropClick() {
    onCancel();
  }

  function handleContentClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Countdown to reset"
      data-testid="countdown-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />

      {/* Countdown content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 p-10 text-center cursor-default"
        onClick={handleContentClick}
        data-testid="countdown-content"
      >
        {/* Large countdown number with tick animation */}
        <div
          key={value}
          className="text-9xl font-bold leading-none select-none text-gray-800
                     animate-[countdown-tick_0.4s_ease-out]"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <p className="text-lg text-gray-600">
            Resetting for next upload...
          </p>
          <p className="text-sm font-medium text-green-600">
            ✓ Downloaded {downloadedFilename}
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg
                     bg-gray-200 hover:bg-gray-300
                     text-gray-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          autoFocus
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
          Cancel — View Results
        </button>

        <p className="text-xs text-gray-400">
          Press Escape or click anywhere outside to cancel
        </p>
      </div>
    </div>
  );
}
