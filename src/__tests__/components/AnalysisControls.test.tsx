// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisControls from '@/components/AnalysisControls';

describe('AnalysisControls', () => {
  it('threshold slider defaults to 50', () => {
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={3}
        isAnalyzing={false}
        onRunAnalysis={vi.fn()}
      />
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('50');
  });

  it('changing slider updates the displayed value', () => {
    const onThresholdChange = vi.fn();
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={onThresholdChange}
        fileCount={3}
        isAnalyzing={false}
        onRunAnalysis={vi.fn()}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onThresholdChange).toHaveBeenCalledWith(75);
  });

  it('Run Analysis button is disabled when fileCount is 0', () => {
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={0}
        isAnalyzing={false}
        onRunAnalysis={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Analyze/ });
    expect(button).toBeDisabled();
  });

  it('Run Analysis button is enabled when files exist', () => {
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={3}
        isAnalyzing={false}
        onRunAnalysis={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Analyze 3 Files' });
    expect(button).not.toBeDisabled();
  });

  it('Run Analysis button shows loading state when isAnalyzing', () => {
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={3}
        isAnalyzing={true}
        onRunAnalysis={vi.fn()}
      />
    );

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('clicking Run Analysis calls onRunAnalysis', () => {
    const onRunAnalysis = vi.fn();
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={3}
        isAnalyzing={false}
        onRunAnalysis={onRunAnalysis}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Analyze 3 Files' }));
    expect(onRunAnalysis).toHaveBeenCalledTimes(1);
  });

  it('shows singular "File" for single file', () => {
    render(
      <AnalysisControls
        threshold={50}
        onThresholdChange={vi.fn()}
        fileCount={1}
        isAnalyzing={false}
        onRunAnalysis={vi.fn()}
      />
    );

    expect(screen.getByText('Analyze 1 File')).toBeInTheDocument();
  });
});
