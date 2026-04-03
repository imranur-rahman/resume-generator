/**
 * resume-generator/src/generate.js
 *
 * Reads  src/resume.json
 * Writes output/resume.docx   (formatted, for human eyes)
 *        output/resume.pdf    (ATS-safe, for online portals)
 *
 * Run:  node src/generate.js
 */

"use strict";

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  ExternalHyperlink, BorderStyle, WidthType, TabStopType, UnderlineType,
} = require("docx");
const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

// ── Load data ────────────────────────────────────────────────────────────────
const DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname, "resume.json"), "utf8")
);

// ── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  accent : "1A5276",
  body   : "111111",
  muted  : "555555",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function r(text, opts = {}) {
  return new TextRun({ text, font: "Calibri", color: THEME.body, size: 20, ...opts });
}

function link(text, url, opts = {}) {
  return new ExternalHyperlink({
    link: url,
    children: [r(text, { color: THEME.accent, underline: { type: UnderlineType.SINGLE }, ...opts })],
  });
}

function gap(pts = 80) {
  return new Paragraph({ children: [r("")], spacing: { before: 0, after: pts } });
}

function sectionHeader(title) {
  return new Paragraph({
    children: [r(title, { bold: true, size: 22, color: THEME.accent, allCaps: true })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: THEME.accent, space: 4 } },
  });
}

/**
 * ATS-SAFE bullet: ASCII hyphen "-" is universally parsed.
 * Replaced unicode "▪" which some parsers drop or corrupt.
 */
function bullet(children) {
  const kids = typeof children === "string"
    ? [r(children, { size: 19, color: THEME.muted })]
    : children;
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: kids,
    spacing: { before: 30, after: 30 },
  });
}

/**
 * ATS-SAFE label row: plain "Label: value" paragraph.
 * Replaces the invisible-bordered table that most ATS scanners skip entirely.
 */
function labelRow(label, value) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      r(label + ": ", { bold: true, size: 19, color: THEME.accent }),
      r(value,        { size: 19, color: THEME.muted }),
    ],
  });
}

function entryHeader(title, org, orgUrl, date) {
  const TAB = 9260;
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TAB }],
    spacing: { before: 160, after: 40 },
    children: [
      r(title, { bold: true, size: 22 }),
      r(" · ", { size: 22, color: THEME.muted }),
      orgUrl
        ? link(org, orgUrl, { size: 22, bold: false })
        : r(org, { size: 22, color: THEME.accent }),
      new TextRun({ text: "\t", font: "Calibri" }),
      r(date, { size: 18, color: THEME.muted, italics: true }),
    ],
  });
}

function pubEntry({ title, venue, venueUrl, desc }) {
  const venueRun = venueUrl
    ? link(venue, venueUrl, { size: 19, bold: true })
    : r(venue, { bold: true, size: 19, color: THEME.accent });
  return [
    new Paragraph({
      spacing: { before: 100, after: 20 },
      children: [r(title, { bold: true, size: 19 })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [venueRun, r("  -  " + desc, { size: 18, color: THEME.muted })],
    }),
  ];
}

// ── Build document ───────────────────────────────────────────────────────────
function buildDoc(data) {
  const { personal, summary, skills, experience, education,
          publications, patents, awards, service } = data;

  const children = [

    // Name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [r(personal.name, { bold: true, size: 52, color: THEME.accent })],
    }),

    // Contact — inline text with | separators so ATS reads every field
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        r(personal.location + "  |  ", { size: 18, color: THEME.muted }),
        link(personal.email, `mailto:${personal.email}`, { size: 18 }),
        r("  |  ", { size: 18, color: THEME.muted }),
        link(personal.website, personal.websiteUrl, { size: 18 }),
        r("  |  ", { size: 18, color: THEME.muted }),
        link(personal.linkedin, personal.linkedinUrl, { size: 18 }),
        r("  |  " + personal.phone, { size: 18, color: THEME.muted }),
      ],
    }),

    gap(60),

    // Summary
    sectionHeader("Profile"),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [r(summary, { size: 19, color: THEME.muted })],
    }),

    // Skills — label rows instead of table
    sectionHeader("Technical Skills"),
    ...skills.map(s => labelRow(s.label, s.value)),

    // Experience
    sectionHeader("Experience"),
    ...experience.flatMap(job => [
      entryHeader(job.title, job.org, job.orgUrl, job.date),
      ...job.bullets.map(b => bullet(b)),
    ]),

    // Education
    sectionHeader("Education"),
    ...education.flatMap(edu => {
      const rows = [entryHeader(edu.degree, edu.school, null, edu.date)];
      if (edu.detail) {
        const detailRuns = edu.advisorUrl
          ? [
              r("Advisor: ", { size: 19, color: THEME.muted }),
              link("Dr. Laurie Williams", edu.advisorUrl, { size: 19 }),
              r("  |  Research Domain: Software Supply Chain Security",
                { size: 19, color: THEME.muted }),
            ]
          : [r(edu.detail, { size: 18, color: THEME.muted })];
        rows.push(new Paragraph({
          spacing: { before: 20, after: 40 },
          indent: { left: 200 },
          children: detailRuns,
        }));
      }
      return rows;
    }),

    // Publications
    sectionHeader("Selected Publications"),
    ...publications.flatMap(p => pubEntry(p)),

    // Patents
    sectionHeader("Patents"),
    ...patents.map(p =>
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [r(p.title + "  |  ", { size: 19 }), link(p.label, p.url, { size: 19 })],
      })
    ),

    // Awards
    sectionHeader("Awards & Honors"),
    ...awards.map(a =>
      bullet([
        r(a.title + " - ", { bold: true, size: 19 }),
        link(a.detail, a.detailUrl, { size: 19 }),
        r("  " + a.suffix, { size: 19, color: THEME.muted }),
      ])
    ),

    // Service — label rows instead of table
    sectionHeader("Academic Service"),
    ...service.map(s => labelRow(s.label, s.value)),
  ];

  return new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",                   // ✅ ASCII hyphen — ATS-safe
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } },
        }],
      }],
    },
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20, color: THEME.body } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 900, right: 1080, bottom: 900, left: 1080 },
        },
      },
      children,
    }],
  });
}

// ── Write outputs ────────────────────────────────────────────────────────────
(async () => {
  const outDir   = path.join(__dirname, "..", "output");
  const docxPath = path.join(outDir, "resume.docx");
  const pdfPath  = path.join(outDir, "resume.pdf");

  fs.mkdirSync(outDir, { recursive: true });

  // 1. DOCX
  const buf = await Packer.toBuffer(buildDoc(DATA));
  fs.writeFileSync(docxPath, buf);
  console.log(`✅  DOCX written -> ${docxPath}`);

  // 2. PDF via LibreOffice
  try {
    const sofficeWrapper = path.join(__dirname, "..", "scripts", "soffice.py");
    const cmd = fs.existsSync(sofficeWrapper)
      ? `python3 "${sofficeWrapper}" --headless --convert-to pdf "${docxPath}" --outdir "${outDir}"`
      : `soffice --headless --convert-to pdf "${docxPath}" --outdir "${outDir}"`;

    execSync(cmd, { stdio: "pipe" });
    console.log(`✅  PDF  written -> ${pdfPath}`);
  } catch (err) {
    console.error("PDF conversion failed - is LibreOffice installed?");
    console.error("  Install: https://www.libreoffice.org/download/");
    console.error("  Error:", err.message);
    process.exit(1);
  }
})();
