import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";
import { afterAll, expect, it } from "vitest";

import { buildPublicRelease } from "../../scripts/release/build.js";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
let workspace: string | undefined;

afterAll(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { recursive: true, force: true });
  }
});

it("ships consistent release metadata, the report addendum, and the historical citation", async () => {
  workspace = await mkdtemp(join(tmpdir(), "aidd-versioned-release-"));
  const destination = join(workspace, "public-release");
  await buildPublicRelease({
    sourceRoot: repositoryRoot,
    destination,
    inventoryPath: join(workspace, "inventory.txt"),
  });
  const read = (path: string) => readFile(join(destination, path), "utf8");
  const root = JSON.parse(await read("package.json"));
  const site = JSON.parse(await read("site/package.json"));
  const citation = parse(await read("CITATION.cff"));
  expect(root.version).toMatch(/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/u);
  expect(site.version).toBe(root.version);
  expect(citation.version).toBe(root.version);
  expect(citation["preferred-citation"].version).toBe(root.version);
  expect(citation["repository-code"]).toBe(
    "https://github.com/aidd-commons/aidd-commons",
  );
  expect(citation.url).toBe("https://aidd-commons.github.io/aidd-commons/");
  const publication = JSON.parse(
    await read("catalog/comparisons/publication.json"),
  );
  if (publication.first_published_at === null) {
    expect(citation).not.toHaveProperty("date-released");
  } else {
    expect(citation["date-released"]).toBe(
      publication.first_published_at.slice(0, 10),
    );
  }
  const pythonVersion = (await read("pyproject.toml")).match(
    /^version = "([^"]+)"$/mu,
  )?.[1];
  expect(pythonVersion).toBe(root.version.replace("-rc.", "rc"));
  const archive = parse(await read("report/CITATION-v0.1.cff"));
  expect(archive.version).toBe("0.1.0");
  expect(archive["date-released"]).toBe("2026-09-04");
  await read("report/aidd-commons-v0.2-addendum.md");
  await read("report/metadata-v0.2.yaml");
  await read("report/aidd-commons-living-report-v0.2.md");
  expect(
    (
      await read("site/public/reports/aidd-commons-living-report-v0.2.html")
    ).replace(/\s+/g, " "),
  ).toContain("Learning through linked scientific views");
  await read("scripts/report/build-v02-pdf.py");
  const reports = JSON.parse(await read("site/src/data/publications.json"));
  const current = reports.versions.find(
    (version: { id: string }) => version.id === "v0.2",
  );
  expect(current.pdfHref).toBe("/reports/aidd-commons-living-report-v0.2.pdf");
  const pdfPath = `site/public${current.pdfHref}`;
  const shippedPDF = await readFile(join(destination, pdfPath));
  expect(shippedPDF.subarray(0, 5).toString()).toBe("%PDF-");
  expect(shippedPDF.equals(await readFile(join(repositoryRoot, pdfPath)))).toBe(
    true,
  );
  await read("CHANGELOG.md");
}, 120_000);
