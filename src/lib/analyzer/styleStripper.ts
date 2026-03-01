import type { ParsedElement } from "./types";

/**
 * Recursively removes all 'style' attributes from every element in the tree.
 * Mutates the tree in place. Returns the same root element.
 *
 * Inline styles are developer overrides and NOT part of the template structure.
 */
export function stripInlineStyles(root: ParsedElement): ParsedElement {
  delete root.attributes["style"];

  for (const child of root.children) {
    stripInlineStyles(child);
  }

  return root;
}
