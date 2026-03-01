import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  extractModuleCode,
  resolveModuleCode,
} from '@/lib/analyzer/moduleCodeExtractor';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('extractModuleCode', () => {
  it('extracts ANZH101 from title "1.0 ANZH101 - Aotearoa New Zealand Histories"', () => {
    const html = '<html><head><title>1.0 ANZH101 - Aotearoa New Zealand Histories</title></head></html>';
    expect(extractModuleCode(html, 'somefile.html')).toBe('ANZH101');
  });

  it('extracts ENGI401 from title "3.0 ENGI401 – Engineering"', () => {
    const html = '<html><head><title>3.0 ENGI401 – Engineering</title></head></html>';
    expect(extractModuleCode(html, 'somefile.html')).toBe('ENGI401');
  });

  it('extracts ENGI401 from filename ENGI401_3_0.html', () => {
    const html = '<html><head><title>Lesson Three</title></head></html>';
    expect(extractModuleCode(html, 'ENGI401_3_0.html')).toBe('ENGI401');
  });

  it('filename code wins when title and filename differ', () => {
    const html = '<html><head><title>1.0 OSAI301 – Science</title></head></html>';
    expect(extractModuleCode(html, 'ENGI401_1_0.html')).toBe('ENGI401');
  });

  it('returns null when no module code found', () => {
    const html = '<html><head><title>Untitled</title></head></html>';
    expect(extractModuleCode(html, 'lesson.html')).toBeNull();
  });

  it('extracts code from real ANZH101_1_0.html', () => {
    const rawHTML = loadFixture('ANZH101_1_0.html');
    expect(extractModuleCode(rawHTML, 'ANZH101_1_0.html')).toBe('ANZH101');
  });

  it('extracts code from real ANZH101_0_0.html', () => {
    const rawHTML = loadFixture('ANZH101_0_0.html');
    expect(extractModuleCode(rawHTML, 'ANZH101_0_0.html')).toBe('ANZH101');
  });

  it('does not match single-letter prefix like A1', () => {
    const html = '<html><head><title>A1 Lesson</title></head></html>';
    expect(extractModuleCode(html, 'lesson.html')).toBeNull();
  });

  it('matches minimum 2 uppercase + digit like ABC1', () => {
    const html = '<html><head><title>ABC1 Course</title></head></html>';
    expect(extractModuleCode(html, 'somefile.html')).toBe('ABC1');
  });
});

describe('resolveModuleCode', () => {
  it('single code across all files', () => {
    const result = resolveModuleCode({
      'file1.html': 'ANZH101',
      'file2.html': 'ANZH101',
      'file3.html': 'ANZH101',
    });
    expect(result.code).toBe('ANZH101');
    expect(result.resolution).toBe('single');
  });

  it('common prefix across different codes', () => {
    const result = resolveModuleCode({
      'file1.html': 'ENGI103',
      'file2.html': 'ENGI301',
    });
    expect(result.code).toBe('ENGI');
    expect(result.resolution).toBe('common-prefix');
  });

  it('unrelated codes', () => {
    const result = resolveModuleCode({
      'file1.html': 'ENGI401',
      'file2.html': 'OSAI301',
    });
    expect(result.code).toBe('[MODULE_CODE]');
    expect(result.resolution).toBe('unrelated');
  });

  it('null entries are ignored', () => {
    const result = resolveModuleCode({
      'file1.html': 'ANZH101',
      'file2.html': null,
      'file3.html': 'ANZH101',
    });
    expect(result.code).toBe('ANZH101');
    expect(result.resolution).toBe('single');
  });

  it('all nulls returns [MODULE_CODE]', () => {
    const result = resolveModuleCode({
      'file1.html': null,
      'file2.html': null,
    });
    expect(result.code).toBe('[MODULE_CODE]');
    expect(result.resolution).toBe('unrelated');
  });

  it('preserves perFileCode in result', () => {
    const perFileCodes = {
      'file1.html': 'ANZH101',
      'file2.html': null,
      'file3.html': 'ANZH101',
    };
    const result = resolveModuleCode(perFileCodes);
    expect(result.perFileCode).toEqual(perFileCodes);
  });

  it('single character common prefix is not meaningful', () => {
    const result = resolveModuleCode({
      'file1.html': 'ABCD101',
      'file2.html': 'AXYZ201',
    });
    // Common prefix "A" is only 1 character — not meaningful
    expect(result.code).toBe('[MODULE_CODE]');
    expect(result.resolution).toBe('unrelated');
  });

  it('two-letter common prefix with 2 uppercase letters is meaningful', () => {
    const result = resolveModuleCode({
      'file1.html': 'EN101',
      'file2.html': 'EN202',
    });
    expect(result.code).toBe('EN');
    expect(result.resolution).toBe('common-prefix');
  });
});
