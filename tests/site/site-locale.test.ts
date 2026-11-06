import { describe, expect, it } from "vitest";
import { languageAlternate, localizedPath } from "../../site/src/lib/site-locale.js";
import { localizedAtlasLabel } from "../../site/src/lib/atlas-presentation.js";

describe("bilingual interface routes", () => {
  it.each(["/", "/atlas/", "/atlas/browse/", "/atlas/freesolv-v0-52/", "/audit/", "/report/", "/report/figures/", "/report/figures/plot-2-coverage-bounds/", "/contribute/", "/learn/tracks/foundations/", "/labs/notebook-guide/", "/search/"])("keeps the current destination for %s", (path) => {
    const chinese = localizedPath(path, true);
    expect(chinese).toBe(`/zh-cn${path}`);
    expect(localizedPath(chinese, false)).toBe(path);
    expect(localizedPath(chinese, true)).toBe(chinese);
  });
  it("retains result state and anchors across languages and a deployment base", () => {
    expect(languageAlternate("/aidd-commons/atlas/?kind=dataset&compare=a%2Cb&page=2#compare", "/aidd-commons/", false)).toBe("/zh-cn/atlas/?kind=dataset&compare=a%2Cb&page=2#compare");
    expect(languageAlternate("/aidd-commons/zh-cn/audit/?track=representations#matrix-title", "/aidd-commons/", true)).toBe("/audit/?track=representations#matrix-title");
  });
  it.each(["/data/resources.v1.json", "/report/v0-2/", "/report/citation.cff", "/atlas/open-cofolding-frontier/", "/atlas/target-to-candidate-map/"])("keeps canonical source %s", (path) => {
    expect(localizedPath(path, true)).toBe(path);
  });
  it("falls back to the Chinese report hub when an edition has no translation", () => {
    expect(languageAlternate("/report/v0-2/", "/", false)).toBe("/zh-cn/report/");
  });
  it("translates display labels while retaining unrecognized source terms", () => {
    expect(localizedAtlasLabel("training_data", true)).toBe("训练数据");
    expect(localizedAtlasLabel("unverified", true)).toBe("未核实");
    expect(localizedAtlasLabel("unverified")).toBe("unverified");
    expect(localizedAtlasLabel("novel_source_term", true)).toBe("novel source term");
  });
});
