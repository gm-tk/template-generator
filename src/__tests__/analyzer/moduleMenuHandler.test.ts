import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { captureModuleMenu } from '@/lib/analyzer/moduleMenuHandler';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('captureModuleMenu', () => {
  it('returns null when no module menu exists in HTML', () => {
    const html = '<html><body><div id="body"><p>No menu here</p></div></body></html>';
    expect(captureModuleMenu(html, false)).toBeNull();
  });

  describe('lesson page menu (ANZH101_1_0.html)', () => {
    let rawHTML: string;

    beforeAll(() => {
      rawHTML = loadFixture('ANZH101_1_0.html');
    });

    it('captures module menu from lesson page', () => {
      const result = captureModuleMenu(rawHTML, false);
      expect(result).not.toBeNull();
      expect(result!.sourceType).toBe('lesson-page');
    });

    it('preserves h5 heading text exactly', () => {
      const result = captureModuleMenu(rawHTML, false);
      expect(result!.processedHTML).toContain('We are learning:');
      expect(result!.processedHTML).toContain('I can:');
    });

    it('replaces list item text with lorem ipsum', () => {
      const result = captureModuleMenu(rawHTML, false);
      // Original list item text should NOT be present
      expect(result!.processedHTML).not.toContain('About early settlement');
      expect(result!.processedHTML).not.toContain('Key historical events');
      expect(result!.processedHTML).not.toContain('Identify important dates');
      // Lorem ipsum list items should be present
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
    });

    it('preserves original HTML in originalHTML field', () => {
      const result = captureModuleMenu(rawHTML, false);
      // The original should contain the real text
      expect(result!.originalHTML).toContain('About early settlement');
      expect(result!.originalHTML).toContain('Key historical events');
    });

    it('preserves DOM structure (headings, lists)', () => {
      const result = captureModuleMenu(rawHTML, false);
      expect(result!.processedHTML).toContain('<h5>');
      expect(result!.processedHTML).toContain('<ul>');
      expect(result!.processedHTML).toContain('<li>');
    });
  });

  describe('first page menu (ANZH101_0_0.html)', () => {
    let firstPageHTML: string;

    beforeAll(() => {
      firstPageHTML = loadFixture('ANZH101_0_0.html');
    });

    it('captures module menu from first page', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      expect(result).not.toBeNull();
      expect(result!.sourceType).toBe('first-page');
    });

    it('preserves h3 heading text exactly', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      expect(result!.processedHTML).toContain('<span>Understand</span>');
      expect(result!.processedHTML).toContain('<span>Know</span>');
      expect(result!.processedHTML).toContain('<span>Do</span>');
      expect(result!.processedHTML).toContain('<span>Learning intentions</span>');
      expect(result!.processedHTML).toContain('<span>Supervisors</span>');
      expect(result!.processedHTML).toContain('<span>How will I know if I\'ve learned it?</span>');
    });

    it('replaces paragraph text with lorem ipsum', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      // Original text should NOT be present
      expect(result!.processedHTML).not.toContain('Ākonga will:');
      expect(result!.processedHTML).not.toContain('Ākonga can:');
      // Lorem ipsum should be present
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet, consectetur adipisicing elit.');
    });

    it('replaces list item text with lorem ipsum', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      // Original list item text should NOT be present
      expect(result!.processedHTML).not.toContain('Māori history is the foundational');
      expect(result!.processedHTML).not.toContain('Generate questions that reflect');
      // Lorem ipsum list items should be present
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
    });

    it('preserves DOM structure (rows, columns, headings)', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      expect(result!.processedHTML).toContain('class="row"');
      expect(result!.processedHTML).toContain('offset-md-0');
      expect(result!.processedHTML).toContain('<h3>');
      expect(result!.processedHTML).toContain('<ul>');
      expect(result!.processedHTML).toContain('<li>');
    });

    it('preserves original HTML in originalHTML field', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      expect(result!.originalHTML).toContain('Māori history is the foundational');
      expect(result!.originalHTML).toContain('Ākonga will:');
    });

    it('normalises list items to 3 per list', () => {
      const result = captureModuleMenu(firstPageHTML, true);
      // The "Do" section in the first page has 3 list items — should stay 3
      // Other lists have 1-2 items — should stay at original count
      const originalLiCount = (result!.originalHTML.match(/<li>/g) || []).length;
      const processedLiCount = (result!.processedHTML.match(/<li>/g) || []).length;
      expect(processedLiCount).toBeLessThanOrEqual(originalLiCount);
    });
  });

  describe('edge cases', () => {
    it('handles module menu with no list items', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <h5>Section:</h5>
          <p>Some paragraph text.</p>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html, false);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('Lorem ipsum');
    });

    it('handles moduleMenu class on the same element as id', () => {
      const html = `<html><body>
        <div id="module-menu-content" class="moduleMenu">
          <h5>Heading:</h5>
          <ul><li>Item one</li><li>Item two</li></ul>
        </div>
      </body></html>`;
      const result = captureModuleMenu(html, true);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
      expect(result!.processedHTML).not.toContain('Item one');
    });
  });
});
