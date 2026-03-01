// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CountdownOverlay from '@/components/CountdownOverlay';

describe('CountdownOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders countdown value', () => {
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays downloaded filename', () => {
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="ANZH101_template.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/ANZH101_template\.html/)).toBeInTheDocument();
  });

  it('ticks after 1 second', () => {
    const onCountdownTick = vi.fn();
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={onCountdownTick}
        onCountdownComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    vi.advanceTimersByTime(1000);
    expect(onCountdownTick).toHaveBeenCalledWith(4);
  });

  it('completes at zero', () => {
    const onCountdownComplete = vi.fn();
    render(
      <CountdownOverlay
        value={0}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={onCountdownComplete}
        onCancel={vi.fn()}
      />
    );

    expect(onCountdownComplete).toHaveBeenCalledTimes(1);
  });

  it('cancel button click calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('escape key calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('backdrop click cancels', () => {
    const onCancel = vi.fn();
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('countdown-overlay'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('content area click does NOT cancel', () => {
    const onCancel = vi.fn();
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('countdown-content'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancel button has autoFocus', () => {
    render(
      <CountdownOverlay
        value={5}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    expect(cancelButton).toHaveFocus();
  });

  it('does NOT complete if unmounted before reaching zero', () => {
    const onCountdownComplete = vi.fn();
    const { unmount } = render(
      <CountdownOverlay
        value={3}
        downloadedFilename="test.html"
        onCountdownTick={vi.fn()}
        onCountdownComplete={onCountdownComplete}
        onCancel={vi.fn()}
      />
    );

    unmount();
    vi.advanceTimersByTime(5000);
    expect(onCountdownComplete).not.toHaveBeenCalled();
  });
});
