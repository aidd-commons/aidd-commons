import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const reportPath = resolve(root, "report/aidd-commons-living-report-v0.2.md");
const referencesPath = resolve(root, "report/references.bib");
const buildPath = resolve(root, "scripts/report/build-v02-pdf.py");

const expectedChapters = [
  "Scope and boundary",
  "The target-to-candidate pipeline",
  "The AIDD education and infrastructure landscape",
  "The open-development frontier",
  "Data, standards, tasks, and benchmarks",
  "Reproducibility, evaluation, and failure modes",
  "Community development and governance",
  "Safety, licences, limitations, and roadmap",
  "The completed laboratory evidence",
  "How the comparison audit works",
  "What the independent reading found",
  "The current frontier method families",
  "Learning through linked scientific views",
];

function citationKeys(markdown: string): string[] {
  return [...markdown.matchAll(/@([A-Za-z0-9_:.+-]+)/g)].map(
    (match) => match[1],
  );
}

function bibliographyKeys(bibtex: string): Set<string> {
  return new Set(
    [...bibtex.matchAll(/@[A-Za-z]+\s*\{\s*([^,\s]+)/g)].map(
      (match) => match[1],
    ),
  );
}

describe("living report source", () => {
  it("contains all thirteen substantive chapters in order", () => {
    const markdown = readFileSync(reportPath, "utf8");
    const chapters = [...markdown.matchAll(/^#\s+(.+)$/gm)].map(
      (match) => match[1],
    );
    expect(chapters).toEqual(expectedChapters);
  });

  it("resolves every citation key and leaves no authoring placeholders or tool tokens", () => {
    const markdown = readFileSync(reportPath, "utf8");
    const bibliography = readFileSync(referencesPath, "utf8");
    const knownKeys = bibliographyKeys(bibliography);
    const unresolved = [...new Set(citationKeys(markdown))].filter(
      (key) => !knownKeys.has(key),
    );

    expect(unresolved).toEqual([]);
    expect(markdown).not.toMatch(/\b(?:TODO|TBD|FIXME|CITATION NEEDED)\b/i);
    expect(markdown).not.toMatch(/turn\d+(?:search|view|fetch|open)\d+/i);
  });

  it("builds the complete current report with figures and references", () => {
    const source = readFileSync(buildPath, "utf8");
    expect(source).toContain("pandoc");
    expect(source).toContain("xelatex");
    expect(source).toContain("--citeproc");
    expect(source).toContain("--top-level-division=chapter");
    expect(source).toContain("aidd-commons-living-report-v0.2.pdf");
    expect(source).toContain("report/aidd-commons-living-report-v0.2.md");
    expect(source).not.toContain("report/aidd-commons-v0.2-addendum.md");
    expect(source).not.toMatch(/\/Users\/|\$HOME|`date|\$\(date/);
  });
});
