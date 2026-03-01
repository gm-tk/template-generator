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
      types.ts                       # All TypeScript interfaces (ParsedElement, FileAnalysis, ConsensusModel, etc.)
      componentExclusionRegistry.ts  # Exclusion registry Set (100 classes) + matching function
      bootstrapUtils.ts              # Column class detection (isBootstrapColumnClass) + stripping
      htmlParser.ts                  # Raw HTML → ParsedElement tree (htmlparser2, skips text nodes)
      styleStripper.ts               # Remove inline style attributes (mutates AST in place)
      textStripper.ts                # Text stripping (no-op, handled by parser)
      componentExcluder.ts           # Prune excluded components from AST + detect special elements (supports custom registry)
      fingerprinter.ts               # Generate structural fingerprints (DJB2 hash + signatures)
      moduleCodeExtractor.ts         # Per-file module code extraction + cross-file resolution
      moduleMenuHandler.ts           # Module menu DOM capture with text processing
      pipeline.ts                    # analyzeFile() + analyzeFiles() + validateHTML() + isTekuraFile() + extractTemplateVersionFromHTML()
      consensus.ts                   # Cross-file pattern-type consensus analysis (Phase 3)
      templateGenerator.ts           # Generate output HTML template from BatchAnalysisResult (Phase 4)
  app/
    layout.tsx                       # Next.js root layout with Tailwind CSS
    page.tsx                         # Client component — wraps TemplateAnalyzer in ToastProvider
    globals.css                      # Tailwind CSS v4 import
  components/
    TemplateAnalyzer.tsx             # Main orchestrator — state machine, custom registry state, toast integration
    FileUploadZone.tsx               # Drag-and-drop + file picker, keyboard accessible, 100-file limit, ARIA
    FileList.tsx                     # Uploaded file list with ARIA labels, role="list", 30+ file warning
    AnalysisControls.tsx             # Consensus threshold slider + Run Analysis button
    ProgressIndicator.tsx            # Step-by-step progress during analysis (4 steps), aria-live
    ResultsPanel.tsx                 # ARIA tablist with arrow key navigation, toast notifications, scrollIntoView
    TemplatePreview.tsx              # Rendered HTML preview via sandboxed iframe (srcDoc)
    TemplateCode.tsx                 # Raw HTML source code viewer (monospace, copy-to-clipboard)
    AnalysisSummary.tsx              # Analysis stats dashboard — file errors, mixed versions, non-Te Kura warnings, ARIA
    ExclusionRegistryPanel.tsx       # Interactive exclusion registry — add/remove/reset/search/filter/validation
    Toaster.tsx                      # Toast notification system (React Context) — info/success/warning/error
  __tests__/
    setup.ts                         # Test setup — imports @testing-library/jest-dom
    analyzer/
      bootstrapUtils.test.ts         # 29 tests — column class detection/stripping
      componentExcluder.test.ts      # 24 tests — exclusion + special element detection
      fingerprinter.test.ts          # 11 tests — fingerprint generation + hash stability
      moduleCodeExtractor.test.ts    # 16 tests — extraction + cross-file resolution
      moduleMenuHandler.test.ts      # 8 tests — menu capture, text preservation/replacement
      consensus.test.ts              # 50 tests — pattern detection + consensus building
      pipeline.test.ts               # 36 tests — full pipeline integration + batch + consensus
      templateGenerator.test.ts      # 71 tests — template generation, integration + unit + edge cases
      malformedHtml.test.ts          # 14 tests — empty files, non-HTML, mixed valid/invalid batches, size limits
      templateDetection.test.ts      # 15 tests — template version extraction, Te Kura detection, mixed versions
      customRegistry.test.ts         # 6 tests — custom registry pipeline integration
      firstPageIntegration.test.ts   # 11 tests — first page fixture, batch with first+lesson pages
    components/
      FileUploadZone.test.tsx        # 5 tests — rendering, compact mode, ARIA, drag-over
      FileList.test.tsx              # 6 tests — file display, remove, aria-labels, empty state
      AnalysisControls.test.tsx      # 7 tests — threshold, disabled/enabled, loading, click
      AnalysisSummary.test.tsx       # 11 tests — stats, errors, warnings, single/two file messaging
      ExclusionRegistryPanel.test.tsx # 9 tests — add/remove/reset/search/filter/validation
    integration/
      fullPipeline.test.ts           # 27 tests — end-to-end pipeline + template generation with real fixtures
  test-fixtures/
      ANZH101_0_0.html               # First page fixture (module menu with tabs, no prev-lesson)
      ANZH101_1_0.html               # Real lesson page 1 (h1=01, template 1-3)
      ANZH101_2_0.html               # Real lesson page 2 (h1=02, template 1-3)
      ANZH101_3_0.html               # Real lesson page 3 (h1=03, template 1-3)
