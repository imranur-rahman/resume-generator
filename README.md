# resume-generator

Generates a polished `.docx` **and** ATS-safe `.pdf` resume from a single JSON data file. Content and styling are fully separated — edit `src/resume.json`, run one command, get both files.

## Quick start

```bash
npm install
npm run build        # -> output/resume.docx + output/resume.pdf
```

During active editing, auto-rebuild on every save:

```bash
npm run watch
```

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js >= 18 | Runs the generator | [nodejs.org](https://nodejs.org) |
| LibreOffice | DOCX -> PDF conversion | [libreoffice.org](https://www.libreoffice.org/download/) |

On macOS: `brew install --cask libreoffice`
On Ubuntu/Debian: `sudo apt-get install libreoffice`

## Repository layout

```
resume-generator/
├── src/
│   ├── resume.json      # <- All your resume content lives here
│   └── generate.js      # Layout engine (docx-js)
├── scripts/
│   └── soffice.py       # LibreOffice wrapper (handles sandboxed CI envs)
├── output/
│   ├── resume.docx      # Auto-generated
│   └── resume.pdf       # Auto-generated
├── .github/
│   └── workflows/
│       └── build.yml    # CI: builds on every push to main
├── package.json
└── .gitignore
```

## How to update your resume

1. Open `src/resume.json`
2. Edit any section — `personal`, `summary`, `skills`, `experience`, `education`, `publications`, `patents`, `awards`, or `service`
3. Run `npm run build`
4. Open `output/resume.docx` or `output/resume.pdf`

Never edit the `output/` files by hand — they are overwritten on every build.

## Restyling

Edit the `THEME` object at the top of `src/generate.js`:

```js
const THEME = {
  accent : "1A5276",   // section headers, labels, links (hex)
  body   : "111111",   // primary text
  muted  : "555555",   // secondary text / descriptions
};
```

Changing `accent` re-themes every heading, label, and hyperlink in one edit.

## ATS compliance

The generator is designed to produce ATS-safe output:

| Element | Choice | Why |
|---------|--------|-----|
| Bullets | ASCII `-` hyphen | Unicode symbols (▪ • –) are dropped by many parsers |
| Skills section | Plain `Label: value` paragraphs | Tables are invisible to most ATS scanners |
| Service section | Plain `Label: value` paragraphs | Same reason |
| Contact row | Inline text, no text boxes | Text boxes are skipped by ATS |
| Fonts | Calibri (system font) | Always available; no embedding issues |
| Layout | Single-column | Multi-column layouts break ATS reading order |

## CI / GitHub Actions

Every push to `main` that touches `src/` automatically:
1. Installs LibreOffice on the runner
2. Builds `output/resume.docx` and `output/resume.pdf`
3. Uploads both as a GitHub Actions artifact (retained 90 days)
4. Commits the updated files back to the repo

## Dependencies

| Package | Purpose |
|---------|---------|
| [`docx`](https://github.com/dolanmiu/docx) | Generates `.docx` from JavaScript |
| [`nodemon`](https://nodemon.io) | Watch mode for auto-rebuild (dev only) |
