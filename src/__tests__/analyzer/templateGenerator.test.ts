import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateTemplate } from '@/lib/analyzer/templateGenerator';
import { analyzeFiles } from '@/lib/analyzer/pipeline';
import type {
    BatchAnalysisResult,
    ConsensusModel,
    ModuleCodeResult,
} from '@/lib/analyzer/types';

const FIXTURES_DIR = join(__dirname, '../../test-fixtures');

function loadFixture(filename: string): string {
    return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

/**
 * Creates a minimal BatchAnalysisResult for unit testing.
 */
function createMockBatchResult(
    overrides: Partial<{
        moduleCode: string;
        templateVersion: string | null;
        hasVideoSection: boolean;
        hasAcknowledgements: boolean;
        moduleMenu: BatchAnalysisResult['moduleMenu'];
        consensus: Partial<ConsensusModel>;
    }> = {}
): BatchAnalysisResult {
    const defaultConsensus: ConsensusModel = {
        threshold: 0.5,
        totalFiles: 1,
        patterns: [],
        consensusPatterns: [],
        headingLevels: [],
        alertVariants: [],
        hasVideoSection: false,
        hasSidebarAlertActivity: false,
        hasSidebarImage: false,
        hasQuoteText: false,
        hasTables: false,
        hasImages: false,
        hasOrderedLists: false,
        hasUnorderedLists: false,
        hasButtons: false,
        hasExternalButtons: false,
        activityTypes: [],
    };

    const moduleCodeResult: ModuleCodeResult = {
        code: overrides.moduleCode ?? 'TEST101',
        resolution: 'single',
        perFileCode: { 'test.html': overrides.moduleCode ?? 'TEST101' },
    };

    return {
        files: [],
        moduleCode: moduleCodeResult,
        moduleMenu: overrides.moduleMenu ?? null,
        templateVersion: overrides.templateVersion !== undefined ? overrides.templateVersion : '1-3',
        hasVideoSection: overrides.hasVideoSection ?? false,
        hasAcknowledgements: overrides.hasAcknowledgements ?? false,
        consensus: { ...defaultConsensus, ...overrides.consensus },
        fileErrors: [],
        templateVersions: new Map(),
        isMixedTemplateVersions: false,
        nonTekuraFiles: [],
    };
}

// ──────────────────────────────────────────────────────────
// Integration tests using real ANZH101 fixtures
// ──────────────────────────────────────────────────────────

describe('generateTemplate — integration with ANZH101 fixtures', () => {
    let batchResult: BatchAnalysisResult;
    let template: string;

    beforeAll(() => {
        const files = [
            { rawHTML: loadFixture('ANZH101_1_0.html'), filename: 'ANZH101_1_0.html' },
            { rawHTML: loadFixture('ANZH101_2_0.html'), filename: 'ANZH101_2_0.html' },
            { rawHTML: loadFixture('ANZH101_3_0.html'), filename: 'ANZH101_3_0.html' },
        ];
        batchResult = analyzeFiles(files);
        template = generateTemplate(batchResult);
    });

    describe('structural validity', () => {
        it('starts with <!DOCTYPE html>', () => {
            expect(template).toMatch(/^<!DOCTYPE html>/);
        });

        it('has <html>, <head>, and <body> tags', () => {
            expect(template).toContain('<html');
            expect(template).toContain('<head>');
            expect(template).toContain('<body>');
            expect(template).toContain('</body>');
            expect(template).toContain('</html>');
        });

        it('contains exactly ONE element with id="header"', () => {
            const matches = template.match(/id="header"/g);
            expect(matches).not.toBeNull();
            expect(matches!.length).toBe(1);
        });

        it('contains exactly ONE element with id="body"', () => {
            const matches = template.match(/id="body"/g);
            expect(matches).not.toBeNull();
            expect(matches!.length).toBe(1);
        });

        it('contains exactly ONE element with id="footer"', () => {
            const matches = template.match(/id="footer"/g);
            expect(matches).not.toBeNull();
            expect(matches!.length).toBe(1);
        });

        it('contains no duplicate id attributes', () => {
            const idPattern = /id="([^"]+)"/g;
            const ids: string[] = [];
            let match;
            while ((match = idPattern.exec(template)) !== null) {
                ids.push(match[1]);
            }
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });

        it('contains ZERO style= attributes', () => {
            expect(template).not.toMatch(/style="/);
            expect(template).not.toMatch(/style='/);
        });

        it('contains the <title> tag with module code', () => {
            expect(template).toContain('<title>0.0 ANZH101 - Module Title Lorem Ipsum</title>');
        });
    });

    describe('content correctness', () => {
        it('contains lorem ipsum text', () => {
            const loremCount = (template.match(/Lorem ipsum/g) || []).length;
            expect(loremCount).toBeGreaterThan(5);
        });

        it('does NOT contain developer labels', () => {
            expect(template).not.toContain('Body paragraph text');
            expect(template).not.toContain('Section Heading');
            expect(template).not.toContain('Main content area');
        });

        it('contains <h4> section labels', () => {
            expect(template).toContain('<h4>Paragraph</h4>');
            expect(template).toContain('<h4>Activity</h4>');
            expect(template).toContain('<h4>Video</h4>');
        });

        it('contains <hr> dividers between sections', () => {
            expect(template).toContain('<hr>');
        });
    });

    describe('consensus-driven sections', () => {
        it('contains heading levels in consensus (h2, h3)', () => {
            expect(template).toContain('<h2>Heading H2</h2>');
            expect(template).toContain('<h3>Heading H3</h3>');
        });

        it('contains paragraph section', () => {
            expect(template).toContain('<h4>Paragraph</h4>');
        });

        it('contains video section (all 3 files have videoSection)', () => {
            expect(template).toContain('<h4>Video</h4>');
        });

        it('contains the canonical video markup', () => {
            expect(template).toContain('src="https://player.vimeo.com/video/317381854"');
            expect(template).toContain('videoSection icon ratio ratio-16x9');
            expect(template).toContain('class="embed-responsive-item"');
            expect(template).toContain('height="339"');
        });

        it('does NOT contain YouTube URLs in video section', () => {
            // The only YouTube URL should be in acknowledgements placeholder
            const videoSectionStart = template.indexOf('videoSection icon');
            const videoSectionEnd = template.indexOf('</iframe>', videoSectionStart);
            if (videoSectionStart !== -1 && videoSectionEnd !== -1) {
                const videoMarkup = template.slice(videoSectionStart, videoSectionEnd);
                expect(videoMarkup).not.toContain('youtube');
            }
        });

        it('contains alert section (all 3 files have alerts)', () => {
            expect(template).toContain('<h4>Alerts</h4>');
            expect(template).toContain('class="alert"');
        });

        it('contains standard activity section (all 3 files)', () => {
            expect(template).toContain('<h4>Activity</h4>');
            expect(template).toContain('class="activity alertPadding"');
        });

        it('contains interactive activity section (2 of 3 files)', () => {
            expect(template).toContain('<h4>Activity (Interactive)</h4>');
            expect(template).toContain('class="activity interactive"');
        });

        it('contains unordered list section (2 of 3 files)', () => {
            expect(template).toContain('<h4>Unordered List</h4>');
            expect(template).toContain('<ul>');
        });

        it('does NOT contain ordered list section (only 1 of 3 files)', () => {
            expect(template).not.toContain('<h4>Ordered List</h4>');
        });

        it('does NOT contain table section (only 1 of 3 files)', () => {
            expect(template).not.toContain('<h4>Generic Table</h4>');
        });

        it('does NOT contain quote section (only 1 of 3 files)', () => {
            expect(template).not.toContain('<h4>.quoteText');
        });
    });

    describe('module code', () => {
        it('contains module code ANZH101 in the <title> tag', () => {
            expect(template).toContain('ANZH101');
            expect(template).toMatch(/<title>.*ANZH101.*<\/title>/);
        });

        it('contains module code in #module-code > h1', () => {
            expect(template).toMatch(/id="module-code"[\s\S]*?<h1>ANZH101<\/h1>/);
        });
    });

    describe('module menu', () => {
        it('contains module menu content', () => {
            expect(template).toContain('id="module-menu-content"');
        });

        it('menu contains <h5> headings with preserved text', () => {
            expect(template).toContain('<h5>');
        });
    });

    describe('acknowledgements', () => {
        it('ALWAYS contains the acknowledgements section', () => {
            expect(template).toContain('Acknowledgements');
            expect(template).toContain('class="acks"');
        });

        it('contains <span class="currentYear"></span>', () => {
            expect(template).toContain('<span class="currentYear"></span>');
        });

        it('contains the copyright text', () => {
            expect(template).toContain('Te Aho o Te Kura Pounamu');
        });
    });

    describe('bootstrap column standardization', () => {
        it('contains col-md-8 col-12 for primary content columns', () => {
            expect(template).toContain('col-md-8 col-12');
        });

        it('contains col-md-12 for full-width label rows', () => {
            expect(template).toContain('col-md-12');
        });

        it('contains col-12 for activity inner columns', () => {
            // Activity standard uses col-12 inside
            expect(template).toMatch(/class="activity alertPadding"[\s\S]*?class="col-12"/);
        });
    });

    describe('activity numbering', () => {
        it('activities use sequential numbering starting with 1A', () => {
            expect(template).toContain('number="1A"');
        });

        it('interactive activity gets 1B', () => {
            expect(template).toContain('number="1B"');
        });
    });

    describe('footer', () => {
        it('contains ul.footer-nav', () => {
            expect(template).toContain('class="footer-nav"');
        });

        it('contains #prev-lesson link', () => {
            expect(template).toContain('id="prev-lesson"');
        });

        it('contains .home-nav link', () => {
            expect(template).toContain('class="home-nav"');
        });

        it('contains #next-lesson link', () => {
            expect(template).toContain('id="next-lesson"');
        });
    });

    describe('script references', () => {
        it('contains stickyNav.js local script', () => {
            expect(template).toContain('src="stickyNav.js"');
        });

        it('contains the correct CDN URL for idoc_scripts.js', () => {
            expect(template).toContain('src="https://tekura.desire2learn.com/shared/refresh_template/js/idoc_scripts.js"');
        });
    });
});

// ──────────────────────────────────────────────────────────
// Unit tests with mock BatchAnalysisResult
// ──────────────────────────────────────────────────────────

describe('generateTemplate — unit tests with mocks', () => {
    describe('edge case: no consensus patterns at all', () => {
        it('produces valid HTML with empty body sections', () => {
            const result = createMockBatchResult();
            const template = generateTemplate(result);

            expect(template).toMatch(/^<!DOCTYPE html>/);
            expect(template).toContain('id="header"');
            expect(template).toContain('id="body"');
            expect(template).toContain('id="footer"');
            expect(template).toContain('class="acks"');
        });

        it('still contains acknowledgements', () => {
            const result = createMockBatchResult();
            const template = generateTemplate(result);

            expect(template).toContain('Acknowledgements');
            expect(template).toContain('<span class="currentYear"></span>');
        });

        it('does not contain any <hr> when no body sections exist', () => {
            const result = createMockBatchResult();
            const template = generateTemplate(result);

            // No sections means no <hr> dividers in the body
            const bodyStart = template.indexOf('id="body"');
            const bodyEnd = template.indexOf('id="footer"');
            const bodyContent = template.slice(bodyStart, bodyEnd);
            expect(bodyContent).not.toContain('<hr>');
        });
    });

    describe('edge case: all patterns in consensus', () => {
        it('includes all sections in correct order', () => {
            const result = createMockBatchResult({
                consensus: {
                    headingLevels: ['h2', 'h3', 'h4', 'h5'],
                    hasVideoSection: true,
                    hasSidebarImage: true,
                    hasQuoteText: true,
                    hasTables: true,
                    hasImages: true,
                    hasOrderedLists: true,
                    hasUnorderedLists: true,
                    hasButtons: true,
                    hasExternalButtons: true,
                    hasSidebarAlertActivity: true,
                    alertVariants: ['alert', 'alert.solid'],
                    activityTypes: ['standard', 'interactive', 'dropbox'],
                    consensusPatterns: [{ id: 'paragraph', label: 'Paragraph', category: 'paragraph', fileCount: 1, presentInFiles: ['test.html'], totalFiles: 1, percentage: 1, isConsensus: true, variants: [] }],
                },
            });
            const template = generateTemplate(result);

            // Verify order by checking position of section labels
            const positions = [
                template.indexOf('Heading H2'),
                template.indexOf('<h4>Paragraph</h4>'),
                template.indexOf('<h4>Paragraph with Sidebar Image</h4>'),
                template.indexOf('<h4>.quoteText'),
                template.indexOf('<h4>Unordered List</h4>'),
                template.indexOf('<h4>Ordered List</h4>'),
                template.indexOf('<h4>Generic Table</h4>'),
                template.indexOf('<h4>Images</h4>'),
                template.indexOf('<h4>Video</h4>'),
                template.indexOf('<h4>Alerts</h4>'),
                template.indexOf('<h4>Sidebar Alert Activity</h4>'),
                template.indexOf('<h4>Activity</h4>'),
                template.indexOf('<h4>Activity (Interactive)</h4>'),
                template.indexOf('<h4>Activity (Dropbox)</h4>'),
                template.indexOf('<h4>Button</h4>'),
                template.indexOf('<h4>External Button</h4>'),
            ];

            // All positions should be found
            for (const pos of positions) {
                expect(pos).toBeGreaterThan(-1);
            }

            // Each position should be less than the next
            for (let i = 0; i < positions.length - 1; i++) {
                expect(positions[i]).toBeLessThan(positions[i + 1]);
            }
        });

        it('assigns sequential activity numbers 1A, 1B, 1C', () => {
            const result = createMockBatchResult({
                consensus: {
                    activityTypes: ['standard', 'interactive', 'dropbox'],
                },
            });
            const template = generateTemplate(result);

            expect(template).toContain('number="1A"');
            expect(template).toContain('number="1B"');
            expect(template).toContain('number="1C"');
        });
    });

    describe('template version', () => {
        it('uses provided template version', () => {
            const result = createMockBatchResult({ templateVersion: '4-6' });
            const template = generateTemplate(result);

            expect(template).toContain('template="4-6"');
        });

        it('defaults to 9-10 when template version is null', () => {
            const result = createMockBatchResult({ templateVersion: null });
            const template = generateTemplate(result);

            expect(template).toContain('template="9-10"');
        });
    });

    describe('module code handling', () => {
        it('uses the resolved module code in title and header', () => {
            const result = createMockBatchResult({ moduleCode: 'ENGI401' });
            const template = generateTemplate(result);

            expect(template).toContain('<title>0.0 ENGI401 - Module Title Lorem Ipsum</title>');
            expect(template).toContain('<h1>ENGI401</h1>');
        });

        it('handles [MODULE_CODE] literal', () => {
            const result = createMockBatchResult({ moduleCode: '[MODULE_CODE]' });
            const template = generateTemplate(result);

            expect(template).toContain('[MODULE_CODE]');
        });
    });

    describe('module menu fallback', () => {
        it('generates default menu when no module menu is available', () => {
            const result = createMockBatchResult({ moduleMenu: null });
            const template = generateTemplate(result);

            expect(template).toContain('We are learning:');
            expect(template).toContain('I can:');
            expect(template).toContain('Lorem ipsum dolor sit amet.');
        });

        it('uses processedHTML when module menu is available', () => {
            const result = createMockBatchResult({
                moduleMenu: {
                    processedHTML: '<h5>Custom heading:</h5><ul><li>Lorem ipsum dolor sit amet.</li></ul>',
                    originalHTML: '<h5>Custom heading:</h5><ul><li>Original text</li></ul>',
                },
            });
            const template = generateTemplate(result);

            expect(template).toContain('Custom heading:');
            expect(template).not.toContain('Original text');
        });
    });

    describe('individual sections', () => {
        it('generates heading hierarchy section', () => {
            const result = createMockBatchResult({
                consensus: { headingLevels: ['h2', 'h4'] },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h2>Heading H2</h2>');
            expect(template).toContain('<h4>Heading H4</h4>');
            expect(template).not.toContain('<h3>Heading H3</h3>');
        });

        it('generates paragraph section with inline formatting', () => {
            const result = createMockBatchResult({
                consensus: {
                    consensusPatterns: [{ id: 'paragraph', label: 'Paragraph', category: 'paragraph', fileCount: 1, presentInFiles: ['test.html'], totalFiles: 1, percentage: 1, isConsensus: true, variants: [] }],
                },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Paragraph</h4>');
            expect(template).toContain('<b>');
            expect(template).toContain('<i>');
            expect(template).toContain('<a href="" target="_blank">');
        });

        it('generates sidebar image section', () => {
            const result = createMockBatchResult({
                consensus: { hasSidebarImage: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Paragraph with Sidebar Image</h4>');
            expect(template).toContain('https://placehold.co/600x400?text=Sidebar+Image');
            expect(template).toContain('col-md-4 offset-md-0 col-12');
        });

        it('generates quote text section', () => {
            const result = createMockBatchResult({
                consensus: { hasQuoteText: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>.quoteText - .quoteAck</h4>');
            expect(template).toContain('class="quoteText"');
            expect(template).toContain('class="quoteAck"');
            expect(template).toContain('\u2014 Lorem Ipsum');
        });

        it('generates unordered list section', () => {
            const result = createMockBatchResult({
                consensus: { hasUnorderedLists: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Unordered List</h4>');
            expect(template).toContain('<ul>');
            expect(template).toContain('<li>Lorem ipsum dolor sit amet.</li>');
        });

        it('generates ordered list section', () => {
            const result = createMockBatchResult({
                consensus: { hasOrderedLists: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Ordered List</h4>');
            expect(template).toContain('<ol>');
        });

        it('generates table section', () => {
            const result = createMockBatchResult({
                consensus: { hasTables: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Generic Table</h4>');
            expect(template).toContain('class="table-responsive"');
            expect(template).toContain('class="table"');
            expect(template).toContain('<thead>');
            expect(template).toContain('<tbody>');
        });

        it('generates image section with placeholder and caption', () => {
            const result = createMockBatchResult({
                consensus: { hasImages: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Images</h4>');
            expect(template).toContain('https://placehold.co/1280x720?text=Image+Placeholder');
            expect(template).toContain('class="captionText"');
            expect(template).toContain('flex-end');
            expect(template).toContain('paddingL');
        });

        it('generates canonical video section', () => {
            const result = createMockBatchResult({
                consensus: { hasVideoSection: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Video</h4>');
            expect(template).toContain('class="videoSection icon ratio ratio-16x9"');
            expect(template).toContain('class="embed-responsive-item"');
            expect(template).toContain('height="339"');
            expect(template).toContain('src="https://player.vimeo.com/video/317381854"');
        });

        it('generates alert sections for each variant', () => {
            const result = createMockBatchResult({
                consensus: {
                    alertVariants: ['alert', 'alert.solid', 'alert.top', 'alert.blank'],
                },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Alerts</h4>');
            expect(template).toContain('class="alert"');
            expect(template).toContain('class="alert solid"');
            expect(template).toContain('class="alert top"');
            expect(template).toContain('class="alert blank"');
        });

        it('generates sidebar alertActivity section', () => {
            const result = createMockBatchResult({
                consensus: { hasSidebarAlertActivity: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Sidebar Alert Activity</h4>');
            expect(template).toContain('class="alertActivity"');
        });

        it('generates standard activity section', () => {
            const result = createMockBatchResult({
                consensus: { activityTypes: ['standard'] },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Activity</h4>');
            expect(template).toContain('class="activity alertPadding"');
            expect(template).toContain('number="1A"');
            expect(template).toContain('Go to workbook');
        });

        it('generates interactive activity section', () => {
            const result = createMockBatchResult({
                consensus: { activityTypes: ['interactive'] },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Activity (Interactive)</h4>');
            expect(template).toContain('class="activity interactive"');
            expect(template).toContain('number="1A"');
        });

        it('generates dropbox activity section', () => {
            const result = createMockBatchResult({
                consensus: { activityTypes: ['dropbox'] },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Activity (Dropbox)</h4>');
            expect(template).toContain('class="activity alertPadding dropbox"');
            expect(template).toContain('number="1A"');
            expect(template).toContain('Upload to dropbox');
            expect(template).toContain('target="_self"');
        });

        it('generates button section', () => {
            const result = createMockBatchResult({
                consensus: { hasButtons: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>Button</h4>');
            expect(template).toContain('class="button"');
        });

        it('generates external button section', () => {
            const result = createMockBatchResult({
                consensus: { hasExternalButtons: true },
            });
            const template = generateTemplate(result);

            expect(template).toContain('<h4>External Button</h4>');
            expect(template).toContain('class="externalButton"');
        });
    });

    describe('dropbox activity: only dropbox present gets 1A', () => {
        it('assigns 1A when dropbox is the only activity type', () => {
            const result = createMockBatchResult({
                consensus: { activityTypes: ['dropbox'] },
            });
            const template = generateTemplate(result);

            expect(template).toContain('number="1A"');
        });
    });

    describe('paragraph section contains link element', () => {
        it('paragraph has an anchor tag with target="_blank"', () => {
            const result = createMockBatchResult({
                consensus: {
                    consensusPatterns: [{ id: 'paragraph', label: 'Paragraph', category: 'paragraph', fileCount: 1, presentInFiles: ['test.html'], totalFiles: 1, percentage: 1, isConsensus: true, variants: [] }],
                },
            });
            const template = generateTemplate(result);

            expect(template).toContain('consectetur adipisicing</a>');
        });
    });
});
