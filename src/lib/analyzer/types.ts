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
 * A structural pattern type detected across files.
 */
export interface StructuralPatternType {
  /** Unique identifier for this pattern type */
  id: string;

  /** Human-readable label (used for template section headers) */
  label: string;

  /**
   * Category for template output ordering.
   * Maps to the template layout order defined in the project spec.
   */
  category:
    | 'heading'
    | 'paragraph'
    | 'paragraph-with-sidebar'
    | 'quote'
    | 'list-unordered'
    | 'list-ordered'
    | 'table'
    | 'image'
    | 'video'
    | 'alert'
    | 'activity-standard'
    | 'activity-interactive'
    | 'activity-dropbox'
    | 'sidebar-alertActivity'
    | 'button'
    | 'external-button'
    | 'other';

  /** How many files contain this pattern type */
  fileCount: number;

  /** Which filenames contain this pattern type */
  presentInFiles: string[];

  /** Total number of files analyzed */
  totalFiles: number;

  /** Percentage of files containing this pattern (fileCount / totalFiles) */
  percentage: number;

  /** Whether this pattern meets the consensus threshold */
  isConsensus: boolean;

  /**
   * Sub-variants of this pattern type, if applicable.
   * For example, 'heading' has sub-variants: h2, h3, h4, h5.
   * For 'alert', sub-variants might be: alert, alert.solid, alert.top, alert.blank.
   */
  variants: string[];
}

/**
 * The complete consensus model produced by the consensus engine.
 * This is the input to the template generator (Phase 4).
 */
export interface ConsensusModel {
  /** The consensus threshold used (0-1, e.g., 0.5 for 50%) */
  threshold: number;

  /** Total number of files analyzed */
  totalFiles: number;

  /** All detected pattern types, both consensus and non-consensus */
  patterns: StructuralPatternType[];

  /** Only the patterns that meet the consensus threshold */
  consensusPatterns: StructuralPatternType[];

  /** Specific heading levels found in consensus (e.g., ['h2', 'h3', 'h4']) */
  headingLevels: string[];

  /** Specific alert variants found in consensus (e.g., ['alert', 'alert solid']) */
  alertVariants: string[];

  /** Whether video sections were found in ANY file (not threshold-dependent) */
  hasVideoSection: boolean;

  /** Whether sidebar+alertActivity pattern was found in consensus */
  hasSidebarAlertActivity: boolean;

  /** Whether sidebar+image pattern was found in consensus */
  hasSidebarImage: boolean;

  /** Whether quote text/ack pattern was found in consensus */
  hasQuoteText: boolean;

  /** Whether tables were found in consensus */
  hasTables: boolean;

  /** Whether images were found in consensus */
  hasImages: boolean;

  /** Whether ordered lists were found in consensus */
  hasOrderedLists: boolean;

  /** Whether unordered lists were found in consensus */
  hasUnorderedLists: boolean;

  /** Whether button links were found in consensus */
  hasButtons: boolean;

  /** Whether external buttons were found in consensus */
  hasExternalButtons: boolean;

  /** Activity types found in consensus */
  activityTypes: Array<'standard' | 'interactive' | 'dropbox'>;
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

  /** The consensus model (Phase 3) */
  consensus: ConsensusModel;
}
