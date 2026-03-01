import { describe, it, expect } from 'vitest';
import { analyzeFiles, validateHTML } from '@/lib/analyzer/pipeline';

describe('validateHTML', () => {
  it('returns error for empty file', () => {
    const result = validateHTML('', 'empty.html');
    expect(result).not.toBeNull();
    expect(result!.filename).toBe('empty.html');
    expect(result!.error).toContain('empty');
  });

  it('returns error for whitespace-only file', () => {
    const result = validateHTML('   \n\t  ', 'whitespace.html');
    expect(result).not.toBeNull();
    expect(result!.error).toContain('empty');
  });

  it('returns error for non-HTML content', () => {
    const result = validateHTML('hello world, this is plain text', 'readme.html');
    expect(result).not.toBeNull();
    expect(result!.error).toContain('does not appear to contain HTML');
  });

  it('returns error for file exceeding 20MB', () => {
    const bigContent = '<html>' + 'a'.repeat(21 * 1024 * 1024) + '</html>';
    const result = validateHTML(bigContent, 'huge.html');
    expect(result).not.toBeNull();
    expect(result!.error).toContain('20MB');
  });

  it('returns null for valid HTML', () => {
    const result = validateHTML('<html><body><p>Hello</p></body></html>', 'valid.html');
    expect(result).toBeNull();
  });

  it('returns null for minimal HTML with a tag', () => {
    const result = validateHTML('<p>test</p>', 'minimal.html');
    expect(result).toBeNull();
  });
});

describe('analyzeFiles — malformed HTML handling', () => {
  const validHTML = `
    <html lang="en" template="1-3" class="notranslate" translate="no">
    <head><title>1.0 TEST101 - Test</title></head>
    <body>
      <div id="header"><div id="module-code"><h1>01</h1></div></div>
      <div id="body"><div class="row"><div class="col-md-8 col-12"><p>Content</p></div></div></div>
      <div id="footer"><ul class="footer-nav"><li><a id="prev-lesson" href="">Prev</a></li></ul></div>
    </body>
    </html>
  `;

  it('empty file is recorded in fileErrors without crash', () => {
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid.html' },
      { rawHTML: '', filename: 'empty.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.fileErrors).toHaveLength(1);
    expect(result.fileErrors[0].filename).toBe('empty.html');
    expect(result.fileErrors[0].error).toContain('empty');
  });

  it('non-HTML file is recorded in fileErrors without crash', () => {
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid.html' },
      { rawHTML: 'just plain text no html tags', filename: 'readme.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.fileErrors).toHaveLength(1);
    expect(result.fileErrors[0].filename).toBe('readme.html');
  });

  it('one valid + one malformed: batch result has 1 file and 1 error', () => {
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid.html' },
      { rawHTML: '', filename: 'broken.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filename).toBe('valid.html');
    expect(result.fileErrors).toHaveLength(1);
    expect(result.fileErrors[0].filename).toBe('broken.html');
    // Template should still be generatable from the valid file
    expect(result.consensus).toBeDefined();
  });

  it('all files malformed throws appropriate error', () => {
    expect(() => {
      analyzeFiles([
        { rawHTML: '', filename: 'empty1.html' },
        { rawHTML: 'not html', filename: 'text.html' },
      ]);
    }).toThrow('All uploaded files failed to parse');
  });

  it('broken HTML tags (unclosed, nested incorrectly) still parse without crash', () => {
    const brokenHTML = '<html><body><div><p>Unclosed paragraph<div>Nested wrong</div></body></html>';
    const result = analyzeFiles([
      { rawHTML: brokenHTML, filename: 'broken-tags.html' },
    ]);
    // htmlparser2 is lenient, so this should parse
    expect(result.files).toHaveLength(1);
    expect(result.fileErrors).toHaveLength(0);
  });

  it('very large file validation rejects files over 20MB', () => {
    const bigContent = '<html>' + 'a'.repeat(21 * 1024 * 1024) + '</html>';
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid.html' },
      { rawHTML: bigContent, filename: 'huge.html' },
    ]);
    expect(result.files).toHaveLength(1);
    expect(result.fileErrors).toHaveLength(1);
    expect(result.fileErrors[0].filename).toBe('huge.html');
    expect(result.fileErrors[0].error).toContain('20MB');
  });

  it('multiple failures with some successes', () => {
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid1.html' },
      { rawHTML: '', filename: 'empty.html' },
      { rawHTML: validHTML, filename: 'valid2.html' },
      { rawHTML: 'no tags here', filename: 'text.html' },
    ]);
    expect(result.files).toHaveLength(2);
    expect(result.fileErrors).toHaveLength(2);
  });

  it('no fileErrors when all files are valid', () => {
    const result = analyzeFiles([
      { rawHTML: validHTML, filename: 'valid1.html' },
      { rawHTML: validHTML, filename: 'valid2.html' },
    ]);
    expect(result.fileErrors).toHaveLength(0);
  });
});
