import type { ParsedElement } from "./types";

/**
 * Text content stripping is handled during parsing — text nodes are not
 * included in the ParsedElement tree. This module exists as a pipeline
 * placeholder and for any future text-related processing needs.
 */
export function stripTextContent(root: ParsedElement): ParsedElement {
  // Text nodes are already excluded during HTML parsing.
  // ParsedElement only contains element nodes, not text nodes.
  return root;
}
