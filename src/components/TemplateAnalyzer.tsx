'use client';

import { useCallback, useMemo, useState } from 'react';
import { analyzeFiles } from '@/lib/analyzer/pipeline';
import { generateTemplate } from '@/lib/analyzer/templateGenerator';
import type { BatchAnalysisResult } from '@/lib/analyzer/types';
import FileUploadZone from './FileUploadZone';
import FileList from './FileList';
import AnalysisControls from './AnalysisControls';
import ProgressIndicator, { type AnalysisProgress } from './ProgressIndicator';
import ResultsPanel from './ResultsPanel';
import ExclusionRegistryPanel from './ExclusionRegistryPanel';

type AppPhase = 'upload' | 'ready' | 'analyzing' | 'results' | 'error';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function TemplateAnalyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState<number>(50);
  const [phase, setPhase] = useState<AppPhase>('upload');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(null);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingFilenames = useMemo(
    () => new Set(files.map(f => f.name)),
    [files]
  );

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const unique = newFiles.filter(f => !existing.has(f.name));
      return [...prev, ...unique];
    });
    if (phase === 'upload') {
      setPhase('ready');
    }
  }, [phase]);

  const handleFileRemoved = useCallback((index: number) => {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setPhase('upload');
        setBatchResult(null);
        setGeneratedHTML(null);
      }
      return next;
    });
  }, []);

  const runAnalysis = useCallback(async () => {
    setPhase('analyzing');
    setError(null);
    setBatchResult(null);
    setGeneratedHTML(null);

    try {
      // Step 1: Read all files
      setProgress({ step: 'reading', current: 0, total: files.length });
      const fileInputs: Array<{ rawHTML: string; filename: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const rawHTML = await readFileAsText(files[i]);
        fileInputs.push({ rawHTML, filename: files[i].name });
        setProgress({ step: 'reading', current: i + 1, total: files.length });
      }

      // Step 2: Run analysis pipeline
      setProgress({ step: 'analyzing', current: 0, total: fileInputs.length });
      // Use setTimeout to yield to the event loop so the progress indicator can render
      const result = await new Promise<BatchAnalysisResult>((resolve) => {
        setTimeout(() => {
          resolve(analyzeFiles(fileInputs, threshold / 100));
        }, 0);
      });
      setBatchResult(result);

      // Step 3: Generate template
      setProgress({ step: 'generating', current: 0, total: 1 });
      const html = await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(generateTemplate(result));
        }, 0);
      });
      setGeneratedHTML(html);

      // Done
      setProgress({ step: 'complete', current: 1, total: 1 });
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
      setPhase('error');
    }
  }, [files, threshold]);

  const handleStartOver = useCallback(() => {
    setFiles([]);
    setThreshold(50);
    setPhase('upload');
    setProgress(null);
    setBatchResult(null);
    setGeneratedHTML(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-gray-900">HTML Template Analyzer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload Te Kura HTML lesson files to analyze shared structural patterns and generate a canonical template.
          </p>
        </header>

        {/* Upload zone */}
        <FileUploadZone
          onFilesAdded={handleFilesAdded}
          existingFilenames={existingFilenames}
          compact={phase !== 'upload'}
        />

        {/* File list */}
        {files.length > 0 && (
          <FileList files={files} onFileRemoved={handleFileRemoved} />
        )}

        {/* Analysis controls */}
        {files.length > 0 && phase !== 'analyzing' && (
          <AnalysisControls
            threshold={threshold}
            onThresholdChange={setThreshold}
            fileCount={files.length}
            isAnalyzing={false}
            onRunAnalysis={runAnalysis}
          />
        )}

        {/* Progress indicator */}
        {phase === 'analyzing' && progress && (
          <ProgressIndicator progress={progress} />
        )}

        {/* Error state */}
        {phase === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-1">Analysis Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={runAnalysis}
                className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleStartOver}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && batchResult && generatedHTML && (
          <ResultsPanel
            batchResult={batchResult}
            generatedHTML={generatedHTML}
            onStartOver={handleStartOver}
          />
        )}

        {/* Exclusion registry */}
        <ExclusionRegistryPanel />
      </div>
    </div>
  );
}
