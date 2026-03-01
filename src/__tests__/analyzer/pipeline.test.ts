import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { analyzeFile, analyzeFiles } from "@/lib/analyzer/pipeline";
import type { FileAnalysis, ParsedElement } from "@/lib/analyzer/types";

const FIXTURES_DIR = join(__dirname, "../../test-fixtures");

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), "utf-8");
}

/**
 * Recursively check that no element in the tree has a 'style' attribute.
 */
function assertNoStyleAttributes(element: ParsedElement): void {
  expect(element.attributes).not.toHaveProperty("style");
  for (const child of element.children) {
    assertNoStyleAttributes(child);
  }
}

/**
 * Recursively collect all elements in the tree (non-excluded only).
 */
function collectElements(element: ParsedElement): ParsedElement[] {
  const result: ParsedElement[] = [element];
  for (const child of element.children) {
    result.push(...collectElements(child));
  }
  return result;
}

/**
 * Check if any element in the tree has a specific class.
 */
function hasElementWithClass(
  element: ParsedElement,
  className: string
): boolean {
  if (element.classes.includes(className)) return true;
  return element.children.some((child) =>
    hasElementWithClass(child, className)
  );
}

/**
 * Find element by id in tree.
 */
function findById(
  element: ParsedElement,
  id: string
): ParsedElement | undefined {
  if (element.id === id) return element;
  for (const child of element.children) {
    const found = findById(child, id);
    if (found) return found;
  }
  return undefined;
}

