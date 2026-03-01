import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeFiles, isTekuraFile, extractTemplateVersionFromHTML } from '@/lib/analyzer/pipeline';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('extractTemplateVersionFromHTML', () => {
  it('extracts version from standard Te Kura HTML', () => {
    const html = '<html lang="en" template="1-3" class="notranslate">';
    expect(extractTemplateVersionFromHTML(html)).toBe('1-3');
  });

  it('extracts version 9-10', () => {
    const html = '<html template="9-10">';
    expect(extractTemplateVersionFromHTML(html)).toBe('9-10');
  });

  it('returns null when no template attribute', () => {
    const html = '<html lang="en" class="notranslate">';
    expect(extractTemplateVersionFromHTML(html)).toBeNull();
  });

  it('returns null for plain text', () => {
    expect(extractTemplateVersionFromHTML('just text')).toBeNull();
  });
});

describe('isTekuraFile', () => {
  it('detects Te Kura file with idoc_scripts.js + div#header + div#body + div#footer', () => {
    const html = `
      <html lang="en">
      <head><script src="idoc_scripts.js"></script></head>
      <body>
        <div id="header"></div>
        <div id="body"></div>
        <div id="footer"></div>
      </body>
      </html>
    `;
    expect(isTekuraFile(html)).toBe(true);
  });

  it('detects Te Kura file with template attribute + notranslate', () => {
    const html = '<html template="1-3" class="notranslate"><body></body></html>';
    expect(isTekuraFile(html)).toBe(true);
  });

  it('non-Te Kura file: plain HTML without Te Kura markers', () => {
    const html = '<html><head><title>My Page</title></head><body><p>Hello</p></body></html>';
    expect(isTekuraFile(html)).toBe(false);
  });

  it('file with only one signal is not Te Kura', () => {
    const html = '<html template="1-3"><body><p>Hello</p></body></html>';
    expect(isTekuraFile(html)).toBe(false);
  });

  it('real fixture files are detected as Te Kura', () => {
    const fixture = loadFixture('ANZH101_1_0.html');
    expect(isTekuraFile(fixture)).toBe(true);
  });
});

describe('analyzeFiles — template version detection', () => {
  let rawHTML1: string;
  let rawHTML2: string;
  let rawHTML3: string;

  beforeAll(() => {
    rawHTML1 = loadFixture('ANZH101_1_0.html');
    rawHTML2 = loadFixture('ANZH101_2_0.html');
    rawHTML3 = loadFixture('ANZH101_3_0.html');
  });

  it('all files same template version → isMixedTemplateVersions is false', () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: 'ANZH101_1_0.html' },
      { rawHTML: rawHTML2, filename: 'ANZH101_2_0.html' },
      { rawHTML: rawHTML3, filename: 'ANZH101_3_0.html' },
    ]);
    expect(result.isMixedTemplateVersions).toBe(false);
    expect(result.templateVersions.size).toBe(1);
    expect(result.templateVersions.get('1-3')).toBe(3);
  });

  it('mixed template versions → isMixedTemplateVersions is true', () => {
    const htmlV1 = '<html template="1-3" class="notranslate"><head><script src="idoc_scripts.js"></script></head><body><div id="header"></div><div id="body"><div class="row"><div class="col-md-8 col-12"><p>Content</p></div></div></div><div id="footer"></div></body></html>';
    const htmlV9 = '<html template="9-10" class="notranslate"><head><script src="idoc_scripts.js"></script></head><body><div id="header"></div><div id="body"><div class="row"><div class="col-md-8 col-12"><p>Content</p></div></div></div><div id="footer"></div></body></html>';

    const result = analyzeFiles([
      { rawHTML: htmlV1, filename: 'file1.html' },
      { rawHTML: htmlV9, filename: 'file2.html' },
    ]);
    expect(result.isMixedTemplateVersions).toBe(true);
    expect(result.templateVersions.size).toBe(2);
    expect(result.templateVersions.get('1-3')).toBe(1);
    expect(result.templateVersions.get('9-10')).toBe(1);
  });

  it('file without template attribute does not add to templateVersions map', () => {
    const htmlNoTemplate = '<html lang="en" class="notranslate"><head><script src="idoc_scripts.js"></script></head><body><div id="header"></div><div id="body"><p>Content</p></div><div id="footer"></div></body></html>';

    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: 'ANZH101_1_0.html' },
      { rawHTML: htmlNoTemplate, filename: 'no-template.html' },
    ]);
    // Only the first file has a template version
    expect(result.templateVersions.get('1-3')).toBe(1);
    expect(result.templateVersions.size).toBe(1);
    expect(result.isMixedTemplateVersions).toBe(false);
  });
});

describe('analyzeFiles — Te Kura file detection', () => {
  let rawHTML1: string;

  beforeAll(() => {
    rawHTML1 = loadFixture('ANZH101_1_0.html');
  });

  it('real Te Kura files are not in nonTekuraFiles', () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: 'ANZH101_1_0.html' },
    ]);
    expect(result.nonTekuraFiles).toHaveLength(0);
  });

  it('non-Te Kura file is added to nonTekuraFiles', () => {
    const nonTekuraHTML = '<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>';

    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: 'ANZH101_1_0.html' },
      { rawHTML: nonTekuraHTML, filename: 'random.html' },
    ]);
    expect(result.nonTekuraFiles).toContain('random.html');
    expect(result.nonTekuraFiles).not.toContain('ANZH101_1_0.html');
  });

  it('non-Te Kura files are still analyzed (informational only)', () => {
    const nonTekuraHTML = '<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>';

    const result = analyzeFiles([
      { rawHTML: nonTekuraHTML, filename: 'random.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.nonTekuraFiles).toContain('random.html');
  });
});
