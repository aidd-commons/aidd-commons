import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { Resource } from "../../site/src/data/resource.js";
import { opennessDimensions } from "../../site/src/data/resource.js";
import {
  atlasLandscape,
  buildAtlasIndex,
  comparisonAssetRows,
} from "../../site/src/lib/atlas-presentation.js";
import {
  filterResources,
  parseAtlasQuery,
} from "../../site/src/lib/atlas-state.js";
import { GET as indexGET } from "../../site/src/pages/data/atlas-index.json.js";
import {
  GET as detailGET,
  getStaticPaths,
} from "../../site/src/pages/data/resources/[id].json.js";

const resources = JSON.parse(
  await readFile("site/public/data/resources.v1.json", "utf8"),
) as Resource[];

describe("Atlas compact index and detailed records", () => {
  it("keeps every searchable identifier, task, modality, date and scoped licence without embedded claim evidence", async () => {
    const index = buildAtlasIndex(resources);
    expect(index.length).toBe(resources.length);
    for (const [offset, record] of resources.entries()) {
      const entry = index[offset];
      expect(entry.id).toBe(record.id);
      expect(entry.identifiers.map(({ value }) => value)).toEqual(
        record.identifiers.map(({ value }) => value),
      );
      expect(entry.tasks).toEqual(record.tasks);
      expect(entry.modalities).toEqual(record.modalities);
      expect(entry.licenses).toEqual(
        record.licenses.map(({ name, scope }) => ({ name, scope })),
      );
      expect(entry.last_verified).toBe(record.last_verified);
      expect(entry).not.toHaveProperty("evidence");
      expect(entry).not.toHaveProperty("openness");
    }
    const response = indexGET();
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual(index);
  });

  it("serves each exact source record once under its own ID, retaining seven dimensions and evidence", async () => {
    const paths = getStaticPaths();
    expect(new Set(paths.map(({ params }) => params.id)).size).toBe(
      resources.length,
    );
    for (const path of paths) {
      const detail = await detailGET({ props: path.props }).json();
      expect(detail).toEqual(resources.find(({ id }) => id === path.params.id));
      expect(Object.keys(detail.openness).sort()).toEqual(
        [...opennessDimensions].sort(),
      );
    }
  });

  it("preserves all four asset states independently and keeps each cell's direct evidence", () => {
    const record = structuredClone(resources[0]);
    const states = [
      "available",
      "not_available",
      "not_applicable",
      "unverified",
    ];
    opennessDimensions.forEach((dimension, index) => {
      record.openness[dimension] = {
        value: states[index % states.length],
        evidence: [`source-${dimension}`],
      };
    });
    const rows = comparisonAssetRows([record]);
    expect(rows).toHaveLength(7);
    rows.forEach((row, index) => {
      expect(row.cells).toEqual([
        {
          resourceId: record.id,
          value: states[index % states.length],
          evidence: [`source-${row.dimension}`],
        },
      ]);
    });
    expect(new Set(rows.map(({ cells }) => cells[0].value)).size).toBe(4);
  });

  it("builds landscape counts from the same filtered population without double-counting IDs inside a cell", () => {
    const index = buildAtlasIndex(resources);
    const matched = filterResources(
      index,
      parseAtlasQuery(new URLSearchParams("q=protein&kind=model")),
    );
    expect(matched.length).toBeGreaterThan(0);
    const matrix = atlasLandscape(matched);
    expect(matrix.total).toBe(matched.length);
    for (const row of matrix.rows)
      for (const cell of row.cells) {
        const expected = matched
          .filter(
            (record) =>
              record.kind === cell.kind &&
              (row.stage
                ? record.stages.includes(row.stage)
                : !record.stages.length),
          )
          .map(({ id }) => id);
        expect(cell.ids).toEqual(expected);
        expect(new Set(cell.ids).size).toBe(cell.ids.length);
      }
    expect(atlasLandscape([])).toEqual({ total: 0, kinds: [], rows: [] });
    const noStage = index.filter(({ stages }) => !stages.length);
    expect(noStage.length).toBeGreaterThan(0);
    expect(
      atlasLandscape(noStage).rows[0].cells.flatMap(({ ids }) => ids),
    ).toEqual(noStage.map(({ id }) => id));
  });
});
