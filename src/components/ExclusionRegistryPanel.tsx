'use client';

import { useMemo, useState } from 'react';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';

export default function ExclusionRegistryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sortedEntries = useMemo(
    () => Array.from(COMPONENT_EXCLUSION_REGISTRY).sort((a, b) => a.localeCompare(b)),
    []
  );

  const filteredEntries = useMemo(
    () => search
      ? sortedEntries.filter(entry => entry.toLowerCase().includes(search.toLowerCase()))
      : sortedEntries,
    [sortedEntries, search]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Component Exclusion Registry
          <span className="ml-1.5 text-xs text-gray-400 font-normal">
            ({COMPONENT_EXCLUSION_REGISTRY.size} classes)
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          <p className="text-xs text-gray-400">
            Elements with these CSS classes are excluded from structural analysis. To modify permanently, edit{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">src/lib/analyzer/componentExclusionRegistry.ts</code>
          </p>

          <input
            type="text"
            placeholder="Filter classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
          />

          <div className="max-h-60 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {filteredEntries.map((entry) => (
                <span
                  key={entry}
                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono"
                >
                  {entry}
                </span>
              ))}
            </div>
            {filteredEntries.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No matching classes found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
