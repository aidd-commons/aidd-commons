import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseLabPage } from "../../scripts/catalog/overview.js";
import {
  buildLabDiscovery,
  filterLabs,
  labDiscovery,
  labInputLabels,
  labModeLabels,
  parseLabQuery,
  serializeLabQuery,
} from "../../site/src/lib/lab-discovery.js";
import type { LabGuide } from "../../site/src/lib/lab-discovery.js";

const content = new URL("../../site/src/content/docs/", import.meta.url);
const slugs = async (language: string) =>
  (await readdir(new URL(`${language}labs/`, content)))
    .filter((file) => file.endsWith(".mdx") && file !== "notebook-guide.mdx")
    .map((file) => file.replace(/\.mdx$/u, ""))
    .sort();

async function canonicalGuides(): Promise<LabGuide[]> {
  return Promise.all(
    (await slugs("")).map(async (slug) => {
      const en = parseLabPage(
        await readFile(new URL(`labs/${slug}.mdx`, content), "utf8"),
        slug,
        "en",
      );
      const zh = parseLabPage(
        await readFile(new URL(`zh-cn/labs/${slug}.mdx`, content), "utf8"),
        slug,
        "zh-cn",
      );
      return {
        slug,
        title: en.title,
        description: en.description,
        href: `/labs/${slug}/`,
        titleZh: zh.title,
        descriptionZh: zh.description,
        hrefZh: `/zh-cn/labs/${slug}/`,
      };
    }),
  );
}

