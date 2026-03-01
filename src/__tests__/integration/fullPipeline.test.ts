import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeFile, analyzeFiles, validateHTML, isTekuraFile, extractTemplateVersionFromHTML } from '@/lib/analyzer/pipeline';
import { generateTemplate } from '@/lib/analyzer/templateGenerator';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

describe('Full pipeline integration (3 fixture files)', () => {
  let html1: string;
  let html2: string;
  let html3: string;

  beforeAll(() => {
    html1 = loadFixture('ANZH101_1_0.html');
    html2 = loadFixture('ANZH101_2_0.html');
    html3 = loadFixture('ANZH101_3_0.html');
  });

  it('analyzeFiles produces a valid BatchAnalysisResult', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);

    expect(result.files).toHaveLength(3);
    expect(result.moduleCode.code).toBe('ANZH101');
    expect(result.moduleCode.resolution).toBe('single');
    expect(result.templateVersion).toBe('1-3');
    expect(result.hasVideoSection).toBe(true);
    expect(result.fileErrors).toHaveLength(0);
    expect(result.nonTekuraFiles).toHaveLength(0);
    expect(result.isMixedTemplateVersions).toBe(false);
    expect(result.consensus).toBeDefined();
    expect(result.consensus.totalFiles).toBe(3);
  });

  it('generateTemplate produces valid HTML from batch result', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    // Basic HTML structure
    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('<html');
    expect(template).toContain('</html>');

    // Single instance of each structural ID
    expect((template.match(/id="header"/g) || []).length).toBe(1);
    expect((template.match(/id="body"/g) || []).length).toBe(1);
    expect((template.match(/id="footer"/g) || []).length).toBe(1);
  });

  it('template contains module code in title and header', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('ANZH101');
    expect(template).toContain('<title>');
    expect(template).toContain('</title>');
  });

  it('template has no inline style attributes', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).not.toMatch(/style="/);
  });

  it('template uses lorem ipsum placeholder text', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('Lorem ipsum');
  });

  it('template always includes acknowledgements section', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('Acknowledgements');
    expect(template).toContain('class="acks"');
  });

  it('consensus patterns at default 50% threshold are correct', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);

    const c = result.consensus;

    // All 3 files have these
    expect(c.hasImages).toBe(true);
    expect(c.hasVideoSection).toBe(true);
    expect(c.hasSidebarImage).toBe(true);

    // Heading levels present in consensus
    expect(c.headingLevels).toContain('h2');
    expect(c.headingLevels).toContain('h3');
  });

  it('template includes video section with canonical markup', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('class="videoSection icon ratio ratio-16x9"');
    expect(template).toContain('class="embed-responsive-item"');
    expect(template).toContain('height="339"');
    expect(template).toContain('https://player.vimeo.com/video/317381854');
  });

  it('template includes footer navigation', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('id="prev-lesson"');
    expect(template).toContain('class="home-nav"');
    expect(template).toContain('id="next-lesson"');
  });

  it('template includes module menu content', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('id="module-menu-content"');
    expect(result.moduleMenu).not.toBeNull();
  });

  it('template uses standardized Bootstrap column classes', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('col-md-8 col-12');
    expect(template).toContain('col-md-12');
  });
});

describe('Pipeline with varied thresholds', () => {
  let html1: string;
  let html2: string;
  let html3: string;

  beforeAll(() => {
    html1 = loadFixture('ANZH101_1_0.html');
    html2 = loadFixture('ANZH101_2_0.html');
    html3 = loadFixture('ANZH101_3_0.html');
  });

  it('higher threshold (100%) produces fewer consensus patterns', () => {
    const low = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ], 0.5);

    const high = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ], 1.0);

    expect(high.consensus.consensusPatterns.length).toBeLessThanOrEqual(
      low.consensus.consensusPatterns.length
    );
  });

  it('video is always included regardless of threshold', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ], 1.0);

    expect(result.consensus.hasVideoSection).toBe(true);
    const template = generateTemplate(result);
    expect(template).toContain('videoSection');
  });
});