```

## Development Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | HTML Parser, Style/Column Stripping, Component Exclusion, Fingerprinting | **Complete** |
| 2 | Module Code Extraction, Module Menu Handling | **Complete** |
| 3 | Consensus Analysis Engine | **Complete** |
| 4 | Template Generator | **Complete** |
| 5 | Web Application UI | **Complete** |
| 6 | Refinement and Edge Cases | **Complete** |

**Total tests: 356** (all passing across 18 test files)

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

4. **`componentExcluder.ts`** — Two-pass operation with optional custom registry:
   - **Pass 1 (detect):** Walks full tree to record `hasVideoSection`, `hasAcknowledgements`, and captures `moduleMenuElement` (deep cloned) BEFORE any pruning.
   - **Pass 2 (prune):** Removes elements whose classes match the exclusion registry. Top-down: excluded element + all descendants are removed; parent stays. Accepts optional `customRegistry` parameter; falls back to `COMPONENT_EXCLUSION_REGISTRY`.

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

3. **Updated `pipeline.ts`** — Five public functions:
   - `analyzeFile(rawHTML, filename, customRegistry?)` — 8-step single-file pipeline (Phase 1 steps + Phase 2 module code extraction, module menu capture). Optional custom exclusion registry.
   - `analyzeFiles(files, threshold?, customRegistry?)` — Batch function for multi-file analysis with per-file error handling:
     - Validates and runs `analyzeFile()` on each file (catches errors per-file)
     - Resolves cross-file module code via `resolveModuleCode()`
     - Selects first available module menu
     - Determines majority template version
     - Aggregates `hasVideoSection` and `hasAcknowledgements` across all files
     - Detects template version mismatches and non-Te Kura files
     - Builds consensus model via `buildConsensus()` (Phase 3)
     - Returns `BatchAnalysisResult` (throws only if ALL files fail)
   - `validateHTML(rawHTML, filename)` — Pre-analysis validation (empty, no HTML tags, >20MB)
   - `isTekuraFile(rawHTML)` — Detects Te Kura template files (≥2 of 4 signals)
   - `extractTemplateVersionFromHTML(rawHTML)` — Regex extraction of template version from raw HTML

### Phase 3 — Consensus Analysis Engine (Complete)

A single module — `consensus.ts` — that takes multiple `FileAnalysis` objects and identifies which structural patterns appear in the majority of files.

**Core concept: Pattern-type consensus, NOT position-based.** The engine does not try to align elements position-for-position across files. Instead, it identifies structural pattern types — categories of structural elements — and counts how many files contain each type.

1. **`consensus.ts`** — Two exported functions:
   - `detectPatterns(analysis)` — Walks the `#body` section of a single file's processed AST and returns a `Set<string>` of pattern type IDs present in that file.
   - `buildConsensus(fileAnalyses, threshold?)` — Detects patterns in each file, counts frequencies, and classifies each as consensus (≥ threshold) or not. Default threshold is 0.5 (50%).

