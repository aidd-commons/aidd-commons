import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { retainedViewRows } from "../../scripts/workbench/adapters.js";
import {
  checkWorkbenchArtifacts,
  loadWorkbenchData,
  nominateSourceReviews,
  renderWorkbenchArtifacts,
  reviewedSourceDate,
  validateSourceAnchor,
  validateWorkbenchGraph,
} from "../../scripts/workbench/data.js";
import {
  atPointer,
  parseWorkbenchRegistry,
} from "../../scripts/workbench/registry.js";
import type {
  WorkbenchData,
  SearchIndex,
} from "../../scripts/workbench/types.js";

const root = join(import.meta.dirname, "../..");
const fixture = async (name: string) =>
  readFile(join(import.meta.dirname, "fixtures", name), "utf8");
let data: WorkbenchData;
let search: SearchIndex;
beforeAll(async () => {
  ({ data, search } = await loadWorkbenchData(root));
});

describe("curated workbench registry diagnostics", () => {
  it("accepts a representative valid case/view and rejects known unit, edge, path and translation defects", async () => {
    expect(
      parseWorkbenchRegistry(parse(await fixture("valid-registry.yaml")))
        .cases[0].id,
    ).toBe("egfr-assay-transfer");
    for (const [name, diagnostic] of [
      ["bad-unit.yaml", /require unit pChEMBL/u],
      ["bad-unresolved-view.yaml", /unresolved or mismatched view/u],
      ["bad-source-traversal.yaml", /without traversal/u],
      ["bad-translation.yaml", /titleZh/u],
    ] as const)
      expect(() => parseWorkbenchRegistry(parseContent(name))).toThrow(
        diagnostic,
      );
    function parseContent(name: string) {
      return badFixtures.get(name);
    }
  });

  const badFixtures = new Map<string, unknown>();
  beforeAll(async () => {
    for (const name of [
      "bad-unit.yaml",
      "bad-unresolved-view.yaml",
      "bad-source-traversal.yaml",
      "bad-translation.yaml",
    ])
      badFixtures.set(name, parse(await fixture(name)));
  });

  it("rejects unresolved source files/pointers/anchors instead of treating source names as evidence", async () => {
    await expect(
      validateSourceAnchor(root, {
        path: "labs/chembl_egfr/locked-summary.json",
        label: "retained result",
        pointer: "/results/primary_test/count",
      }),
    ).resolves.toBe(132);
    await expect(
      validateSourceAnchor(root, {
        path: "labs/missing/summary.json",
        label: "missing",
      }),
    ).rejects.toThrow();
    await expect(
      validateSourceAnchor(root, {
        path: "labs/chembl_egfr/locked-summary.json",
        label: "missing pointer",
        pointer: "/results/unknown",
      }),
    ).rejects.toThrow(/Unresolved JSON source pointer/u);
    await expect(
      validateSourceAnchor(root, {
        path: "site/src/content/docs/labs/chembl-egfr-representation-baselines.mdx",
        label: "bad anchor",
        anchor: "not-a-heading",
      }),
    ).rejects.toThrow(/Unresolved source anchor/u);
    expect(() => atPointer({ "a/b": { "~x": 0 } }, "/a~1b/~0x")).not.toThrow();
  });

  it("never substitutes an arbitrary content date for an unknown source review date", () => {
    expect(reviewedSourceDate("Entry guidance updated: 2026-09-09")).toBeNull();
    expect(reviewedSourceDate("Sources last reviewed: 2026-09-08.")).toBe(
      "2026-09-08",
    );
    expect(reviewedSourceDate("Sources last reviewed: 2026-02-30.")).toBeNull();
  });
});

