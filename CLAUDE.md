# CLAUDE.md — HTML Template Analyzer

## What This Project Is

A web application that takes multiple HTML files from Te Kura's template system, analyzes them for shared structural patterns, and generates a single canonical template HTML file. The user uploads 4–30 HTML lesson pages, the app identifies majority-consensus structure, and outputs a clean template with lorem ipsum placeholder text — styled correctly when opened in a browser.

**Domain context:** Te Kura (Te Aho o Te Kura Pounamu) is the New Zealand Correspondence School. Their lesson pages are built on a shared "refresh_template" system using Bootstrap grid classes and a custom JS/CSS framework loaded from `tekura.desire2learn.com`. Multiple developers author pages from the same template, introducing structural drift. This app reverse-engineers the canonical template from those drifted pages.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **HTML parsing:** `htmlparser2` + `domutils` + `domhandler`
- **Testing:** Vitest (with `globals: true`, path alias `@` → `./src`)
- **Styling:** Tailwind CSS
- **All processing is self-contained** — no external HTML analysis APIs

## Project Structure

```
src/
  lib/
    analyzer/
      types.ts                       # All TypeScript interfaces (ParsedElement, FileAnalysis, etc.)
      componentExclusionRegistry.ts  # Exclusion registry Set (100 classes) + matching function
      bootstrapUtils.ts              # Column class detection (isBootstrapColumnClass) + stripping
      htmlParser.ts                  # Raw HTML → ParsedElement tree (htmlparser2, skips text nodes)
      styleStripper.ts               # Remove inline style attributes (mutates AST in place)
      textStripper.ts                # Text stripping (no-op, handled by parser)
      componentExcluder.ts           # Prune excluded components from AST + detect special elements
      fingerprinter.ts               # Generate structural fingerprints (DJB2 hash + signatures)
      moduleCodeExtractor.ts         # Per-file module code extraction + cross-file resolution
      moduleMenuHandler.ts           # Module menu DOM capture with text processing
      pipeline.ts                    # analyzeFile() single-file + analyzeFiles() batch pipeline
      consensus.ts                   # Cross-file consensus analysis (Phase 3 — not started)
      templateGenerator.ts           # Generate output HTML template (Phase 4 — not started)
  app/
    layout.tsx                       # Next.js root layout
    page.tsx                         # Next.js home page (placeholder)
  components/                        # React UI components (Phase 5 — empty)
  __tests__/
    analyzer/
      bootstrapUtils.test.ts         # 29 tests — column class detection/stripping
      componentExcluder.test.ts      # 24 tests — exclusion + special element detection
      fingerprinter.test.ts          # 11 tests — fingerprint generation + hash stability
      moduleCodeExtractor.test.ts    # 16 tests — extraction + cross-file resolution
      moduleMenuHandler.test.ts      # 14 tests — menu capture + text processing
      pipeline.test.ts               # 37 tests — full pipeline integration + batch analysis
  test-fixtures/
      ANZH101_1_0.html               # Lesson page 1 (h1=01, template 1-3)
      ANZH101_2_0.html               # Lesson page 2 (h1=02, template 1-3)
      ANZH101_3_0.html               # Lesson page 3 (h1=03, template 1-3)
```

## Development Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | HTML Parser, Style/Column Stripping, Component Exclusion, Fingerprinting | **Complete** |
| 2 | Module Code Extraction, Module Menu Handling | **Complete** |
| 3 | Consensus Analysis Engine | Not started |
| 4 | Template Generator | Not started |
| 5 | Web Application UI | Not started |
| 6 | Refinement and Edge Cases | Not started |

