import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

async function read(relativePath: string) {
  return readFile(join(repositoryRoot, relativePath), "utf8");
}

describe("comparison audit page", () => {
  it("makes the external freeze and separate current product review visible", async () => {
    const page = await read("site/src/pages/audit/index.astro");
    expect(page).toContain("data-comparison-date-boundary");
    expect(page).toContain("comparison.external_survey_frozen_on");
    expect(page).toContain("CURRENT_RESOURCE_COMPARISON.md");
    expect(page).toContain("without rescoring this matrix");
  });

  it("publishes bounded coverage without collapsing it into an overall score", async () => {
    const [page, bounds, matrix] = await Promise.all([
      read("site/src/pages/audit/index.astro"),
      read("site/src/components/CoverageBounds.astro"),
      read("site/src/components/ComparisonMatrix.astro"),
    ]);
    const surface = [page, bounds, matrix].join("\n");

    expect(surface).toContain("Lower bound");
    expect(surface).toContain("Upper bound");
    expect(surface).toContain("not established");
    expect(surface).not.toMatch(/overall score/iu);
  });

  it("keeps bilingual filters, cell state, and evidence available to assistive technology", async () => {
    const matrix = await read("site/src/components/ComparisonMatrix.astro");
    expect(matrix).not.toMatch(/onmouseover|onmouseenter/iu);
    for (const [route, chinese] of [["audit", false], ["zh-cn/audit", true]] as const) {
      const html = await read(`site/dist/${route}/index.html`);
      const comparison = html.match(/<comparison-audit\b[^>]*>[\s\S]*?<\/comparison-audit>/u)?.[0];
      expect(comparison, route).toBeDefined();
      expect(comparison).toContain("<table");
      expect(comparison).toContain("<details");
      expect(comparison).toMatch(new RegExp(`data-column="evidence"[^>]*data-label="${chinese ? "证据" : "Evidence"}"`, "u"));
      expect(comparison).toContain(chinese ? "仅直接观察" : "Direct observations only");
      for (const [id, english, translated, tag] of [
        ["comparison-track", "Track", "学习方向", "select"],
        ["comparison-topic", "Topic", "主题", "select"],
        ["comparison-provider-class", "Provider class", "提供方类型", "select"],
        ["comparison-depth", "Coverage depth", "覆盖深度", "select"],
        ["comparison-access", "Content access", "内容访问", "select"],
        ["comparison-language", "Language", "语言", "select"],
        ["comparison-review-after", "Reviewed on or after", "审阅日期不早于", "input"],
      ]) {
        expect(comparison, `${route} ${id}: associated label`).toMatch(
          new RegExp(`<label\\b[^>]*for="${id}"[^>]*>\\s*${chinese ? translated : english}\\s*</label>`, "u"),
        );
        expect(comparison, `${route} ${id}: labelled control`).toMatch(
          new RegExp(`<${tag}\\b[^>]*id="${id}"`, "u"),
        );
      }
    }
  });

  it("distinguishes confirmed gaps from topics requiring self-audit", async () => {
    const page = await read("site/src/pages/audit/index.astro");

    expect(page).toContain("Confirmed depth gaps");
    expect(page).toContain("Self-audit needed");
    expect(page).toContain("must not be interpreted as a confirmed deficiency");
    // With no confirmed gap the section must say so rather than render an empty
    // list, and must not read as a claim that unverified topics are covered.
    // Match the whole rendered sentence inside its own conditional block, not
    // disjoint substrings that could each appear somewhere unrelated.
    const emptyStateBranch = page.match(
      /comparison\.gaps\.candidates\.length === 0\s*\?\s*\([\s\S]*?\)\s*:\s*\(/u,
    )?.[0];
    expect(emptyStateBranch).toBeDefined();
    const emptyStateBlock = emptyStateBranch?.match(/<p\b[^>]*data-gap-empty[^>]*>[\s\S]*?<\/p>/u)?.[0];
    expect(emptyStateBlock).toBeDefined();
    expect(emptyStateBranch).not.toContain("<ol");
    const normalized = emptyStateBlock?.replace(/\s+/gu, " ");
    expect(normalized).toContain(
      "No evidence-backed depth gap is identified in the current records. This count moves only with a new review or new teaching material, and it says nothing about topics still recorded as unverified.",
    );
    expect(normalized).toContain(
      "当前记录未识别出有证据支持的深度缺口。计数仅随新评阅或新教学材料改变，不说明仍标为未核实的主题。",
    );
  });

  it("distinguishes the frozen selection contract from live delivery", async () => {
    const page = await read("site/src/pages/audit/index.astro");

    expect(page).toContain("Frozen v0.2b depth candidates");
    expect(page).toContain("Independent unit");
    expect(page).toContain("Cheap baseline");
    expect(page).toContain(
      "implementation status and result note describe current delivery",
    );
  });

  it("links the matching-language audit from both site navigation systems", async () => {
    for (const [prefix, label] of [["", "Audit"], ["zh-cn/", "审计"]]) {
      for (const route of [`${prefix}index.html`, `${prefix}learn/foundations/getting-started/index.html`]) {
        const document = await read(`site/dist/${route}`);
        const navigation = [...document.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/gu)]
          .map((match) => match[0])
          .join("\n");
        expect(navigation, route).toMatch(
          new RegExp(`<a\\b[^>]*href="/${prefix}audit/"[^>]*>[\\s\\S]*?${label}[\\s\\S]*?</a>`, "u"),
        );
      }
    }
  });
});
