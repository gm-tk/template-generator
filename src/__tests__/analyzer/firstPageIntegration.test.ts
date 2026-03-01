import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeFile, analyzeFiles } from '@/lib/analyzer/pipeline';
import { generateTemplate } from '@/lib/analyzer/templateGenerator';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('First page (00) fixture processing', () => {
  it('analyzeFile processes the first page fixture without errors', () => {
    const html = loadFixture('ANZH101_0_0.html');
    const result = analyzeFile(html, 'ANZH101_0_0.html');

    expect(result.filename).toBe('ANZH101_0_0.html');
    expect(result.moduleCode).toBe('ANZH101');
    expect(result.templateVersion).toBe('1-3');
    expect(result.ast).toBeDefined();
  });

  it('first page has module menu capture', () => {
    const html = loadFixture('ANZH101_0_0.html');
    const result = analyzeFile(html, 'ANZH101_0_0.html');

    expect(result.moduleMenuCapture).not.toBeNull();
    expect(result.moduleMenuCapture!.processedHTML).toBeDefined();
    expect(result.moduleMenuCapture!.originalHTML).toBeDefined();
  });

  it('first page module menu preserves h4 and h5 heading text', () => {
    const html = loadFixture('ANZH101_0_0.html');
    const result = analyzeFile(html, 'ANZH101_0_0.html');

    const processedHTML = result.moduleMenuCapture!.processedHTML;
    // h4 and h5 headings should be preserved
    expect(processedHTML).toContain('We are learning:');
    expect(processedHTML).toContain('I can:');
  });

  it('first page module menu preserves tab labels', () => {
    const html = loadFixture('ANZH101_0_0.html');
    const result = analyzeFile(html, 'ANZH101_0_0.html');

    const processedHTML = result.moduleMenuCapture!.processedHTML;
    expect(processedHTML).toContain('Overview');
    expect(processedHTML).toContain('Information');
  });
});

describe('Batch with first page + lesson pages', () => {
  let firstPageHTML: string;
  let lessonHTML1: string;
  let lessonHTML2: string;
  let lessonHTML3: string;

  beforeAll(() => {
    firstPageHTML = loadFixture('ANZH101_0_0.html');
    lessonHTML1 = loadFixture('ANZH101_1_0.html');
    lessonHTML2 = loadFixture('ANZH101_2_0.html');
    lessonHTML3 = loadFixture('ANZH101_3_0.html');
  });

  it('batch with first page produces valid template', () => {
    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
      { rawHTML: lessonHTML1, filename: 'ANZH101_1_0.html' },
      { rawHTML: lessonHTML2, filename: 'ANZH101_2_0.html' },
      { rawHTML: lessonHTML3, filename: 'ANZH101_3_0.html' },
    ]);
    const html = generateTemplate(result);

    expect(html).toContain('<!DOCTYPE html>');
    expect((html.match(/id="header"/g) || []).length).toBe(1);
    expect((html.match(/id="body"/g) || []).length).toBe(1);
    expect((html.match(/id="footer"/g) || []).length).toBe(1);
    expect(html).toContain('ANZH101');
  });

  it('module code matches ANZH101 from all files', () => {
    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
      { rawHTML: lessonHTML1, filename: 'ANZH101_1_0.html' },
    ]);

    expect(result.moduleCode.code).toBe('ANZH101');
    expect(result.moduleCode.resolution).toBe('single');
  });

  it('module menu is captured and rendered in template', () => {
    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
      { rawHTML: lessonHTML1, filename: 'ANZH101_1_0.html' },
    ]);
    const html = generateTemplate(result);

    expect(html).toContain('id="module-menu-content"');
    expect(result.moduleMenu).not.toBeNull();
  });

  it('footer navigation is present in template', () => {
    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
      { rawHTML: lessonHTML1, filename: 'ANZH101_1_0.html' },
    ]);
    const html = generateTemplate(result);

    expect(html).toContain('id="prev-lesson"');
    expect(html).toContain('class="home-nav"');
    expect(html).toContain('id="next-lesson"');
  });

  it('acknowledgements section always present', () => {
    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
      { rawHTML: lessonHTML1, filename: 'ANZH101_1_0.html' },
    ]);
    const html = generateTemplate(result);

    expect(html).toContain('Acknowledgements');
    expect(html).toContain('class="acks"');
  });
});

describe('Batch with ONLY lesson pages (no first page)', () => {
  it('template uses simple lesson-page header', () => {
    const html1 = loadFixture('ANZH101_1_0.html');
    const html2 = loadFixture('ANZH101_2_0.html');

    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
    ]);
    const template = generateTemplate(result);

    // Should have module menu content
    expect(template).toContain('id="module-menu-content"');
    // Module menu should contain lesson-page headings
    expect(template).toContain('We are learning:');
    expect(template).toContain('I can:');
  });
});

describe('Batch with ONLY first page', () => {
  it('single first page treated normally, template generated', () => {
    const firstPageHTML = loadFixture('ANZH101_0_0.html');

    const result = analyzeFiles([
      { rawHTML: firstPageHTML, filename: 'ANZH101_0_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('ANZH101');
    expect(template).toContain('Acknowledgements');
    expect((template.match(/id="header"/g) || []).length).toBe(1);
  });
});