**Total tests: 131** (all passing across 6 test files)

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm test             # Run Vitest tests (vitest run)
npm run test:watch   # Run Vitest in watch mode
```

---

## What Has Been Built

### Phase 1 — Parsing Pipeline (Complete)

The core analysis pipeline processes a single HTML file through these steps:

1. **`htmlParser.ts`** — Parses raw HTML via `htmlparser2` into a `ParsedElement` tree. Skips text nodes entirely (structural analysis only). Preserves all attributes, classes, IDs, and hierarchy.

2. **`styleStripper.ts`** — Recursively deletes all `style="..."` attributes from the AST. Mutates in place.

3. **`textStripper.ts`** — No-op placeholder (text nodes already excluded by the parser).

4. **`componentExcluder.ts`** — Two-pass operation:
   - **Pass 1 (detect):** Walks full tree to record `hasVideoSection`, `hasAcknowledgements`, and captures `moduleMenuElement` (deep cloned) BEFORE any pruning.
   - **Pass 2 (prune):** Removes elements whose classes match the Component Exclusion Registry. Top-down: excluded element + all descendants are removed; parent stays.

5. **`fingerprinter.ts`** — Generates `StructuralFingerprint` for every non-excluded element. Uses DJB2 hash incorporating: tag name, classes (with Bootstrap column classes stripped via `bootstrapUtils`), ID, sorted attributes, parent hash (nesting context), child signatures, and depth. Produces both a hash string and a human-readable signature like `div.row > div.activity.alertPadding`.

6. **`bootstrapUtils.ts`** — `isBootstrapColumnClass()` detects classes matching `/^col(-(?:sm|md|lg|xl|xxl))?(-(?:\d{1,2}|auto))?$/`. `stripColumnClasses()` filters them from arrays. These are stripped from fingerprints only — never from the raw AST.

7. **`componentExclusionRegistry.ts`** — A `Set<string>` of 100 excluded class names. Case-sensitive, whole-token matching via `isExcludedComponent()`.

### Phase 2 — Module Code Extraction, Module Menu Handling (Complete)

Two modules that work with **raw HTML strings** (because the Phase 1 AST strips text nodes):

1. **`moduleCodeExtractor.ts`** — Two functions:
   - `extractModuleCode(rawHTML, filename)` — Extracts code matching `/[A-Z]{2,}[A-Z0-9]*\d+/`. **Filename-derived code wins** over title-derived code when both exist.
   - `resolveModuleCode(perFileCodes)` — Cross-file resolution:
     - All same → `resolution: 'single'`
     - Shared prefix (2+ chars, 2+ uppercase letters) → `resolution: 'common-prefix'` with the prefix as the code
     - No meaningful prefix → `resolution: 'unrelated'`, code = `'[MODULE_CODE]'`
     - Null entries (no code found) are ignored

2. **`moduleMenuHandler.ts`** — `captureModuleMenu(rawHTML)` extracts and processes the module menu:
   - Finds `<div id="module-menu-content">` in raw HTML
   - Handles two structural variants: `moduleMenu` class on same element or on inner child div
   - **Text processing rules:**
     - `h3`, `h4`, `h5` text: **PRESERVED exactly** (including child `<span>` elements, leading spaces)
     - `li > a` inside `ul.nav.nav-tabs`: **PRESERVED** (tab labels)
     - `p` text: **REPLACED** with `"Lorem ipsum dolor sit amet, consectetur adipisicing elit."`
     - `li` text: **REPLACED** with cycling lorem ipsum variants (`"Lorem ipsum dolor sit amet."`, `"Consetetur sadipscing elitr."`, etc.)
   - List items normalised to **max 3 per list** (keeps original count if fewer)
   - Returns `ModuleMenuCapture` with `processedHTML` and `originalHTML`

3. **Updated `pipeline.ts`** — Two public functions:
   - `analyzeFile(rawHTML, filename)` — 8-step single-file pipeline (Phase 1 steps + Phase 2 module code extraction, module menu capture)
   - `analyzeFiles(files)` — Batch function for multi-file analysis:
     - Runs `analyzeFile()` on each file
     - Resolves cross-file module code via `resolveModuleCode()`
     - Selects first available module menu
     - Determines majority template version
     - Aggregates `hasVideoSection` and `hasAcknowledgements` across all files
     - Returns `BatchAnalysisResult`

### Key Type Interfaces (types.ts)

```typescript
ParsedElement          // Internal element tree node (tag, classes, id, attributes, children, depth)
StructuralFingerprint  // Hash + human-readable signature for structural comparison
FileAnalysis           // Single-file result (AST, fingerprints, flags, moduleMenuCapture)
ModuleMenuCapture      // Captured menu: processedHTML, originalHTML
ModuleCodeResult       // Cross-file code: code, resolution, perFileCode map
BatchAnalysisResult    // Multi-file result: files[], moduleCode, moduleMenu, flags
```

### Test Fixtures

- **`ANZH101_1_0.html`** — Lesson page with h1 `01`, simple module menu (h5 headings), videoSection, multiChoiceQuiz, dragAndDrop, hintDropContent, alertActivity, 3 activities, inline styles.
- **`ANZH101_2_0.html`** — Lesson page with h1 `02`, carousel, accordion, two videoSections, quoteText/quoteAck, ordered list, table, alertActivity.
- **`ANZH101_3_0.html`** — Lesson page with h1 `03`, videoSection, h3 sub-heading, all 3 activity types (standard, interactive, dropbox), activity with internal accordion.

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

The template has exactly ONE `<div id="header">`. Use the consensus lesson-page header structure. Never generate two headers.

---

## Te Kura HTML File Characteristics

Source files share these patterns:
- `<html lang="en" template="1-3" class="notranslate" translate="no">` (template values: `1-3`, `4-6`, `7-8`, `9-10`)
- External scripts: `stickyNav.js` (local), `idoc_scripts.js` (from CDN)
- Three-part page structure: `div#header`, `div#body`, `div#footer`, optionally followed by `div.acks`
- Bootstrap grid layout: `div.row` > `div.col-*` for all content
- Module code in `<title>` tag and filename (e.g., `ANZH101`, `ENGI401`, `OSAI301`)
- Lesson pages have lesson number in `#module-code > h1` (e.g., `01`, `02`)
- Activity wrappers: `div.activity` with `number` attribute and modifier classes (`alertPadding`, `interactive`, `dropbox`)
- Footer: `ul.footer-nav` with `#prev-lesson`, `#next-lesson`, `.home-nav`

