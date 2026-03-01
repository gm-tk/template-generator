import * as htmlparser2 from 'htmlparser2';
import { Element, Text, isTag, isText } from 'domhandler';
import type { ModuleMenuCapture } from './types';

const LOREM_LIST_ITEMS = [
  'Lorem ipsum dolor sit amet.',
  'Consetetur sadipscing elitr.',
  'Sed diam nonumy eirmod tempor.',
  'At vero eos et accusam et justo.',
  'Stet clita kasd gubergren, no sea.',
];

const LOREM_PARAGRAPH = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.';

const MAX_LIST_ITEMS = 3;

/** Tags whose text content should be preserved exactly as-is */
const PRESERVED_HEADING_TAGS = new Set(['h3', 'h4', 'h5']);

/**
 * Captures and processes the module menu structure from an HTML file.
 *
 * Extracts the full inner HTML of the module menu element, then processes text:
 * - h3, h4, h5 text: PRESERVED exactly (including child spans)
 * - li>a text inside ul.nav.nav-tabs: PRESERVED (tab labels)
 * - p text: REPLACED with lorem ipsum
 * - li text (inside ul/ol, NOT inside nav tabs): REPLACED with lorem ipsum
 * - All other text content: REPLACED with lorem ipsum
 *
 * List items are normalised to MAX_LIST_ITEMS per list (or fewer if original had fewer).
 *
 * @param rawHTML - The raw HTML string of the file
 * @returns ModuleMenuCapture with processed and original HTML, or null if no menu found
 */
export function captureModuleMenu(
  rawHTML: string
): ModuleMenuCapture | null {
  const menuHTML = extractModuleMenuInnerHTML(rawHTML);
  if (!menuHTML) return null;

  const originalHTML = menuHTML;
  const processedHTML = processMenuHTML(menuHTML);

  return {
    processedHTML,
    originalHTML,
  };
}

/**
 * Extracts the innerHTML of the module menu content element.
 *
 * Handles two structural variants:
 * 1. <div id="module-menu-content" class="moduleMenu">...content...</div>
 *    (ID and class on the same element)
 * 2. <div id="module-menu-content"><div class="moduleMenu">...content...</div></div>
 *    (class on an inner child div)
 *
 * Returns the innerHTML of the element that has the moduleMenu class,
 * or the innerHTML of #module-menu-content if it has the class itself.
 */