describe("analyzeFile pipeline", () => {
  let analysis1: FileAnalysis;
  let analysis2: FileAnalysis;
  let analysis3: FileAnalysis;

  beforeAll(() => {
    analysis1 = analyzeFile(
      loadFixture("ANZH101_1_0.html"),
      "ANZH101_1_0.html"
    );
    analysis2 = analyzeFile(
      loadFixture("ANZH101_2_0.html"),
      "ANZH101_2_0.html"
    );
    analysis3 = analyzeFile(
      loadFixture("ANZH101_3_0.html"),
      "ANZH101_3_0.html"
    );
  });

  describe("ANZH101_1_0.html", () => {
    it("is not a first page", () => {
      expect(analysis1.isFirstPage).toBe(false);
    });

    it("extracts module code ANZH101", () => {
      expect(analysis1.moduleCode).toBe("ANZH101");
    });

    it("extracts template version 1-3", () => {
      expect(analysis1.templateVersion).toBe("1-3");
    });

    it("detects video section", () => {
      expect(analysis1.hasVideoSection).toBe(true);
    });

    it("does not detect acknowledgements", () => {
      expect(analysis1.hasAcknowledgements).toBe(false);
    });
  });

  describe("ANZH101_2_0.html", () => {
    it("is not a first page", () => {
      expect(analysis2.isFirstPage).toBe(false);
    });

    it("extracts module code ANZH101", () => {
      expect(analysis2.moduleCode).toBe("ANZH101");
    });

    it("extracts template version 1-3", () => {
      expect(analysis2.templateVersion).toBe("1-3");
    });

    it("detects video section", () => {
      expect(analysis2.hasVideoSection).toBe(true);
    });

    it("does not detect acknowledgements", () => {
      expect(analysis2.hasAcknowledgements).toBe(false);
    });
  });

  describe("ANZH101_3_0.html", () => {
    it("is not a first page", () => {
      expect(analysis3.isFirstPage).toBe(false);
    });

    it("extracts module code ANZH101", () => {
      expect(analysis3.moduleCode).toBe("ANZH101");
    });

    it("extracts template version 1-3", () => {
      expect(analysis3.templateVersion).toBe("1-3");
    });

    it("detects video section", () => {
      expect(analysis3.hasVideoSection).toBe(true);
    });

    it("does not detect acknowledgements", () => {
      expect(analysis3.hasAcknowledgements).toBe(false);
    });
  });

  describe("AST integrity (all files)", () => {
    it("no style attributes survive in any AST", () => {
      assertNoStyleAttributes(analysis1.ast);
      assertNoStyleAttributes(analysis2.ast);
      assertNoStyleAttributes(analysis3.ast);
    });

    it("AST contains div#header, div#body, div#footer", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        expect(findById(analysis.ast, "header")).toBeDefined();
        expect(findById(analysis.ast, "body")).toBeDefined();
        expect(findById(analysis.ast, "footer")).toBeDefined();
      }
    });

    it("AST does NOT contain excluded component elements after processing", () => {
      const excludedClasses = [
        "multiChoiceQuiz",
        "dragAndDrop",
        "carousel",
        "accordion",
        "videoSection",
        "moduleMenu",
        "hintDropContent",
      ];

      for (const analysis of [analysis1, analysis2, analysis3]) {
        for (const cls of excludedClasses) {
          expect(hasElementWithClass(analysis.ast, cls)).toBe(false);
        }
      }
    });

    it("AST still contains non-excluded elements like alert and alertActivity", () => {
      // File 1 has alert and alertActivity
      expect(hasElementWithClass(analysis1.ast, "alert")).toBe(true);
      expect(hasElementWithClass(analysis1.ast, "alertActivity")).toBe(true);

      // File 2 has alert and alertActivity
      expect(hasElementWithClass(analysis2.ast, "alert")).toBe(true);
      expect(hasElementWithClass(analysis2.ast, "alertActivity")).toBe(true);

      // File 3 has alert
      expect(hasElementWithClass(analysis3.ast, "alert")).toBe(true);
    });

    it("AST still contains activity wrappers", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        expect(hasElementWithClass(analysis.ast, "activity")).toBe(true);
      }
    });
  });

  describe("Fingerprint integrity (all files)", () => {
    it("no fingerprints exist for excluded elements", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        for (const [element] of analysis.fingerprints) {
          expect(element.excluded).toBe(false);
        }
      }
    });

    it("fingerprints contain entries for div#header, div#body, div#footer", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        const signatures = Array.from(analysis.fingerprints.values()).map(
          (fp) => fp.signature
        );
        expect(signatures.some((s) => s.includes("#header"))).toBe(true);
        expect(signatures.some((s) => s.includes("#body"))).toBe(true);
        expect(signatures.some((s) => s.includes("#footer"))).toBe(true);
      }
    });

    it("fingerprints do NOT contain entries for excluded component classes", () => {
      const excludedClasses = [
        "multiChoiceQuiz",
        "dragAndDrop",
        "carousel",
        "accordion",
        "videoSection",
        "moduleMenu",
        "hintDropContent",
      ];

      for (const analysis of [analysis1, analysis2, analysis3]) {
        for (const [element] of analysis.fingerprints) {
          for (const cls of excludedClasses) {
            expect(element.classes).not.toContain(cls);
          }
        }
      }
    });

    it("fingerprints contain entries for activity wrappers", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        const hasActivity = Array.from(analysis.fingerprints.keys()).some(
          (el) => el.classes.includes("activity")
        );
        expect(hasActivity).toBe(true);
      }
    });

    it("fingerprint count is reasonable (more than 10 elements per file)", () => {
      for (const analysis of [analysis1, analysis2, analysis3]) {
        expect(analysis.fingerprints.size).toBeGreaterThan(10);
      }
    });
  });

  describe("First page detection", () => {
    it("detects first page from filename with 0_0", () => {
      const html =
        '<html template="1-3"><head><title>0.0 TEST101</title></head><body></body></html>';
      const result = analyzeFile(html, "TEST101_0_0.html");
      expect(result.isFirstPage).toBe(true);
    });

    it("detects first page from filename with _00", () => {
      const html =
        '<html template="1-3"><head><title>Intro TEST101</title></head><body></body></html>';
      const result = analyzeFile(html, "TEST101_00.html");
      expect(result.isFirstPage).toBe(true);
    });

    it("detects first page from title starting with 0.0", () => {
      const html =
        '<html template="1-3"><head><title>0.0 TEST101 Introduction</title></head><body></body></html>';
      const result = analyzeFile(html, "TEST101_intro.html");
      expect(result.isFirstPage).toBe(true);
    });

    it("detects first page from title starting with 00", () => {
      const html =
        '<html template="1-3"><head><title>00 TEST101 Module Overview</title></head><body></body></html>';
      const result = analyzeFile(html, "TEST101_intro.html");
      expect(result.isFirstPage).toBe(true);
    });

    it("does not detect lesson page as first page", () => {
      const html =
        '<html template="1-3"><head><title>1.0 ANZH101 Lesson One</title></head><body></body></html>';
      const result = analyzeFile(html, "ANZH101_1_0.html");
      expect(result.isFirstPage).toBe(false);
    });
  });

  describe("Module code extraction", () => {
    it("extracts module code from title", () => {
      const html =
        '<html><head><title>1.0 ENGI401 Engineering</title></head><body></body></html>';
      const result = analyzeFile(html, "some_file.html");
      expect(result.moduleCode).toBe("ENGI401");
    });

    it("extracts module code from filename when not in title", () => {
      const html =
        "<html><head><title>Lesson One</title></head><body></body></html>";
      const result = analyzeFile(html, "OSAI301_1_0.html");
      expect(result.moduleCode).toBe("OSAI301");
    });

    it("returns null when no module code found", () => {
      const html =
        "<html><head><title>Untitled</title></head><body></body></html>";
      const result = analyzeFile(html, "lesson.html");
      expect(result.moduleCode).toBeNull();
    });
  });

  describe("Phase 2 — moduleMenuCapture", () => {
    it("ANZH101_1_0.html has moduleMenuCapture", () => {
      expect(analysis1.moduleMenuCapture).not.toBeNull();
      expect(analysis1.moduleMenuCapture!.sourceType).toBe("lesson-page");
    });

    it("ANZH101_0_0.html is detected as first page with menu capture", () => {
      const rawHTML0 = loadFixture("ANZH101_0_0.html");
      const result = analyzeFile(rawHTML0, "ANZH101_0_0.html");
      expect(result.isFirstPage).toBe(true);
      expect(result.moduleCode).toBe("ANZH101");
      expect(result.moduleMenuCapture).not.toBeNull();
      expect(result.moduleMenuCapture!.sourceType).toBe("first-page");
    });
  });
});

