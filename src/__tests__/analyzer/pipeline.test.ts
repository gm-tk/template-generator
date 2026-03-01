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
    });
  });
});

describe("analyzeFiles — batch analysis", () => {
  let rawHTML1: string;
  let rawHTML2: string;
  let rawHTML3: string;

  beforeAll(() => {
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
    expect(result.hasVideoSection).toBe(true);
    expect(result.moduleMenu).not.toBeNull();
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

  it("batch uses first available lesson page menu", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
    ]);
    expect(result.moduleMenu).not.toBeNull();
  });

  it("batch with all three files resolves correctly", () => {
    const result = analyzeFiles([
      { rawHTML: rawHTML1, filename: "ANZH101_1_0.html" },
      { rawHTML: rawHTML2, filename: "ANZH101_2_0.html" },
      { rawHTML: rawHTML3, filename: "ANZH101_3_0.html" },
    ]);
    expect(result.files).toHaveLength(3);
    expect(result.moduleCode.code).toBe("ANZH101");
    expect(result.moduleCode.resolution).toBe("single");
    expect(result.templateVersion).toBe("1-3");
  });
});
