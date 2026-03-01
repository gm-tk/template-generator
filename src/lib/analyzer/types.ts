/**
 * Represents a parsed HTML element after processing.
 * This is our internal representation, NOT the raw htmlparser2 node.
 */
export interface ParsedElement {
  /** HTML tag name (lowercase): 'div', 'h1', 'p', etc. */
  tagName: string;

  /** CSS classes on this element, preserving original order */
  classes: string[];

  /** Element ID if present, null otherwise */
  id: string | null;

  /**
   * All attributes EXCEPT 'class', 'id', and 'style'.
   * Includes custom attributes like layout="speech", number="1A", etc.
   * Key-value pairs. Boolean attributes have empty string values.
   */
  attributes: Record<string, string>;

  /** Ordered list of child elements (text nodes stripped, excluded components pruned) */
  children: ParsedElement[];

  /** Depth in the tree (root html = 0, body = 1, etc.) */
  depth: number;

  /** Whether this element was excluded by the Component Exclusion Registry */
  excluded: boolean;

  /**
   * Classes with Bootstrap column classes stripped out.
   * Used for fingerprinting. Computed during fingerprint generation.
   */
  fingerprintClasses: string[];
}

/**
 * Structural fingerprint for a single element.
 * Two elements with identical fingerprints are considered structurally equivalent.
 */
export interface StructuralFingerprint {
  /** The fingerprint hash string */
  hash: string;

  /** Human-readable signature for debugging: "div.row > div.activity.alertPadding" */
  signature: string;

  /** Depth in the tree */
  depth: number;

  /** Reference to the element this fingerprint describes */
  element: ParsedElement;
}

/**
 * Result of analyzing a single HTML file.
 */
export interface FileAnalysis {
  /** Original filename */
  filename: string;

  /** The full parsed and processed AST (after stripping and exclusion) */
  ast: ParsedElement;

  /** Map from element to its structural fingerprint */
  fingerprints: Map<ParsedElement, StructuralFingerprint>;

  /** Extracted module code (e.g., 'ANZH101') */
  moduleCode: string | null;

  /** Template attribute value from <html> tag (e.g., '1-3', '7-8', '9-10') */
  templateVersion: string | null;

  /** Whether this file contains a videoSection element (detected before exclusion) */
  hasVideoSection: boolean;

  /** Whether this file contains a div.acks element */
  hasAcknowledgements: boolean;

  /** Captured module menu structure for template generation */
  moduleMenuCapture: ModuleMenuCapture | null;
}

/**
 * Represents a captured module menu structure ready for template generation.
 * The DOM structure is preserved but text content is processed:
 * - Heading text (h3, h4, h5) is preserved exactly as-is
 * - Tab label text (li > a inside ul.nav.nav-tabs) is preserved exactly as-is
 * - All other text (paragraphs, list items) is replaced with lorem ipsum
 */
export interface ModuleMenuCapture {
  /**
   * The raw HTML string of the module menu contents,
   * with text replacements applied.
   * Ready to be inserted directly into the template output.
   */
  processedHTML: string;

  /**
   * The raw HTML string of the module menu contents BEFORE any text processing.
   * Kept as a reference for debugging and for the template generator to inspect.
   */
  originalHTML: string;
}

/**
 * Result of cross-file module code resolution.
 */
export interface ModuleCodeResult {
  /** The resolved module code to use in the template */
  code: string;

  /** How the code was resolved */
  resolution: 'single' | 'common-prefix' | 'unrelated';

  /** Individual codes extracted from each file, keyed by filename */
  perFileCode: Record<string, string | null>;
}

/**
 * Result of batch analysis across multiple HTML files.
 */
export interface BatchAnalysisResult {
  /** Per-file analysis results */
  files: FileAnalysis[];

  /** Resolved module code across all files */
  moduleCode: ModuleCodeResult;

  /** The selected module menu capture for template generation */
  moduleMenu: ModuleMenuCapture | null;

  /** Template version from the html element (e.g., '1-3') — majority wins */
  templateVersion: string | null;

  /** Whether ANY file contained a videoSection */
  hasVideoSection: boolean;

  /** Whether ANY file contained a div.acks */
  hasAcknowledgements: boolean;
}
