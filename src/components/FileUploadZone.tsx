'use client';

import { useCallback, useRef, useState } from 'react';

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  existingFilenames: Set<string>;
  compact?: boolean;
}

export default function FileUploadZone({ onFilesAdded, existingFilenames, compact }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    if (skipped.length > 0) {
      setNotification(`Skipped: ${skipped.join(', ')}`);
      setTimeout(() => setNotification(null), 4000);
    }

    if (htmlFiles.length > 0) {
      onFilesAdded(htmlFiles);
    }
  }, [onFilesAdded, existingFilenames]);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  }, [processFiles]);

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
            {compact ? 'Drop more HTML files here, or click to browse' : 'Drop HTML files here, or click to browse'}
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
        />
      </div>

      {notification && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          {notification}
        </div>
      )}
    </div>
  );
}
