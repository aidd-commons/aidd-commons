import { beforeAll, describe, expect, it } from "vitest";
import { loadWorkbenchData } from "../../scripts/workbench/data.js";
import { rankSearchEntries } from "../../scripts/workbench/search.js";
import type { SearchEntry } from "../../scripts/workbench/types.js";

let entries: SearchEntry[];
beforeAll(async () => {
  entries = (await loadWorkbenchData(import.meta.dirname + "/../..")).search
    .entries;
});

describe("cross-content lexical search", () => {
  it("ranks exact identifiers and names above incidental matches", () => {
    expect(
      rankSearchEntries(entries, "model-boltz-2", { locale: "en" })[0].objectId,
    ).toBe("resource:model-boltz-2");
    expect(
      rankSearchEntries(entries, "Boltz-2", { locale: "en" })[0].objectId,
    ).toBe("resource:model-boltz-2");
    expect(
      rankSearchEntries(entries, "activity.json", { locale: "en" })[0].objectId,
    ).toBe("resource:dataset-chembl-activity");
    expect(
      rankSearchEntries(entries, "CHEMBL5736995", { locale: "en" }).some(
        ({ type }) => type === "lab",
      ),
    ).toBe(true);
  });

  it("shares deterministic type/track filtering, Unicode normalization and empty results", () => {
    expect(
      rankSearchEntries(entries, "EGFR", {
        locale: "en",
        types: ["case"],
      }).every(({ type }) => type === "case"),
    ).toBe(true);
    expect(
      rankSearchEntries(entries, "", { locale: "en", types: ["track"] }),
    ).toHaveLength(18);
    expect(
      rankSearchEntries(entries, "", {
        locale: "en",
        trackId: "active-learning",
      }).every(({ trackIds }) => trackIds.includes("active-learning")),
    ).toBe(true);
    const result = rankSearchEntries(entries, "模型", {
      locale: "zh-cn",
      limit: 5,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(({ locale }) => locale === "zh-cn")).toBe(true);
    expect(
      rankSearchEntries(entries, "Ｂｏｌｔｚ－２", { locale: "en" })[0]
        .objectId,
    ).toBe("resource:model-boltz-2");
    expect(
      rankSearchEntries([...entries].reverse(), "EGFR", { locale: "en" }),
    ).toEqual(rankSearchEntries(entries, "EGFR", { locale: "en" }));
    expect(
      rankSearchEntries(entries, "not-a-real-item-938724", { locale: "en" }),
    ).toEqual([]);
    expect(rankSearchEntries(entries, "", { locale: "en", limit: 0 })).toEqual(
      [],
    );
  });
});
