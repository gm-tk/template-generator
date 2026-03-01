'use client';

import type { BatchAnalysisResult } from '@/lib/analyzer/types';

interface AnalysisSummaryProps {
  batchResult: BatchAnalysisResult;
}

export default function AnalysisSummary({ batchResult }: AnalysisSummaryProps) {
  const { consensus, moduleCode, templateVersion } = batchResult;

  const hasNoConsensus = consensus.consensusPatterns.length === 0;

  return (
    <div className="space-y-6">
      {/* Top-level stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Files Analyzed" value={String(batchResult.files.length)} />
        <StatCard label="Threshold" value={`${Math.round(consensus.threshold * 100)}%`} />
        <StatCard
          label="Module Code"
          value={moduleCode.code}
          subtitle={moduleCode.resolution}
        />
        <StatCard
          label="Template Version"
          value={templateVersion ?? 'Not detected'}
        />
      </div>

      {/* Boolean flags */}
      <div className="flex flex-wrap gap-2">
        <Badge label="Video" active={consensus.hasVideoSection} />
        <Badge label="Module Menu" active={batchResult.moduleMenu !== null} />
        <Badge label="Acknowledgements" active={batchResult.hasAcknowledgements} />
      </div>

      {hasNoConsensus && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          No structural patterns met the consensus threshold. Try lowering the threshold or uploading more files.
        </div>
      )}

      {/* Consensus patterns breakdown */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Detected Patterns</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-medium text-gray-600">Pattern</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-20">Files</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-24">Coverage</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consensus.patterns
                .sort((a, b) => b.percentage - a.percentage)
                .map((pattern) => (
                  <tr key={pattern.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">{pattern.label}</td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {pattern.fileCount}/{pattern.totalFiles}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pattern.isConsensus ? 'bg-teal-500' : 'bg-gray-300'}`}
                            style={{ width: `${Math.round(pattern.percentage * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {Math.round(pattern.percentage * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {pattern.isConsensus ? (
                        <svg className="inline w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="inline w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 truncate">{value}</dd>
      {subtitle && <dd className="text-xs text-gray-400">{subtitle}</dd>}
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
      ${active ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-teal-500' : 'bg-gray-300'}`} />
      {label}
    </span>
  );
}
