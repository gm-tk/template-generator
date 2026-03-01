'use client';

import { useCallback, useMemo, useState } from 'react';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';

interface ExclusionRegistryPanelProps {
  registry: Set<string>;
  onRegistryChange: (registry: Set<string>) => void;
}

export default function ExclusionRegistryPanel({ registry, onRegistryChange }: ExclusionRegistryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newClass, setNewClass] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const sortedEntries = useMemo(
    () => Array.from(registry).sort((a, b) => a.localeCompare(b)),
    [registry]
  );

  const filteredEntries = useMemo(
    () => search
      ? sortedEntries.filter(entry => entry.toLowerCase().includes(search.toLowerCase()))
      : sortedEntries,
    [sortedEntries, search]
  );

  const isModified = useMemo(() => {
    if (registry.size !== COMPONENT_EXCLUSION_REGISTRY.size) return true;
    for (const cls of registry) {
      if (!COMPONENT_EXCLUSION_REGISTRY.has(cls)) return true;
    }
    return false;
  }, [registry]);

  const modificationSummary = useMemo(() => {
    if (!isModified) return null;
    let added = 0;
    let removed = 0;
    for (const cls of registry) {
      if (!COMPONENT_EXCLUSION_REGISTRY.has(cls)) added++;
    }
    for (const cls of COMPONENT_EXCLUSION_REGISTRY) {
      if (!registry.has(cls)) removed++;
    }
    return { added, removed };
  }, [registry, isModified]);

  const handleAddClass = useCallback(() => {
    const trimmed = newClass.trim();
    setValidationError(null);

    if (!trimmed) {
      setValidationError('Class name cannot be empty.');
      return;
    }
    if (/\s/.test(trimmed)) {
      setValidationError('Class name must not contain whitespace.');
      return;
    }
    if (registry.has(trimmed)) {
      setValidationError('Class already exists in registry.');
      return;
    }

    const updated = new Set(registry);
    updated.add(trimmed);
    onRegistryChange(updated);
    setNewClass('');
  }, [newClass, registry, onRegistryChange]);

  const handleRemoveClass = useCallback((cls: string) => {
    const updated = new Set(registry);
    updated.delete(cls);
    onRegistryChange(updated);
  }, [registry, onRegistryChange]);

  const handleReset = useCallback(() => {
    onRegistryChange(new Set(COMPONENT_EXCLUSION_REGISTRY));
  }, [onRegistryChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddClass();
    }
  }, [handleAddClass]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="exclusion-registry-content"
      >
        <span className="text-sm font-medium text-gray-700">
          Component Exclusion Registry
          <span className="ml-1.5 text-xs text-gray-400 font-normal">
            ({registry.size} classes)
          </span>
          {isModified && modificationSummary && (
            <span className="ml-2 text-xs text-amber-600 font-normal">
              Modified
              {modificationSummary.added > 0 && ` +${modificationSummary.added}`}
              {modificationSummary.removed > 0 && ` -${modificationSummary.removed}`}
            </span>
          )}
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
        <div id="exclusion-registry-content" className="border-t border-gray-200 px-4 py-3 space-y-3">
          <p className="text-xs text-gray-400">
            Elements with these CSS classes are excluded from structural analysis. Add or remove classes below — changes apply to the next analysis run.
          </p>

          {/* Add class input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add class name..."
              value={newClass}
              onChange={(e) => { setNewClass(e.target.value); setValidationError(null); }}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              aria-label="New class name to add to exclusion registry"
            />
            <button
              onClick={handleAddClass}
              className="px-3 py-1.5 text-sm font-medium bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
            >
              Add
            </button>
            {isModified && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {validationError && (
            <p className="text-xs text-red-600" role="alert">{validationError}</p>
          )}

          {/* Search/filter */}
          <input
            type="text"
            placeholder="Filter classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
            aria-label="Filter exclusion registry classes"
          />

          <div className="max-h-60 overflow-y-auto" aria-live="polite">
            <div className="flex flex-wrap gap-1.5">
              {filteredEntries.map((entry) => (
                <span
                  key={entry}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono group hover:bg-gray-200 transition-colors"
                >
                  {entry}
                  <button
                    onClick={() => handleRemoveClass(entry)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${entry} from exclusion registry`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
