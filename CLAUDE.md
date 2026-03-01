# CLAUDE.md — HTML Template Analyzer

## What This Project Is

A web application that takes multiple HTML files from Te Kura's template system, analyzes them for shared structural patterns, and generates a single canonical template HTML file. The user uploads 4–30 HTML lesson pages, the app identifies majority-consensus structure, and outputs a clean template with lorem ipsum placeholder text — styled correctly when opened in a browser.

**Domain context:** Te Kura (Te Aho o Te Kura Pounamu) is the New Zealand Correspondence School. Their lesson pages are built on a shared "refresh_template" system using Bootstrap grid classes and a custom JS/CSS framework loaded from `tekura.desire2learn.com`. Multiple developers author pages from the same template, introducing structural drift. This app reverse-engineers the canonical template from those drifted pages.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **HTML parsing:** `htmlparser2` + `domutils` + `domhandler`
- **Testing:** Vitest
- **Styling:** Tailwind CSS
- **All processing is self-contained** — no external HTML analysis APIs

## Project Structure

```
src/
  lib/
    analyzer/
      types.ts                       # All TypeScript interfaces
      componentExclusionRegistry.ts  # Exclusion registry Set + matching function
      bootstrapUtils.ts              # Column class detection/stripping
      htmlParser.ts                  # Raw HTML → ParsedElement tree
      styleStripper.ts               # Remove inline style attributes
      textStripper.ts                # Text stripping (handled by parser)
      componentExcluder.ts           # Prune excluded components from AST
      fingerprinter.ts               # Generate structural fingerprints
      pipeline.ts                    # Chains all steps → analyzeFile()
      consensus.ts                   # Cross-file consensus analysis (Phase 3)
      templateGenerator.ts           # Generate output HTML template (Phase 4)
      firstPageDetector.ts           # First page detection + module code extraction
      moduleMenuHandler.ts           # Module menu structure capture
  app/                               # Next.js App Router pages
  components/                        # React UI components (Phase 5)
  __tests__/
    analyzer/                        # Vitest test files
  test-fixtures/                     # Real Te Kura HTML files for testing
```

## Development Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | HTML Parser, Style/Column Stripping, Component Exclusion, Fingerprinting | In progress |
| 2 | First Page Detection, Module Code Extraction, Module Menu Handling | Not started |
| 3 | Consensus Analysis Engine | Not started |
| 4 | Template Generator | Not started |
| 5 | Web Application UI | Not started |
| 6 | Refinement and Edge Cases | Not started |

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm test             # Run Vitest tests
npm run test:watch   # Run Vitest in watch mode
```

---

## CRITICAL RULES — READ BEFORE EVERY CHANGE

These rules are non-negotiable. Violating any of them produces incorrect output.

### 1. Component Exclusion Registry

The analysis engine must **completely ignore** certain Te Kura interactive components. When an element's class list contains ANY class from the Component Exclusion Registry, that element AND its entire subtree are invisible to analysis.

**Matching rules:**
- **Case-sensitive:** `TKmodal` matches, `tkmodal` does not
- **Token-based:** Match whole class tokens only. `carousel` matches in `class="row carousel audioBook"` but does NOT match `class="carousel-caption"`
- **Top-down absolute:** When excluded, the element + all descendants are pruned. The parent stays.

**Things that are NOT excluded (common mistakes):**
- `alert` — NOT in registry. Alert boxes are simple content containers.
- `alertActivity` — NOT in registry. Sidebar activity notes are structural.
- `activity` — NOT in registry. Activity wrappers (`div.activity`) ARE template structure. Only the component elements INSIDE activities are excluded.
- `row` — NOT in registry. Structural container.
- `externalButton` — NOT in registry.

**Special cases where exclusion from analysis ≠ exclusion from output:**
- `moduleMenu` — Excluded from fingerprinting/consensus BUT the module menu structure is ALWAYS fully generated in the template output (see Module Menu Handling below).
- `videoSection` — Excluded from fingerprinting/consensus BUT the template output includes the canonical video section markup whenever ANY uploaded file contained a videoSection.
- `accordion` inside `div.acks` — The acks accordion shell is preserved in the template as part of the always-generated acknowledgements section.

The full registry is in `src/lib/analyzer/componentExclusionRegistry.ts`.

### 2. Bootstrap Column Classes Are Invisible to Analysis

ALL Bootstrap column classes are **stripped from fingerprints** during analysis. They are never compared across files.

**What gets stripped:** `col`, `col-auto`, `col-1` through `col-12`, `col-sm-*`, `col-md-*`, `col-lg-*`, `col-xl-*`, `col-xxl-*` — any class matching `/^col(-(?:sm|md|lg|xl|xxl))?(-(?:\d{1,2}|auto))?$/`

**What is NOT stripped:**
- `row` — structural container, IS analyzed
- `offset-md-0`, `offset-3` — layout modifiers, IS analyzed
- `paddingR`, `paddingL`, `paddingLR` — layout helpers, IS analyzed
- `flex-end` — layout modifier, IS analyzed
- `container-fluid` — NOT a column class
- `column-3` — NOT a Bootstrap grid class (it's a custom class used in quiz layouts)

**In the generated template output**, standardized column classes are always applied regardless of what source files used:
- Primary content: `col-md-8 col-12`
- Sidebar: `col-md-4 offset-md-0 col-12` (or `col-md-4 offset-md-0 col-6 offset-3`)
- Full width: `col-md-12`
- Activity inner: `col-12`
- Interactive activity: `col-md-8 col-12` for content inside `col-12` wrapper

### 3. Inline Styles Are Stripped Completely

ALL `style="..."` attributes are removed during parsing. They never appear in analysis. They never appear in the generated template. Zero exceptions.

### 4. Text Content Is Irrelevant

All text node content is stripped during parsing. The analysis engine operates purely on structural skeletons: tags, classes, IDs, attributes, hierarchy.

### 5. Generated Template Uses Lorem Ipsum — NOT Developer Labels

The template output uses lorem ipsum placeholder text. **Never** use developer-label descriptions like "Body paragraph text" or "Section Heading". Use actual lorem ipsum: `"Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."`

### 6. Canonical Video Section Markup

When the template includes a video section, ALWAYS use this exact markup — no deviations:

```html
<div class="videoSection icon ratio ratio-16x9">
    <iframe class="embed-responsive-item" height="339" src="https://player.vimeo.com/video/317381854" frameborder="0" allowfullscreen></iframe>
