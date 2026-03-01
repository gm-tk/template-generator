'use client';

import { useState, useEffect, useCallback } from 'react';

interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function HelpSection({ title, children, defaultOpen = false }: HelpSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left text-sm font-medium text-gray-800 hover:text-teal-700 transition-colors"
        aria-expanded={open}
      >
        {title}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 px-1 text-sm text-gray-600 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function HelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:text-teal-600 hover:border-teal-400 transition-colors"
        aria-label="Open help"
        title="Help"
      >
        <span className="text-sm font-bold">?</span>
      </button>

      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Help panel"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Help</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close help"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <HelpSection title="Getting Started" defaultOpen={true}>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Upload 4&#8211;30 HTML lesson pages from a single Te Kura module</li>
                <li>Set the consensus threshold (default 50% &#8212; elements in more than half the files are included)</li>
                <li>Click &ldquo;Run Analysis&rdquo; to generate a template</li>
                <li>Download the generated template HTML file</li>
              </ol>
            </HelpSection>

            <HelpSection title="What This Tool Does">
              <p>
                Analyzes uploaded Te Kura HTML files for shared structural patterns. It identifies which elements
                (headings, paragraphs, activities, alerts, etc.) appear consistently across your files.
              </p>
              <p>
                Generates a clean template file with the consensus structure and lorem ipsum placeholder text.
                The template preserves the correct CSS classes and script references so it renders correctly
                when opened in a browser on the Te Kura network.
              </p>
            </HelpSection>

            <HelpSection title="Understanding the Consensus Threshold">
              <p>The threshold determines what percentage of files must contain a structural element for it to be included in the template.</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>At 50% (default):</strong> an element must appear in more than half your files</li>
                <li><strong>At 100%:</strong> only elements in ALL files are included</li>
                <li>Lower thresholds include more elements; higher thresholds are stricter</li>
              </ul>
              <p className="text-gray-500 italic">Tip: Start with 50% and adjust based on results.</p>
            </HelpSection>

            <HelpSection title="Batch Mode">
              <p>Enable Batch Mode to streamline generating templates for multiple modules in a row.</p>
              <p>
                When enabled: click &ldquo;Analyze &amp; Download&rdquo; &#8594; template auto-downloads &#8594; a countdown
                timer appears &#8594; the page resets ready for the next upload.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set the countdown duration to your preference (1&#8211;30 seconds, default 5)</li>
                <li>Cancel the countdown at any time to inspect results:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li>Click the Cancel button</li>
                    <li>Press Escape</li>
                    <li>Click anywhere on the faded background</li>
                  </ul>
                </li>
                <li>Your Batch Mode setting, countdown duration, and threshold all persist between sessions</li>
              </ul>
            </HelpSection>

            <HelpSection title="Component Exclusion Registry">
              <p>
                Te Kura&rsquo;s interactive components (quizzes, drag-and-drop, speech bubbles, etc.) are
                excluded from analysis. Only the page skeleton is analyzed: headings, paragraphs, activity
                wrappers, alerts, images, etc.
              </p>
              <p>
                Advanced users can modify the exclusion list in the Component Exclusion Registry panel at the
                bottom of the page.
              </p>
            </HelpSection>

            <HelpSection title="Tips">
              <ul className="list-disc list-inside space-y-1.5">
                <li>Upload at least 4 files for meaningful consensus analysis</li>
                <li>Include a mix of lesson pages (not just the first page) for best results</li>
                <li>The generated template is a starting point &#8212; download it and customise as needed</li>
                <li>Use Batch Mode when processing many modules &#8212; it saves significant time</li>
              </ul>
            </HelpSection>
          </div>
        </div>
      </div>
    </>
  );
}