**Detected pattern types:**
| Pattern ID | Category | Detection Rule |
|-----------|----------|----------------|
| `heading:h2` through `heading:h5` | heading | `<h2>`–`<h5>` elements inside `#body` (h1 excluded — header only) |
| `paragraph` | paragraph | `<p>` elements inside `#body` (excluding `p.quoteText`) |
| `list-unordered` | list-unordered | `<ul>` elements inside `#body` |
| `list-ordered` | list-ordered | `<ol>` elements inside `#body` |
| `table` | table | `<table>` elements inside `#body` |
| `image` | image | `<img>` elements inside `#body` |
| `video` | video | From `hasVideoSection` flag (set before exclusion) |
| `alert`, `alert-solid`, `alert-top`, `alert-blank` | alert | `<div class="alert">` with optional modifier classes |
| `activity-standard` | activity-standard | `<div class="activity">` without `interactive` or `dropbox` |
| `activity-interactive` | activity-interactive | `<div class="activity interactive">` |
| `activity-dropbox` | activity-dropbox | `<div class="activity ... dropbox">` |
| `sidebar-alertActivity` | sidebar-alertActivity | `div.row` with 2+ children where a column child has `div.alertActivity` |
| `sidebar-image` | paragraph-with-sidebar | `div.row` with 2+ children where a column child has `<img>` |
| `button` | button | `<a>` containing `<div class="button">` |
| `external-button` | external-button | `<div class="externalButton">` |
| `quote` | quote | `<p class="quoteText">` |

**Key rules:**
- **Video is threshold-independent:** `hasVideoSection` is true if ANY file contains a videoSection, regardless of threshold.
- **Only #body content is analyzed.** Header, footer, and acknowledgements are not subject to consensus.
- **Uses the processed AST** (post-exclusion, post-style-stripping) for all detection except video.
- **Pattern detection uses `fingerprintClasses`** (column classes stripped) for class-based matching.

**ConsensusModel output includes:**
- `patterns` — All detected pattern types with file counts, percentages, and consensus status
- `consensusPatterns` — Only patterns meeting the threshold
- `headingLevels` — Consensus heading levels (e.g., `['h2', 'h3']`)
- `alertVariants` — Consensus alert variants
- `activityTypes` — Consensus activity types (`'standard'`, `'interactive'`, `'dropbox'`)
- Convenience booleans: `hasVideoSection`, `hasSidebarImage`, `hasQuoteText`, `hasTables`, `hasImages`, `hasOrderedLists`, `hasUnorderedLists`, `hasButtons`, `hasExternalButtons`, `hasSidebarAlertActivity`

### Phase 4 — Template Generator (Complete)

A single module — `templateGenerator.ts` — that takes a `BatchAnalysisResult` and produces a complete, valid HTML template file as a string.

1. **`templateGenerator.ts`** — One exported function:
   - `generateTemplate(batchResult)` — Takes the complete output from `analyzeFiles()` and returns a fully valid HTML string — a Te Kura template file ready to open in a browser.

**Architecture:** Builds the template by assembling HTML string sections:
1. Builds `<head>` with meta tags, title (using resolved module code), and script references (`stickyNav.js` local + `idoc_scripts.js` from CDN)
2. Builds `<div id="header">` with module code, title, module menu button, and module menu content (uses `processedHTML` from `ModuleMenuCapture` or generates a fallback)
3. Builds body sections array — only includes sections where the corresponding consensus flag is true
4. Joins body sections with `<hr>` dividers (no trailing `<hr>`)
5. Builds `<div id="footer">` with navigation links
6. Builds acknowledgements section (ALWAYS included)
7. Concatenates everything into the final HTML document

