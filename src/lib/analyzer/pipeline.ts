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
import type {
  FileAnalysis,
  ParsedElement,
  BatchAnalysisResult,
  ModuleMenuCapture,
} from "./types";

/**
 * Full analysis pipeline for a single HTML file.
 *
 * Steps:
 * 1. Parse raw HTML to AST
 * 2. Strip inline styles
 * 3. Strip text content (no-op, handled by parser)
 * 4. Extract template version from <html> element
 * 5. Detect special elements and exclude components
 * 6. Generate structural fingerprints
 * 7. Extract module code (Phase 2)
 * 8. Capture module menu structure (Phase 2)
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
 * 1. Runs analyzeFile() on each file
 * 2. Resolves the cross-file module code using resolveModuleCode()
 * 3. Selects the first available module menu capture
 * 4. Determines majority template version
 * 5. Aggregates flags (hasVideoSection, hasAcknowledgements)
 *
 * @param files - Array of { rawHTML, filename } objects
 * @returns BatchAnalysisResult with per-file analyses and cross-file data
 */
export function analyzeFiles(
  files: Array<{ rawHTML: string; filename: string }>
): BatchAnalysisResult {
  // Analyze each file individually
  const analyses = files.map((f) => analyzeFile(f.rawHTML, f.filename));

  // Resolve cross-file module code
  const perFileCodes: Record<string, string | null> = {};
  for (const analysis of analyses) {
    perFileCodes[analysis.filename] = analysis.moduleCode;
  }
  const moduleCode = resolveModuleCode(perFileCodes);

  // Select module menu: use first available
  const firstWithMenu = analyses.find((a) => a.moduleMenuCapture !== null);
  const moduleMenu: ModuleMenuCapture | null = firstWithMenu?.moduleMenuCapture || null;

  // Determine majority template version
  const templateVersion = getMajorityTemplateVersion(analyses);

  // Aggregate flags
  const hasVideoSection = analyses.some((a) => a.hasVideoSection);
  const hasAcknowledgements = analyses.some((a) => a.hasAcknowledgements);

  return {
    files: analyses,
    moduleCode,
    moduleMenu,
    templateVersion,
    hasVideoSection,
    hasAcknowledgements,
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