function extractModuleMenuInnerHTML(rawHTML: string): string | null {
  // Strategy: find the module menu content by looking for the moduleMenu class
  // or the module-menu-content id, then extract innerHTML using bracket matching.

  // Try to find div#module-menu-content first
  const idPattern = /<div[^>]*id\s*=\s*["']module-menu-content["'][^>]*>/i;
  const idMatch = idPattern.exec(rawHTML);
  if (!idMatch) return null;

  const outerStartTag = idMatch[0];
  const outerStartPos = idMatch.index;

  // Check if the outer element also has class="moduleMenu"
  const hasModuleMenuClass = /class\s*=\s*["'][^"']*moduleMenu[^"']*["']/i.test(outerStartTag);

  if (hasModuleMenuClass) {
    // The outer element IS the module menu — extract its innerHTML
    return extractInnerHTML(rawHTML, outerStartPos, outerStartTag);
  }

  // Otherwise, look for a child div.moduleMenu inside #module-menu-content
  const outerInnerHTML = extractInnerHTML(rawHTML, outerStartPos, outerStartTag);
  if (!outerInnerHTML) return null;

  const innerPattern = /<div[^>]*class\s*=\s*["'][^"']*moduleMenu[^"']*["'][^>]*>/i;
  const innerMatch = innerPattern.exec(outerInnerHTML);
  if (!innerMatch) return null;

  return extractInnerHTML(outerInnerHTML, innerMatch.index, innerMatch[0]);
}

/**
 * Extracts innerHTML from a known start tag position using bracket matching.
 */
function extractInnerHTML(
  html: string,
  startTagPos: number,
  startTag: string
): string | null {
  const contentStart = startTagPos + startTag.length;

  // Extract the tag name from the start tag
  const tagNameMatch = startTag.match(/<(\w+)/);
  if (!tagNameMatch) return null;
  const tagName = tagNameMatch[1].toLowerCase();

  // Find the matching closing tag using a depth counter
  let depth = 1;
  let pos = contentStart;
  const openPattern = new RegExp(`<${tagName}[\\s>]`, 'gi');
  const closePattern = new RegExp(`</${tagName}>`, 'gi');

  while (depth > 0 && pos < html.length) {
    openPattern.lastIndex = pos;
    closePattern.lastIndex = pos;

    const nextOpen = openPattern.exec(html);
    const nextClose = closePattern.exec(html);

    if (!nextClose) return null; // Malformed HTML

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(contentStart, nextClose.index).trim();
      }
      pos = nextClose.index + nextClose[0].length;
    }
  }

  return null;
}

/**
 * Processes the module menu HTML: preserves heading text, replaces body text with lorem ipsum,
 * and normalises list item counts.
 */
function processMenuHTML(menuHTML: string): string {
  const doc = htmlparser2.parseDocument(menuHTML);
  processNode(doc);
  return serializeNode(doc);
}

/**
 * Recursively processes DOM nodes to apply text replacement rules.
 */
function processNode(node: any): void {
  if (!node.children) return;

  for (const child of node.children) {
    if (isTag(child)) {
      const tagName = child.tagName.toLowerCase();

      if (PRESERVED_HEADING_TAGS.has(tagName)) {
        // Preserve heading text entirely — skip processing children
        continue;
      }

      if (tagName === 'p') {
        replaceTextContent(child, LOREM_PARAGRAPH);
        continue;
      }

      if (tagName === 'ul' || tagName === 'ol') {
        processListElement(child);
        continue;
      }

      // Recurse into other elements
      processNode(child);
    }
  }
}

/**
 * Processes a list element: replaces text and normalises item count.
 */
function processListElement(listEl: Element): void {
  // Check if this is a nav-tabs list (tab labels should be preserved)
  const classes = (listEl.attribs?.class || '').split(/\s+/);
  const isNavTabs = classes.includes('nav-tabs') || classes.includes('nav');

  const liElements = listEl.children.filter(
    (child): child is Element => isTag(child) && child.tagName === 'li'
  );

  if (isNavTabs) {
    // Preserve tab label text
    return;
  }

  // Normalise list item count to MAX_LIST_ITEMS or fewer
  const targetCount = Math.min(liElements.length, MAX_LIST_ITEMS);

  // Replace text in kept items with cycling lorem ipsum
  for (let i = 0; i < targetCount; i++) {
    replaceTextContent(liElements[i], LOREM_LIST_ITEMS[i % LOREM_LIST_ITEMS.length]);
  }

  // Remove excess list items
  if (liElements.length > MAX_LIST_ITEMS) {
    const toRemove = liElements.slice(MAX_LIST_ITEMS);
    listEl.children = listEl.children.filter(
      (child) => !toRemove.includes(child as Element)
    );
  }
}

/**
 * Replaces all text content within an element with a single text node.
 * Removes all child elements and replaces with plain text.
 */
function replaceTextContent(element: Element, text: string): void {
  const textNode = new Text(text);
  (textNode as any).parent = element;
  element.children = [textNode];
}

/**
 * Serializes a DOM node back to an HTML string.
 */
function serializeNode(node: any): string {
  if (isText(node)) {
    return (node as Text).data;
  }

  if (isTag(node)) {
    const element = node as Element;
    const tagName = element.tagName;

    // Build attributes string
    let attrs = '';
    if (element.attribs) {
      for (const [key, value] of Object.entries(element.attribs)) {
        if (value === '') {
          attrs += ` ${key}`;
        } else {
          attrs += ` ${key}="${escapeAttr(value)}"`;
        }
      }
    }

    // Void elements (self-closing)
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);

    if (voidElements.has(tagName)) {
      return `<${tagName}${attrs}>`;
    }

    // Serialize children
    const childrenHTML = (element.children || [])
      .map((child: any) => serializeNode(child))
      .join('');

    return `<${tagName}${attrs}>${childrenHTML}</${tagName}>`;
  }

  // For document nodes or other containers, serialize children
  if (node.children) {
    return node.children.map((child: any) => serializeNode(child)).join('');
  }

  return '';
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
