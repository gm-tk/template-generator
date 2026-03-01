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

function renderControls(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  // Create fresh mocks for each render
  for (const key of Object.keys(props)) {
    const val = props[key as keyof typeof props];
    if (typeof val === 'function' && vi.isMockFunction(val)) {
      (val as ReturnType<typeof vi.fn>).mockClear();
    }
  }
  return render(<AnalysisControls {...props} />);
}

describe('AnalysisControls', () => {
  it('threshold slider defaults to 50', () => {
    renderControls();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('50');
  });

  it('changing slider updates the displayed value', () => {
    const onThresholdChange = vi.fn();
    renderControls({ onThresholdChange });
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onThresholdChange).toHaveBeenCalledWith(75);
  });

  it('Run Analysis button is disabled when fileCount is 0', () => {
    renderControls({ fileCount: 0 });
    const button = screen.getByRole('button', { name: /Analyze/ });
    expect(button).toBeDisabled();
  });

  it('Run Analysis button is enabled when files exist', () => {
    renderControls({ fileCount: 3 });
    const button = screen.getByRole('button', { name: 'Analyze 3 Files' });
    expect(button).not.toBeDisabled();
  });

  it('Run Analysis button shows loading state when isAnalyzing', () => {
    renderControls({ isAnalyzing: true });
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('clicking Run Analysis calls onRunAnalysis', () => {
    const onRunAnalysis = vi.fn();
    renderControls({ onRunAnalysis });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze 3 Files' }));
    expect(onRunAnalysis).toHaveBeenCalledTimes(1);
  });

  it('shows singular "File" for single file', () => {
    renderControls({ fileCount: 1 });
    expect(screen.getByText('Analyze 1 File')).toBeInTheDocument();
  });

  // --- Batch Mode Tests ---

  it('Batch Mode checkbox renders and is unchecked by default', () => {
    renderControls({ batchModeEnabled: false });
    const checkbox = screen.getByRole('checkbox', { name: /Batch Mode/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('toggling Batch Mode checkbox calls onBatchModeChange(true)', () => {
    const onBatchModeChange = vi.fn();
    renderControls({ batchModeEnabled: false, onBatchModeChange });
    const checkbox = screen.getByRole('checkbox', { name: /Batch Mode/i });
    fireEvent.click(checkbox);
    expect(onBatchModeChange).toHaveBeenCalledWith(true);
  });

  it('countdown duration input is hidden when Batch Mode is disabled', () => {
    renderControls({ batchModeEnabled: false });
    expect(screen.queryByLabelText('Countdown duration in seconds')).not.toBeInTheDocument();
  });

  it('countdown duration input is visible when Batch Mode is enabled', () => {
    renderControls({ batchModeEnabled: true });
    expect(screen.getByLabelText('Countdown duration in seconds')).toBeInTheDocument();
  });

  it('countdown duration input shows the current value', () => {
    renderControls({ batchModeEnabled: true, countdownDuration: 10 });
    const input = screen.getByLabelText('Countdown duration in seconds');
    expect(input).toHaveValue(10);
  });

  it('changing the countdown duration input calls onCountdownDurationChange', () => {
    const onCountdownDurationChange = vi.fn();
    renderControls({ batchModeEnabled: true, onCountdownDurationChange });
    const input = screen.getByLabelText('Countdown duration in seconds');
    fireEvent.change(input, { target: { value: '8' } });
    expect(onCountdownDurationChange).toHaveBeenCalledWith(8);
  });

  it('countdown duration clamps low values to 1 on blur', () => {
    // Render with countdownDuration already at an invalid low value (0)
    // to test the onBlur clamping when the DOM value is out of range.
    const onCountdownDurationChange = vi.fn();
    renderControls({
      batchModeEnabled: true,
      countdownDuration: 0,
      onCountdownDurationChange,
    });
    const input = screen.getByLabelText('Countdown duration in seconds');
    // The input shows 0 (the prop). Trigger blur to clamp.
    fireEvent.blur(input);
    expect(onCountdownDurationChange).toHaveBeenCalledWith(1);
  });

  it('countdown duration clamps high values to 30 on blur', () => {
    const onCountdownDurationChange = vi.fn();
    renderControls({
      batchModeEnabled: true,
      countdownDuration: 50,
      onCountdownDurationChange,
    });
    const input = screen.getByLabelText('Countdown duration in seconds');
    // The input shows 50 (the prop). Trigger blur to clamp.
    fireEvent.blur(input);
    expect(onCountdownDurationChange).toHaveBeenCalledWith(30);
  });

  it('Run Analysis button text changes to "Analyze & Download" when Batch Mode is enabled', () => {
    renderControls({ batchModeEnabled: true });
    expect(screen.getByRole('button', { name: 'Analyze & Download' })).toBeInTheDocument();
  });

  it('Run Analysis button text is normal text when Batch Mode is disabled', () => {
    renderControls({ batchModeEnabled: false, fileCount: 5 });
    expect(screen.getByRole('button', { name: 'Analyze 5 Files' })).toBeInTheDocument();
  });
});
