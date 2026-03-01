import type {
  FileAnalysis,
  ParsedElement,
  ConsensusModel,
  StructuralPatternType,
} from "./types";

/**
 * Pattern type definitions: id, label, category.
 * These define the known structural pattern types the engine can detect.
 */
const PATTERN_DEFS: Record<
  string,
  { label: string; category: StructuralPatternType["category"] }
> = {
  "heading:h2": { label: "Heading H2", category: "heading" },
  "heading:h3": { label: "Heading H3", category: "heading" },
  "heading:h4": { label: "Heading H4", category: "heading" },
  "heading:h5": { label: "Heading H5", category: "heading" },
  paragraph: { label: "Paragraph", category: "paragraph" },
  "list-unordered": { label: "Unordered list", category: "list-unordered" },
  "list-ordered": { label: "Ordered list", category: "list-ordered" },
  table: { label: "Table", category: "table" },
  image: { label: "Image", category: "image" },
  video: { label: "Video section", category: "video" },
  alert: { label: "Alert", category: "alert" },
  "alert-solid": { label: "Alert solid", category: "alert" },
  "alert-top": { label: "Alert top", category: "alert" },
  "alert-blank": { label: "Alert blank", category: "alert" },
  "activity-standard": {
    label: "Activity — standard",
    category: "activity-standard",
  },
  "activity-interactive": {
    label: "Activity — interactive",
    category: "activity-interactive",
  },
  "activity-dropbox": {
    label: "Activity — dropbox",
    category: "activity-dropbox",
  },
  "sidebar-alertActivity": {
    label: "Sidebar with alertActivity",
    category: "sidebar-alertActivity",
  },
  "sidebar-image": {
    label: "Paragraph with sidebar image",
    category: "paragraph-with-sidebar",
  },
  button: { label: "Button link", category: "button" },
  "external-button": { label: "External button", category: "external-button" },
  quote: { label: "Quote text", category: "quote" },
};

/**
 * Builds a consensus model from multiple file analyses.
 *
 * The engine identifies which structural PATTERN TYPES appear across files,
 * counts their frequency, and classifies them as consensus or not based on
 * the threshold.
 *
 * This is a PATTERN-TYPE analysis, not a position-based alignment.
 * It answers: "What types of structural elements do the majority of files use?"
 *
 * @param fileAnalyses - Array of FileAnalysis objects from analyzeFile()
 * @param threshold - Consensus threshold (0-1). Default 0.5 (50%).
 *                    A pattern type is consensus if it appears in >= threshold * totalFiles.
 * @returns ConsensusModel describing all detected patterns and their consensus status
 */
export function buildConsensus(
  fileAnalyses: FileAnalysis[],
  threshold: number = 0.5
): ConsensusModel {
  const totalFiles = fileAnalyses.length;
  const minCount = Math.ceil(totalFiles * threshold);

  // 1. Detect patterns in each file
  const perFilePatterns = new Map<string, string[]>();

  for (const analysis of fileAnalyses) {
    const patterns = detectPatterns(analysis);
    for (const patternId of patterns) {
      if (!perFilePatterns.has(patternId)) {
        perFilePatterns.set(patternId, []);
      }
      perFilePatterns.get(patternId)!.push(analysis.filename);
    }
  }

  // 2. Build StructuralPatternType objects
  const allPatterns: StructuralPatternType[] = [];

  for (const [patternId, filenames] of perFilePatterns) {
    const def = PATTERN_DEFS[patternId];
    if (!def) continue;

    const fileCount = filenames.length;
    const percentage = totalFiles > 0 ? fileCount / totalFiles : 0;
    const isConsensus = fileCount >= minCount;

    allPatterns.push({
      id: patternId,
      label: def.label,
      category: def.category,
      fileCount,
      presentInFiles: filenames,
      totalFiles,
      percentage,
      isConsensus,
      variants: [],
    });
  }

  // 3. Build consensus-only list
  const consensusPatterns = allPatterns.filter((p) => p.isConsensus);

  // 4. Compute heading levels in consensus
  const headingLevels = consensusPatterns
    .filter((p) => p.category === "heading")
    .map((p) => p.id.replace("heading:", ""))
    .sort();

  // 5. Compute alert variants in consensus
  const alertVariants = consensusPatterns
    .filter((p) => p.category === "alert")
    .map((p) => p.id.replace("-", " ").replace("alert ", "alert."))
    .map((v) => {
      // Normalize: 'alert' stays 'alert', 'alert.solid' stays 'alert.solid'
      if (v === "alert") return "alert";
      return v;
    });

  // 6. Video is threshold-independent: true if ANY file has it
  const hasVideoSection = fileAnalyses.some((a) => a.hasVideoSection);

  // 7. Compute convenience booleans from consensus patterns
  const consensusIds = new Set(consensusPatterns.map((p) => p.id));

  const hasSidebarAlertActivity = consensusIds.has("sidebar-alertActivity");
  const hasSidebarImage = consensusIds.has("sidebar-image");
  const hasQuoteText = consensusIds.has("quote");
  const hasTables = consensusIds.has("table");
  const hasImages = consensusIds.has("image");
  const hasOrderedLists = consensusIds.has("list-ordered");
  const hasUnorderedLists = consensusIds.has("list-unordered");
  const hasButtons = consensusIds.has("button");
  const hasExternalButtons = consensusIds.has("external-button");

  // 8. Activity types in consensus
  const activityTypes: Array<"standard" | "interactive" | "dropbox"> = [];
  if (consensusIds.has("activity-standard")) activityTypes.push("standard");
  if (consensusIds.has("activity-interactive"))
    activityTypes.push("interactive");
  if (consensusIds.has("activity-dropbox")) activityTypes.push("dropbox");

  return {
    threshold,
    totalFiles,
    patterns: allPatterns,
    consensusPatterns,
    headingLevels,
    alertVariants,
    hasVideoSection,
    hasSidebarAlertActivity,
    hasSidebarImage,
    hasQuoteText,
    hasTables,
    hasImages,
    hasOrderedLists,
    hasUnorderedLists,
    hasButtons,
    hasExternalButtons,
    activityTypes,
  };
}

