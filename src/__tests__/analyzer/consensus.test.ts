import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildConsensus, detectPatterns } from "@/lib/analyzer/consensus";
import { analyzeFile } from "@/lib/analyzer/pipeline";
import type { FileAnalysis } from "@/lib/analyzer/types";

const FIXTURES_DIR = join(__dirname, "../../test-fixtures");

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), "utf-8");
}

describe("detectPatterns", () => {
  let analysis1: FileAnalysis;
  let analysis2: FileAnalysis;
  let analysis3: FileAnalysis;

  beforeAll(() => {
    analysis1 = analyzeFile(loadFixture("ANZH101_1_0.html"), "ANZH101_1_0.html");
    analysis2 = analyzeFile(loadFixture("ANZH101_2_0.html"), "ANZH101_2_0.html");
    analysis3 = analyzeFile(loadFixture("ANZH101_3_0.html"), "ANZH101_3_0.html");
  });

  it("detects heading:h2 in file 1", () => {
    const patterns = detectPatterns(analysis1);
    expect(patterns.has("heading:h2")).toBe(true);
  });

  it("detects heading:h3 in all files", () => {
    expect(detectPatterns(analysis1).has("heading:h3")).toBe(true);
    expect(detectPatterns(analysis2).has("heading:h3")).toBe(true);
    expect(detectPatterns(analysis3).has("heading:h3")).toBe(true);
  });

  it("detects paragraph in all files", () => {
    expect(detectPatterns(analysis1).has("paragraph")).toBe(true);
    expect(detectPatterns(analysis2).has("paragraph")).toBe(true);
    expect(detectPatterns(analysis3).has("paragraph")).toBe(true);
  });

  it("detects video in all files (from hasVideoSection flag)", () => {
    expect(detectPatterns(analysis1).has("video")).toBe(true);
    expect(detectPatterns(analysis2).has("video")).toBe(true);
    expect(detectPatterns(analysis3).has("video")).toBe(true);
  });

  it("detects alert in all files", () => {
    expect(detectPatterns(analysis1).has("alert")).toBe(true);
    expect(detectPatterns(analysis2).has("alert")).toBe(true);
    expect(detectPatterns(analysis3).has("alert")).toBe(true);
  });

  it("detects activity-standard in all files", () => {
    expect(detectPatterns(analysis1).has("activity-standard")).toBe(true);
    expect(detectPatterns(analysis2).has("activity-standard")).toBe(true);
    expect(detectPatterns(analysis3).has("activity-standard")).toBe(true);
  });

  it("detects activity-interactive in files 1 and 3", () => {
    expect(detectPatterns(analysis1).has("activity-interactive")).toBe(true);
    expect(detectPatterns(analysis2).has("activity-interactive")).toBe(false);
    expect(detectPatterns(analysis3).has("activity-interactive")).toBe(true);
  });

  it("detects activity-dropbox only in file 3", () => {
    expect(detectPatterns(analysis1).has("activity-dropbox")).toBe(false);
    expect(detectPatterns(analysis2).has("activity-dropbox")).toBe(false);
    expect(detectPatterns(analysis3).has("activity-dropbox")).toBe(true);
  });

  it("detects image in all files", () => {
    expect(detectPatterns(analysis1).has("image")).toBe(true);
    expect(detectPatterns(analysis2).has("image")).toBe(true);
    expect(detectPatterns(analysis3).has("image")).toBe(true);
  });

  it("detects sidebar-image in all files", () => {
    expect(detectPatterns(analysis1).has("sidebar-image")).toBe(true);
    expect(detectPatterns(analysis2).has("sidebar-image")).toBe(true);
    expect(detectPatterns(analysis3).has("sidebar-image")).toBe(true);
  });

  it("detects list-unordered in files 2 and 3", () => {
    expect(detectPatterns(analysis1).has("list-unordered")).toBe(false);
    expect(detectPatterns(analysis2).has("list-unordered")).toBe(true);
    expect(detectPatterns(analysis3).has("list-unordered")).toBe(true);
  });

  it("detects list-ordered only in file 2", () => {
    expect(detectPatterns(analysis1).has("list-ordered")).toBe(false);
    expect(detectPatterns(analysis2).has("list-ordered")).toBe(true);
    expect(detectPatterns(analysis3).has("list-ordered")).toBe(false);
  });

  it("detects table only in file 2", () => {
    expect(detectPatterns(analysis1).has("table")).toBe(false);
    expect(detectPatterns(analysis2).has("table")).toBe(true);
    expect(detectPatterns(analysis3).has("table")).toBe(false);
  });

  it("detects quote only in file 2", () => {
    expect(detectPatterns(analysis1).has("quote")).toBe(false);
    expect(detectPatterns(analysis2).has("quote")).toBe(true);
    expect(detectPatterns(analysis3).has("quote")).toBe(false);
  });

  it("does not detect button in any file", () => {
    expect(detectPatterns(analysis1).has("button")).toBe(false);
    expect(detectPatterns(analysis2).has("button")).toBe(false);
    expect(detectPatterns(analysis3).has("button")).toBe(false);
  });

  it("does not detect external-button in any file", () => {
    expect(detectPatterns(analysis1).has("external-button")).toBe(false);
    expect(detectPatterns(analysis2).has("external-button")).toBe(false);
    expect(detectPatterns(analysis3).has("external-button")).toBe(false);
  });

  it("does not detect sidebar-alertActivity in any file", () => {
    expect(detectPatterns(analysis1).has("sidebar-alertActivity")).toBe(false);
    expect(detectPatterns(analysis2).has("sidebar-alertActivity")).toBe(false);
    expect(detectPatterns(analysis3).has("sidebar-alertActivity")).toBe(false);
  });

  it("does not detect heading:h1 (h1 is header-only)", () => {
    expect(detectPatterns(analysis1).has("heading:h1")).toBe(false);
    expect(detectPatterns(analysis2).has("heading:h1")).toBe(false);
    expect(detectPatterns(analysis3).has("heading:h1")).toBe(false);
  });

  it("returns empty set when AST has no #body", () => {
    const mockAnalysis: FileAnalysis = {
      filename: "empty.html",
      ast: { tagName: "html", classes: [], id: null, attributes: {}, children: [], depth: 0, excluded: false, fingerprintClasses: [] },
      fingerprints: new Map(),
      moduleCode: null,
      templateVersion: null,
      hasVideoSection: false,
      hasAcknowledgements: false,
      moduleMenuCapture: null,
    };
    const patterns = detectPatterns(mockAnalysis);
    expect(patterns.size).toBe(0);
  });
});

