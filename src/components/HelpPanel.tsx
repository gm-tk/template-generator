'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HelpPanelProps {
  onClose: () => void;
}

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: (
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
        <li>Upload 4&ndash;30 HTML lesson pages from a single Te Kura module</li>
        <li>Set the consensus threshold (default 50% &mdash; elements in more than half the files are included)</li>
        <li>Click &ldquo;Run Analysis&rdquo; to generate a template</li>
        <li>Download the generated template HTML file</li>
      </ol>
    ),
  },
  {
    id: 'what-it-does',
    title: 'What This Tool Does',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
        <li>Analyzes uploaded Te Kura HTML files for shared structural patterns</li>
        <li>Identifies which elements (headings, paragraphs, activities, alerts, etc.) appear consistently across your files</li>
        <li>Generates a clean template file with the consensus structure and lorem ipsum placeholder text</li>
        <li>The template preserves the correct CSS classes and script references so it renders correctly when opened in a browser on the Te Kura network</li>
      </ul>
    ),
  },
  {
    id: 'threshold',
    title: 'Understanding the Consensus Threshold',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
        <li>The threshold determines what percentage of files must contain a structural element for it to be included in the template</li>
        <li>At 50% (default): an element must appear in more than half your files</li>
        <li>At 100%: only elements in ALL files are included</li>
        <li>Lower thresholds include more elements; higher thresholds are stricter</li>
        <li>Tip: Start with 50% and adjust based on results</li>
      </ul>
    ),
  },
  {
    id: 'batch-mode',
    title: 'Batch Mode',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
        <li>Enable Batch Mode to streamline generating templates for multiple modules in a row</li>
        <li>When enabled: click &ldquo;Analyze &amp; Download&rdquo; &rarr; template auto-downloads &rarr; a countdown timer appears &rarr; the page resets ready for the next upload</li>
        <li>Set the countdown duration to your preference (1&ndash;30 seconds, default 5)</li>
        <li>Cancel the countdown at any time to inspect results &mdash; click the Cancel button, press Escape, or click anywhere on the faded background</li>
        <li>Your Batch Mode setting, countdown duration, and threshold all persist between sessions</li>
      </ul>
    ),
  },
  {
    id: 'exclusion-registry',
    title: 'Component Exclusion Registry',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
        <li>Te Kura&rsquo;s interactive components (quizzes, drag-and-drop, speech bubbles, etc.) are excluded from analysis</li>
        <li>Only the page skeleton is analyzed: headings, paragraphs, activity wrappers, alerts, images, etc.</li>
        <li>Advanced users can modify the exclusion list in the Component Exclusion Registry panel</li>
      </ul>
    ),
  },
  {
    id: 'tips',
    title: 'Tips',
    content: (
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
        <li>Upload at least 4 files for meaningful consensus analysis</li>
        <li>Include a mix of lesson pages (not just the first page) for best results</li>
        <li>The generated template is a starting point &mdash; download it and customise as needed</li>
        <li>Use Batch Mode when processing many modules &mdash; it saves significant time</li>
      </ul>
    ),
  },
];

export default function HelpPanel({ onClose }: HelpPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['getting-started']));
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel — slide in from right */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl
                   overflow-y-auto border-l border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="Help"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Help</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close help"
            autoFocus
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="px-5 py-4 space-y-1">
          {SECTIONS.map(section => (
            <div key={section.id} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between py-3 text-left
                           text-sm font-medium text-gray-800 hover:text-teal-700 transition-colors"
                aria-expanded={expanded.has(section.id)}
                aria-controls={`help-section-${section.id}`}
              >
                {section.title}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expanded.has(section.id) ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {expanded.has(section.id) && (
                <div id={`help-section-${section.id}`} className="pb-3">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
