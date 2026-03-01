import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  isFirstPage,
  extractTitleText,
  extractModuleCodeH1Text,
} from '@/lib/analyzer/firstPageDetector';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('isFirstPage', () => {
  describe('filename-based detection', () => {
    const dummyHTML = '<html><head><title>Test</title></head><body></body></html>';

    it('detects 0_0 in filename', () => {
      expect(isFirstPage('ANZH101_0_0.html', dummyHTML)).toBe(true);
    });

    it('detects 0.0 in filename', () => {
      expect(isFirstPage('ENGI401_0.0.html', dummyHTML)).toBe(true);
    });

    it('detects -00 in filename', () => {
      expect(isFirstPage('OSAI301-00.html', dummyHTML)).toBe(true);
    });

    it('detects _00 in filename', () => {
      expect(isFirstPage('MODULE_00.html', dummyHTML)).toBe(true);
    });

    it('rejects lesson page 1_0', () => {
      expect(isFirstPage('ANZH101_1_0.html', dummyHTML)).toBe(false);
    });

    it('rejects lesson page 2_0', () => {
      expect(isFirstPage('ANZH101_2_0.html', dummyHTML)).toBe(false);
    });

    it('rejects lesson page 3_0', () => {
      expect(isFirstPage('ANZH101_3_0.html', dummyHTML)).toBe(false);
    });

    it('rejects lesson 10_0 (not 0_0)', () => {
      expect(isFirstPage('ANZH101_10_0.html', dummyHTML)).toBe(false);
    });
  });

  describe('title-based detection', () => {
    function htmlWithTitle(title: string): string {
      return `<html><head><title>${title}</title></head><body></body></html>`;
    }

    it('detects title starting with 0.0', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('0.0 ENGI401 - A Moment in Time'))
      ).toBe(true);
    });

    it('detects title starting with 00', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('00 OSAI301 - Module Title'))
      ).toBe(true);
    });

    it('rejects title starting with 1.0', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('1.0 ANZH101 – Tangata Whenua Origin Stories'))
      ).toBe(false);
    });

    it('rejects title starting with 3.0', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('3.0 ANZH101 – The environment names places'))
      ).toBe(false);
    });

    it('rejects title starting with 10.0', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('10.0 ENGI401 - Lesson Ten'))
      ).toBe(false);
    });

    it('rejects title starting with 001 (three digits, not 00)', () => {
      expect(
        isFirstPage('somefile.html', htmlWithTitle('001 MODULE - Something'))
      ).toBe(false);
    });
  });

  describe('module-code h1 detection', () => {
    function htmlWithModuleCodeH1(h1Content: string): string {
      return `<html><head><title>Test</title></head><body>
        <div id="module-code"><h1>${h1Content}</h1></div>
      </body></html>`;
    }

    it('detects module code in h1 (e.g. ANZH101)', () => {
      expect(isFirstPage('somefile.html', htmlWithModuleCodeH1('ANZH101'))).toBe(true);
    });

    it('detects module code in h1 (e.g. ENGI401)', () => {
      expect(isFirstPage('somefile.html', htmlWithModuleCodeH1('ENGI401'))).toBe(true);
    });

    it('rejects lesson number in h1 (e.g. 01)', () => {
      expect(isFirstPage('somefile.html', htmlWithModuleCodeH1('01'))).toBe(false);
    });

    it('rejects lesson number in h1 (e.g. 03)', () => {
      expect(isFirstPage('somefile.html', htmlWithModuleCodeH1('03'))).toBe(false);
    });

    it('rejects lesson number in h1 (e.g. 10)', () => {
      expect(isFirstPage('somefile.html', htmlWithModuleCodeH1('10'))).toBe(false);
    });
  });

  describe('real file tests', () => {
    it('ANZH101_0_0.html fixture is detected as first page', () => {
      const rawHTML = loadFixture('ANZH101_0_0.html');
      expect(isFirstPage('ANZH101_0_0.html', rawHTML)).toBe(true);
    });

    it('ANZH101_1_0.html fixture is NOT a first page', () => {
      const rawHTML = loadFixture('ANZH101_1_0.html');
      expect(isFirstPage('ANZH101_1_0.html', rawHTML)).toBe(false);
    });

    it('ANZH101_2_0.html fixture is NOT a first page', () => {
      const rawHTML = loadFixture('ANZH101_2_0.html');
      expect(isFirstPage('ANZH101_2_0.html', rawHTML)).toBe(false);
    });

    it('ANZH101_3_0.html fixture is NOT a first page', () => {
      const rawHTML = loadFixture('ANZH101_3_0.html');
      expect(isFirstPage('ANZH101_3_0.html', rawHTML)).toBe(false);
    });
  });
});

describe('extractTitleText', () => {
  it('extracts title text from valid HTML', () => {
    const html = '<html><head><title>0.0 ANZH101 – Origins</title></head></html>';
    expect(extractTitleText(html)).toBe('0.0 ANZH101 – Origins');
  });

  it('returns null when no title element exists', () => {
    const html = '<html><head></head><body></body></html>';
    expect(extractTitleText(html)).toBeNull();
  });

  it('trims whitespace from title', () => {
    const html = '<html><head><title>  1.0 ANZH101  </title></head></html>';
    expect(extractTitleText(html)).toBe('1.0 ANZH101');
  });
});

describe('extractModuleCodeH1Text', () => {
  it('extracts h1 text from #module-code', () => {
    const html = '<div id="module-code"><h1>ANZH101</h1></div>';
    expect(extractModuleCodeH1Text(html)).toBe('ANZH101');
  });

  it('returns null when no #module-code element exists', () => {
    const html = '<div><h1>ANZH101</h1></div>';
    expect(extractModuleCodeH1Text(html)).toBeNull();
  });

  it('returns null when #module-code has no h1', () => {
    const html = '<div id="module-code"><h2>ANZH101</h2></div>';
    expect(extractModuleCodeH1Text(html)).toBeNull();
  });

  it('strips HTML tags from h1 content', () => {
    const html = '<div id="module-code"><h1><span>ENGI401</span></h1></div>';
    expect(extractModuleCodeH1Text(html)).toBe('ENGI401');
  });
});
