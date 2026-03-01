import { parseDocument } from "htmlparser2";
import { Element, isTag } from "domhandler";
import type { ParsedElement } from "./types";

/**
 * Parse a raw HTML string into our ParsedElement tree.
 *
 * This function:
 * 1. Parses the HTML using htmlparser2
 * 2. Converts the htmlparser2 DOM into our ParsedElement format
 * 3. Preserves ALL attributes, classes, IDs
 * 4. Preserves the full element hierarchy
 * 5. Does NOT strip styles, text, or components — those are separate steps
 *
 * Returns the root ParsedElement (typically the <html> element,
 * or a virtual root wrapping top-level elements if no single root exists).
 */
export function parseHTML(rawHTML: string): ParsedElement {
  const doc = parseDocument(rawHTML);

  // Find all top-level element nodes (skip doctype, text, comments)
  const topElements = doc.children.filter(isTag);

  if (topElements.length === 1) {
    return convertElement(topElements[0], 0);
  }

  // If there's no single root element, find the <html> element
  const htmlEl = topElements.find((el) => el.tagName === "html");
  if (htmlEl) {
    return convertElement(htmlEl, 0);
  }

  // Fallback: create a virtual root wrapping all top-level elements
  return {
    tagName: "root",
    classes: [],
    id: null,
    attributes: {},
    children: topElements.map((el) => convertElement(el, 1)),
    depth: 0,
    excluded: false,
    fingerprintClasses: [],
  };
}

function convertElement(node: Element, depth: number): ParsedElement {
  const attribs = node.attribs || {};

  // Extract classes
  const classAttr = attribs["class"] || "";
  const classes = classAttr
    ? classAttr.split(/\s+/).filter((c) => c.length > 0)
    : [];

  // Extract id
  const id = attribs["id"] || null;

  // All other attributes (excluding class, id — style is kept for now,
  // stripping is a separate pipeline step)
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(attribs)) {
    if (key !== "class" && key !== "id") {
      attributes[key] = value;
    }
  }

  // Recursively convert child elements (skip text nodes, comments, etc.)
  const children: ParsedElement[] = [];
  for (const child of node.children) {
    if (isTag(child)) {
      children.push(convertElement(child as Element, depth + 1));
    }
  }

  return {
    tagName: node.tagName.toLowerCase(),
    classes,
    id,
    attributes,
    children,
    depth,
    excluded: false,
    fingerprintClasses: [],
  };
}
