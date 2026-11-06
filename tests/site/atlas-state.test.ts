import { describe, expect, it } from "vitest";

import {
  evidenceForIds,
  evidenceForSupport,
  filterResources,
  mergeLessonProgress,
  parseLessonProgress,
  parseAtlasQuery,
  progressStorageKey,
  readLessonProgress,
  serializeAtlasQuery,
  toggleLessonProgress,
  parseAtlasState,
  serializeAtlasState,
  toggleAtlasComparison,
  sortAtlasResources,
  paginateAtlasResources,
} from "../../site/src/lib/atlas-state.js";

const resources = [
  {
    id: "openfold",
    name: "OpenFold",
    kind: "model",
    summary: "Open structure-prediction implementation.",
    stages: ["structure-prediction"],
    access_level: { value: "open_source" },
    status: { value: "active" },
  },
  {
    id: "freesolv-v0-52",
    name: "FreeSolv v0.52",
    kind: "dataset",
    summary: "Versioned hydration free-energy dataset.",
    stages: ["property-prediction"],
    access_level: { value: "research_only" },
    status: { value: "legacy" },
  },
];

describe("atlas URL state", () => {
  it("round-trips a positive safe page number and rejects malformed pagination state", () => {
    const state = parseAtlasState(
      new URLSearchParams(
        "q=protein&view=table&page=3&compare=boltz-1,openfold",
      ),
    );
    expect(state.page).toBe(3);
    expect(new URLSearchParams(serializeAtlasState(state)).get("page")).toBe(
      "3",
    );
    expect(
      parseAtlasState(new URLSearchParams(serializeAtlasState(state))),
    ).toEqual(state);
    for (const invalid of [
      "0",
      "-1",
      "2.5",
      "1e3",
      "Infinity",
      "NaN",
      "9007199254740992",
      "",
      " 2 ",
    ]) {
      expect(
        parseAtlasState(new URLSearchParams({ page: invalid })).page,
        invalid,
      ).toBe(1);
    }
    expect(
      serializeAtlasState(parseAtlasState(new URLSearchParams("page=1"))),
    ).toBe("");
  });

  it("bounds a visible page without losing or changing the complete matched population", () => {
    const records = Array.from(
      { length: 49 },
      (_, index) => `resource-${index + 1}`,
    );
    expect(paginateAtlasResources(records, 2)).toEqual({
      page: 2,
      pages: 3,
      total: 49,
      from: 25,
      to: 48,
      items: records.slice(24, 48),
    });
    expect(paginateAtlasResources(records, 999)).toEqual({
      page: 3,
      pages: 3,
      total: 49,
      from: 49,
      to: 49,
      items: ["resource-49"],
    });
    expect(paginateAtlasResources(records, -1).items).toEqual(
      records.slice(0, 24),
    );
    expect(paginateAtlasResources([], 2)).toEqual({
      page: 1,
      pages: 1,
      total: 0,
      from: 0,
      to: 0,
      items: [],
    });
    expect(records).toHaveLength(49);
  });
  it("retains view, sort and two-to-four distinct comparison IDs, including native repeated form fields", () => {
    const state = parseAtlasState(
      new URLSearchParams(
        "q=protein&view=table&sort=checked&compare=boltz-1&compare=openfold,boltz-1",
      ),
    );
    expect(state.compare).toEqual(["boltz-1", "openfold"]);
    expect(state.view).toBe("table");
    expect(state.sort).toBe("checked");
    expect(
      parseAtlasState(new URLSearchParams(serializeAtlasState(state))),
    ).toEqual(state);
    expect(serializeAtlasState(parseAtlasState(new URLSearchParams()))).toBe(
      "",
    );
  });

  it("rejects malformed selectors and unsafe IDs while preserving valid unknown IDs for a visible diagnostic", () => {
    const state = parseAtlasState(
      new URLSearchParams(
        "view=untrusted&sort=score&compare=../bad,boltz-1,%3Cscript%3E,missing-record,openfold,tool-rdkit,extra",
      ),
    );
    expect(state.view).toBe("list");
    expect(state.sort).toBe("relevance");
    expect(state.compare).toEqual([
      "boltz-1",
      "missing-record",
      "openfold",
      "tool-rdkit",
    ]);
    const ids = ["one", "two", "three", "four"];
    expect(toggleAtlasComparison(ids, "five")).toEqual(ids);
    expect(toggleAtlasComparison(ids, "two")).toEqual(["one", "three", "four"]);
    expect(ids).toEqual(["one", "two", "three", "four"]);
  });
  it("parses and serializes shareable atlas filters", () => {
    const query = parseAtlasQuery(
      new URLSearchParams(
        "q=free+solv&stage=property-prediction&kind=dataset&access=research_only&lifecycle=legacy&ignored=value",
      ),
    );

    expect(query).toEqual({
      access: "research_only",
      kind: "dataset",
      lifecycle: "legacy",
      q: "free solv",
      stage: "property-prediction",
    });
    expect(serializeAtlasQuery(query)).toBe(
      "?q=free+solv&stage=property-prediction&kind=dataset&access=research_only&lifecycle=legacy",
    );
  });

  it("maps claim IDs and metadata support to their displayed evidence", () => {
    const evidence = [
      { id: "official-page", supports: ["name", "summary"] },
      { id: "release-doi", supports: ["identifiers", "caveats"] },
    ];

    expect(evidenceForIds(evidence, ["official-page"])).toEqual([
      { id: "official-page", supports: ["name", "summary"] },
    ]);
    expect(evidenceForSupport(evidence, "caveats")).toEqual([
      { id: "release-doi", supports: ["identifiers", "caveats"] },
    ]);
  });

  it("returns only resources that satisfy every active atlas filter", () => {
    const results = filterResources(resources, {
      access: "research_only",
      kind: "dataset",
      lifecycle: "legacy",
      q: "hydration",
      stage: "property-prediction",
    });

    expect(results.map((resource) => resource.id)).toEqual(["freesolv-v0-52"]);
  });

  it("searches source identifier values even when absent from the resource name and summary", () => {
    const records = [
      { ...resources[0], identifiers: [{ value: "10.1234/EXAMPLE" }] },
      resources[1],
    ];
    const query = parseAtlasQuery(new URLSearchParams("q=10.1234%2Fexample"));
    expect(filterResources(records, query).map(({ id }) => id)).toEqual([
      "openfold",
    ]);
    expect(filterResources(records, { ...query, kind: "dataset" })).toEqual([]);
  });

  it("searches declared tasks and modalities and gives exact identifiers explicit text-match priority", () => {
    const records = [
      {
        ...resources[0],
        tasks: ["cofolding"],
        modalities: ["protein-ligand-complex"],
        last_verified: "2026-01-01",
        identifiers: [{ value: "10.1/example" }],
      },
      {
        ...resources[1],
        summary: "Mentions 10.1/example",
        last_verified: "2026-10-01",
      },
    ];
    expect(
      filterResources(
        records,
        parseAtlasQuery(new URLSearchParams("q=cofolding")),
      ).map(({ id }) => id),
    ).toEqual(["openfold"]);
    expect(
      filterResources(
        records,
        parseAtlasQuery(new URLSearchParams("q=protein-ligand")),
      ).map(({ id }) => id),
    ).toEqual(["openfold"]);
    const query = parseAtlasQuery(new URLSearchParams("q=10.1/example"));
    expect(sortAtlasResources(records, query, "relevance")[0].id).toBe(
      "openfold",
    );
    expect(sortAtlasResources(records, query, "checked")[0].id).toBe(
      "freesolv-v0-52",
    );
    expect(records[0].id).toBe("openfold");
  });
});

describe("lesson progress state", () => {
  it("adds an unfinished lesson and removes it when toggled again", () => {
    const completed = toggleLessonProgress([], "foundations/getting-started");

    expect(completed).toEqual(["foundations/getting-started"]);
    expect(
      toggleLessonProgress(completed, "foundations/getting-started"),
    ).toEqual([]);
  });

  it("keeps only distinct valid lesson identifiers from persisted progress", () => {
    expect(
      parseLessonProgress(
        '{"completed":["foundations/getting-started","foundations/getting-started",3]}',
      ),
    ).toEqual(["foundations/getting-started"]);
    expect(parseLessonProgress("not-json")).toEqual([]);
  });

  it("reads the namespaced progress record and merges distinct completed lessons", () => {
    const stored = readLessonProgress({
      getItem(key) {
        return key === "aidd-commons:v1:progress"
          ? '{"completed":["foundations/getting-started"]}'
          : null;
      },
    });

    expect(progressStorageKey).toBe("aidd-commons:v1:progress");
    expect(
      mergeLessonProgress(stored, [
        "foundations/getting-started",
        "research/reading-papers",
      ]),
    ).toEqual(["foundations/getting-started", "research/reading-papers"]);
  });
});
