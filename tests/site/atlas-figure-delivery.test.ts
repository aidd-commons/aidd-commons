import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));

interface FigureEntry {
  id: string;
  file: string;
  pdf: string;
  width: number;
  height: number;
  pages: string[];
  previews: Record<string, string>;
  detailHref: string;
  reportNumber: number;
  chapterAnchor: string;
  source_stem: string;
}

const manifest = JSON.parse(
  readFileSync(join(root, "site/src/data/atlas-figures.json"), "utf8"),
) as { figures: FigureEntry[]; library: FigureEntry[] };

it("diagnoses valid native pairs and known wrong-size, stale-caption and missing-file defects", () => {
  execFileSync(
    join(root, ".venv/bin/python"),
    ["tests/site/test_atlas_figure_delivery.py"],
    {
      cwd: root,
      env: {
        ...process.env,
        MPLBACKEND: "Agg",
        MPLCONFIGDIR:
          process.env.MPLCONFIGDIR || join(root, ".cache", "matplotlib"),
      },
      stdio: "pipe",
    },
  );
}, 60_000); // A first font-cache build can exceed 30 seconds on macOS.

it("publishes source-bound PNG previews with vector PDFs and accurate dimensions", () => {
  expect(manifest.figures.length).toBeGreaterThan(0);
  for (const figure of manifest.figures) {
    expect(figure.file, figure.id).toMatch(/\.png$/u);
    expect(figure.pdf, figure.id).toBe(figure.file.replace(/\.png$/u, ".pdf"));
    const png = readFileSync(join(root, "site/public/figures", figure.file));
    expect(png.subarray(0, 8).toString("hex"), figure.id).toBe(
      "89504e470d0a1a0a",
    );
    expect(figure.width, figure.id).toBe(png.readUInt32BE(16));
    expect(figure.height, figure.id).toBe(png.readUInt32BE(20));
    const pdf = readFileSync(join(root, "site/public/figures", figure.pdf));
    expect(pdf.subarray(0, 5).toString("ascii"), figure.id).toBe("%PDF-");
  }
  execFileSync(
    join(root, ".venv/bin/python"),
    ["site/scripts/check-site-figures.py"],
    {
      cwd: root,
      stdio: "pipe",
    },
  );
});

it("renders every placed preview as an accessible image with a PDF download", () => {
  for (const figure of manifest.figures) {
    for (const page of figure.pages) {
      const html = readFileSync(
        join(root, "site/dist", page, "index.html"),
        "utf8",
      );
      const block = [...html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gu)]
        .map((match) => match[0])
        .find((candidate) =>
          candidate.includes(`data-atlas-figure="${figure.id}"`),
        );
      expect(block, `${page} ${figure.id}`).toBeDefined();
      expect(block).toContain(`/figures/${figure.file}`);
      expect(block).toContain(`width="${figure.width}"`);
      expect(block).toContain(`height="${figure.height}"`);
      expect(block).toMatch(/<img\b[^>]*alt="[^"]+"/u);
      const previewLink = block?.match(
        /<a\b[^>]*>[\s\S]*?<img\b[\s\S]*?<\/a>/u,
      )?.[0];
      expect(
        previewLink,
        `${figure.id}: preview opens its vector PDF`,
      ).toContain(`/figures/${figure.pdf}`);
      const downloadLink = [
        ...block!.matchAll(
          /<a\b[^>]*\bdownload(?:="[^"]*")?[^>]*>[\s\S]*?<\/a>/gu,
        ),
      ]
        .map((match) => match[0])
        .find((link) => link.includes(`href="/figures/${figure.pdf}"`));
      expect(
        downloadLink,
        `${page} ${figure.id}: labelled PDF download`,
      ).toBeDefined();
      expect(downloadLink).toContain(
        page.replace(/^\//u, "").startsWith("zh-cn/")
          ? "下载 PDF"
          : "Download PDF",
      );
      expect(block).not.toContain("<svg");
    }
  }
});