describe("analyzeFiles — batch analysis", () => {
  let rawHTML0: string;
  let rawHTML1: string;
  let rawHTML2: string;
  let rawHTML3: string;

  beforeAll(() => {
    rawHTML0 = loadFixture("ANZH101_0_0.html");
    rawHTML1 = loadFixture("ANZH101_1_0.html");
    rawHTML2 = loadFixture("ANZH101_2_0.html");
    rawHTML3 = loadFixture("ANZH101_3_0.html");
  });

  it("resolves module code across all ANZH101 lesson files", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
      { rawHTML: rawHTML3, filename: "ANZH101_3_0.html" },
    ]);
    expect(result.moduleCode.code).toBe("ANZH101");
    expect(result.moduleCode.resolution).toBe("single");
    expect(result.files).toHaveLength(3);
    expect(result.hasFirstPage).toBe(false);
    expect(result.hasVideoSection).toBe(true);
    expect(result.moduleMenu).not.toBeNull();
  });

  it("batch with first page selects first page menu", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML0, filename: "ANZH101_0_0.html" },
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
    ]);
    expect(result.hasFirstPage).toBe(true);
    expect(result.firstPageAnalysis).not.toBeNull();
    expect(result.firstPageAnalysis!.filename).toBe("ANZH101_0_0.html");
    expect(result.moduleMenu!.sourceType).toBe("first-page");
  });

  it("batch detects template version from majority", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
      { rawHTML: rawHTML3, filename: "ANZH101_3_0.html" },
    ]);
    expect(result.templateVersion).toBe("1-3");
  });

  it("batch aggregates hasVideoSection across files", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
    ]);
    expect(result.hasVideoSection).toBe(true);
  });

  it("batch without first page uses first lesson page menu", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
    ]);
    expect(result.hasFirstPage).toBe(false);
    expect(result.firstPageAnalysis).toBeNull();
    expect(result.moduleMenu).not.toBeNull();
    expect(result.moduleMenu!.sourceType).toBe("lesson-page");
  });

  it("batch with all four files includes first page analysis", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML0, filename: "ANZH101_0_0.html" },
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
      { rawHTML: rawHTML3, filename: "ANZH101_3_0.html" },
    ]);
    expect(result.files).toHaveLength(4);
    expect(result.moduleCode.code).toBe("ANZH101");
    expect(result.moduleCode.resolution).toBe("single");
    expect(result.hasFirstPage).toBe(true);
    expect(result.templateVersion).toBe("1-3");
  });
});
