import { describe, it, expect } from "vitest";
import { generateFingerprints } from "@/lib/analyzer/fingerprinter";
import type { ParsedElement } from "@/lib/analyzer/types";

function makeElement(
  tagName: string,
  classes: string[],
  children: ParsedElement[] = [],
  overrides: Partial<ParsedElement> = {}
): ParsedElement {
  return {
    tagName,
    classes,
    id: null,
    attributes: {},
    children,
    depth: 0,
    excluded: false,
    fingerprintClasses: [],
    ...overrides,
  };
}

describe("generateFingerprints", () => {
  it("generates fingerprints for all non-excluded elements", () => {
    const child1 = makeElement("p", [], [], { depth: 2 });
    const child2 = makeElement("h3", [], [], { depth: 2 });
    const parent = makeElement("div", ["row"], [child1, child2], { depth: 1 });
    const root = makeElement("div", [], [parent], { depth: 0 });

    const fingerprints = generateFingerprints(root);

    expect(fingerprints.size).toBe(4); // root, parent, child1, child2
    expect(fingerprints.has(root)).toBe(true);
    expect(fingerprints.has(parent)).toBe(true);
    expect(fingerprints.has(child1)).toBe(true);
    expect(fingerprints.has(child2)).toBe(true);
  });

  it("skips excluded elements", () => {
    const excluded = makeElement("div", ["videoSection"], [], {
      depth: 1,
      excluded: true,
    });
    const kept = makeElement("p", [], [], { depth: 1 });
    const root = makeElement("div", [], [excluded, kept], { depth: 0 });

    const fingerprints = generateFingerprints(root);

    expect(fingerprints.has(excluded)).toBe(false);
    expect(fingerprints.has(kept)).toBe(true);
  });

  it("elements differing only in column classes produce SAME fingerprint hash", () => {
    // Element A: col-md-8 col-12 paddingR
    const elementA = makeElement(
      "div",
      ["col-md-8", "col-12", "paddingR"],
      [],
      { depth: 1 }
    );
    const rootA = makeElement("div", [], [elementA], { depth: 0 });

    // Element B: col-md-12 col-12 paddingR
    const elementB = makeElement(
      "div",
      ["col-md-12", "col-12", "paddingR"],
      [],
      { depth: 1 }
    );
    const rootB = makeElement("div", [], [elementB], { depth: 0 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    // The child elements should have the same hash since they both reduce to ['paddingR']
    expect(fpA.get(elementA)!.hash).toBe(fpB.get(elementB)!.hash);
  });

  it("elements differing in a non-column class produce DIFFERENT fingerprints", () => {
    const elementA = makeElement("div", ["activity", "alertPadding"], [], {
      depth: 1,
    });
    const rootA = makeElement("div", [], [elementA], { depth: 0 });

    const elementB = makeElement("div", ["activity", "interactive"], [], {
      depth: 1,
    });
    const rootB = makeElement("div", [], [elementB], { depth: 0 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    expect(fpA.get(elementA)!.hash).not.toBe(fpB.get(elementB)!.hash);
  });

  it("element with id produces different fingerprint than without id", () => {
    const withId = makeElement("div", [], [], { depth: 1, id: "header" });
    const rootA = makeElement("div", [], [withId], { depth: 0 });

    const withoutId = makeElement("div", [], [], { depth: 1 });
    const rootB = makeElement("div", [], [withoutId], { depth: 0 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    expect(fpA.get(withId)!.hash).not.toBe(fpB.get(withoutId)!.hash);
  });

  it("depth affects fingerprint", () => {
    const shallow = makeElement("div", ["row"], [], { depth: 1 });
    const rootA = makeElement("div", [], [shallow], { depth: 0 });

    const deep = makeElement("div", ["row"], [], { depth: 5 });
    const rootB = makeElement("div", [], [deep], { depth: 4 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    expect(fpA.get(shallow)!.hash).not.toBe(fpB.get(deep)!.hash);
  });

  it("parent context affects fingerprint (same element at different nesting positions)", () => {
    const inner = makeElement("p", [], [], { depth: 2 });
    const parentA = makeElement("div", ["alert"], [inner], { depth: 1 });
    const rootA = makeElement("div", [], [parentA], { depth: 0 });

    const inner2 = makeElement("p", [], [], { depth: 2 });
    const parentB = makeElement("div", ["activity"], [inner2], { depth: 1 });
    const rootB = makeElement("div", [], [parentB], { depth: 0 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    // Same p element at depth 2, but different parent → different hash
    expect(fpA.get(inner)!.hash).not.toBe(fpB.get(inner2)!.hash);
  });

  it("custom attributes are included in fingerprint", () => {
    const elA = makeElement("div", ["activity"], [], {
      depth: 1,
      attributes: { number: "1A" },
    });
    const rootA = makeElement("div", [], [elA], { depth: 0 });

    const elB = makeElement("div", ["activity"], [], {
      depth: 1,
      attributes: { number: "2A" },
    });
    const rootB = makeElement("div", [], [elB], { depth: 0 });

    const fpA = generateFingerprints(rootA);
    const fpB = generateFingerprints(rootB);

    expect(fpA.get(elA)!.hash).not.toBe(fpB.get(elB)!.hash);
  });

  it("computes fingerprintClasses by stripping column classes", () => {
    const element = makeElement(
      "div",
      ["col-md-8", "col-12", "paddingR", "flex-end"],
      [],
      { depth: 0 }
    );

    generateFingerprints(element);

    expect(element.fingerprintClasses).toEqual(["paddingR", "flex-end"]);
  });

  it("generates human-readable signature", () => {
    const element = makeElement("div", ["activity", "alertPadding"], [], {
      depth: 0,
      id: null,
      attributes: { number: "1A" },
    });

    const fingerprints = generateFingerprints(element);
    const fp = fingerprints.get(element)!;

    expect(fp.signature).toContain("div");
    expect(fp.signature).toContain("activity");
    expect(fp.signature).toContain("alertPadding");
    expect(fp.signature).toContain("number=1A");
  });

  it("generates signature with id", () => {
    const element = makeElement("div", [], [], { depth: 0, id: "header" });

    const fingerprints = generateFingerprints(element);
    const fp = fingerprints.get(element)!;

    expect(fp.signature).toBe("div#header");
  });
});