it("keeps the library in actual cumulative-report order with stable detail routes", () => {
  const report = readFileSync(
    join(root, "report/aidd-commons-living-report-v0.2.md"),
    "utf8",
  );
  const sourceStems = [
    ...report.matchAll(/\(figures\/out\/([a-z0-9_-]+)\.pdf\)/gu),
  ].map((match) => match[1]);
  expect(sourceStems).toHaveLength(20);
  expect(manifest.library.map((entry) => entry.source_stem)).toEqual(
    sourceStems,
  );
  expect(manifest.library.map((entry) => entry.reportNumber)).toEqual(
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  for (const entry of manifest.library) {
    expect(entry.detailHref).toBe(`/report/figures/${entry.id}/`);
    expect(entry.chapterAnchor).toMatch(/^[a-z][a-z0-9-]+$/u);
    expect(entry.previews).toEqual({
      "480": entry.file.replace(/\.png$/u, "-480.webp"),
      "960": entry.file.replace(/\.png$/u, "-960.webp"),
    });
  }
});

it("renders report-order WebP previews and separate details without JavaScript", () => {
  for (const language of ["", "zh-cn/"]) {
    const html = readFileSync(
      join(root, `site/dist/${language}report/figures/index.html`),
      "utf8",
    );
    const figures = [
      ...html.matchAll(
        /<figure\b[^>]*data-library-figure="([^"]+)"[^>]*>[\s\S]*?<\/figure>/gu,
      ),
    ];
    expect(figures.map((match) => match[1])).toEqual(
      manifest.library.map((entry) => entry.id),
    );
    for (const [index, match] of figures.entries()) {
      const entry = manifest.library[index];
      const preview = match[0].match(/<img\b[^>]*>/u)?.[0];
      expect(preview).toContain(`src="/figures/${entry.previews["480"]}"`);
      expect(preview).toContain(`/figures/${entry.previews["960"]} 960w`);
      expect(preview).not.toContain(entry.file);
      expect(match[0]).toContain(
        `href="/${language}report/figures/${entry.id}/"`,
      );
    }
  }
});

it("preserves established figure routes, download filenames and inline placement aliases", () => {
  const legacy = JSON.parse(
    readFileSync(
      join(root, "tests/site/fixtures/legacy-figure-routes.json"),
      "utf8",
    ),
  ) as { library_ids: string[]; placement_ids: Record<string, string> };
  for (const id of legacy.library_ids) {
    const entry = manifest.library.find((entry) => entry.id === id)!;
    expect(entry, id).toBeDefined();
    expect(entry.detailHref).toBe(`/report/figures/${id}/`);
    expect(entry.file).toBe(`${id}.png`);
    expect(entry.pdf).toBe(`${id}.pdf`);
  }
  for (const [id, stem] of Object.entries(legacy.placement_ids)) {
    const entry = manifest.figures.find((entry) => entry.id === id)!;
    expect(entry, id).toBeDefined();
    expect(entry.file).toBe(`${stem}.png`);
    expect(entry.pdf).toBe(`${stem}.pdf`);
  }
});

it("keeps gallery anchors and detail navigation in static HTML without depending on JavaScript", () => {
  const legacy = JSON.parse(
    readFileSync(
      join(root, "tests/site/fixtures/legacy-figure-routes.json"),
      "utf8",
    ),
  ) as { library_ids: string[]; group_anchors: string[] };
  for (const language of ["", "zh-cn/"]) {
    const html = readFileSync(
      join(root, `site/dist/${language}report/figures/index.html`),
      "utf8",
    );
    for (const anchor of legacy.group_anchors)
      expect(html).toContain(`id="${anchor}"`);
    for (const id of legacy.library_ids) {
      const card = [
        ...html.matchAll(
          /<figure\b[^>]*data-library-figure="([^"]+)"[^>]*>[\s\S]*?<\/figure>/gu,
        ),
      ].find((match) => match[1] === id)?.[0];
      expect(card, id).toBeDefined();
      expect(card!.match(/^<figure\b[^>]*>/u)?.[0]).not.toMatch(
        /\shidden(?:[\s=>])/u,
      );
      expect(card).toContain(`id="${id}"`);
      expect(card).toContain(`href="/${language}report/figures/${id}/"`);
      expect(card).toContain(`href="/figures/${id}.pdf"`);
    }
  }
});

it("links figure chapters into the full HTML report after chapter renaming", () => {
  const report = readFileSync(
    join(root, "site/public/reports/aidd-commons-living-report-v0.2.html"),
    "utf8",
  );
  const source = readFileSync(
    join(root, "report/aidd-commons-living-report-v0.2.md"),
    "utf8",
  );
  expect(source).toContain("# What the retained automated readings found");
  expect(source).not.toContain("# What the independent reading found");
  expect(report).toContain('id="what-the-retained-automated-readings-found"');
  for (const entry of manifest.library) {
    expect(report, entry.id).toContain(`id="${entry.chapterAnchor}"`);
    for (const language of ["", "zh-cn/"]) {
      const detail = readFileSync(
        join(
          root,
          `site/dist/${language}report/figures/${entry.id}/index.html`,
        ),
        "utf8",
      );
      expect(detail).toContain(
        `href="/reports/aidd-commons-living-report-v0.2.html#${entry.chapterAnchor}"`,
      );
      expect(detail).not.toContain(
        `href="/${language}report/#${entry.chapterAnchor}"`,
      );
    }
  }
});
