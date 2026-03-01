import { parseHTML } from "./htmlParser";
import { stripInlineStyles } from "./styleStripper";
import { stripTextContent } from "./textStripper";
import { excludeComponents } from "./componentExcluder";
import { generateFingerprints } from "./fingerprinter";
import type { FileAnalysis, ParsedElement } from "./types";

const MODULE_CODE_PATTERN = /[A-Z]{2,}[A-Z0-9]*\d+/;
const FIRST_PAGE_FILENAME_PATTERN = /(?:0[_.]0|[_-]00)/;

/**
 * Full analysis pipeline for a single HTML file.
 *
 * Steps:
 * 1. Parse raw HTML to AST
 * 2. Strip inline styles
 * 3. Strip text content (no-op, handled by parser)
 * 4. Detect special elements (videoSection, acks, moduleMenu)
 * 5. Exclude component elements
 * 6. Generate structural fingerprints
 * 7. Detect first page and extract module code
 *
 * Returns a complete FileAnalysis object.
 */
export function analyzeFile(rawHTML: string, filename: string): FileAnalysis {
  // Step 1: Parse
  const ast = parseHTML(rawHTML);

  // Step 2: Strip inline styles
  stripInlineStyles(ast);

  // Step 3: Strip text content (no-op)
  stripTextContent(ast);

  // Step 4: Extract template version from <html> element
  const templateVersion = extractTemplateVersion(ast);

  // Step 5: Detect special elements and exclude components
  const detections = excludeComponents(ast);

  // Step 6: Generate structural fingerprints
  const fingerprints = generateFingerprints(ast);

  // Step 7: Detect first page and extract module code
  const titleText = extractTitleText(rawHTML);
  const isFirstPage = detectFirstPage(filename, titleText, ast);
  const moduleCode = extractModuleCode(titleText, filename);

  return {
    filename,
    ast,
    fingerprints,
    isFirstPage,
    moduleCode,
    templateVersion,
    hasVideoSection: detections.hasVideoSection,
    hasAcknowledgements: detections.hasAcknowledgements,
  };
}

/**
 * Extract the template attribute from the <html> element.
 */
function extractTemplateVersion(ast: ParsedElement): string | null {
  // The AST root should be the <html> element
  if (ast.tagName === "html" && ast.attributes["template"]) {
    return ast.attributes["template"];
  }
  // Search children in case there's a wrapper
  for (const child of ast.children) {
    if (child.tagName === "html" && child.attributes["template"]) {
      return child.attributes["template"];
    }
  }
  return null;
}

/**
 * Extract raw title text from the HTML using a simple regex.
 * We use the raw HTML because text nodes are stripped from the AST.
 */
function extractTitleText(rawHTML: string): string | null {
  const match = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Detect if this file is a first page (module intro).
 */
function detectFirstPage(
  filename: string,
  titleText: string | null,
  ast: ParsedElement
): boolean {
  // Check filename patterns: 0_0, 0.0, _00, -00
  if (FIRST_PAGE_FILENAME_PATTERN.test(filename)) {
    return true;
  }

  // Check title starts with 0.0 or 00
  if (titleText) {
    const trimmed = titleText.trim();
    if (trimmed.startsWith("0.0") || trimmed.startsWith("00")) {
      return true;
    }
  }

  // Check if #module-code > h1 contains a module code pattern rather than a lesson number
  const moduleCodeEl = findElementById(ast, "module-code");
  if (moduleCodeEl) {
    const h1 = moduleCodeEl.children.find((c) => c.tagName === "h1");
    if (h1) {
      // We can't check text content since text nodes are stripped.
      // First page detection by #module-code content requires raw HTML.
      // Handled by title and filename checks above.
    }
  }

  return false;
}

/**
 * Find an element by its ID in the AST.
 */
function findElementById(
  element: ParsedElement,
  id: string
): ParsedElement | null {
  if (element.id === id) {
    return element;
  }
  for (const child of element.children) {
    const found = findElementById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Extract module code from title text or filename.
 * Pattern: uppercase letters (2+) followed by digits (e.g., ANZH101, ENGI401, OSAI301).
 */
function extractModuleCode(
  titleText: string | null,
  filename: string
): string | null {
  // Try title first
  if (titleText) {
    const match = titleText.match(MODULE_CODE_PATTERN);
    if (match) return match[0];
  }

  // Try filename
  const filenameMatch = filename.match(MODULE_CODE_PATTERN);
  if (filenameMatch) return filenameMatch[0];

  return null;
}
