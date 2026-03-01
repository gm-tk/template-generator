'use client';

export interface AnalysisProgress {
  step: 'reading' | 'analyzing' | 'generating' | 'complete';
  current: number;
  total: number;
}

interface ProgressIndicatorProps {
  progress: AnalysisProgress;
}

const STEPS = [
  { key: 'reading', label: 'Reading files' },
  { key: 'analyzing', label: 'Analyzing structural patterns' },
  { key: 'generating', label: 'Generating template' },
  { key: 'complete', label: 'Complete' },
] as const;

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const currentIndex = STEPS.findIndex(s => s.key === progress.step);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6" aria-live="polite" role="status">
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex || progress.step === 'complete';
          const isCurrent = index === currentIndex && progress.step !== 'complete';

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`
                shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${isComplete
                  ? 'bg-teal-600 text-white'
                  : isCurrent
                    ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600'
                    : 'bg-gray-100 text-gray-400'
                }
              `}>
                {isComplete ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isCurrent ? 'text-gray-900 font-medium' : isComplete ? 'text-gray-500' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                {isCurrent && step.key === 'reading' && progress.total > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    {progress.current} of {progress.total}
                  </span>
                )}
              </div>
              {isCurrent && step.key !== 'complete' && (
                <svg className="animate-spin h-4 w-4 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
