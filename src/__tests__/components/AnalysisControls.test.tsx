// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisControls from '@/components/AnalysisControls';

const defaultProps = {
  threshold: 50,
  onThresholdChange: vi.fn(),
  fileCount: 3,
  isAnalyzing: false,
  onRunAnalysis: vi.fn(),
  batchModeEnabled: false,
  onBatchModeChange: vi.fn(),
  countdownDuration: 5,
  onCountdownDurationChange: vi.fn(),
};

describe('AnalysisControls', () => {
  it('threshold slider defaults to 50', () => {
    render(<AnalysisControls {...defaultProps} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('50');
  });

  it('changing slider updates the displayed value', () => {
    const onThresholdChange = vi.fn();
    render(<AnalysisControls {...defaultProps} onThresholdChange={onThresholdChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onThresholdChange).toHaveBeenCalledWith(75);
  });

  it('Run Analysis button is disabled when fileCount is 0', () => {
    render(<AnalysisControls {...defaultProps} fileCount={0} />);

    const button = screen.getByRole('button', { name: /Analyze/ });
    expect(button).toBeDisabled();
  });

  it('Run Analysis button is enabled when files exist', () => {
    render(<AnalysisControls {...defaultProps} />);

    const button = screen.getByRole('button', { name: 'Analyze 3 Files' });
    expect(button).not.toBeDisabled();
  });

  it('Run Analysis button shows loading state when isAnalyzing', () => {
    render(<AnalysisControls {...defaultProps} isAnalyzing={true} />);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('clicking Run Analysis calls onRunAnalysis', () => {
    const onRunAnalysis = vi.fn();
    render(<AnalysisControls {...defaultProps} onRunAnalysis={onRunAnalysis} />);

    fireEvent.click(screen.getByRole('button', { name: 'Analyze 3 Files' }));
    expect(onRunAnalysis).toHaveBeenCalledTimes(1);
  });

  it('shows singular "File" for single file', () => {
    render(<AnalysisControls {...defaultProps} fileCount={1} />);

    expect(screen.getByText('Analyze 1 File')).toBeInTheDocument();
  });

  // --- Batch Mode tests ---

  it('Batch Mode checkbox renders and is unchecked by default', () => {
    render(<AnalysisControls {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: /Batch Mode/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('toggling Batch Mode checkbox calls onBatchModeChange(true)', () => {
    const onBatchModeChange = vi.fn();
    render(<AnalysisControls {...defaultProps} onBatchModeChange={onBatchModeChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /Batch Mode/i });
    fireEvent.click(checkbox);
    expect(onBatchModeChange).toHaveBeenCalledWith(true);
  });

  it('countdown duration input is hidden when Batch Mode is disabled', () => {
    render(<AnalysisControls {...defaultProps} batchModeEnabled={false} />);

    expect(screen.queryByLabelText('Countdown duration in seconds')).not.toBeInTheDocument();
  });

  it('countdown duration input is visible when Batch Mode is enabled', () => {
    render(<AnalysisControls {...defaultProps} batchModeEnabled={true} />);

    expect(screen.getByLabelText('Countdown duration in seconds')).toBeInTheDocument();
  });

  it('countdown duration input shows the current value', () => {
    render(<AnalysisControls {...defaultProps} batchModeEnabled={true} countdownDuration={10} />);

    const input = screen.getByLabelText('Countdown duration in seconds');
    expect(input).toHaveValue(10);
  });

  it('changing the countdown duration input calls onCountdownDurationChange', () => {
    const onCountdownDurationChange = vi.fn();
    render(
      <AnalysisControls
        {...defaultProps}
        batchModeEnabled={true}
        onCountdownDurationChange={onCountdownDurationChange}
      />
    );

    const input = screen.getByLabelText('Countdown duration in seconds');
    fireEvent.change(input, { target: { value: '10' } });
    expect(onCountdownDurationChange).toHaveBeenCalledWith(10);
  });

  it('countdown duration clamps to 1 on blur when value is below minimum', () => {
    const onCountdownDurationChange = vi.fn();
    // Render with an out-of-range prop value to simulate a value of 0
    render(
      <AnalysisControls
        {...defaultProps}
        batchModeEnabled={true}
        countdownDuration={0}
        onCountdownDurationChange={onCountdownDurationChange}
      />
    );

    const input = screen.getByLabelText('Countdown duration in seconds');
    fireEvent.blur(input);
    expect(onCountdownDurationChange).toHaveBeenCalledWith(1);
  });

  it('countdown duration clamps to 30 on blur when value exceeds maximum', () => {
    const onCountdownDurationChange = vi.fn();
    // Render with an out-of-range prop value to simulate a value of 50
    render(
      <AnalysisControls
        {...defaultProps}
        batchModeEnabled={true}
        countdownDuration={50}
        onCountdownDurationChange={onCountdownDurationChange}
      />
    );

    const input = screen.getByLabelText('Countdown duration in seconds');
    fireEvent.blur(input);
    expect(onCountdownDurationChange).toHaveBeenCalledWith(30);
  });

  it('button text changes to "Analyze & Download" when Batch Mode is enabled', () => {
    render(<AnalysisControls {...defaultProps} batchModeEnabled={true} />);

    expect(screen.getByRole('button', { name: 'Analyze & Download' })).toBeInTheDocument();
  });

  it('button text is normal when Batch Mode is disabled', () => {
    render(<AnalysisControls {...defaultProps} batchModeEnabled={false} />);

    expect(screen.getByRole('button', { name: 'Analyze 3 Files' })).toBeInTheDocument();
  });
});