### Module Code Extraction

**Per-file priority:** Filename → `<title>` tag. Pattern: `/[A-Z]{2,}[A-Z0-9]*\d+/` (e.g., `ANZH101`). Filename-derived code wins when both exist and differ.

**Cross-file resolution:** All same → `single`. Common prefix (2+ chars with 2+ uppercase) → `common-prefix`. No meaningful prefix → `unrelated` (returns `[MODULE_CODE]`).

---

## Module Menu Handling

Even though `moduleMenu` is in the Component Exclusion Registry (excluded from analysis), the `moduleMenuHandler` captures the raw structure for later template generation:

- Captures the lesson-page module menu structure. Preserves `<h3>`, `<h4>`, and `<h5>` heading text exactly (including child `<span>` elements). Replaces all other text with lorem ipsum. Normalises list items to max 3 per list.

The `ModuleMenuCapture` stores both `processedHTML` (text-replaced) and `originalHTML` (untouched) for template generation in Phase 4.

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
- **Malformed HTML:** Report error, exclude file from analysis.
- **Mixed template versions:** Warn in UI (not in template output).
- **New component types not in registry:** Analyzed as regular elements. User can add to registry.
- **Components nested inside components:** Top-down exclusion handles this automatically.

---

## Testing

Test files are in `src/__tests__/analyzer/`. Test fixtures are in `src/test-fixtures/`. All tests use Vitest with `globals: true`.

**131 tests across 6 test files:**

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `bootstrapUtils.test.ts` | 29 | Column class regex matching, stripping, edge cases |
| `componentExcluder.test.ts` | 24 | Exclusion pruning, special element detection, deep clone |
| `fingerprinter.test.ts` | 11 | Hash generation, signature format, column class stripping in fingerprints |
| `moduleCodeExtractor.test.ts` | 16 | Per-file extraction, cross-file resolution, edge cases |
| `moduleMenuHandler.test.ts` | 14 | Menu capture, text preservation/replacement, list normalisation |
| `pipeline.test.ts` | 37 | Full integration (3 lesson pages), batch analysis |

When writing tests, always verify:
- No `style` attributes survive in processed ASTs
- No excluded component elements appear in fingerprint maps
- Column classes don't affect fingerprint equality
- `hasVideoSection` is detected BEFORE exclusion occurs
- Module code extraction works from title tag and filename
- Filename-derived module code wins over title-derived
- Module menu heading text is preserved exactly (h3/h4/h5 with spans)
- Module menu body text is replaced with lorem ipsum
- List items are normalised to max 3 per list
- Cross-file module code resolution handles single, common-prefix, and unrelated cases
- Generated template has exactly one of each ID'd element
- Generated template contains zero inline styles
- Generated template uses lorem ipsum (not developer labels)
- Acknowledgements section is always present in output
