import type { ModuleCodeResult } from './types';

const MODULE_CODE_PATTERN = /[A-Z]{2,}[A-Z0-9]*\d+/;

/**
 * Extracts a module code from a single file.
 *
 * Priority order:
 * 1. Filename — look for pattern /[A-Z]{2,}[A-Z0-9]*\d+/
 * 2. Title tag text — look for same pattern
 *
 * Filename-derived code wins when both exist and differ.
 *
 * @param rawHTML - The raw HTML string of the file
 * @param filename - The original filename
 * @returns The extracted module code, or null if none found
 */
export function extractModuleCode(
  rawHTML: string,
  filename: string
): string | null {
  // Try filename first (it takes priority)
  const filenameCode = extractFromFilename(filename);

  // Try title
  const titleCode = extractFromTitle(rawHTML);

  // Filename wins if present
  if (filenameCode) return filenameCode;
  if (titleCode) return titleCode;

  return null;
}

function extractFromFilename(filename: string): string | null {
  const match = filename.match(MODULE_CODE_PATTERN);
  return match ? match[0] : null;
}

function extractFromTitle(rawHTML: string): string | null {
  const titleMatch = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return null;

  const titleText = titleMatch[1].trim();
  const codeMatch = titleText.match(MODULE_CODE_PATTERN);
  return codeMatch ? codeMatch[0] : null;
}

/**
 * Resolves a single module code from multiple files' individual codes.
 *
 * Rules:
 * - If all files share the same code → return that code (resolution: 'single')
 * - If codes differ but share a common prefix of 2+ chars with 2+ uppercase letters
 *   → return the longest common prefix (resolution: 'common-prefix')
 * - If codes have no meaningful common prefix → return '[MODULE_CODE]'
 *   (resolution: 'unrelated')
 * - Null entries (files where no code was found) are ignored
 *
 * @param perFileCodes - Map of filename → extracted module code (or null)
 * @returns ModuleCodeResult with resolved code and metadata
 */
export function resolveModuleCode(
  perFileCodes: Record<string, string | null>
): ModuleCodeResult {
  const validCodes = Object.values(perFileCodes).filter(
    (code): code is string => code !== null
  );

  if (validCodes.length === 0) {
    return {
      code: '[MODULE_CODE]',
      resolution: 'unrelated',
      perFileCode: perFileCodes,
    };
  }

  // Check if all codes are the same
  const uniqueCodes = [...new Set(validCodes)];
  if (uniqueCodes.length === 1) {
    return {
      code: uniqueCodes[0],
      resolution: 'single',
      perFileCode: perFileCodes,
    };
  }

  // Try to find a meaningful common prefix
  const prefix = longestCommonPrefix(uniqueCodes);
  if (isMeaningfulPrefix(prefix)) {
    return {
      code: prefix,
      resolution: 'common-prefix',
      perFileCode: perFileCodes,
    };
  }

  return {
    code: '[MODULE_CODE]',
    resolution: 'unrelated',
    perFileCode: perFileCodes,
  };
}

function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

/**
 * A common prefix is meaningful if it's at least 2 characters long
 * AND contains at least 2 uppercase letters.
 */
function isMeaningfulPrefix(prefix: string): boolean {
  if (prefix.length < 2) return false;
  const uppercaseCount = (prefix.match(/[A-Z]/g) || []).length;
  return uppercaseCount >= 2;
}