**Body section order (each preceded by `<h4>` label):**
1. Heading hierarchy (h2–h5 from `consensus.headingLevels`)
2. Paragraph (with inline formatting: `<a>`, `<b>`, `<i>`)
3. Paragraph with sidebar image (if `hasSidebarImage`)
4. Quote text / quoteAck (if `hasQuoteText`)
5. Unordered list (if `hasUnorderedLists`)
6. Ordered list (if `hasOrderedLists`)
7. Table (if `hasTables`)
8. Images with caption (if `hasImages`)
9. Video — canonical markup (if `hasVideoSection`, threshold-independent)
10. Alerts — one block per variant from `alertVariants`
11. Sidebar alertActivity (if `hasSidebarAlertActivity`)
12. Activity standard (if `activityTypes` includes `'standard'`)
13. Activity interactive (if `activityTypes` includes `'interactive'`)
14. Activity dropbox (if `activityTypes` includes `'dropbox'`)
15. Button (if `hasButtons`)
16. External button (if `hasExternalButtons`)

**Key implementation details:**
- Uses standardized Bootstrap column classes throughout (e.g., `col-md-8 col-12` for primary content)
- Activity numbers are sequential: `1A`, `1B`, `1C` — assigned in order of appearance (standard → interactive → dropbox)
- Alert variant strings from consensus (e.g., `'alert.solid'`) are converted to CSS classes (e.g., `class="alert solid"`)
- Module menu uses `processedHTML` directly (innerHTML of the moduleMenu div, no wrapper included) — wrapped in `<div id="module-menu-content" class="moduleMenu">`
- Falls back to a default lesson-page menu with "We are learning:" / "I can:" headings when no module menu is available
- Template version defaults to `"9-10"` when `batchResult.templateVersion` is null
- 4-space indentation throughout generated HTML

### Phase 5 — Web Application UI (Complete)

The complete browser-based interface wiring the analysis pipeline to a React/Next.js application. All processing runs client-side — no API routes or server-side processing.

**Architecture:** Single-page application with a linear state machine flow:

```
Upload Files → Configure Threshold → Run Analysis → View Results → Download Template
```

**State machine phases:** `upload` → `ready` → `analyzing` → `results` → `error`

**Components built (all in `src/components/`):**

1. **`TemplateAnalyzer.tsx`** — Main orchestrator component (`"use client"`). Manages the `AppPhase` state machine, file state, threshold, custom exclusion registry state, analysis progress, results, and errors. Reads uploaded files via `FileReader` API, passes them to `analyzeFiles()` with custom registry, then to `generateTemplate()`. Uses `setTimeout(..., 0)` to yield to the event loop. Integrates with toast notifications via `useToast()`.

2. **`FileUploadZone.tsx`** — Drag-and-drop upload zone with hidden `<input type="file" multiple accept=".html">` fallback. Filters by `.html` extension. Prevents duplicates by filename. Shows visual drag-over feedback (border/background colour change, text change). Displays notifications for skipped files. Compact mode. Keyboard accessible (`role="button"`, Enter/Space). 100-file hard limit. ARIA attributes.

3. **`FileList.tsx`** — Lists uploaded files with filename, formatted size (B/KB/MB), and remove button (× icon). Shows total file count. Removing all files returns the app to the `upload` phase. `role="list"`, `aria-label` on items and buttons. 30+ file warning.

4. **`AnalysisControls.tsx`** — Consensus threshold slider (1–100%, default 50%) with synced numeric input. "Analyze N Files" button with loading/spinner state. Threshold is displayed as a percentage in the UI and converted to a decimal (0.01–1.0) when passed to `analyzeFiles()`.

5. **`ProgressIndicator.tsx`** — Four-step progress display (Reading files → Analyzing structural patterns → Generating template → Complete). Shows file count progress during the reading step. Completed steps display checkmarks; current step shows a spinner. `aria-live="polite"`, `role="status"`. Exports `AnalysisProgress` interface.

6. **`ResultsPanel.tsx`** — Tabbed container (Preview / Code / Summary) with full ARIA tab pattern (`role="tablist/tab/tabpanel"`, `aria-selected`, `aria-controls`, `tabIndex`), arrow key left/right navigation. Action buttons: Download Template, Copy HTML (toast notifications), Start Over. `scrollIntoView` on mount.

