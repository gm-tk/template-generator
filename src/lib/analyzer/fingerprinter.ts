import { stripColumnClasses } from "./bootstrapUtils";
import type { ParsedElement, StructuralFingerprint } from "./types";

/**
 * Generates structural fingerprints for all non-excluded elements in the tree.
 *
 * A fingerprint captures:
 * - Tag name
 * - Classes (with Bootstrap column classes STRIPPED)
 * - ID (if present)
 * - Custom attributes (sorted by key, excluding 'style', 'class', 'id')
 * - Parent's fingerprint hash (to capture nesting context)
 * - Ordered child element signatures (tag+fingerprintClasses of each child)
 * - Depth in tree
 *
 * Two elements with identical fingerprints are considered structurally equivalent
 * regardless of their Bootstrap column classes or text content.
 */
export function generateFingerprints(
  root: ParsedElement,
  parentHash?: string
): Map<ParsedElement, StructuralFingerprint> {
  const results = new Map<ParsedElement, StructuralFingerprint>();

  if (root.excluded) {
    return results;
  }

  // Compute fingerprintClasses (strip column classes)
  root.fingerprintClasses = stripColumnClasses(root.classes);

  // Build the fingerprint input string
  const parts: string[] = [];

  // Tag name
  parts.push(`tag:${root.tagName}`);

  // Sorted fingerprint classes
  const sortedClasses = [...root.fingerprintClasses].sort();
  parts.push(`classes:${sortedClasses.join(".")}`);

  // ID
  parts.push(`id:${root.id || ""}`);

  // Sorted attributes (excluding class, id, style)
  const attrKeys = Object.keys(root.attributes)
    .filter((k) => k !== "style")
    .sort();
  for (const key of attrKeys) {
    parts.push(`attr:${key}=${root.attributes[key]}`);
  }

  // Parent hash
  parts.push(`parent:${parentHash || ""}`);

  // Child sequence signatures
  const childSigs: string[] = [];
  for (const child of root.children) {
    if (!child.excluded) {
      const childFpClasses = stripColumnClasses(child.classes);
      childSigs.push(`${child.tagName}.${childFpClasses.sort().join(".")}`);
    }
  }
  parts.push(`children:[${childSigs.join(",")}]`);

  // Depth
  parts.push(`depth:${root.depth}`);

  const fingerprintString = parts.join("|");
  const hash = djb2Hash(fingerprintString);

  // Build human-readable signature
  const signature = buildSignature(root);

  const fingerprint: StructuralFingerprint = {
    hash,
    signature,
    depth: root.depth,
    element: root,
  };

  results.set(root, fingerprint);

  // Recurse into non-excluded children
  for (const child of root.children) {
    if (!child.excluded) {
      const childFingerprints = generateFingerprints(child, hash);
      for (const [el, fp] of childFingerprints) {
        results.set(el, fp);
      }
    }
  }

  return results;
}

/**
 * Simple DJB2 hash function — returns a string representation.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned 32-bit and then to hex string
  return (hash >>> 0).toString(16);
}

/**
 * Build a human-readable signature string for debugging.
 * Examples: "div#header", "div.row", "div.activity.alertPadding[number=1A]", "h3", "p"
 */
function buildSignature(element: ParsedElement): string {
  let sig = element.tagName;

  if (element.id) {
    sig += `#${element.id}`;
  }

  for (const cls of element.fingerprintClasses) {
    sig += `.${cls}`;
  }

  // Include notable attributes
  const notableAttrs = Object.entries(element.attributes)
    .filter(([key]) => key !== "style")
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key, value] of notableAttrs) {
    if (value) {
      sig += `[${key}=${value}]`;
    } else {
      sig += `[${key}]`;
    }
  }

  return sig;
}
