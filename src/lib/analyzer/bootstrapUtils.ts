/**
 * Returns true if a class name is a Bootstrap grid COLUMN class.
 * Matches: col, col-auto, col-1 through col-12, col-md-1 through col-md-12,
 * col-sm-*, col-lg-*, col-xl-*, col-xxl-*, and bare col-auto, col, etc.
 *
 * Does NOT match: 'row' (structural container, not a column class).
 * Does NOT match: 'offset-md-0', 'offset-3', etc. (layout modifiers, kept for analysis).
 */
export function isBootstrapColumnClass(className: string): boolean {
  return /^col(-(?:sm|md|lg|xl|xxl))?(-(?:\d{1,2}|auto))?$/.test(className);
}

/**
 * Strips all Bootstrap column classes from a class list.
 * Returns a new array with only non-column classes.
 */
export function stripColumnClasses(classes: string[]): string[] {
  return classes.filter((cls) => !isBootstrapColumnClass(cls));
}