7. **`TemplatePreview.tsx`** — Renders the generated template in a sandboxed `<iframe>` using `srcDoc`. Uses `sandbox="allow-scripts allow-same-origin"` so Te Kura's external JS/CSS framework can load. Includes info note about external style dependencies.

8. **`TemplateCode.tsx`** — Displays raw HTML source in a dark-themed monospace code block with horizontal/vertical scroll. Copy-to-clipboard button with "Copied!" feedback state.

9. **`AnalysisSummary.tsx`** — Dashboard showing:
   - Top-level stat cards: Files Analyzed, Threshold, Module Code (with resolution type), Template Version
   - Boolean flag badges: Video detected, Module Menu captured, Acknowledgements present
   - File error warnings (amber), mixed template version warnings (amber), non-Te Kura file info (blue)
   - Single-file and two-file informational notes
   - Full pattern breakdown table: pattern label, file count/total, percentage bar, consensus status (checkmark/×), sorted by percentage descending
   - Zero-consensus warning when no patterns meet the threshold
   - ARIA attributes: `role="alert"` on warnings, `role="status"` on info, `aria-label` on sections

10. **`ExclusionRegistryPanel.tsx`** — Interactive collapsible panel (collapsed by default). Features: add class (with Enter key and validation), remove class, reset to defaults, search/filter, "Modified +N -M" indicator. Validation: empty, whitespace, duplicate. ARIA: `aria-expanded`, `aria-controls`, `aria-label`, `aria-live`.

11. **`Toaster.tsx`** — Toast notification system using React Context. Supports info/success/warning/error types with auto-dismiss (3s). `ToastProvider` wraps the app in `page.tsx`. `useToast()` hook provides `addToast(message, type)` for components.

**Page setup:**
- `src/app/layout.tsx` — Root layout with metadata title "HTML Template Analyzer — Te Kura", imports `globals.css`
- `src/app/page.tsx` — Client Component wrapping `<TemplateAnalyzer />` in `<ToastProvider>`
- `src/app/globals.css` — Tailwind CSS v4 import (`@import "tailwindcss"`)
- `postcss.config.mjs` — PostCSS config using `@tailwindcss/postcss`

**Visual design:** Clean, functional developer tool aesthetic. Neutral base (whites, greys) with teal accent colour. Tailwind utility classes throughout — no custom CSS. Responsive for desktop and tablet.

### Phase 6 — Refinement and Edge Cases (Complete)

Phase 6 adds robustness, accessibility, and UI polish across 8 work areas:

#### Area 1: Malformed HTML Handling

- **`validateHTML(rawHTML, filename)`** — Pre-analysis validation: rejects empty files, non-HTML content, and files >20MB.
- **Per-file error handling** in `analyzeFiles()`: individual files that fail validation or throw during analysis are captured in `fileErrors` rather than crashing the batch. Only throws if ALL files fail.
- **`FileError` interface** added to `types.ts`: `{ filename: string; error: string }`.
- **`BatchAnalysisResult`** extended with: `fileErrors`, `templateVersions`, `isMixedTemplateVersions`, `nonTekuraFiles`.

#### Area 2: Template Version and Family Mismatch Detection

- **`isTekuraFile(rawHTML)`** — Detects Te Kura template files using 4 signals (template attribute, idoc_scripts.js, header/body/footer divs, notranslate class). Requires ≥2 signals to match.
- **`extractTemplateVersionFromHTML(rawHTML)`** — Extracts template version from raw HTML via regex.
- **Template version tracking** in `analyzeFiles()`: counts versions across files, flags `isMixedTemplateVersions` when >1 version detected.
- **Non-Te Kura file tracking**: files that don't match the Te Kura signature are listed in `nonTekuraFiles`.

