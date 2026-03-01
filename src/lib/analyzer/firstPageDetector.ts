/**
 * Determines whether an HTML file is a "first page" (module introduction/overview).
 *
 * A file is a first page if ANY of these conditions are true:
 * 1. Filename contains '0_0', '0.0', '_00', or '-00'
 * 2. The <title> tag text starts with '0.0' or '00'
 * 3. The #module-code > h1 contains a module code pattern (uppercase letters + numbers
 *    like ANZH101, ENGI401) rather than a lesson number (like 01, 02, 3.0)
 *
 * IMPORTANT: Uses raw HTML for text extraction because the Phase 1 AST strips text nodes.
 */

const FIRST_PAGE_FILENAME_PATTERNS = [
  /(?<!\d)0[_.]0/,  // matches 0_0 or 0.0, but NOT 10_0
  /[_-]00(?:\.|$)/,  // matches _00. or _00 at end, or -00. or -00 at end
];

const MODULE_CODE_H1_PATTERN = /^[A-Z]{2,}/;

/**
 * Determines whether an HTML file is a "first page" (module introduction/overview).
 *
 * @param filename - The original filename of the HTML file
 * @param rawHTML - The raw HTML string (needed for text-based detection)
 * @returns true if this file is a first page
 */
export function isFirstPage(filename: string, rawHTML: string): boolean {
  // Check 1: Filename patterns
  if (matchesFirstPageFilename(filename)) {
    return true;
  }

  // Check 2: Title starts with 0.0 or 00
  const titleText = extractTitleText(rawHTML);
  if (titleText) {
    const trimmed = titleText.trim();
    if (trimmed.startsWith('0.0') || /^00(?!\d)/.test(trimmed)) {
      return true;
    }
  }

  // Check 3: #module-code > h1 contains a module code pattern
  const h1Text = extractModuleCodeH1Text(rawHTML);
  if (h1Text && MODULE_CODE_H1_PATTERN.test(h1Text.trim())) {
    return true;
  }

  return false;
}

/**
 * Tests whether a filename matches first page patterns.
 */
function matchesFirstPageFilename(filename: string): boolean {
  return FIRST_PAGE_FILENAME_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * Extracts the text content of the <title> element from the raw HTML.
 * Returns null if no title element is found.
 */
export function extractTitleText(rawHTML: string): string | null {
  const match = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extracts the text content of #module-code > h1 from raw HTML.
 * Returns null if not found.
 *
 * Looks for the pattern: <div id="module-code">...<h1>TEXT</h1>...</div>
 */
export function extractModuleCodeH1Text(rawHTML: string): string | null {
  // Find the #module-code div and extract h1 text within it
  const moduleCodeMatch = rawHTML.match(
    /<div[^>]*id\s*=\s*["']module-code["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (!moduleCodeMatch) return null;

  const innerHTML = moduleCodeMatch[1];
  const h1Match = innerHTML.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return null;

  // Strip HTML tags from h1 content to get plain text
  return h1Match[1].replace(/<[^>]*>/g, '').trim();
}