describe("buildConsensus", () => {
  let analysis1: FileAnalysis;
  let analysis2: FileAnalysis;
  let analysis3: FileAnalysis;
  let allAnalyses: FileAnalysis[];

  beforeAll(() => {
    analysis1 = analyzeFile(loadFixture("ANZH101_1_0.html"), "ANZH101_1_0.html");
    analysis2 = analyzeFile(loadFixture("ANZH101_2_0.html"), "ANZH101_2_0.html");
    analysis3 = analyzeFile(loadFixture("ANZH101_3_0.html"), "ANZH101_3_0.html");
    allAnalyses = [analysis1, analysis2, analysis3];
  });

  it("returns correct totalFiles", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.totalFiles).toBe(3);
  });

  it("default threshold is 0.5", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.threshold).toBe(0.5);
  });

  it("accepts custom threshold", () => {
    const model = buildConsensus(allAnalyses, 0.75);
    expect(model.threshold).toBe(0.75);
  });

  it("heading:h3 is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const h3 = model.patterns.find((p) => p.id === "heading:h3");
    expect(h3).toBeDefined();
    expect(h3!.isConsensus).toBe(true);
    expect(h3!.fileCount).toBe(3);
  });

  it("heading:h2 is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const h2 = model.patterns.find((p) => p.id === "heading:h2");
    expect(h2).toBeDefined();
    expect(h2!.isConsensus).toBe(true);
    expect(h2!.fileCount).toBe(3);
  });

  it("paragraph is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const p = model.patterns.find((p) => p.id === "paragraph");
    expect(p).toBeDefined();
    expect(p!.isConsensus).toBe(true);
  });

  it("alert is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const alert = model.patterns.find((p) => p.id === "alert");
    expect(alert).toBeDefined();
    expect(alert!.isConsensus).toBe(true);
  });

  it("activity-standard is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const activity = model.patterns.find((p) => p.id === "activity-standard");
    expect(activity).toBeDefined();
    expect(activity!.isConsensus).toBe(true);
    expect(model.activityTypes).toContain("standard");
  });

  it("activity-interactive is consensus (2 of 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const interactive = model.patterns.find(
      (p) => p.id === "activity-interactive"
    );
    expect(interactive).toBeDefined();
    expect(interactive!.isConsensus).toBe(true);
    expect(model.activityTypes).toContain("interactive");
  });

  it("activity-dropbox is NOT consensus at 50% (1 of 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    const dropbox = model.patterns.find((p) => p.id === "activity-dropbox");
    expect(dropbox).toBeDefined();
    expect(dropbox!.isConsensus).toBe(false);
    expect(model.activityTypes).not.toContain("dropbox");
  });

  it("video is always true if any file has videoSection", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasVideoSection).toBe(true);
  });

  it("video is true even if only 1 of 3 files has it", () => {
    const mockAnalyses = allAnalyses.map((a, i) => ({
      ...a,
      hasVideoSection: i === 0,
    }));
    const model = buildConsensus(mockAnalyses);
    expect(model.hasVideoSection).toBe(true);
  });

  it("quote is NOT consensus (only 1 file has quoteText)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasQuoteText).toBe(false);
  });

  it("table is NOT consensus (only 1 file has tables)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasTables).toBe(false);
  });

  it("list-unordered is consensus (2 of 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasUnorderedLists).toBe(true);
  });

  it("list-ordered is NOT consensus (only 1 file)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasOrderedLists).toBe(false);
  });

  it("image is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasImages).toBe(true);
  });

  it("sidebar-image is consensus (all 3 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasSidebarImage).toBe(true);
  });

  it("button is NOT consensus (0 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasButtons).toBe(false);
  });

  it("external-button is NOT consensus (0 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasExternalButtons).toBe(false);
  });

  it("sidebar-alertActivity is NOT consensus (0 files)", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.hasSidebarAlertActivity).toBe(false);
  });

  it("consensusPatterns only includes patterns meeting threshold", () => {
    const model = buildConsensus(allAnalyses);
    for (const pattern of model.consensusPatterns) {
      expect(pattern.isConsensus).toBe(true);
      expect(pattern.percentage).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("headingLevels only includes consensus heading levels", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.headingLevels).toContain("h2");
    expect(model.headingLevels).toContain("h3");
  });

  it("alertVariants includes consensus alert variants", () => {
    const model = buildConsensus(allAnalyses);
    expect(model.alertVariants.length).toBeGreaterThan(0);
  });

  it("pattern percentage is computed correctly", () => {
    const model = buildConsensus(allAnalyses);
    const h3 = model.patterns.find((p) => p.id === "heading:h3");
    expect(h3!.percentage).toBeCloseTo(1.0);
    expect(h3!.totalFiles).toBe(3);
  });

  it("pattern presentInFiles lists correct filenames", () => {
    const model = buildConsensus(allAnalyses);
    const h3 = model.patterns.find((p) => p.id === "heading:h3");
    expect(h3!.presentInFiles).toContain("ANZH101_1_0.html");
    expect(h3!.presentInFiles).toContain("ANZH101_2_0.html");
    expect(h3!.presentInFiles).toContain("ANZH101_3_0.html");
  });

  // THRESHOLD TESTS
  it("at 100% threshold, only patterns in ALL files are consensus", () => {
    const model = buildConsensus(allAnalyses, 1.0);
    for (const pattern of model.consensusPatterns) {
      expect(pattern.fileCount).toBe(3);
    }
  });

  it("at 0% threshold, all detected patterns are consensus", () => {
    const model = buildConsensus(allAnalyses, 0);
    expect(model.consensusPatterns.length).toBe(model.patterns.length);
  });

  // SINGLE FILE
  it("single file produces 100% consensus for all its patterns", () => {
    const model = buildConsensus([analysis1]);
    expect(model.totalFiles).toBe(1);
    for (const pattern of model.patterns) {
      expect(pattern.isConsensus).toBe(true);
      expect(pattern.percentage).toBe(1);
    }
  });

  // TWO FILES
  it("two files at 50% threshold: pattern in both = consensus", () => {
    const model = buildConsensus([analysis1, analysis2], 0.5);
    const alert = model.patterns.find((p) => p.id === "alert");
    expect(alert!.isConsensus).toBe(true);
  });

  it("two files at 50% threshold: pattern in one = consensus (ceil of 1)", () => {
    const model = buildConsensus([analysis1, analysis2], 0.5);
    // list-ordered is only in file 2 — ceil(2 * 0.5) = 1, so 1 >= 1 = consensus
    const ordered = model.patterns.find((p) => p.id === "list-ordered");
    expect(ordered).toBeDefined();
    expect(ordered!.isConsensus).toBe(true);
  });
});
