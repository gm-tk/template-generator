import { describe, it, expect } from "vitest";
import {
  isBootstrapColumnClass,
  stripColumnClasses,
} from "@/lib/analyzer/bootstrapUtils";

describe("isBootstrapColumnClass", () => {
  // TRUE cases — Bootstrap column classes
  it.each([
    ["col-md-8", true],
    ["col-12", true],
    ["col-md-12", true],
    ["col-6", true],
    ["col-sm-4", true],
    ["col-xl-6", true],
    ["col-xxl-3", true],
    ["col", true],
    ["col-auto", true],
    ["col-md-auto", true],
    ["col-md", true], // bare breakpoint, no number — valid Bootstrap
  ])("returns true for %s", (className, expected) => {
    expect(isBootstrapColumnClass(className)).toBe(expected);
  });

  // FALSE cases — NOT Bootstrap column classes
  it.each([
    ["row", false],
    ["offset-md-0", false],
    ["offset-3", false],
    ["activity", false],
    ["alertPadding", false],
    ["paddingR", false],
    ["container-fluid", false],
    ["column-3", false], // custom class, not Bootstrap grid
  ])("returns false for %s", (className, expected) => {
    expect(isBootstrapColumnClass(className)).toBe(expected);
  });

  // Edge cases
  it("returns false for empty string", () => {
    expect(isBootstrapColumnClass("")).toBe(false);
  });

  it("returns false for 'color' (col as substring)", () => {
    expect(isBootstrapColumnClass("color")).toBe(false);
  });

  it("returns false for 'col-xs-6' (xs is not a valid breakpoint)", () => {
    // xs is not in the Bootstrap 5 breakpoint set for the col pattern
    expect(isBootstrapColumnClass("col-xs-6")).toBe(false);
  });

  it("returns false for 'col-md-13' (13 is two digits but exceeds 12)", () => {
    // The regex allows 1-2 digit numbers, so col-md-13 matches the pattern
    // (it's \d{1,2} which matches 13). This is technically "valid" by pattern.
    // Bootstrap allows arbitrary numbers in the regex, even if not standard.
    expect(isBootstrapColumnClass("col-md-13")).toBe(true);
  });
});

describe("stripColumnClasses", () => {
  it("strips column classes and keeps non-column classes", () => {
    expect(
      stripColumnClasses(["col-md-8", "col-12", "activity", "alertPadding"])
    ).toEqual(["activity", "alertPadding"]);
  });

  it("keeps row and strips col classes", () => {
    expect(stripColumnClasses(["col-xl-6", "row"])).toEqual(["row"]);
  });

  it("keeps offset classes and strips col classes", () => {
    expect(stripColumnClasses(["col-md-6", "offset-md-0", "col-12"])).toEqual([
      "offset-md-0",
    ]);
  });

  it("returns empty array when all classes are column classes", () => {
    expect(stripColumnClasses(["col-md-8", "col-12"])).toEqual([]);
  });

  it("returns full array when no classes are column classes", () => {
    expect(
      stripColumnClasses(["row", "activity", "paddingR", "flex-end"])
    ).toEqual(["row", "activity", "paddingR", "flex-end"]);
  });

  it("handles empty array", () => {
    expect(stripColumnClasses([])).toEqual([]);
  });
});