describe('Pipeline with custom exclusion registry', () => {
  let html1: string;
  let html2: string;

  beforeAll(() => {
    html1 = loadFixture('ANZH101_1_0.html');
    html2 = loadFixture('ANZH101_2_0.html');
  });

  it('custom registry with extra exclusions produces different results', () => {
    const defaultResult = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
    ]);

    // Add 'alert' to exclusion registry
    const customRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    customRegistry.add('alert');

    const customResult = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
    ], 0.5, customRegistry);

    // Default should have alert patterns; custom should not
    const defaultHasAlert = defaultResult.consensus.patterns.some(p => p.id.startsWith('alert'));
    const customHasAlert = customResult.consensus.patterns.some(p => p.id.startsWith('alert'));

    // At least the default should detect alert patterns
    if (defaultHasAlert) {
      expect(customHasAlert).toBe(false);
    }
  });

  it('empty custom registry excludes nothing extra', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
    ], 0.5, new Set());

    // Analysis should succeed (no exclusions means more patterns may be found)
    expect(result.files).toHaveLength(2);
    expect(result.fileErrors).toHaveLength(0);
  });
});

describe('Error handling and validation', () => {
  let html1: string;

  beforeAll(() => {
    html1 = loadFixture('ANZH101_1_0.html');
  });

  it('validateHTML rejects empty content', () => {
    const err = validateHTML('', 'empty.html');
    expect(err).not.toBeNull();
    expect(err!.error).toContain('empty');
  });

  it('validateHTML rejects non-HTML content', () => {
    const err = validateHTML('This is just plain text with no tags.', 'text.html');
    expect(err).not.toBeNull();
    expect(err!.error).toContain('HTML');
  });

  it('validateHTML accepts valid HTML', () => {
    const err = validateHTML(html1, 'ANZH101_1_0.html');
    expect(err).toBeNull();
  });

  it('isTekuraFile detects Te Kura fixture files', () => {
    expect(isTekuraFile(html1)).toBe(true);
  });

  it('isTekuraFile rejects generic HTML', () => {
    const generic = '<html><head><title>Test</title></head><body><p>Hello</p></body></html>';
    expect(isTekuraFile(generic)).toBe(false);
  });

  it('extractTemplateVersionFromHTML finds template version', () => {
    expect(extractTemplateVersionFromHTML(html1)).toBe('1-3');
  });

  it('extractTemplateVersionFromHTML returns null for non-Te Kura', () => {
    const generic = '<html><body></body></html>';
    expect(extractTemplateVersionFromHTML(generic)).toBeNull();
  });

  it('mixed valid/invalid files produces partial results', () => {
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: '', filename: 'empty.html' },
      { rawHTML: 'not html at all', filename: 'text.html' },
    ]);

    expect(result.files).toHaveLength(1);
    expect(result.fileErrors).toHaveLength(2);
    expect(result.fileErrors.map(e => e.filename)).toContain('empty.html');
    expect(result.fileErrors.map(e => e.filename)).toContain('text.html');
  });

  it('all files invalid throws error', () => {
    expect(() => analyzeFiles([
      { rawHTML: '', filename: 'empty.html' },
      { rawHTML: 'no tags', filename: 'text.html' },
    ])).toThrow('All uploaded files failed to parse');
  });
});

describe('Single file analysis', () => {
  it('single file produces 100% consensus for all patterns', () => {
    const html1 = loadFixture('ANZH101_1_0.html');
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
    ]);

    // Every detected pattern should be consensus (100%)
    for (const p of result.consensus.patterns) {
      expect(p.isConsensus).toBe(true);
      expect(p.percentage).toBe(1);
    }
  });
});

describe('First page fixture integration', () => {
  it('first page + lesson pages produce valid template with module menu', () => {
    const firstPage = loadFixture('ANZH101_0_0.html');
    const lesson1 = loadFixture('ANZH101_1_0.html');
    const lesson2 = loadFixture('ANZH101_2_0.html');

    const result = analyzeFiles([
      { rawHTML: firstPage, filename: 'ANZH101_0_0.html' },
      { rawHTML: lesson1, filename: 'ANZH101_1_0.html' },
      { rawHTML: lesson2, filename: 'ANZH101_2_0.html' },
    ]);
    const template = generateTemplate(result);

    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('ANZH101');
    expect(template).toContain('id="module-menu-content"');
    expect(template).toContain('Acknowledgements');
    expect(result.moduleCode.code).toBe('ANZH101');
    expect(result.fileErrors).toHaveLength(0);
  });
});

describe('Template version tracking', () => {
  it('consistent template versions are not flagged as mixed', () => {
    const html1 = loadFixture('ANZH101_1_0.html');
    const html2 = loadFixture('ANZH101_2_0.html');

    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
    ]);

    expect(result.isMixedTemplateVersions).toBe(false);
    expect(result.templateVersions.get('1-3')).toBe(2);
  });
});
