import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { analyzeFile, analyzeFiles } from '@/lib/analyzer/pipeline';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';
import type { ParsedElement } from '@/lib/analyzer/types';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

function hasElementWithClass(element: ParsedElement, className: string): boolean {
  if (element.classes.includes(className)) return true;
  return element.children.some((child) => hasElementWithClass(child, className));
}

describe('analyzeFile with custom registry', () => {
  it('default registry (no customRegistry param) → same results as before', () => {
    const html = loadFixture('ANZH101_1_0.html');
    const result = analyzeFile(html, 'ANZH101_1_0.html');

    // videoSection should be excluded from AST (it's in the default registry)
    expect(hasElementWithClass(result.ast, 'videoSection')).toBe(false);
    // But detected before exclusion
    expect(result.hasVideoSection).toBe(true);
  });

  it('custom registry without videoSection → videoSection elements appear in processed AST', () => {
    const html = loadFixture('ANZH101_1_0.html');
    // Create a custom registry that does NOT include videoSection
    const customRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    customRegistry.delete('videoSection');

    const result = analyzeFile(html, 'ANZH101_1_0.html', customRegistry);

    // videoSection should still be in the AST since it's not in the custom registry
    expect(hasElementWithClass(result.ast, 'videoSection')).toBe(true);
    // Special detection should still work (it happens before exclusion)
    expect(result.hasVideoSection).toBe(true);
  });

  it('custom registry with alert added → div.alert elements are excluded', () => {
    const html = loadFixture('ANZH101_1_0.html');
    const customRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    customRegistry.add('alert');

    const result = analyzeFile(html, 'ANZH101_1_0.html', customRegistry);

    // alert should be excluded from AST
    expect(hasElementWithClass(result.ast, 'alert')).toBe(false);
  });

  it('empty custom registry → nothing is excluded', () => {
    const html = loadFixture('ANZH101_1_0.html');
    const emptyRegistry = new Set<string>();

    const result = analyzeFile(html, 'ANZH101_1_0.html', emptyRegistry);

    // Elements that are normally excluded should now be present
    expect(hasElementWithClass(result.ast, 'videoSection')).toBe(true);
    expect(hasElementWithClass(result.ast, 'moduleMenu')).toBe(true);
  });
});

describe('analyzeFiles with custom registry', () => {
  it('custom registry is passed through to consensus building', () => {
    const html1 = loadFixture('ANZH101_1_0.html');
    const html2 = loadFixture('ANZH101_2_0.html');
    const html3 = loadFixture('ANZH101_3_0.html');

    // Use default registry
    const defaultResult = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
      { rawHTML: html2, filename: 'ANZH101_2_0.html' },
      { rawHTML: html3, filename: 'ANZH101_3_0.html' },
    ]);

    // Use custom registry that adds 'alert' (normally NOT excluded)
    const customRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    customRegistry.add('alert');

    const customResult = analyzeFiles(
      [
        { rawHTML: html1, filename: 'ANZH101_1_0.html' },
        { rawHTML: html2, filename: 'ANZH101_2_0.html' },
        { rawHTML: html3, filename: 'ANZH101_3_0.html' },
      ],
      0.5,
      customRegistry
    );

    // Default result should have alert patterns in consensus
    const defaultAlertPatterns = defaultResult.consensus.patterns.filter(p => p.id === 'alert');
    expect(defaultAlertPatterns.length).toBeGreaterThan(0);

    // Custom result with alert excluded should NOT have alert in consensus
    const customAlertPatterns = customResult.consensus.patterns.filter(p => p.id === 'alert');
    expect(customAlertPatterns).toHaveLength(0);
  });

  it('all existing tests still pass when no custom registry is provided', () => {
    const html1 = loadFixture('ANZH101_1_0.html');
    const result = analyzeFiles([
      { rawHTML: html1, filename: 'ANZH101_1_0.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.moduleCode.code).toBe('ANZH101');
    expect(result.hasVideoSection).toBe(true);
  });
});