describe("canonical navigation and source semantics", () => {
  it("projects all 18 tracks, declared routes and qualified prerequisites from the sole curriculum source", async () => {
    const curriculum = parse(
      await readFile(join(root, "catalog/curriculum/tracks.yaml"), "utf8"),
    );
    expect(data.tracks.map(({ id }) => id)).toEqual(
      curriculum.tracks.map(({ id }: { id: string }) => id),
    );
    expect(data.tracks).toHaveLength(18);
    for (const route of data.routes)
      expect(route.lessonIds).toEqual(
        curriculum.learning_paths.find(
          ({ id }: { id: string }) => id === route.id,
        ).lesson_ids,
      );
    for (const track of data.tracks) {
      expect(track.href).toBe(`/learn/tracks/${track.id}/`);
      expect(
        track.lessons.every((lesson) =>
          lesson.prerequisiteIds.every((id) =>
            data.objects.some((object) => object.id === `lesson:${id}`),
          ),
        ),
      ).toBe(true);
    }
    for (const unit of data.objects.filter(({ kind }) => kind === "unit")) {
      const source = curriculum.units.find(
        ({ id }: { id: string }) => `unit:${id}` === unit.id,
      );
      expect(unit.href).toBe(
        source.lesson_id ? `/learn/${source.lesson_id}/` : null,
      );
    }
  });

  it("covers every MDX family and keeps source language independent of navigation language", () => {
    expect(
      search.entries.some(
        ({ objectId }) => objectId === "document:report/v0-2",
      ),
    ).toBe(true);
    expect(
      search.entries.some(
        ({ objectId }) => objectId === "document:atlas/open-cofolding-frontier",
      ),
    ).toBe(true);
    expect(
      search.entries.find(
        ({ objectId, locale }) =>
          objectId === "document:pathways/foundations" && locale === "en",
      )?.language,
    ).toBe("zh-cn");
    expect(
      search.entries.find(
        ({ objectId, locale }) =>
          objectId === "resource:model-boltz-2" && locale === "zh-cn",
      ),
    ).toMatchObject({ language: "en", href: "/atlas/model-boltz-2/" });
    expect(
      search.entries.every(
        ({ href }) => href.startsWith("/") && !href.startsWith("//"),
      ),
    ).toBe(true);
  });

  it("rejects dangling graph links, wrong edge semantics, wrong endpoint types and missing bilingual destinations", () => {
    expect(() => validateWorkbenchGraph(data)).not.toThrow();
    const dangling = structuredClone(data);
    dangling.relations[0].target = "resource:does-not-exist";
    expect(() => validateWorkbenchGraph(dangling)).toThrow(
      /Unresolved workbench relation/u,
    );
    const semantics = structuredClone(data);
    semantics.relations.find(({ kind }) => kind === "navigation")!.semantics =
      "declared-support";
    expect(() => validateWorkbenchGraph(semantics)).toThrow(
      /must not become verified scientific support/u,
    );
    const endpoint = structuredClone(data);
    endpoint.relations.find(({ kind }) => kind === "produced-under")!.target =
      "resource:model-boltz-2";
    expect(() => validateWorkbenchGraph(endpoint)).toThrow(/typed endpoints/u);
    const bilingual = structuredClone(data);
    bilingual.objects.find(
      ({ language, href }) => language === "bilingual" && href,
    )!.hrefZh = null;
    expect(() => validateWorkbenchGraph(bilingual)).toThrow(/bilingual/u);
    expect(() => validateWorkbenchGraph({ ...data, objects: [] })).toThrow(
      /nonempty/u,
    );
  });

  it("nominates direct consumers of specified changed fields without revising scientific claims", () => {
    const before = JSON.stringify(data);
    const sourcePath = "catalog/resources/model-boltz-2.yaml";
    const candidates = nominateSourceReviews(data, [
      { path: sourcePath, fields: ["openness.weights"] },
    ]);
    expect(
      candidates.some(({ objectId }) => objectId === "resource:model-boltz-2"),
    ).toBe(true);
    expect(
      candidates.some(({ objectId }) => objectId.startsWith("lesson:")),
    ).toBe(true);
    expect(
      candidates.every(
        ({ changedFields, status }) =>
          changedFields.join() === "openness.weights" &&
          status === "review-candidate",
      ),
    ).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe("retained-result adapters and explicit generation", () => {
  it("copies exact source values and population counts, preserving all adverse models and fixed policies", async () => {
    for (const view of data.views) {
      const source = JSON.parse(
        await readFile(join(root, view.sources[0].path), "utf8"),
      );
      expect(view.rows.length).toBeGreaterThan(0);
      for (const row of view.rows) {
        expect(row.value).toBe(atPointer(source, row.sourcePointer));
        expect(row.unit).toBe(view.unit);
      }
    }
    const egfr = data.views.find(({ id }) => id === "egfr-assay-mae")!;
    expect(egfr.rows).toHaveLength(6);
    expect(
      egfr.rows.find(
        ({ population, model }) =>
          population === "assay_replication" && model === "morgan_ridge",
      )?.value,
    ).toBeGreaterThan(3);
    const pool = data.views.find(({ id }) => id === "pool-budget-recovery")!;
    expect(pool.rows).toHaveLength(60);
    expect(new Set(pool.rows.map(({ model }) => model)).size).toBe(6);
    expect(
      data.cases.every(
        ({ limitations, sourceDate }) =>
          limitations.length > 0 && sourceDate === "2026-09-08",
      ),
    ).toBe(true);
    expect(() => retainedViewRows("egfr-mae", {})).toThrow();
    expect(() =>
      retainedViewRows("egfr-mae", JSON.parse(badPopulation)),
    ).toThrow(/population count/u);
    expect(() =>
      retainedViewRows("pool-recovery", JSON.parse(badPolicy)),
    ).toThrow(/all five fixed random policies/u);
  });
  let badPopulation: string;
  let badPolicy: string;
  beforeAll(async () => {
    badPopulation = await fixture("bad-population.json");
    badPolicy = await fixture("bad-missing-policy.json");
  });

  it("accepts current projections and rejects stale/missing exports without repairing them", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aidd-workbench-check-"));
    const output = join(directory, "site/public/data");
    await mkdir(output, { recursive: true });
    const input = { data, search };
    await expect(checkWorkbenchArtifacts(directory, input)).rejects.toThrow(
      /missing or stale/u,
    );
    const artifacts = renderWorkbenchArtifacts(data, search);
    for (const [name, text] of Object.entries(artifacts))
      await writeFile(join(output, name), text);
    await expect(
      checkWorkbenchArtifacts(directory, input),
    ).resolves.toBeUndefined();
    await writeFile(join(output, "search.v1.json"), "{}\n");
    await expect(checkWorkbenchArtifacts(directory, input)).rejects.toThrow(
      /search.v1.json: missing or stale/u,
    );
    expect(await readFile(join(output, "search.v1.json"), "utf8")).toBe("{}\n");
    expect(() =>
      renderWorkbenchArtifacts(data, { version: 1, entries: [] }),
    ).toThrow(/nonempty/u);
  });

  it("keeps ordinary build commands read-only and exposes regeneration explicitly", async () => {
    const rootManifest = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    );
    const siteManifest = JSON.parse(
      await readFile(join(root, "site/package.json"), "utf8"),
    );
    expect(rootManifest.scripts.build).not.toMatch(
      /catalog:build|workbench:build/u,
    );
    expect(siteManifest.scripts.build).toContain("data:check");
    expect(siteManifest.scripts.build).not.toContain("workbench:build");
    expect(rootManifest.scripts["workbench:build"]).toContain(
      "scripts/workbench/export.ts",
    );
    expect(rootManifest.scripts["workbench:check"]).toContain("--check");
  });
});
