'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyzeFiles } from '@/lib/analyzer/pipeline';
import { generateTemplate } from '@/lib/analyzer/templateGenerator';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';
import type { BatchAnalysisResult } from '@/lib/analyzer/types';
import FileUploadZone from './FileUploadZone';
import FileList from './FileList';
import AnalysisControls from './AnalysisControls';
import ProgressIndicator, { type AnalysisProgress } from './ProgressIndicator';
import ResultsPanel from './ResultsPanel';
import ExclusionRegistryPanel from './ExclusionRegistryPanel';
import CountdownOverlay from './CountdownOverlay';
import { useToast } from './Toaster';

type AppPhase = 'upload' | 'ready' | 'analyzing' | 'results' | 'countdown' | 'error';

const BATCH_MODE_KEY = 'template-analyzer-batch-mode';
const COUNTDOWN_DURATION_KEY = 'template-analyzer-countdown-duration';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function triggerDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TemplateAnalyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState<number>(50);
  const [phase, setPhase] = useState<AppPhase>('upload');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [batchResult, setBatchResult] = useState<BatchAnalysisResult | null>(null);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customRegistry, setCustomRegistry] = useState<Set<string>>(new Set(COMPONENT_EXCLUSION_REGISTRY));
  const { addToast } = useToast();

  // Batch Mode state
  const [batchModeEnabled, setBatchModeEnabled] = useState<boolean>(false);
  const [countdownDuration, setCountdownDuration] = useState<number>(5);
  const [countdownValue, setCountdownValue] = useState<number>(5);
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  // Load Batch Mode preferences from localStorage on mount
  useEffect(() => {
    const savedBatch = localStorage.getItem(BATCH_MODE_KEY);
    if (savedBatch === 'true') setBatchModeEnabled(true);

    const savedDuration = localStorage.getItem(COUNTDOWN_DURATION_KEY);
    if (savedDuration) {
      const parsed = parseInt(savedDuration, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 30) {
        setCountdownDuration(parsed);
      }
    }
  }, []);

  const toggleBatchMode = useCallback((enabled: boolean) => {
    setBatchModeEnabled(enabled);
    localStorage.setItem(BATCH_MODE_KEY, enabled.toString());
  }, []);

  const updateCountdownDuration = useCallback((seconds: number) => {
    const clamped = Math.max(1, Math.min(30, Math.round(seconds)));
    setCountdownDuration(clamped);
    localStorage.setItem(COUNTDOWN_DURATION_KEY, clamped.toString());
  }, []);

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

  const handleNotification = useCallback((message: string) => {
    addToast(message, 'warning');
  }, [addToast]);

  const runAnalysis = useCallback(async () => {
    setPhase('analyzing');
    setError(null);
    setBatchResult(null);
    setGeneratedHTML(null);
    // Clear any leftover countdown state
    setDownloadedFilename('');
    setCountdownValue(countdownDuration);

    try {
      // Step 1: Read all files
      setProgress({ step: 'reading', current: 0, total: files.length });
      const fileInputs: Array<{ rawHTML: string; filename: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const rawHTML = await readFileAsText(files[i]);
        fileInputs.push({ rawHTML, filename: files[i].name });
        setProgress({ step: 'reading', current: i + 1, total: files.length });
      }

      // Step 2: Run analysis pipeline (yields to event loop via setTimeout)
      setProgress({ step: 'analyzing', current: 0, total: fileInputs.length });
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = await new Promise<BatchAnalysisResult>((resolve) => {
        setTimeout(() => {
          resolve(analyzeFiles(fileInputs, threshold / 100, customRegistry));
        }, 0);
      });
      setBatchResult(result);

      // Step 3: Generate template (yields to event loop via setTimeout)
      setProgress({ step: 'generating', current: 0, total: 1 });
      await new Promise(resolve => setTimeout(resolve, 0));

      const html = await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(generateTemplate(result));
        }, 0);
      });
      setGeneratedHTML(html);

      // Done
      setProgress({ step: 'complete', current: 1, total: 1 });

      if (batchModeEnabled) {
        // Build the download filename
        const safeName = result.moduleCode.code.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = (safeName === '_MODULE_CODE_')
          ? 'template.html'
          : `${safeName}_template.html`;

        // Auto-download the template
        triggerDownload(html, filename);

        // Start the countdown using the configured duration
        setDownloadedFilename(filename);
        setCountdownValue(countdownDuration);
        setPhase('countdown');
      } else {
        // Normal flow — show results
        setPhase('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
      setPhase('error');
    }
  }, [files, threshold, customRegistry, batchModeEnabled, countdownDuration]);

  const handleCountdownTick = useCallback((newValue: number) => {
    setCountdownValue(newValue);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    // Auto-reset the app for next upload
    setFiles([]);
    setBatchResult(null);
    setGeneratedHTML(null);
    setError(null);
    setCountdownValue(countdownDuration);
    setDownloadedFilename('');
    setPhase('upload');
    // IMPORTANT: Do NOT reset batchModeEnabled, countdownDuration, or threshold — they persist
  }, [countdownDuration]);

  const handleCountdownCancel = useCallback(() => {
    // Stop countdown instantly, show results
    setCountdownValue(countdownDuration);
    setDownloadedFilename('');
    setPhase('results');
  }, [countdownDuration]);

  const handleStartOver = useCallback(() => {
    setFiles([]);
    setThreshold(50);
    setPhase('upload');
    setProgress(null);
    setBatchResult(null);
    setGeneratedHTML(null);
    setError(null);
    setCustomRegistry(new Set(COMPONENT_EXCLUSION_REGISTRY));
  }, []);

  const handleRegistryChange = useCallback((registry: Set<string>) => {
    setCustomRegistry(registry);
  }, []);

  const handleRegistryReset = useCallback(() => {
    setCustomRegistry(new Set(COMPONENT_EXCLUSION_REGISTRY));
    addToast('Registry reset to defaults', 'info');
  }, [addToast]);

  // Lazy-load the HelpPanel to avoid importing it unless needed
  const HelpPanel = helpOpen ? require('./HelpPanel').default : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HTML Template Analyzer</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload Te Kura HTML lesson files to analyze shared structural patterns and generate a canonical template.
            </p>
          </div>
          <button
            onClick={() => setHelpOpen(true)}
            className="flex-shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-full
                       border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700
                       transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Help"
          >
            ?
          </button>
        </header>

        {/* Upload zone */}
        <FileUploadZone
          onFilesAdded={handleFilesAdded}
          existingFilenames={existingFilenames}
          compact={phase !== 'upload'}
          currentFileCount={files.length}
          onNotification={handleNotification}
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
            batchModeEnabled={batchModeEnabled}
            onBatchModeChange={toggleBatchMode}
            countdownDuration={countdownDuration}
            onCountdownDurationChange={updateCountdownDuration}
          />
        )}

        {/* Progress indicator */}
        {phase === 'analyzing' && progress && (
          <ProgressIndicator progress={progress} />
        )}

        {/* Error state */}
        {phase === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
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

        {/* Countdown overlay */}
        {phase === 'countdown' && (
          <CountdownOverlay
            value={countdownValue}
            downloadedFilename={downloadedFilename}
            onCountdownTick={handleCountdownTick}
            onCountdownComplete={handleCountdownComplete}
            onCancel={handleCountdownCancel}
          />
        )}

        {/* Exclusion registry */}
        <ExclusionRegistryPanel
          registry={customRegistry}
          onRegistryChange={handleRegistryChange}
        />
      </div>

      {/* Help panel */}
      {helpOpen && HelpPanel && (
        <HelpPanel onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}
