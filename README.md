# HTML Template Analyzer — Te Kura

A web application that analyzes multiple Te Kura HTML lesson files for shared structural patterns and generates a canonical template with lorem ipsum placeholder text.

## Features

- **Structural consensus analysis** — Upload 4-30 HTML lesson pages; the app identifies which elements (headings, paragraphs, activities, alerts, etc.) appear in the majority of files
- **Configurable threshold** — Set the consensus percentage (default 50%) to control how strict pattern matching is
- **Batch Mode** — Auto-download templates and reset for the next upload with a configurable countdown timer (1-30 seconds)
- **Template generation** — Produces a valid HTML file with correct Te Kura CSS classes and script references
- **Component exclusion** — Interactive components (quizzes, drag-and-drop, etc.) are automatically excluded; advanced users can customise the exclusion list
- **Module code detection** — Automatically extracts and resolves module codes across files
- **Accessibility** — Full ARIA attributes, keyboard navigation, screen reader support

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **HTML parsing:** htmlparser2 + domutils + domhandler
- **Testing:** Vitest (376+ tests across 19 test files)
- **Styling:** Tailwind CSS

## Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd template-generator

# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000
```

## Usage

1. **Upload files** — Drag and drop or click to select 4-30 HTML lesson pages from a single Te Kura module
2. **Set threshold** — Adjust the consensus threshold (default 50%) — elements appearing in at least this percentage of files are included
3. **Analyze** — Click "Run Analysis" to process the files and generate a template
4. **Download** — Download the generated template HTML file

### Batch Mode

For processing many modules in succession:

1. Enable **Batch Mode** in the analysis controls
2. Set the countdown duration (1-30 seconds, default 5)
3. Click **Analyze & Download** — the template auto-downloads and a countdown timer appears
4. When the countdown reaches zero, the page resets ready for the next upload
5. Cancel the countdown at any time: click **Cancel**, press **Escape**, or click the faded background

Batch Mode settings persist between sessions via localStorage.

## Development

### Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm test             # Run Vitest tests (vitest run)
npm run test:watch   # Run Vitest in watch mode
```

### Project Structure

```
src/
  lib/analyzer/      # Core analysis pipeline (parsing, exclusion, fingerprinting, consensus, template generation)
  components/        # React UI components
  app/               # Next.js App Router (layout, page, styles)
  __tests__/         # Test files (analyzer, components, integration)
  test-fixtures/     # Real Te Kura HTML fixtures for testing
```

### Adding Exclusion Registry Entries

The Component Exclusion Registry (`src/lib/analyzer/componentExclusionRegistry.ts`) contains class names for Te Kura interactive components that should be excluded from structural analysis. To add a new entry, add the class name to the `COMPONENT_EXCLUSION_REGISTRY` Set. Users can also add entries at runtime via the UI panel.

## Deployment

### Vercel CLI

```bash
npm i -g vercel
vercel
```

### GitHub Integration

Push to GitHub and import the repository at [vercel.com/new](https://vercel.com/new).

## License

Private — Te Kura internal tool.