#### Area 3: Custom Exclusion Registry Integration

- **`componentExcluder.ts`** updated: `excludeComponents()` accepts optional `customRegistry?: Set<string>` parameter. Falls back to default `COMPONENT_EXCLUSION_REGISTRY` when not provided.
- **`pipeline.ts`** updated: both `analyzeFile()` and `analyzeFiles()` accept optional `customRegistry` parameter, passed through to the excluder.
- Full backward compatibility: all existing calls without `customRegistry` continue to work identically.

#### Area 4: First Page Handling Polish

- **`ANZH101_0_0.html`** — New test fixture for the first page (lesson 0.0) with tabbed module menu (Overview/Information tabs), h4/h5 headings, nav-tabs, no prev-lesson in footer.
- **`firstPageIntegration.test.ts`** — 11 tests verifying first page processing, batch analysis with first+lesson pages, module menu capture, and edge cases.

#### Area 5: Small File Set Edge Cases

- **`AnalysisSummary.tsx`** updated with conditional UI sections:
  - File error warnings (amber, lists each failed file)
  - Mixed template version warnings (amber, shows version counts)
  - Non-Te Kura file info (blue, lists filenames)
  - Single-file informational note
  - Two-file messaging about reduced consensus reliability
  - Zero-consensus warning with current threshold percentage

#### Area 6: Performance — setTimeout Yielding

- Existing `setTimeout(..., 0)` approach in `TemplateAnalyzer.tsx` retained and enhanced with additional yield point before analysis starts, ensuring the progress indicator renders before heavy computation.

#### Area 7: Accessibility and UI Polish

