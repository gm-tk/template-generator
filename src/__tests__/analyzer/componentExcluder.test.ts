import { describe, it, expect } from "vitest";
import {
  isExcludedComponent,
  COMPONENT_EXCLUSION_REGISTRY,
} from "@/lib/analyzer/componentExclusionRegistry";
import { excludeComponents } from "@/lib/analyzer/componentExcluder";
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

describe("isExcludedComponent", () => {
  it("excludes element with class 'speechBubble'", () => {
    expect(isExcludedComponent(["speechBubble"])).toBe(true);
  });

  it("excludes element with class 'carousel' among other classes", () => {
    expect(isExcludedComponent(["row", "carousel", "audioBook"])).toBe(true);
  });

  it("does NOT exclude 'carousel-caption' (substring, not token)", () => {
    expect(isExcludedComponent(["carousel-caption"])).toBe(false);
  });

  it("does NOT exclude 'activity alertPadding' (not in registry)", () => {
    expect(isExcludedComponent(["activity", "alertPadding"])).toBe(false);
  });

  it("does NOT exclude 'alert' (not in registry)", () => {
    expect(isExcludedComponent(["alert"])).toBe(false);
  });

  it("does NOT exclude 'alertActivity' (not in registry)", () => {
    expect(isExcludedComponent(["alertActivity"])).toBe(false);
  });

  it("excludes 'TKmodal' (case-sensitive match)", () => {
    expect(isExcludedComponent(["TKmodal"])).toBe(true);
  });

  it("does NOT exclude 'tkmodal' (wrong case)", () => {
    expect(isExcludedComponent(["tkmodal"])).toBe(false);
  });

  it("does NOT exclude 'row' (structural container)", () => {
    expect(isExcludedComponent(["row"])).toBe(false);
  });

  it("excludes 'videoSection'", () => {
    expect(isExcludedComponent(["videoSection"])).toBe(true);
  });

  it("excludes 'moduleMenu'", () => {
    expect(isExcludedComponent(["moduleMenu"])).toBe(true);
  });

  it("excludes 'multiChoiceQuiz'", () => {
    expect(isExcludedComponent(["multiChoiceQuiz"])).toBe(true);
  });

  it("excludes 'dragAndDrop'", () => {
    expect(isExcludedComponent(["dragAndDrop"])).toBe(true);
  });

  it("does NOT exclude empty class list", () => {
    expect(isExcludedComponent([])).toBe(false);
  });
});

describe("excludeComponents", () => {
  it("prunes excluded elements from parent's children", () => {
    const excluded = makeElement("div", ["speechBubble"]);
    const kept = makeElement("p", []);
    const parent = makeElement("div", ["row"], [excluded, kept]);
    const root = makeElement("div", [], [parent]);

    excludeComponents(root);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(kept);
  });

  it("prunes entire subtree when element is excluded", () => {
    const grandchild = makeElement("span", []);
    const child = makeElement("div", ["options"]);
    child.children = [grandchild];

    const excludedEl = makeElement("div", ["multiChoiceQuiz", "autoCheck"], [
      child,
    ]);
    const sibling = makeElement("p", []);
    const parent = makeElement("div", [], [excludedEl, sibling]);
    const root = makeElement("div", [], [parent]);

    excludeComponents(root);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(sibling);
  });

  it("parent of excluded element stays in the tree", () => {
    const excluded = makeElement("div", ["accordion"]);
    const parent = makeElement("div", ["activity", "alertPadding"], [excluded]);
    const root = makeElement("div", [], [parent]);

    excludeComponents(root);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(parent);
    expect(parent.children).toHaveLength(0);
  });

  it("detects hasVideoSection before excluding videoSection elements", () => {
    const videoEl = makeElement("div", [
      "videoSection",
      "icon",
      "ratio",
      "ratio-16x9",
    ]);
    const parent = makeElement("div", ["row"], [videoEl]);
    const root = makeElement("div", [], [parent]);

    const detections = excludeComponents(root);

    expect(detections.hasVideoSection).toBe(true);
    // videoSection should be excluded from tree
    expect(parent.children).toHaveLength(0);
  });

  it("detects hasAcknowledgements", () => {
    const acksEl = makeElement("div", ["acks"]);
    const root = makeElement("div", [], [acksEl]);

    const detections = excludeComponents(root);

    expect(detections.hasAcknowledgements).toBe(true);
    // acks is NOT in the exclusion registry, so it stays
    expect(root.children).toHaveLength(1);
  });

  it("captures moduleMenuElement before exclusion", () => {
    const menuItem = makeElement("li", []);
    const list = makeElement("ul", [], [menuItem]);
    const heading = makeElement("h5", []);
    const moduleMenu = makeElement("div", ["moduleMenu"], [heading, list]);
    const root = makeElement("div", [], [moduleMenu]);

    const detections = excludeComponents(root);

    expect(detections.moduleMenuElement).not.toBeNull();
    expect(detections.moduleMenuElement!.classes).toContain("moduleMenu");
    expect(detections.moduleMenuElement!.children).toHaveLength(2);
    // The moduleMenu should be excluded from tree
    expect(root.children).toHaveLength(0);
  });

  it("handles nested exclusions (component inside component)", () => {
    // An accordion inside a carousel — both excluded.
    // The carousel is excluded first (top-down), so accordion is never reached.
    const accordion = makeElement("div", ["accordion"]);
    const carousel = makeElement("div", ["carousel"], [accordion]);
    const root = makeElement("div", [], [carousel]);

    excludeComponents(root);

    expect(root.children).toHaveLength(0);
  });

  it("does NOT exclude activity wrappers", () => {
    const activityContent = makeElement("p", []);
    const activity = makeElement(
      "div",
      ["activity", "alertPadding"],
      [activityContent],
      { attributes: { number: "1A" } }
    );
    const root = makeElement("div", [], [activity]);

    excludeComponents(root);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(activity);
    expect(activity.children).toHaveLength(1);
  });

  it("does NOT exclude alert boxes", () => {
    const alertContent = makeElement("p", []);
    const alertEl = makeElement("div", ["alert"], [alertContent]);
    const root = makeElement("div", [], [alertEl]);

    excludeComponents(root);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(alertEl);
  });

  it("does NOT exclude alertActivity", () => {
    const alertActivity = makeElement("div", ["alertActivity"]);
    const root = makeElement("div", [], [alertActivity]);

    excludeComponents(root);

    expect(root.children).toHaveLength(1);
  });
});
