'use client';

interface AnalysisControlsProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  fileCount: number;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  batchModeEnabled: boolean;
  onBatchModeChange: (enabled: boolean) => void;
  countdownDuration: number;
  onCountdownDurationChange: (seconds: number) => void;
}

export default function AnalysisControls({
  threshold,
  onThresholdChange,
  fileCount,
  isAnalyzing,
  onRunAnalysis,
  batchModeEnabled,
  onBatchModeChange,
  countdownDuration,
  onCountdownDurationChange,
}: AnalysisControlsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="threshold" className="text-sm font-medium text-gray-700">
            Consensus Threshold
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => {
                const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                onThresholdChange(val);
              }}
              className="w-14 px-1.5 py-0.5 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
        <input
          id="threshold"
          type="range"
          min={1}
          max={100}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
        <p className="mt-1 text-xs text-gray-400">
          Elements appearing in at least this percentage of files will be included in the template.
        </p>
      </div>

      {/* Batch Mode toggle */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="batch-mode"
          checked={batchModeEnabled}
          onChange={(e) => onBatchModeChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300"
        />
        <div>
          <label htmlFor="batch-mode" className="text-sm font-medium cursor-pointer">
            Batch Mode
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-download template and reset for next upload
          </p>

          {/* Countdown duration — only visible when Batch Mode is enabled */}
          {batchModeEnabled && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-500">Countdown:</span>
              <input
                type="number"
                min={1}
                max={30}
                value={countdownDuration}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onCountdownDurationChange(val);
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) onCountdownDurationChange(1);
                  else if (val > 30) onCountdownDurationChange(30);
                }}
                className="w-12 text-center text-sm border border-gray-300 rounded px-1 py-0.5
                           focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Countdown duration in seconds"
              />
              <span className="text-xs text-gray-500">seconds</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onRunAnalysis}
        disabled={fileCount === 0 || isAnalyzing}
        className={`
          w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors
          ${fileCount === 0 || isAnalyzing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800'
          }
        `}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : batchModeEnabled ? (
          `Analyze & Download`
        ) : (
          `Analyze ${fileCount} ${fileCount === 1 ? 'File' : 'Files'}`
        )}
      </button>
    </div>
  );
}
