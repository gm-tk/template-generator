// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalysisSummary from '@/components/AnalysisSummary';
import type { BatchAnalysisResult, ConsensusModel, ModuleCodeResult } from '@/lib/analyzer/types';

function createMockBatchResult(
  overrides: Partial<{
    fileCount: number;
    moduleCode: string;
    templateVersion: string | null;
    consensus: Partial<ConsensusModel>;
    fileErrors: BatchAnalysisResult['fileErrors'];
    isMixedTemplateVersions: boolean;
    templateVersions: Map<string, number>;
    nonTekuraFiles: string[];
  }> = {}
): BatchAnalysisResult {
  const defaultConsensus: ConsensusModel = {
    threshold: 0.5,
    totalFiles: overrides.fileCount ?? 3,
    patterns: [],
    consensusPatterns: [],
    headingLevels: [],
    alertVariants: [],
    hasVideoSection: false,
    hasSidebarAlertActivity: false,
    hasSidebarImage: false,
    hasQuoteText: false,
    hasTables: false,
    hasImages: false,
    hasOrderedLists: false,
    hasUnorderedLists: false,
    hasButtons: false,
    hasExternalButtons: false,
    activityTypes: [],
  };

  const moduleCodeResult: ModuleCodeResult = {
    code: overrides.moduleCode ?? 'TEST101',
    resolution: 'single',
    perFileCode: {},
  };

  // Create mock FileAnalysis array of the right length
  const files = Array.from({ length: overrides.fileCount ?? 3 }, (_, i) => ({
    filename: `file${i}.html`,
    ast: { tagName: 'html', classes: [], id: null, attributes: {}, children: [], depth: 0, excluded: false, fingerprintClasses: [] },
    fingerprints: new Map(),
    moduleCode: overrides.moduleCode ?? 'TEST101',
    templateVersion: overrides.templateVersion !== undefined ? overrides.templateVersion : '1-3',
    hasVideoSection: false,
    hasAcknowledgements: false,
    moduleMenuCapture: null,
  }));

  return {
    files,
    moduleCode: moduleCodeResult,
    moduleMenu: null,
    templateVersion: overrides.templateVersion !== undefined ? overrides.templateVersion : '1-3',
    hasVideoSection: false,
    hasAcknowledgements: false,
    consensus: { ...defaultConsensus, ...overrides.consensus },
    fileErrors: overrides.fileErrors ?? [],
    templateVersions: overrides.templateVersions ?? new Map(),
    isMixedTemplateVersions: overrides.isMixedTemplateVersions ?? false,
    nonTekuraFiles: overrides.nonTekuraFiles ?? [],
  };
}

describe('AnalysisSummary', () => {
  it('renders file count correctly', () => {
    render(<AnalysisSummary batchResult={createMockBatchResult({ fileCount: 5 })} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders module code', () => {
    render(<AnalysisSummary batchResult={createMockBatchResult({ moduleCode: 'ANZH101' })} />);
    expect(screen.getByText('ANZH101')).toBeInTheDocument();
  });

  it('renders template version', () => {
    render(<AnalysisSummary batchResult={createMockBatchResult({ templateVersion: '4-6' })} />);
    expect(screen.getByText('4-6')).toBeInTheDocument();
  });

  it('renders "Not detected" when template version is null', () => {
    render(<AnalysisSummary batchResult={createMockBatchResult({ templateVersion: null })} />);
    expect(screen.getByText('Not detected')).toBeInTheDocument();
  });

  it('shows file error warnings when fileErrors is non-empty', () => {
    const result = createMockBatchResult({
      fileErrors: [
        { filename: 'bad.html', error: 'File is empty.' },
        { filename: 'worse.html', error: 'File does not appear to contain HTML.' },
      ],
    });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText('2 file(s) could not be analyzed')).toBeInTheDocument();
    expect(screen.getByText(/bad\.html/)).toBeInTheDocument();
    expect(screen.getByText(/File is empty/)).toBeInTheDocument();
  });

  it('shows mixed template version warning when isMixedTemplateVersions is true', () => {
    const versions = new Map([['1-3', 2], ['9-10', 1]]);
    const result = createMockBatchResult({
      isMixedTemplateVersions: true,
      templateVersions: versions,
    });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText(/Mixed template versions detected/)).toBeInTheDocument();
  });

  it('shows non-Te Kura files info', () => {
    const result = createMockBatchResult({
      nonTekuraFiles: ['random.html', 'other.html'],
    });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText(/may not be Te Kura template files/)).toBeInTheDocument();
    expect(screen.getByText(/random\.html/)).toBeInTheDocument();
  });

  it('shows single-file info message when file count is 1', () => {
    const result = createMockBatchResult({ fileCount: 1 });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText(/Only 1 file was analyzed/)).toBeInTheDocument();
  });

  it('shows two-file info message when file count is 2', () => {
    const result = createMockBatchResult({ fileCount: 2 });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText(/With only 2 files/)).toBeInTheDocument();
  });

  it('shows no consensus warning when no patterns meet threshold', () => {
    const result = createMockBatchResult({
      consensus: { consensusPatterns: [] },
    });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText(/No structural patterns met/)).toBeInTheDocument();
  });

  it('renders consensus pattern list with correct indicators', () => {
    const result = createMockBatchResult({
      consensus: {
        patterns: [
          { id: 'paragraph', label: 'Paragraph', category: 'paragraph', fileCount: 3, presentInFiles: [], totalFiles: 3, percentage: 1, isConsensus: true, variants: [] },
          { id: 'table', label: 'Table', category: 'table', fileCount: 1, presentInFiles: [], totalFiles: 3, percentage: 0.33, isConsensus: false, variants: [] },
        ],
        consensusPatterns: [
          { id: 'paragraph', label: 'Paragraph', category: 'paragraph', fileCount: 3, presentInFiles: [], totalFiles: 3, percentage: 1, isConsensus: true, variants: [] },
        ],
      },
    });
    render(<AnalysisSummary batchResult={result} />);

    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });
});
