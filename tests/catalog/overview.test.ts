import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../../scripts/catalog/catalog.js";
import {
  buildCatalogOverview,
  buildSiteOverview,
  parseLabPage,
} from "../../scripts/catalog/overview.js";
import {
  checkCatalogArtifacts,
  renderCatalogArtifacts,
} from "../../scripts/catalog/projections.js";
import {
  checkSiteData,
  loadLabPages,
} from "../../scripts/catalog/site-data.js";
import { loadCurriculum } from "../../scripts/curriculum/curriculum.js";

const root = import.meta.dirname + "/../..";
const fixtureResources = () =>
  loadCatalog("tests/catalog/fixtures/export-source", { today: "2026-09-04" });

describe("source-derived site overview", () => {
  it("binds home, Atlas and lab quantities to the actual validated sources", async () => {
    const resources = await loadCatalog("catalog/resources");
    const curriculum = await loadCurriculum("catalog/curriculum/tracks.yaml", {
      resources,
    });
    const pages = await loadLabPages(root);
    const overview = buildSiteOverview(resources, curriculum, pages);
    expect(overview.catalog.count).toBe(resources.length);
    expect(overview.curriculum.trackCount).toBe(curriculum.tracks.length);
    expect(overview.curriculum.unitCount).toBe(curriculum.units.length);
    expect(overview.curriculum.chapterCount).toBe(
      curriculum.tracks
        .flatMap(({ lessons }) => lessons)
        .filter(({ type }) => type !== "core-source-path").length,
    );
    expect(overview.labs.pageCount).toBe(
      pages.filter(({ locale }) => locale === "en").length,
    );
    expect(overview.labs.guideCount).toBe(
      overview.labs.pageCount - overview.labs.sharedPages.length,
    );
    expect(
      overview.labs.guides.every(
        ({ href, hrefZh }) => hrefZh === `/zh-cn${href}`,
      ),
    ).toBe(true);
    expect(await checkSiteData(root)).toEqual(overview);
    expect(
      buildSiteOverview(
        [...resources].reverse(),
        { ...curriculum, tracks: [...curriculum.tracks].reverse() },
        [...pages].reverse(),
      ),
    ).toEqual(overview);
  }, 20_000); // Full filesystem-backed catalogue and workbench validation, not a latency gate.

  it("keeps lifecycle, access and all four states in every openness dimension separate", async () => {
    const resources = await fixtureResources();
    resources[0].openness.weights = {
      value: "not_applicable",
      evidence: ["official-page"],
    };
    resources[1].openness.weights = { value: "unverified" };
    resources[0].stages = ["example-stage", "example-stage"];
    resources[0].access_level.value = "closed";
    resources[1].access_level.value = "research_only";
    resources[0].status.value = "active";
    resources[1].status.value = "legacy";
    const overview = buildCatalogOverview(resources);
    expect(overview.openness.weights).toEqual({
      available: 0,
      not_available: 0,
      not_applicable: 1,
      unverified: 1,
    });
    for (const states of Object.values(overview.openness)) {
      expect(Object.values(states).reduce((a, b) => a + b, 0)).toBe(2);
    }
    expect(
      overview.facets.stage.find(({ value }) => value === "example-stage")
        ?.count,
    ).toBe(1);
    expect(overview.lastVerified.from).toBe(
      [...resources.map(({ last_verified }) => last_verified)].sort()[0],
    );
    expect(overview.facets.access).toEqual([
      { value: "closed", count: 1 },
      { value: "research_only", count: 1 },
    ]);
    expect(overview.facets.lifecycle).toEqual([
      { value: "active", count: 1 },
      { value: "legacy", count: 1 },
    ]);
    expect(() => buildCatalogOverview([])).toThrow(/nonempty/u);
    expect(() => buildCatalogOverview([resources[0], resources[0]])).toThrow(
      /unique/u,
    );
  });

  it("refuses missing translations and malformed guide metadata", async () => {
    const resources = await loadCatalog("catalog/resources");
    const curriculum = await loadCurriculum("catalog/curriculum/tracks.yaml", {
      resources,
    });
    const page = parseLabPage(
      "---\ntitle: Synthetic guide\ndescription: Metadata fixture\n---\n",
      "fixture",
      "en",
    );
    expect(() => buildSiteOverview(resources, curriculum, [page])).toThrow(
      /both English and Chinese/u,
    );
    expect(() =>
      parseLabPage("---\ntitle: [invalid]\n---\n", "fixture", "en"),
    ).toThrow(/frontmatter/u);
    expect(() => buildSiteOverview(resources, curriculum, [])).toThrow(
      /published guide/u,
    );
  });
});

describe("read-only generated-data validation", () => {
  it("accepts valid deterministic exports and refuses a stale projection without repairing it", async () => {
    const resources = await fixtureResources();
    const directory = await mkdtemp(join(tmpdir(), "aidd-data-check-"));
    const artifacts = renderCatalogArtifacts(resources);
    expect(renderCatalogArtifacts([...resources].reverse())).toEqual(artifacts);
    await Promise.all(
      Object.entries(artifacts).map(([name, value]) =>
        writeFile(join(directory, name), value),
      ),
    );
    await expect(
      checkCatalogArtifacts(resources, directory),
    ).resolves.toBeUndefined();
    await writeFile(join(directory, "openness.v1.json"), "[]\n");
    await expect(checkCatalogArtifacts(resources, directory)).rejects.toThrow(
      /openness.v1.json: stale/u,
    );
    expect(await readFile(join(directory, "openness.v1.json"), "utf8")).toBe(
      "[]\n",
    );
  });

  it("rejects missing artifacts and empty input rather than passing an empty scan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aidd-missing-data-"));
    await expect(
      checkCatalogArtifacts(await fixtureResources(), directory),
    ).rejects.toThrow(/missing or unreadable/u);
    expect(() => renderCatalogArtifacts([])).toThrow(/nonempty/u);
  });

  it("keeps figure generation explicit while build and check retain read-only freshness checks", async () => {
    const manifest = JSON.parse(
      await readFile(join(root, "site/package.json"), "utf8"),
    );
    for (const command of [manifest.scripts.build, manifest.scripts.check]) {
      expect(command).toContain("data:check");
      expect(command).toContain("figures:check");
      expect(command).not.toContain("figures:build");
    }
    expect(manifest.scripts["figures:check"]).toContain(
      "check-site-figures.py",
    );
    expect(manifest.scripts["figures:build"]).toContain("make-site-figures.py");
  });
});
