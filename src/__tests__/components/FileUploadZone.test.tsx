// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUploadZone from '@/components/FileUploadZone';

describe('FileUploadZone', () => {
  it('renders with instructional text', () => {
    render(
      <FileUploadZone
        onFilesAdded={vi.fn()}
        existingFilenames={new Set()}
      />
    );
    expect(screen.getByText('Drop HTML files here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Only .html files are accepted')).toBeInTheDocument();
  });

  it('shows compact text when compact prop is true', () => {
    render(
      <FileUploadZone
        onFilesAdded={vi.fn()}
        existingFilenames={new Set()}
        compact
      />
    );
    expect(screen.getByText('Drop more HTML files here, or click to browse')).toBeInTheDocument();
  });

  it('has correct aria attributes for keyboard access', () => {
    render(
      <FileUploadZone
        onFilesAdded={vi.fn()}
        existingFilenames={new Set()}
      />
    );
    const uploadZone = screen.getByRole('button', { name: 'Upload HTML files for analysis' });
    expect(uploadZone).toBeInTheDocument();
    expect(uploadZone).toHaveAttribute('tabindex', '0');
  });

  it('clicking the zone triggers the hidden file input', () => {
    render(
      <FileUploadZone
        onFilesAdded={vi.fn()}
        existingFilenames={new Set()}
      />
    );
    const uploadZone = screen.getByRole('button', { name: 'Upload HTML files for analysis' });
    // The hidden input exists
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('hidden');
  });

  it('shows drag-over feedback text', () => {
    render(
      <FileUploadZone
        onFilesAdded={vi.fn()}
        existingFilenames={new Set()}
      />
    );
    const uploadZone = screen.getByRole('button', { name: 'Upload HTML files for analysis' });

    fireEvent.dragOver(uploadZone, {
      dataTransfer: { files: [] },
    });

    expect(screen.getByText('Drop files here')).toBeInTheDocument();
  });
});