describe("shared laboratory discovery", () => {
  it("covers every published bilingual guide once, with an explicit mode and input", async () => {
    const english = await slugs("");
    expect(await slugs("zh-cn/")).toEqual(english);
    expect(Object.keys(labDiscovery).sort()).toEqual(english);
    const rows = buildLabDiscovery(await canonicalGuides());
    expect(rows.map(({ slug }) => slug).sort()).toEqual(english);
    expect(new Set(rows.map(({ href }) => href)).size).toBe(rows.length);
    expect(new Set(rows.map(({ hrefZh }) => hrefZh)).size).toBe(rows.length);
    for (const row of rows) {
      expect(labModeLabels[row.mode]).toBeDefined();
      expect(labInputLabels[row.input]).toBeDefined();
      expect(row.titleZh).not.toBe("");
      expect(row.hrefZh).toBe(`/zh-cn${row.href}`);
    }
  });

  it("connects both indexes to the same canonical inventory and shared renderer", async () => {
    for (const route of ["labs", "zh-cn/labs"]) {
      const source = await readFile(
        new URL(`../../site/src/pages/${route}/index.astro`, import.meta.url),
        "utf8",
      );
      expect(source).toContain("buildLabDiscovery(siteOverview.labs.guides)");
      expect(source).toContain("<LabExplorer labs={labs}");
    }
  });

  it("rejects duplicate routes and missing discovery labels instead of dropping a guide", async () => {
    const [valid] = await canonicalGuides();
    expect(buildLabDiscovery([valid])).toHaveLength(1);
    expect(() => buildLabDiscovery([valid, valid])).toThrow(
      "Duplicate lab discovery route",
    );
    expect(() =>
      buildLabDiscovery([{ ...valid, slug: "new-unreviewed-guide" }]),
    ).toThrow("Missing reviewed mode/input labels: new-unreviewed-guide");
  });

  it("combines scientific search, mode and input with bilingual search and shareable URLs", async () => {
    const labs = buildLabDiscovery(await canonicalGuides());
    const query = parseLabQuery(
      new URLSearchParams("q=EGFR&mode=inspect&input=molecular&ignored=1"),
    );
    expect(filterLabs(labs, query).map(({ slug }) => slug)).toEqual([
      "egfr-structure-evidence",
    ]);
    expect(serializeLabQuery(query)).toBe(
      "?q=EGFR&mode=inspect&input=molecular",
    );
    const row = labs.find(({ slug }) => slug === "egfr-structure-evidence")!;
    expect(filterLabs(labs, { ...query, q: row.titleZh })).toContainEqual(row);
    expect(filterLabs(labs, { ...query, mode: "read" })).toEqual([]);
    expect(filterLabs(labs, { q: "", mode: "", input: "" })).toHaveLength(
      labs.length,
    );
    expect(serializeLabQuery({ q: "", mode: "", input: "" })).toBe("");
  });

  it("does not promote a local computation or saved-result reader to independent validation", async () => {
    expect(labModeLabels.reproduce.en).not.toMatch(/\bindependent\b/iu);
    expect(labModeLabels.reproduce.zh).not.toContain("独立");
    const guide = await readFile(
      new URL("labs/pool-budget-uncertainty-acquisition.mdx", content),
      "utf8",
    );
    expect(guide).toContain("**Mode: reading existing results.**");
    expect(labDiscovery["pool-budget-uncertainty-acquisition"].mode).toBe(
      "read",
    );
    expect(labDiscovery["pool-budget-uncertainty-acquisition"].input).toBe(
      "project-records",
    );
  });

  it("distinguishes the public-data default lipophilicity notebook from historical fixture checks", async () => {
    const guide = await readFile(
      new URL("labs/lipophilicity-notebook.mdx", content),
      "utf8",
    );
    expect(guide.replace(/\s+/gu, " ")).toContain(
      "It downloads the public `Lipophilicity.csv` table",
    );
    const notebook = JSON.parse(
      await readFile(
        new URL(
          "../../labs/lipophilicity/lipophilicity_tutorial.ipynb",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as { cells: { cell_type: string; source: string[] }[] };
    const code = notebook.cells
      .filter(({ cell_type }) => cell_type === "code")
      .map(({ source }) => source.join(""))
      .join("\n");
    expect(code).toContain('DATA_KIND = "public-MoleculeNet-lipophilicity"');
    expect(code).toContain(
      'DATA_URL = "https://deepchemdata.s3-us-west-1.amazonaws.com/datasets/Lipophilicity.csv"',
    );
    const history = await readFile(
      new URL("../../labs/lipophilicity/README.md", import.meta.url),
      "utf8",
    );
    expect(history).toContain("constructed 20-molecule fixture");
    expect(history.replace(/\s+/gu, " ")).toContain(
      "Constructed-fixture execution verifies the engineering flow, not performance on the real assay.",
    );
    expect(labDiscovery["lipophilicity-notebook"].input).toBe("public-data");
    expect(labDiscovery["lipophilicity-notebook"].qualifier.en).toContain(
      "separate engineering check",
    );
  });

  it("labels the inspector's own JSON input separately from its upstream experimental data", async () => {
    for (const slug of [
      "chembl-contract-inspection",
      "pool-budget-contract-inspection",
      "rmd17-contract-inspection",
    ] as const) {
      const guide = await readFile(
        new URL(`labs/${slug}.mdx`, content),
        "utf8",
      );
      expect(guide.replace(/\s+/gu, " ")).toContain("reads only JSON");
      expect(labDiscovery[slug].input).toBe("project-records");
    }
    const authoredGuide = await readFile(
      new URL("labs/molecule-representation-inspector.mdx", content),
      "utf8",
    );
    expect(authoredGuide.replace(/\s+/gu, " ")).toContain(
      "seven authored SMILES examples",
    );
    expect(labDiscovery["molecule-representation-inspector"].input).toBe(
      "authored",
    );
  });

  it("keeps mixed-mode and mixed-input qualifiers visible and searchable in both languages", async () => {
    for (const slug of [
      "pool-budget-campaign",
      "crossdomain-tradeoff",
      "egfr-structure-evidence",
      "generation-gate",
      "pkpd-translation-audit",
    ] as const) {
      expect(labDiscovery[slug].qualifier.en).not.toBe("");
      expect(labDiscovery[slug].qualifier.zh).not.toBe("");
    }
    const labs = buildLabDiscovery(await canonicalGuides());
    expect(
      filterLabs(labs, {
        q: "artificial scores",
        mode: "exercise",
        input: "authored",
      }).map(({ slug }) => slug),
    ).toEqual(["pool-budget-campaign"]);
    const renderer = await readFile(
      new URL("../../site/src/components/LabExplorer.astro", import.meta.url),
      "utf8",
    );
    expect(renderer).toContain("lab.qualifier[language]");
    expect(renderer).toContain("default entry mode and primary input");
  });
});