/**
 * Detects which structural pattern types are present in a single file's AST.
 *
 * Walks the #body section of the processed AST (post-exclusion, post-style-stripping)
 * to find each pattern type. A pattern is "present" if at least one matching
 * element exists anywhere in #body.
 *
 * Video is detected from the hasVideoSection flag (set before component exclusion).
 */
export function detectPatterns(analysis: FileAnalysis): Set<string> {
  const patterns = new Set<string>();

  // Video: from flag (detected before exclusion)
  if (analysis.hasVideoSection) {
    patterns.add("video");
  }

  // Find #body in the AST
  const body = findElementById(analysis.ast, "body");
  if (!body) return patterns;

  // Walk all elements inside #body
  walkElement(body, (el) => {
    const tag = el.tagName;
    const fpClasses = el.fingerprintClasses;

    // Headings (h2-h5 only, not h1)
    if (tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5") {
      patterns.add(`heading:${tag}`);
    }

    // Paragraphs
    if (tag === "p") {
      if (fpClasses.includes("quoteText")) {
        patterns.add("quote");
      } else {
        patterns.add("paragraph");
      }
    }

    // Lists
    if (tag === "ul") patterns.add("list-unordered");
    if (tag === "ol") patterns.add("list-ordered");

    // Table
    if (tag === "table") patterns.add("table");

    // Image
    if (tag === "img") patterns.add("image");

    // Alert variants
    if (tag === "div" && fpClasses.includes("alert")) {
      if (fpClasses.includes("solid")) {
        patterns.add("alert-solid");
      } else if (fpClasses.includes("top")) {
        patterns.add("alert-top");
      } else if (fpClasses.includes("blank")) {
        patterns.add("alert-blank");
      } else {
        patterns.add("alert");
      }
    }

    // Activity variants
    if (tag === "div" && fpClasses.includes("activity")) {
      if (fpClasses.includes("interactive")) {
        patterns.add("activity-interactive");
      } else if (fpClasses.includes("dropbox")) {
        patterns.add("activity-dropbox");
      } else {
        patterns.add("activity-standard");
      }
    }

    // Sidebar patterns: div.row with 2+ children where a sibling column has alertActivity or img
    if (tag === "div" && fpClasses.includes("row") && el.children.length >= 2) {
      for (const child of el.children) {
        for (const grandchild of child.children) {
          if (grandchild.classes.includes("alertActivity")) {
            patterns.add("sidebar-alertActivity");
          }
          if (grandchild.tagName === "img") {
            patterns.add("sidebar-image");
          }
        }
      }
    }

    // Button: <a> containing a child <div class="button">
    if (tag === "a") {
      for (const child of el.children) {
        if (
          child.tagName === "div" &&
          child.fingerprintClasses.includes("button")
        ) {
          patterns.add("button");
        }
      }
    }

    // External button
    if (tag === "div" && fpClasses.includes("externalButton")) {
      patterns.add("external-button");
    }
  });

  return patterns;
}

/**
 * Finds an element by ID in the AST.
 */
function findElementById(
  root: ParsedElement,
  id: string
): ParsedElement | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findElementById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Recursively walks an element tree, calling the callback for each element.
 */
function walkElement(
  element: ParsedElement,
  callback: (el: ParsedElement) => void
): void {
  callback(element);
  for (const child of element.children) {
    walkElement(child, callback);
  }
}
