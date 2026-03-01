// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CountdownOverlay from '@/components/CountdownOverlay';

describe('CountdownOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    value: 5,
    downloadedFilename: 'ANZH101_template.html',
    onCountdownTick: vi.fn(),
    onCountdownComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders countdown value', () => {
    render(<CountdownOverlay {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays downloaded filename', () => {
    render(<CountdownOverlay {...defaultProps} />);
    expect(screen.getByText(/ANZH101_template\.html/)).toBeInTheDocument();
  });

  it('ticks after 1 second', () => {
    const onCountdownTick = vi.fn();
    render(<CountdownOverlay {...defaultProps} onCountdownTick={onCountdownTick} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onCountdownTick).toHaveBeenCalledWith(4);
  });

  it('completes at zero', () => {
    const onCountdownComplete = vi.fn();
    render(<CountdownOverlay {...defaultProps} value={0} onCountdownComplete={onCountdownComplete} />);

    expect(onCountdownComplete).toHaveBeenCalled();
  });

  it('cancel button click calls onCancel', () => {
    const onCancel = vi.fn();
    render(<CountdownOverlay {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn();
    render(<CountdownOverlay {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('backdrop click cancels', () => {
    const onCancel = vi.fn();
    render(<CountdownOverlay {...defaultProps} onCancel={onCancel} />);

    const overlay = screen.getByTestId('countdown-overlay');
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('content area click does NOT cancel', () => {
    const onCancel = vi.fn();
    render(<CountdownOverlay {...defaultProps} onCancel={onCancel} />);

    const content = screen.getByTestId('countdown-content');
    fireEvent.click(content);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancel button has autoFocus', () => {
    render(<CountdownOverlay {...defaultProps} />);
    const button = screen.getByRole('button', { name: /Cancel/ });
    expect(button).toHaveFocus();
  });

  it('does NOT complete if unmounted (cancelled)', () => {
    const onCountdownComplete = vi.fn();
    const onCountdownTick = vi.fn();
    const { unmount } = render(
      <CountdownOverlay
        {...defaultProps}
        value={3}
        onCountdownTick={onCountdownTick}
        onCountdownComplete={onCountdownComplete}
      />
    );

    // Simulate cancel by unmounting
    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onCountdownComplete).not.toHaveBeenCalled();
  });

  it('displays resetting message', () => {
    render(<CountdownOverlay {...defaultProps} />);
    expect(screen.getByText('Resetting for next upload...')).toBeInTheDocument();
  });

  it('displays cancel hint text', () => {
    render(<CountdownOverlay {...defaultProps} />);
    expect(screen.getByText('Press Escape or click anywhere outside to cancel')).toBeInTheDocument();
  });
});
