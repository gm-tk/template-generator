'use client';

import { useCallback, useState } from 'react';
import type { BatchAnalysisResult } from '@/lib/analyzer/types';
import TemplatePreview from './TemplatePreview';
import TemplateCode from './TemplateCode';
import AnalysisSummary from './AnalysisSummary';

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
  const [copied, setCopied] = useState(false);

  const moduleCode = batchResult.moduleCode.code;
  const filename = moduleCode === '[MODULE_CODE]'
    ? 'template.html'
    : `${moduleCode.replace(/[^a-zA-Z0-9]/g, '_')}_template.html`;

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
  }, [generatedHTML, filename]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedHTML;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedHTML]);

  return (
    <div className="space-y-4">
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
          {copied ? 'Copied!' : 'Copy HTML'}
        </button>
        <div className="flex-1" />
        <button
          onClick={onStartOver}
          className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          Start Over
        </button>
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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

        <div className="pt-4">
          {activeTab === 'preview' && <TemplatePreview html={generatedHTML} />}
          {activeTab === 'code' && <TemplateCode html={generatedHTML} />}
          {activeTab === 'summary' && <AnalysisSummary batchResult={batchResult} />}
        </div>
      </div>
    </div>
  );
}