</div>
```

- Always `icon` class present
- Always `embed-responsive-item` class on iframe
- Always `height="339"` on iframe
- Always the Vimeo placeholder URL — never YouTube, never URLs from source files
- Wrapped in `div.row > div.col-md-8.col-12`

### 7. Acknowledgements Section Is ALWAYS Generated

Every generated template includes the acknowledgements section, regardless of whether any uploaded file contains one. Uses the canonical structure: `div.acks > div.accordion > div.accHead + div.accContent` with `<span class="currentYear"></span>` for dynamic copyright year.

### 8. No Inconsistency Report

The generated template NEVER contains an inconsistency report, analysis summary, difference log, or any diagnostic section. Structural differences are resolved silently by majority consensus. Majority wins, minority is dropped, nothing is reported.

### 9. Valid HTML — No Duplicate IDs

The generated template must have exactly ONE `<div id="header">`, ONE `<div id="body">`, ONE `<div id="footer">`. No duplicate IDs anywhere.

### 10. Single Header Approach

The template has exactly ONE `<div id="header">`. If a first page (00) was uploaded, use the first page's header structure with HTML comments noting lesson-page differences. If no first page was uploaded, use the consensus lesson-page header. Never generate two headers.

---

## Te Kura HTML File Characteristics

Source files share these patterns:
- `<html lang="en" template="1-3" class="notranslate" translate="no">` (template values: `1-3`, `4-6`, `7-8`, `9-10`)
- External scripts: `stickyNav.js` (local), `idoc_scripts.js` (from CDN)
- Three-part page structure: `div#header`, `div#body`, `div#footer`, optionally followed by `div.acks`
- Bootstrap grid layout: `div.row` > `div.col-*` for all content
- Module code in `<title>` tag and filename (e.g., `ANZH101`, `ENGI401`, `OSAI301`)
- First pages (00) have tabbed module menus; lesson pages have simpler menus
- Activity wrappers: `div.activity` with `number` attribute and modifier classes (`alertPadding`, `interactive`, `dropbox`)
- Footer: `ul.footer-nav` with `#prev-lesson`, `#next-lesson`, `.home-nav`

### First Page Detection

A file is a "first page" if:
- Filename contains `0_0`, `0.0`, `_00`, or `-00`
- OR `<title>` starts with `0.0` or `00`
- OR `#module-code > h1` contains a module code pattern (letters + numbers) rather than a lesson number

### Module Code Extraction

Priority order: `<title>` tag → `#module-code > h1` (first page only) → filename. Pattern: `/[A-Z]{2,}[A-Z0-9]*\d+/` (e.g., `ANZH101`). When multiple files have different codes, extract the longest common prefix. If no common prefix exists, use `[MODULE_CODE]`.

---

## Module Menu Handling

Even though `moduleMenu` is in the Component Exclusion Registry (excluded from analysis), the template generator MUST produce the full module menu structure:

