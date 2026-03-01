// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileList from '@/components/FileList';

function createMockFile(name: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type: 'text/html' });
  return new File([blob], name, { type: 'text/html' });
}

describe('FileList', () => {
  it('renders file names and formatted sizes', () => {
    const files = [
      createMockFile('test1.html', 512),
      createMockFile('test2.html', 2048),
    ];
    render(<FileList files={files} onFileRemoved={vi.fn()} />);

    expect(screen.getByText('test1.html')).toBeInTheDocument();
    expect(screen.getByText('test2.html')).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('clicking remove calls onFileRemoved with correct index', () => {
    const onFileRemoved = vi.fn();
    const files = [
      createMockFile('file1.html', 100),
      createMockFile('file2.html', 200),
    ];
    render(<FileList files={files} onFileRemoved={onFileRemoved} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[1]);
    expect(onFileRemoved).toHaveBeenCalledWith(1);
  });

  it('shows correct file count text', () => {
    const files = [
      createMockFile('a.html', 10),
      createMockFile('b.html', 20),
      createMockFile('c.html', 30),
    ];
    render(<FileList files={files} onFileRemoved={vi.fn()} />);

    expect(screen.getByText('3 files ready for analysis')).toBeInTheDocument();
  });

  it('shows singular "file" for single file', () => {
    const files = [createMockFile('one.html', 10)];
    render(<FileList files={files} onFileRemoved={vi.fn()} />);

    expect(screen.getByText('1 file ready for analysis')).toBeInTheDocument();
  });

  it('renders nothing when file list is empty', () => {
    const { container } = render(<FileList files={[]} onFileRemoved={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('remove buttons have correct aria-labels', () => {
    const files = [createMockFile('myfile.html', 100)];
    render(<FileList files={files} onFileRemoved={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Remove myfile.html' })).toBeInTheDocument();
  });
});
