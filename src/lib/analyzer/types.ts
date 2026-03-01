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

  /** Whether this file was detected as a first page (module intro) */
  isFirstPage: boolean;

  /** Extracted module code (e.g., 'ANZH101') */
  moduleCode: string | null;

  /** Template attribute value from <html> tag (e.g., '1-3', '7-8', '9-10') */
  templateVersion: string | null;

  /** Whether this file contains a videoSection element (detected before exclusion) */
  hasVideoSection: boolean;

  /** Whether this file contains a div.acks element */
  hasAcknowledgements: boolean;
}
