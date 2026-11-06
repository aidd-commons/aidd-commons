import { describe, expect, it } from "vitest";
import {
  activeAtlasFilters,
  atlasLabel,
  emptyAtlasQuery,
} from "../../site/src/lib/atlas-presentation.js";

describe("Atlas active filter summary", () => {
  it("names every applied constraint without rewriting a scientific search phrase", () => {
    expect(
      activeAtlasFilters({
        q: "binding-site 10.1000/test",
        stage: "target-validation",
        kind: "model",
        access: "research_only",
        lifecycle: "legacy",
      }),
    ).toEqual([
      { key: "q", label: "Search", value: "binding-site 10.1000/test" },
      { key: "stage", label: "Stage", value: "target validation" },
      { key: "kind", label: "Kind", value: "model" },
      { key: "access", label: "Access", value: "research only" },
      { key: "lifecycle", label: "Lifecycle", value: "legacy" },
    ]);
  });

  it("has no active constraints after an explicit clear", () => {
    expect(activeAtlasFilters({ ...emptyAtlasQuery })).toEqual([]);
    expect(atlasLabel("not_applicable")).toBe("not applicable");
    expect(atlasLabel("unverified")).toBe("unverified");
  });
});
