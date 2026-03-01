import { isExcludedComponent, COMPONENT_EXCLUSION_REGISTRY } from "./componentExclusionRegistry";
import type { ParsedElement } from "./types";

export interface ComponentDetections {
  /** Whether any element with class 'videoSection' was found (before exclusion) */
  hasVideoSection: boolean;
  /** Whether any element with class 'acks' was found */
  hasAcknowledgements: boolean;
  /** The raw moduleMenu element (before exclusion) for later template generation */
  moduleMenuElement: ParsedElement | null;
}

/**
 * Walks the AST top-down. When an element's classes match the Component
 * Exclusion Registry, marks it as excluded and removes it from its parent's
 * children array. The parent is NOT excluded (unless it independently matches).
 *
 * IMPORTANT: Before pruning, this function must DETECT and record the presence
 * of special elements (videoSection, acks, moduleMenu) for later use by the
 * template generator. These detections are returned alongside the pruned tree.
 *
 * Mutates the tree in place. Returns detection flags.
 *
 * @param root - The AST root element
 * @param customRegistry - Optional custom exclusion registry. Falls back to default if not provided.
 */
export function excludeComponents(
  root: ParsedElement,
  customRegistry?: Set<string>
): ComponentDetections {
  const detections: ComponentDetections = {
    hasVideoSection: false,
    hasAcknowledgements: false,
    moduleMenuElement: null,
  };

  // First pass: detect special elements throughout the entire tree
  detectSpecialElements(root, detections);

  // Second pass: prune excluded components top-down
  const registry = customRegistry ?? COMPONENT_EXCLUSION_REGISTRY;
  pruneExcluded(root, registry);

  return detections;
}

function detectSpecialElements(
  element: ParsedElement,
  detections: ComponentDetections
): void {
  if (element.classes.includes("videoSection")) {
    detections.hasVideoSection = true;
  }
  if (element.classes.includes("acks")) {
    detections.hasAcknowledgements = true;
  }
  if (element.classes.includes("moduleMenu") && !detections.moduleMenuElement) {
    detections.moduleMenuElement = deepClone(element);
  }

  for (const child of element.children) {
    detectSpecialElements(child, detections);
  }
}

function pruneExcluded(element: ParsedElement, registry: Set<string>): void {
  // Filter children: remove any that match the exclusion registry
  element.children = element.children.filter((child) => {
    if (child.classes.some((cls) => registry.has(cls))) {
      child.excluded = true;
      return false;
    }
    return true;
  });

  // Recurse into remaining children
  for (const child of element.children) {
    pruneExcluded(child, registry);
  }
}

function deepClone(element: ParsedElement): ParsedElement {
  return {
    tagName: element.tagName,
    classes: [...element.classes],
    id: element.id,
    attributes: { ...element.attributes },
    children: element.children.map((child) => deepClone(child)),
    depth: element.depth,
    excluded: element.excluded,
    fingerprintClasses: [...element.fingerprintClasses],
  };
}