- **`Toaster.tsx`** — New toast notification system using React Context. Supports info/success/warning/error types with auto-dismiss (3s). `ToastProvider` wraps the app, `useToast()` hook provides `addToast()`.
- **`FileUploadZone.tsx`** — Keyboard accessible (`role="button"`, `tabIndex={0}`, Enter/Space activation), 100-file hard limit, `aria-label`, `aria-hidden` on hidden input, drag-over text change.
- **`FileList.tsx`** — `role="list"`, `aria-label` on list items and remove buttons, `aria-hidden` on decorative SVGs, 30+ file warning.
- **`ResultsPanel.tsx`** — Full ARIA tab pattern (`role="tablist/tab/tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, `tabIndex`), arrow key left/right navigation, `scrollIntoView` on mount, toast integration.
- **`ProgressIndicator.tsx`** — `aria-live="polite"`, `role="status"`.
- **`ExclusionRegistryPanel.tsx`** — Rewritten from read-only to interactive: add (with Enter key), remove, reset, search/filter, validation (empty/whitespace/duplicate), "Modified +N -M" indicator, `aria-expanded`, `aria-controls`, `aria-live`.
- **`AnalysisSummary.tsx`** — ARIA attributes: `role="alert"` on warnings, `role="status"` on info, `aria-label` on sections.
- **`TemplateAnalyzer.tsx`** — Custom registry state management, passes registry to `analyzeFiles()`, registry reset on Start Over.
- **`page.tsx`** — Changed to `'use client'`, wraps `TemplateAnalyzer` in `ToastProvider`.

#### Area 8: Automated Tests

**Component tests** (5 files, 38 tests total, using `@testing-library/react` + `@testing-library/user-event` + `jsdom`):
- `FileUploadZone.test.tsx` — 5 tests (rendering, compact mode, ARIA, hidden input, drag-over)
- `FileList.test.tsx` — 6 tests (file display, remove callback, count text, singular, empty, aria-labels)
- `AnalysisControls.test.tsx` — 7 tests (default threshold, slider, disabled/enabled, loading, click, singular)
- `AnalysisSummary.test.tsx` — 11 tests (stats, module code, version, errors, mixed versions, non-Te Kura, single file, two files, zero consensus, pattern list)
- `ExclusionRegistryPanel.test.tsx` — 9 tests (class count, expand/collapse, add, duplicate, whitespace, remove, reset, filter, modified indicator)

**Integration test** (1 file, 27 tests):
- `fullPipeline.test.ts` — End-to-end pipeline tests with real fixture files: batch analysis, template generation, consensus verification, threshold variation, custom registry, error handling, validation, Te Kura detection, single file, first page, version tracking.

**Analyzer tests** (4 new files, 46 tests):
- `malformedHtml.test.ts` — 14 tests (empty, non-HTML, partial failures, all-fail, broken tags, size limit)
- `templateDetection.test.ts` — 15 tests (version extraction, Te Kura detection signals, mixed versions, non-Te Kura tracking)
- `customRegistry.test.ts` — 6 tests (custom registry pipeline, videoSection removal, alert exclusion, empty registry)
- `firstPageIntegration.test.ts` — 11 tests (first page processing, batch with first+lesson, menu preservation)

### Key Type Interfaces (types.ts)

```typescript
ParsedElement           // Internal element tree node (tag, classes, id, attributes, children, depth)
StructuralFingerprint   // Hash + human-readable signature for structural comparison
FileAnalysis            // Single-file result (AST, fingerprints, flags, moduleMenuCapture)
ModuleMenuCapture       // Captured menu: processedHTML, originalHTML
ModuleCodeResult        // Cross-file code: code, resolution, perFileCode map
StructuralPatternType   // Pattern type: id, label, category, fileCount, percentage, isConsensus
ConsensusModel          // Consensus result: patterns, thresholds, convenience booleans
FileError               // Failed file: filename, error message
BatchAnalysisResult     // Multi-file result: files[], moduleCode, moduleMenu, flags, consensus, fileErrors, templateVersions, isMixedTemplateVersions, nonTekuraFiles
```

### Test Fixtures

- **`ANZH101_0_0.html`** — First page fixture (lesson 0.0) with module code in h1, dual h1 titles, tabbed module menu (Overview/Information tabs), nav-tabs, h4/h5 headings, no prev-lesson in footer.
- **`ANZH101_1_0.html`** — Lesson page with h1 `01`, simple module menu (h5 headings), videoSection, multiChoiceQuiz, dragAndDrop, hintDropContent, alertActivity, 3 activities (1 interactive + 2 standard), inline styles, sidebar images.
- **`ANZH101_2_0.html`** — Lesson page with h1 `02`, carousel, accordion, two videoSections, quoteText/quoteAck, ordered list, unordered list, table, alertActivity, 1 standard activity, sidebar image.
- **`ANZH101_3_0.html`** — Lesson page with h1 `03`, videoSection, h3 sub-headings, all 3 activity types (standard, interactive, dropbox), activity with internal accordion, unordered list, sidebar image.

**Consensus patterns across fixtures (at 50% threshold = ≥2 of 3 files):**
- All 3 files: heading:h2, heading:h3, paragraph, image, sidebar-image, alert, activity-standard, video
- 2 of 3: activity-interactive (files 1,3), list-unordered (files 2,3)
- 1 only: activity-dropbox (file 3), list-ordered (file 2), table (file 2), quote (file 2)

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

The template has exactly ONE `<div id="header">`. Use the consensus lesson-page header. Never generate two headers.

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

- Captures the lesson-page module menu with `<h5>We are learning:</h5>` / `<h5>I can:</h5>` headings and lorem ipsum list items.
- Preserves `<h3>`, `<h4>`, and `<h5>` heading text exactly (including child `<span>` elements). Replaces all other text with lorem ipsum. Normalises list items to 3 per list.

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

- **Single file uploaded:** 100% consensus for all detected patterns. Still generate acknowledgements.
- **Two files at 50% threshold:** `ceil(2 * 0.5) = 1`, so a pattern in just one file is consensus.
- **Malformed HTML:** Report error, exclude file from analysis.
- **Mixed template versions:** Warn in UI (not in template output).
- **New component types not in registry:** Analyzed as regular elements. User can add to registry.
- **Components nested inside components:** Top-down exclusion handles this automatically.
- **Video section threshold independence:** `hasVideoSection` is true if ANY file contains a videoSection, regardless of threshold.

---

## Testing

Test files are in `src/__tests__/`. Test fixtures are in `src/test-fixtures/`. All tests use Vitest with `globals: true`. Component tests use `@testing-library/react` + `@testing-library/user-event` with `// @vitest-environment jsdom` annotation.

**356 tests across 18 test files:**

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| **Analyzer Tests** | | |
| `bootstrapUtils.test.ts` | 29 | Column class regex matching, stripping, edge cases |
| `componentExcluder.test.ts` | 24 | Exclusion pruning, special element detection, deep clone |
| `fingerprinter.test.ts` | 11 | Hash generation, signature format, column class stripping in fingerprints |
| `moduleCodeExtractor.test.ts` | 16 | Per-file extraction, cross-file resolution, edge cases |
| `moduleMenuHandler.test.ts` | 8 | Menu capture, text preservation/replacement, list normalisation |
| `consensus.test.ts` | 50 | Pattern detection per file, consensus building, thresholds, edge cases |
| `pipeline.test.ts` | 36 | Full pipeline integration, batch analysis, consensus integration |
| `templateGenerator.test.ts` | 71 | Template generation: structural validity, content correctness, consensus-driven sections, module code/menu, acknowledgements, video canonical markup, Bootstrap columns, activity numbering, edge cases |
| `malformedHtml.test.ts` | 14 | Empty files, non-HTML, mixed valid/invalid batches, all-fail, broken tags, 20MB size limit |
| `templateDetection.test.ts` | 15 | Template version extraction, Te Kura detection signals, mixed versions, non-Te Kura tracking |
| `customRegistry.test.ts` | 6 | Custom exclusion registry pipeline integration, videoSection removal, alert exclusion, empty registry |
| `firstPageIntegration.test.ts` | 11 | First page fixture processing, batch with first+lesson pages, menu preservation |
| **Component Tests** | | |
| `FileUploadZone.test.tsx` | 5 | Rendering, compact mode, ARIA attributes, hidden input, drag-over feedback |
| `FileList.test.tsx` | 6 | File display, remove callback, count text, singular, empty state, aria-labels |
| `AnalysisControls.test.tsx` | 7 | Default threshold, slider change, disabled/enabled, loading state, click handler |
| `AnalysisSummary.test.tsx` | 11 | Stats display, file errors, mixed versions, non-Te Kura, single/two file, zero consensus |
| `ExclusionRegistryPanel.test.tsx` | 9 | Add/remove/reset/search/filter, validation (duplicate, whitespace), modified indicator |
| **Integration Tests** | | |
| `fullPipeline.test.ts` | 27 | End-to-end pipeline with real fixtures, template generation, consensus, thresholds, custom registry, error handling |

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
- Pattern detection uses processed AST (#body section only)
- Video pattern is threshold-independent (ANY file → consensus)
- Consensus threshold is applied correctly (default 0.5)
- Single file = 100% consensus for all detected patterns
- Generated template has exactly one of each ID'd element
- Generated template contains zero inline styles
- Generated template uses lorem ipsum (not developer labels)
- Acknowledgements section is always present in output
- Template output has zero `style=` attributes
- Template uses standardised Bootstrap column classes (col-md-8 col-12, col-md-12, col-12)
- Template contains canonical video markup when hasVideoSection is true
- Template contains module code in `<title>` and `#module-code > h1`
- Template uses module menu processedHTML or fallback when null
- Activity numbers are sequential (1A, 1B, 1C)
- Sections only appear when corresponding consensus flag is true
- Template defaults to template version "9-10" when null
- No inconsistency report or diagnostic content in output
- `<hr>` dividers between body sections but not after the last section
