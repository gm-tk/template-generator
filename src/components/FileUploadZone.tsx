'use client';

import { useCallback, useRef, useState } from 'react';

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  existingFilenames: Set<string>;
  compact?: boolean;
  currentFileCount?: number;
  onNotification?: (message: string) => void;
}

const MAX_FILES = 100;

export default function FileUploadZone({ onFilesAdded, existingFilenames, compact, currentFileCount = 0, onNotification }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
    onNotification?.(msg);
  }, [onNotification]);

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const htmlFiles: File[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.html')) {
        if (existingFilenames.has(file.name)) {
          skipped.push(`${file.name} (duplicate)`);
        } else {
          htmlFiles.push(file);
        }
      } else {
        skipped.push(`${file.name} (not .html)`);
      }
    }

    // Check 100-file hard limit
    const totalAfterAdd = currentFileCount + htmlFiles.length;
    if (totalAfterAdd > MAX_FILES) {
      showNotification(`Maximum ${MAX_FILES} files supported. Please reduce your selection.`);
      return;
    }

    if (skipped.length > 0) {
      showNotification(`Skipped: ${skipped.join(', ')}`);
    }

    if (htmlFiles.length > 0) {
      onFilesAdded(htmlFiles);
    }
  }, [onFilesAdded, existingFilenames, currentFileCount, showNotification]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  }, [processFiles]);

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Upload HTML files for analysis"
        className={`
          border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragOver
            ? 'border-teal-500 bg-teal-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${compact ? 'px-4 py-3' : 'px-8 py-12'}
        `}
      >
        <div className={`text-center ${compact ? '' : 'space-y-2'}`}>
          {!compact && (
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
          <p className={compact ? 'text-sm text-gray-600' : 'text-base text-gray-700'}>
            {isDragOver
              ? 'Drop files here'
              : compact
                ? 'Drop more HTML files here, or click to browse'
                : 'Drop HTML files here, or click to browse'}
          </p>
          {!compact && (
            <p className="text-xs text-gray-400">Only .html files are accepted</p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".html"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {notification && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700" role="alert">
          {notification}
        </div>
      )}
    </div>
  );
}
