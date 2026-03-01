'use client';

interface FileListProps {
  files: File[];
  onFileRemoved: (index: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileList({ files, onFileRemoved }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">
          {files.length} {files.length === 1 ? 'file' : 'files'} ready for analysis
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {files.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 group">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-sm text-gray-800 truncate">{file.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatFileSize(file.size)}</span>
            </div>
            <button
              onClick={() => onFileRemoved(index)}
              className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
              title={`Remove ${file.name}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
