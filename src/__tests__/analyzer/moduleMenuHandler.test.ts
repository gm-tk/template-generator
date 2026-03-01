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
    expect(captureModuleMenu(html)).toBeNull();
  });

  describe('lesson page menu (ANZH101_1_0.html)', () => {
    let rawHTML: string;

    beforeAll(() => {
      rawHTML = loadFixture('ANZH101_1_0.html');
    });

    it('captures module menu from lesson page', () => {
      const result = captureModuleMenu(rawHTML);
      expect(result).not.toBeNull();
    });

    it('preserves h5 heading text exactly', () => {
      const result = captureModuleMenu(rawHTML);
      expect(result!.processedHTML).toContain('We are learning:');
      expect(result!.processedHTML).toContain('I can:');
    });

    it('replaces list item text with lorem ipsum', () => {
      const result = captureModuleMenu(rawHTML);
      // Original list item text should NOT be present
      expect(result!.processedHTML).not.toContain('About early settlement');
      expect(result!.processedHTML).not.toContain('Key historical events');
      expect(result!.processedHTML).not.toContain('Identify important dates');
      // Lorem ipsum list items should be present
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
    });

    it('preserves original HTML in originalHTML field', () => {
      const result = captureModuleMenu(rawHTML);
      // The original should contain the real text
      expect(result!.originalHTML).toContain('About early settlement');
      expect(result!.originalHTML).toContain('Key historical events');
    });

    it('preserves DOM structure (headings, lists)', () => {
      const result = captureModuleMenu(rawHTML);
      expect(result!.processedHTML).toContain('<h5>');
      expect(result!.processedHTML).toContain('<ul>');
      expect(result!.processedHTML).toContain('<li>');
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
      const result = captureModuleMenu(html);
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
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
      expect(result!.processedHTML).not.toContain('Item one');
    });

    it('normalises list items to 3 per list', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
            <li>Item 4</li>
            <li>Item 5</li>
          </ul>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      const processedLiCount = (result!.processedHTML.match(/<li>/g) || []).length;
      expect(processedLiCount).toBe(3);
    });

    it('preserves list items when fewer than 3', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      const processedLiCount = (result!.processedHTML.match(/<li>/g) || []).length;
      expect(processedLiCount).toBe(2);
    });

    it('preserves h3 heading text with child spans', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <h3><span>Understand</span></h3>
          <p>Some text to replace.</p>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('<span>Understand</span>');
    });

    it('preserves h4 heading text exactly', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <h4>Learning outcomes</h4>
          <p>Paragraph to replace.</p>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('Learning outcomes');
    });

    it('replaces paragraph text with lorem ipsum', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <p>Original paragraph text that should be replaced.</p>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).not.toContain('Original paragraph text');
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet, consectetur adipisicing elit.');
    });

    it('cycles through lorem ipsum variants for list items', () => {
      const html = `<html><body>
        <div id="module-menu-content"><div class="moduleMenu">
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </div></div>
      </body></html>`;
      const result = captureModuleMenu(html);
      expect(result).not.toBeNull();
      expect(result!.processedHTML).toContain('Lorem ipsum dolor sit amet.');
      expect(result!.processedHTML).toContain('Consetetur sadipscing elitr.');
      expect(result!.processedHTML).toContain('Sed diam nonumy eirmod tempor.');
    });
  });
});
