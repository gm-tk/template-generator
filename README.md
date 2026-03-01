# HTML Template Analyzer — Te Kura

Analyze multiple Te Kura HTML lesson files for shared structural patterns and generate a canonical template with consensus-based structure and lorem ipsum placeholder text.

## Features

- **Structural consensus analysis** — Upload 4–30 HTML lesson pages; the tool identifies which elements appear consistently across files and generates a single clean template
- **Configurable threshold** — Control what percentage of files must contain an element for it to be included (default 50%)
- **Batch Mode** — Auto-download the generated template and reset for the next upload, with a configurable countdown timer (1–30 seconds)
- **Module code detection** — Automatically extracts and resolves module codes across uploaded files
- **Module menu preservation** — Captures and processes module menu structure with heading preservation and lorem ipsum text replacement
- **Custom exclusion registry** — Add or remove CSS class names to control which interactive components are excluded from analysis
- **Accessible UI** — Full ARIA support, keyboard navigation, screen reader friendly
- **Client-side processing** — All analysis runs in the browser; no files are uploaded to any server

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **HTML parsing:** htmlparser2 + domutils + domhandler
- **Testing:** Vitest with @testing-library/react
- **Styling:** Tailwind CSS

## Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd template-generator

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Production build
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Upload files** — Drag and drop (or click to browse) 4–30 HTML lesson pages from a single Te Kura module
2. **Set threshold** — Adjust the consensus threshold slider (default 50%). Lower values include more elements; higher values are stricter
3. **Run analysis** — Click "Analyze N Files" to generate the template
4. **Review results** — Use the Preview, Code, and Summary tabs to inspect the output
5. **Download** — Click "Download Template" to save the HTML file

### Batch Mode

Enable Batch Mode for rapid multi-module processing:

1. Check the **Batch Mode** checkbox in the analysis controls
2. Optionally set the **countdown duration** (1–30 seconds, default 5)
3. Click **"Analyze & Download"** — the template auto-downloads immediately
4. A countdown overlay appears; when it reaches zero, the page resets ready for the next upload
5. Cancel the countdown at any time:
   - Click the **Cancel** button
   - Press **Escape**
   - Click anywhere on the **faded background**

Batch Mode, countdown duration, and threshold settings persist between sessions via localStorage.

## Project Structure

```
src/
  lib/analyzer/       # Analysis pipeline modules
    htmlParser.ts      # HTML → AST parsing
    styleStripper.ts   # Inline style removal
    componentExcluder.ts # Component exclusion with custom registry
    fingerprinter.ts   # Structural fingerprinting (DJB2 hash)
    bootstrapUtils.ts  # Bootstrap column class handling
    consensus.ts       # Cross-file pattern consensus
    templateGenerator.ts # HTML template generation
    pipeline.ts        # Orchestration (analyzeFile, analyzeFiles)
    moduleCodeExtractor.ts # Module code detection
    moduleMenuHandler.ts   # Module menu capture
  components/          # React UI components
  app/                 # Next.js app router pages
  __tests__/           # Test files (Vitest)
  test-fixtures/       # Real Te Kura HTML fixture files
```

## Testing

```bash
npm test             # Run all tests (vitest run)
npm run test:watch   # Watch mode
```

The test suite covers the full analysis pipeline, template generation, UI components, and end-to-end integration with real fixture files.

## Deployment

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

Push to GitHub, then import the repository at [vercel.com/new](https://vercel.com/new).

## Development Notes

- **Adding exclusion registry entries:** Edit `src/lib/analyzer/componentExclusionRegistry.ts` to add CSS class names. Users can also modify the registry at runtime via the UI panel.
- **Test fixtures:** Real Te Kura HTML files are in `src/test-fixtures/`. These are used by integration tests.
- **All processing is client-side** — no API routes or server-side processing. The analysis pipeline runs in the browser using setTimeout yielding for UI responsiveness.
