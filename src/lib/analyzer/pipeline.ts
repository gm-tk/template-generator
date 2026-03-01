import { parseHTML } from "./htmlParser";
import { stripInlineStyles } from "./styleStripper";
import { stripTextContent } from "./textStripper";
import { excludeComponents } from "./componentExcluder";
import { generateFingerprints } from "./fingerprinter";
import {
  extractModuleCode as extractCode,
  resolveModuleCode,
} from "./moduleCodeExtractor";
import { captureModuleMenu } from "./moduleMenuHandler";
import { buildConsensus } from "./consensus";
import type {
  FileAnalysis,
  ParsedElement,
  BatchAnalysisResult,
  ModuleCodeResult,
  ModuleMenuCapture,
  ConsensusModel,
  FileError,
} from "./types";

/**
 * Validates raw HTML before full analysis.
 * Returns a FileError if the HTML is invalid, null if valid.
 */
export function validateHTML(rawHTML: string, filename: string): FileError | null {
  if (!rawHTML.trim()) {
    return { filename, error: 'File is empty.' };
  }

  if (!/<[a-zA-Z]/.test(rawHTML)) {
    return { filename, error: 'File does not appear to contain HTML.' };
  }

  if (rawHTML.length > 20 * 1024 * 1024) {
    return { filename, error: 'File exceeds 20MB size limit.' };
  }

  return null;
}

/**
 * Detects whether a file appears to be a Te Kura template file.
 * A file is considered Te Kura if it matches at least 2 of the signals.
 */