- **If first page (00) is uploaded:** Use the first page's module menu structure. Preserve `<h4>` and `<h5>` heading text exactly. Replace all other text with lorem ipsum. Include HTML comment showing the lesson-page variant.
- **If no first page:** Use the simpler lesson-page module menu with `<h5>We are learning:</h5>` / `<h5>I can:</h5>` headings and lorem ipsum list items.

---

## Template Output Layout Order

The generated template is a **component catalogue**, not a recreation of any single page:

1. `<head>` — meta tags, title with module code, script references
2. `<div id="header">` — single header with module code, titles, module menu
3. `<div id="body">` — each section preceded by `<h4>` label, separated by `<hr>`:
   - Heading hierarchy (h2–h5)
   - Paragraph (with inline formatting examples)
   - Paragraph with sidebar image (if in consensus)
   - Quote text (if `p.quoteText` / `p.quoteAck` in consensus)
   - Lists (unordered and/or ordered)
   - Tables (if in consensus)
   - Images
   - Video (canonical markup, if any file had videoSection)
   - Alerts (each variant found)
   - Activity — standard (`div.activity.alertPadding`)
   - Activity — interactive (if found)
   - Activity — dropbox (if found)
4. `<div id="footer">` — footer navigation
5. Acknowledgements section (ALWAYS, using canonical structure)

Section labels use `<h4>` inside `div.row > div.col-md-12`. Placeholder images use `https://placehold.co/`. Activity numbers are sequential: `1A`, `1B`, `1C`.

---

## Standard Bootstrap Column Patterns for Output

These are always used in the generated template regardless of source file variations:

```html
<!-- Primary content -->
<div class="row"><div class="col-md-8 col-12">...</div></div>

<!-- With sidebar -->
<div class="row">
    <div class="col-md-8 col-12">...</div>
    <div class="col-md-4 offset-md-0 col-12">...</div>
</div>

<!-- Full width (section labels) -->
<div class="row"><div class="col-md-12">...</div></div>

<!-- Activity standard -->
<div class="row"><div class="col-md-8 col-12"><div class="activity alertPadding" number="1A">
    <div class="row"><div class="col-12">...</div></div>
</div></div></div>

<!-- Activity interactive -->
<div class="row"><div class="col-12"><div class="activity interactive" number="1B">
    <div class="row">
        <div class="col-md-12"><h3>...</h3></div>
        <div class="col-md-8 col-12"><p>...</p></div>
    </div>
</div></div></div>

<!-- Activity dropbox -->
<div class="row"><div class="col-md-8 col-12"><div class="activity alertPadding dropbox" number="1C">
    <div class="row"><div class="col-12">...</div></div>
</div></div></div>

<!-- Alert -->
<div class="col-md-8 col-12"><div class="alert">
    <div class="row"><div class="col-12"><p>...</p></div></div>
</div></div>

<!-- Image with caption -->
<div class="row flex-end">
    <div class="col-md-8 col-12"><img class="img-fluid" src="https://placehold.co/1280x720?text=Image+Placeholder" alt="Placeholder image"></div>
    <div class="col-md-2 offset-md-0 col-6 offset-3 paddingL"><p class="captionText">Caption text placeholder.</p></div>
</div>

<!-- Video -->
<div class="row"><div class="col-md-8 col-12">
    <div class="videoSection icon ratio ratio-16x9">
        <iframe class="embed-responsive-item" height="339" src="https://player.vimeo.com/video/317381854" frameborder="0" allowfullscreen></iframe>
    </div>
</div></div>

<!-- Acknowledgements -->
<div class="row"><div class="col-md-8 col-12"><div class="acks">...</div></div></div>
```

---

## Edge Cases

- **Single file uploaded:** 100% consensus. Still generate acknowledgements.
- **Two files at 50% threshold:** Elements in both = consensus, elements in one = split.
- **Only first pages uploaded:** Treat normally.
- **No first page:** Use lesson-page header only, no first-page comments.
- **Malformed HTML:** Report error, exclude file from analysis.
- **Mixed template versions:** Warn in UI (not in template output).
- **New component types not in registry:** Analyzed as regular elements. User can add to registry.
- **Components nested inside components:** Top-down exclusion handles this automatically.

---

## Testing

Test files are in `src/test-fixtures/`. All tests use Vitest.

When writing tests, always verify:
- No `style` attributes survive in processed ASTs
- No excluded component elements appear in fingerprint maps
- Column classes don't affect fingerprint equality
- `hasVideoSection` is detected BEFORE exclusion occurs
- Module code extraction works from title tag and filename
- First page detection handles all filename patterns
- Generated template has exactly one of each ID'd element
- Generated template contains zero inline styles
- Generated template uses lorem ipsum (not developer labels)
- Acknowledgements section is always present in output
