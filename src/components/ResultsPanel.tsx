'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BatchAnalysisResult } from '@/lib/analyzer/types';
import TemplatePreview from './TemplatePreview';
import TemplateCode from './TemplateCode';
import AnalysisSummary from './AnalysisSummary';
import { useToast } from './Toaster';

interface ResultsPanelProps {
  batchResult: BatchAnalysisResult;
  generatedHTML: string;
  onStartOver: () => void;
}

type TabKey = 'preview' | 'code' | 'summary';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'code', label: 'Code' },
  { key: 'summary', label: 'Summary' },
];

export default function ResultsPanel({ batchResult, generatedHTML, onStartOver }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('preview');
  const { addToast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moduleCode = batchResult.moduleCode.code;
  const filename = moduleCode === '[MODULE_CODE]'
    ? 'template.html'
    : `${moduleCode.replace(/[^a-zA-Z0-9]/g, '_')}_template.html`;

  useEffect(() => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${filename}`, 'success');
  }, [generatedHTML, filename, addToast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
      addToast('HTML copied to clipboard', 'success');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedHTML;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      addToast('HTML copied to clipboard', 'success');
    }
  }, [generatedHTML, addToast]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(TABS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }, []);

  return (
    <div ref={resultsRef} className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          Download Template
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Copy HTML
        </button>
        <div className="flex-1" />
        <button
          onClick={onStartOver}
          className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Tabs with proper ARIA pattern */}
      <div>
        <div className="border-b border-gray-200" role="tablist" aria-label="Results view">
          <nav className="flex gap-0">
            {TABS.map((tab, index) => (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[index] = el; }}
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={activeTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                tabIndex={activeTab === tab.key ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`
                  px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${activeTab === tab.key
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {TABS.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            id={`tabpanel-${tab.key}`}
            aria-labelledby={`tab-${tab.key}`}
            hidden={activeTab !== tab.key}
            className="pt-4"
          >
            {activeTab === tab.key && (
              <>
                {tab.key === 'preview' && <TemplatePreview html={generatedHTML} />}
                {tab.key === 'code' && <TemplateCode html={generatedHTML} />}
                {tab.key === 'summary' && <AnalysisSummary batchResult={batchResult} />}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