export function isTekuraFile(rawHTML: string): boolean {
  let signals = 0;

  if (/<html[^>]*\stemplate=["'][^"']+["']/i.test(rawHTML)) signals++;
  if (/idoc_scripts\.js/i.test(rawHTML)) signals++;
  if (/<div[^>]*\sid=["']header["']/i.test(rawHTML) &&
      /<div[^>]*\sid=["']body["']/i.test(rawHTML) &&
      /<div[^>]*\sid=["']footer["']/i.test(rawHTML)) signals++;
  if (/<html[^>]*\sclass=["'][^"']*notranslate[^"']*["']/i.test(rawHTML)) signals++;

  return signals >= 2;
}

/**
 * Extracts the template version from raw HTML string.
 */
export function extractTemplateVersionFromHTML(rawHTML: string): string | null {
  const match = rawHTML.match(/<html[^>]*\stemplate=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

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
 * 7. Extract module code (Phase 2)
 * 8. Capture module menu structure (Phase 2)
 *
 * Returns a complete FileAnalysis object.
 */
export function analyzeFile(
  rawHTML: string,
  filename: string,
  customRegistry?: Set<string>
): FileAnalysis {
  // Step 1: Parse
  const ast = parseHTML(rawHTML);

  // Step 2: Strip inline styles
  stripInlineStyles(ast);

  // Step 3: Strip text content (no-op)
  stripTextContent(ast);

  // Step 4: Extract template version from <html> element
  const templateVersion = extractTemplateVersion(ast);

  // Step 5: Detect special elements and exclude components
  const detections = excludeComponents(ast, customRegistry);

  // Step 6: Generate structural fingerprints
  const fingerprints = generateFingerprints(ast);

  // Step 7: Extract module code (Phase 2)
  const moduleCode = extractCode(rawHTML, filename);

  // Step 8: Capture module menu structure (Phase 2)
  const moduleMenuCapture = captureModuleMenu(rawHTML);

  return {
    filename,
    ast,
    fingerprints,
    moduleCode,
    templateVersion,
    hasVideoSection: detections.hasVideoSection,
    hasAcknowledgements: detections.hasAcknowledgements,
    moduleMenuCapture,
  };
}

/**
 * Analyzes multiple HTML files and produces cross-file results.
 *
 * This function:
 * 1. Validates and runs analyzeFile() on each file (with per-file error handling)
 * 2. Resolves the cross-file module code using resolveModuleCode()
 * 3. Selects the best module menu capture (first available lesson page)
 * 4. Determines majority template version
 * 5. Aggregates flags (hasVideoSection, hasAcknowledgements)
 * 6. Detects template version mismatches and non-Te Kura files
 *
 * @param files - Array of { rawHTML, filename } objects
 * @param threshold - Consensus threshold (0-1). Default 0.5 (50%).
 * @param customRegistry - Optional custom component exclusion registry
 * @returns BatchAnalysisResult with per-file analyses and cross-file data
 */
export function analyzeFiles(
  files: Array<{ rawHTML: string; filename: string }>,
  threshold: number = 0.5,
  customRegistry?: Set<string>
): BatchAnalysisResult {
  const analyses: FileAnalysis[] = [];
  const fileErrors: FileError[] = [];
  const nonTekuraFiles: string[] = [];
  const templateVersionCounts = new Map<string, number>();

  // Analyze each file individually with error handling
  for (const f of files) {
    // Pre-validation
    const validationError = validateHTML(f.rawHTML, f.filename);
    if (validationError) {
      fileErrors.push(validationError);
      continue;
    }

    // Te Kura detection
    if (!isTekuraFile(f.rawHTML)) {
      nonTekuraFiles.push(f.filename);
    }

    // Template version tracking from raw HTML
    const rawVersion = extractTemplateVersionFromHTML(f.rawHTML);
    if (rawVersion) {
      templateVersionCounts.set(rawVersion, (templateVersionCounts.get(rawVersion) || 0) + 1);
    }

    // Run analysis with error handling
    try {
      const analysis = analyzeFile(f.rawHTML, f.filename, customRegistry);
      analyses.push(analysis);
    } catch (err) {
      fileErrors.push({
        filename: f.filename,
        error: err instanceof Error ? err.message : 'Unknown analysis error.',
      });
    }
  }

  // If all files failed, throw
  if (analyses.length === 0) {
    throw new Error('All uploaded files failed to parse. Please check your files and try again.');
  }

  // Resolve cross-file module code
  const perFileCodes: Record<string, string | null> = {};
  for (const analysis of analyses) {
    perFileCodes[analysis.filename] = analysis.moduleCode;
  }
  const moduleCode = resolveModuleCode(perFileCodes);

  // Select module menu: first available
  const firstWithMenu = analyses.find((a) => a.moduleMenuCapture !== null);
  const moduleMenu: ModuleMenuCapture | null = firstWithMenu?.moduleMenuCapture || null;

  // Determine majority template version
  const templateVersion = getMajorityTemplateVersion(analyses);

  // Aggregate flags
  const hasVideoSection = analyses.some((a) => a.hasVideoSection);
  const hasAcknowledgements = analyses.some((a) => a.hasAcknowledgements);

  // Build consensus model (Phase 3)
  const consensus = buildConsensus(analyses, threshold);

  // Template version mismatch detection
  const isMixedTemplateVersions = templateVersionCounts.size > 1;

  return {
    files: analyses,
    moduleCode,
    moduleMenu,
    templateVersion,
    hasVideoSection,
    hasAcknowledgements,
    consensus,
    fileErrors,
    templateVersions: templateVersionCounts,
    isMixedTemplateVersions,
    nonTekuraFiles,
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
 * Determine the majority template version from multiple analyses.
 * Returns the most common template version, or null if none found.
 */
function getMajorityTemplateVersion(analyses: FileAnalysis[]): string | null {
  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    if (analysis.templateVersion) {
      counts.set(
        analysis.templateVersion,
        (counts.get(analysis.templateVersion) || 0) + 1
      );
    }
  }

  if (counts.size === 0) return null;

  let maxVersion: string | null = null;
  let maxCount = 0;
  for (const [version, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxVersion = version;
    }
  }

  return maxVersion;
}
