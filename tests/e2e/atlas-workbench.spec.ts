import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { Resource } from "../../site/src/data/resource.js";
import { opennessDimensions } from "../../site/src/data/resource.js";
import type { ComparisonPayload } from "../../site/src/data/comparison.js";
import { filterResources, parseAtlasQuery } from "../../site/src/lib/atlas-state.js";

const resources = JSON.parse(
  await readFile("site/public/data/resources.v1.json", "utf8"),
) as Resource[];
const pair = ["model-boltz-1", "model-chai-1"];
const auditData = JSON.parse(await readFile("site/public/data/comparison.v1.json", "utf8")) as ComparisonPayload;

async function openComparisonTable(page: Page) {
  const fallback = page.locator(".atlas-comparison-fallback");
  await expect(fallback).toBeVisible();
  if (!(await fallback.evaluate((node) => (node as HTMLDetailsElement).open)))
    await fallback.locator(":scope > summary").click();
}

test("the early numeric heatmap drills into the same filtered population", async ({ page }) => {
  const query = new URLSearchParams("q=protein&kind=model");
  const population = filterResources(resources, parseAtlasQuery(query));
  await page.goto(`/atlas/?${query}`);
  await expect(page.locator("[data-scope-population]")).toHaveText(`${population.length} matching records`);
  const count = page.locator("[data-atlas-overview] [data-scope-stage]").first();
  await expect(count).toBeVisible();
  const stage = (await count.getAttribute("data-scope-stage"))!;
  const kind = (await count.getAttribute("data-scope-kind"))!;
  const expected = population.filter(resource => resource.kind === kind && resource.stages.includes(stage));
  await expect(count).toHaveText(String(expected.length));
  await count.click();
  await expect(page.locator("[data-result-count]")).toHaveText(`${expected.length} of ${resources.length} resources`);
  expect(new URL(page.url()).searchParams.get("q")).toBe("protein");
  expect(new URL(page.url()).searchParams.get("stage")).toBe(stage);
  const offeredStages = await page.locator("[data-atlas-overview] [data-scope-stage]").evaluateAll(buttons => [...new Set(buttons.map(button => button.getAttribute("data-scope-stage")))]);
  expect(offeredStages).toEqual([stage]);
  const downloadEvent = page.waitForEvent("download");
  await page.locator("[data-atlas-export]").click();
  const exported = JSON.parse(await readFile((await (await downloadEvent).path())!, "utf8"));
  expect(exported.map(({ id }: { id: string }) => id).sort()).toEqual(expected.map(({ id }) => id).sort());
});

test("a single-kind heatmap count remains clickable after inspecting evidence at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`/atlas/?q=protein&kind=model&compare=${pair.join(",")}`);
  const evidence = page.locator('[data-inspect-asset="model-chai-1:training_code"]');
  await evidence.click();
  await expect(evidence).toHaveAttribute("aria-pressed", "true");
  const count = page.locator("[data-atlas-overview] [data-scope-stage]").first();
  const stage = await count.getAttribute("data-scope-stage");
  await count.click();
  expect(new URL(page.url()).searchParams.get("stage")).toBe(stage);
  await expect(page.locator("[data-result-count]")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("compact asset profiles select their own claim evidence before the full table", async ({ page }) => {
  await page.goto(`/atlas/?compare=${pair.join(",")}`);
  await expect(page.locator("[data-inspect-asset]")).toHaveCount(pair.length * opennessDimensions.length);
  await expect(page.locator(".atlas-comparison-fallback")).not.toHaveAttribute("open");
  const record = resources.find(resource => resource.id === pair[1])!;
  const dimension = "training_code";
  const selected = page.locator(`[data-inspect-asset="${record.id}:${dimension}"]`);
  await selected.click();
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  const inspector = page.getByRole("region", { name: "Selected asset evidence", exact: true });
  await expect(inspector).toContainText(record.name);
  await expect(inspector).toContainText(record.last_verified);
  const expected = record.evidence.filter(source => record.openness[dimension].evidence?.includes(source.id)).map(source => source.url).sort();
  expect(await inspector.locator(".atlas-cell-sources a").evaluateAll(links => links.map(link => link.getAttribute("href")).sort())).toEqual(expected);
  if (!expected.length) await expect(inspector).toContainText("No direct evidence recorded.");
});

test("audit interval panels retain each named provider's actual pair and selected source", async ({ page }) => {
  await page.goto("/audit/");
  const thresholds = [...new Set(auditData.summaries.map(row => row.threshold))];
  for (const threshold of thresholds) {
    await page.locator(`[data-bounds-threshold="${threshold}"]`).click();
    const panel = page.locator(`[data-bounds-panel="${threshold}"]`);
    await expect(panel).toBeVisible();
    await expect(panel.locator("[data-bounds-provider]")).toHaveCount(auditData.providers.length);
    for (const provider of auditData.providers) {
      const row = auditData.summaries.find(row => row.threshold === threshold && row.provider_id === provider.id)!;
      const interval = panel.locator(`[data-bounds-provider="${provider.id}"]`);
      await expect(interval).toHaveAttribute("data-bounds-lower", String(row.lower));
      await expect(interval).toHaveAttribute("data-bounds-upper", String(row.upper));
    }
  }
  const expectedCell = auditData.rows.find(row => row.track_id === "foundations" && row.coverage_origin === "direct" && row.evidence.length > 0)!;
  expect(expectedCell).toBeDefined();
  const mark = page.locator(`[data-overview-cell="${expectedCell.provider_id}:${expectedCell.topic_id}"] [data-comparison-focus]`);
  await mark.click();
  const inspector = page.locator("[data-comparison-inspector]");
  await expect(inspector).toBeVisible();
  await expect(inspector.locator("h4")).toHaveText(expectedCell.topic_title);
  await expect(inspector).toContainText(expectedCell.provider_name);
  await expect(inspector.locator("details")).toContainText(expectedCell.reviewed_scope);
  await expect(inspector.locator("details")).toContainText(expectedCell.note);
  const expectedLinks = expectedCell.evidence.filter(source => source.source_type === "url").map(source => source.url).sort();
  expect(await inspector.locator("details a").evaluateAll(links => links.map(link => link.getAttribute("href")).sort())).toEqual(expectedLinks);
  await expect(inspector.locator("details")).toHaveAttribute("open");
  await expect(mark).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-comparison-records]")).not.toHaveAttribute("open");
  const unknownCell = auditData.rows.find(row => row.track_id === "foundations" && row.coverage_origin === "default")!;
  expect(unknownCell).toBeDefined();
  await page.locator(`[data-overview-cell="${unknownCell.provider_id}:${unknownCell.topic_id}"] [data-comparison-focus]`).click();
  await expect(inspector.locator("h4")).toHaveText(unknownCell.topic_title);
  await expect(inspector).toContainText(unknownCell.provider_name);
  await expect(inspector).toContainText("No topic-specific source was encoded in this dated review.");
});

test("pagination keeps comparison selections across pages, refresh and Back while exporting every match", async ({
  page,
}) => {
  await page.goto("/atlas/?sort=name");
  const navigation = page.locator('[data-pagination-position="top"]');
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(24);
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing 1–24 of ${resources.length} matching resources`,
  );
  const first = page.locator("[data-atlas-results] [data-compare-id]").first();
  const firstId = (await first.getAttribute("data-compare-id"))!;
  await first.check();
  await navigation
    .getByRole("button", { name: "Next result page", exact: true })
    .click();
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing 25–48 of ${resources.length} matching resources`,
  );
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  expect(new URL(page.url()).searchParams.get("compare")).toBe(firstId);
  await page.goBack();
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing 1–24 of ${resources.length} matching resources`,
  );
  await expect(
    page.locator(`[data-atlas-results] [data-compare-id="${firstId}"]`),
  ).toBeChecked();
  await page.goForward();
  await expect(navigation.locator("[data-atlas-page-select]")).toHaveValue("2");
  const second = page.locator("[data-atlas-results] [data-compare-id]").first();
  const secondId = (await second.getAttribute("data-compare-id"))!;
  expect(secondId).not.toBe(firstId);
  await second.check();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "table", exact: true }).click();
  await expect(
    page.locator("[data-atlas-table] tbody [data-resource-id]"),
  ).toHaveCount(24);
  await page.reload();
  await expect(navigation.locator("[data-atlas-page-select]")).toHaveValue("2");
  await expect(
    page.locator(`[data-atlas-table] [data-compare-id="${secondId}"]`),
  ).toBeChecked();
  await expect(page.locator("[data-compare-tray] > li")).toHaveCount(2);
  await page.getByRole("button", { name: "landscape", exact: true }).click();
  await expect(page.locator("[data-atlas-landscape]")).toContainText(
    `Stage × resource kind for the ${resources.length} matching records.`,
  );
  await expect(page.locator("[data-atlas-pagination]:visible")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  await page.getByRole("button", { name: "table", exact: true }).click();
  await expect(navigation.locator("[data-atlas-page-select]")).toHaveValue("2");
  await expect(
    page.locator("[data-atlas-table] tbody [data-resource-id]"),
  ).toHaveCount(24);
  const downloadEvent = page.waitForEvent("download");
  await page.locator("[data-atlas-export]").click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.map(({ id }: { id: string }) => id).sort()).toEqual(
    resources.map(({ id }) => id).sort(),
  );
  await navigation.locator("[data-atlas-page-select]").selectOption("3");
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing 49–72 of ${resources.length} matching resources`,
  );
  await page.goBack();
  await expect(navigation.locator("[data-atlas-page-select]")).toHaveValue("2");
  await expect(page.locator("[data-compare-tray] > li")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("Boltz");
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    "Showing 1–4 of 4 matching resources",
  );
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(page.locator("[data-result-count]")).toHaveText(
    `4 of ${resources.length} resources`,
  );
  await expect(page.locator("[data-compare-tray] > li")).toHaveCount(2);
  await page.getByRole("button", { name: "landscape", exact: true }).click();
  await expect(page.locator("[data-atlas-pagination]:visible")).toHaveCount(0);
  await expect(page.locator("[data-atlas-landscape]")).toContainText(
    "Stage × resource kind for the 4 matching records.",
  );
});

test("shared page values clamp to the last real page and invalid or empty results return to page one", async ({
  page,
}) => {
  const lastPage = Math.ceil(resources.length / 24);
  await page.goto("/atlas/?view=table&page=999");
  const navigation = page.locator('[data-pagination-position="top"]');
  await expect(navigation.locator("[data-atlas-page-select]")).toHaveValue(
    String(lastPage),
  );
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing ${(lastPage - 1) * 24 + 1}–${resources.length} of ${resources.length} matching resources`,
  );
  await expect(
    page.locator("[data-atlas-table] tbody [data-resource-id]"),
  ).toHaveCount(resources.length - (lastPage - 1) * 24);
  await expect(
    navigation.getByRole("button", { name: "Next result page", exact: true }),
  ).toBeDisabled();
  expect(new URL(page.url()).searchParams.get("page")).toBe(String(lastPage));
  await page.goto("/atlas/?page=2.5");
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(24);
  await expect(navigation.locator("[data-page-range]")).toHaveText(
    `Showing 1–24 of ${resources.length} matching resources`,
  );
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await page.goto("/atlas/?q=no-resource-has-this-identifier-xyz&page=5");
  await expect(page.locator("[data-empty-state]")).toBeVisible();
  await expect(page.locator("[data-atlas-pagination]:visible")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
});

test("Atlas keeps the initial HTML compact and loads evidence only for requested comparisons", async ({
  page,
  request,
}) => {
  const response = await request.get("/atlas/");
  const html = await response.text();
  expect(Buffer.byteLength(html)).toBeLessThanOrEqual(300_000);
  expect(html).not.toContain("data-resources=");
  expect(html.match(/data-resource-id=/gu)).toHaveLength(12);
  const detailRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/data\/resources\/[^/]+\.json$/u.test(request.url()))
      detailRequests.push(request.url());
  });
  await page.goto("/atlas/?q=Boltz");
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("[data-result-count]")).toHaveText(/4 of/);
  expect(detailRequests).toEqual([]);
  const displayedIds = await page
    .locator("[data-atlas-results] [data-resource-id]")
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-resource-id")).sort(),
    );
  const downloadEvent = page.waitForEvent("download");
  await page.locator("[data-atlas-export]").click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.map(({ id }: { id: string }) => id).sort()).toEqual(
    displayedIds,
  );
  for (const entry of exported) {
    const original = resources.find(({ id }) => id === entry.id)!;
    expect(entry.last_verified).toBe(original.last_verified);
    expect(entry.licenses).toEqual(
      original.licenses.map(({ name, scope }) => ({ name, scope })),
    );
  }
  await page.getByLabel("Compare Boltz-1", { exact: true }).check();
  await page.getByLabel("Compare Boltz-2", { exact: true }).check();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  expect(detailRequests).toHaveLength(2);
});

test("comparison preserves seven independent source-linked states, scoped licences and original dates", async ({
  page,
}) => {
  await page.goto(`/atlas/?compare=${pair.join(",")}`);
  await openComparisonTable(page);
  const comparison = page.getByRole("region", {
    name: "Selected resource comparison",
    exact: true,
  });
  await expect(comparison).toBeVisible();
  await expect(comparison.locator("[data-dimension]")).toHaveCount(7);
  for (const id of pair) {
    const record = resources.find((resource) => resource.id === id)!;
    const heading = comparison.locator("thead th").filter({
      has: page.getByRole("link", { name: record.name, exact: true }),
    });
    await expect(heading).toHaveCount(1);
    await expect(heading.locator("time")).toHaveAttribute("datetime", record.last_verified);
    const destination = new URL((await heading.locator("a").getAttribute("href"))!, page.url());
    expect(destination.pathname).toBe(`/atlas/${id}/`);
    expect(destination.searchParams.get("compare")?.split(",").sort()).toEqual([...pair].sort());
    for (const dimension of opennessDimensions) {
      const cell = comparison.locator(
        `[data-dimension="${dimension}"] [data-comparison-resource="${id}"]`,
      );
      await expect(cell).toHaveAttribute(
        "data-asset-state",
        record.openness[dimension].value,
      );
      const expected = record.evidence
        .filter(({ id: evidenceId }) =>
          record.openness[dimension].evidence?.includes(evidenceId),
        )
        .map(({ url }) => url)
        .sort();
      const links = await cell
        .locator("a")
        .evaluateAll((anchors) =>
          anchors.map((anchor) => anchor.getAttribute("href")).sort(),
        );
      expect(links).toEqual(expected);
    }
    for (const license of record.licenses)
      await expect(
        comparison
          .locator(`[data-comparison-resource="${id}"]`)
          .filter({ hasText: `${license.name} (${license.scope})` })
          .first(),
      ).toBeVisible();
  }
});

test("views, sort and selection survive refresh and browser Back, including a landscape drilldown", async ({
  page,
}) => {
  await page.goto(
    `/atlas/?q=Boltz&view=table&sort=checked&compare=${pair.join(",")}`,
  );
  await expect(
    page.getByRole("region", { name: "Resource results table", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-atlas-sort]")).toHaveValue("checked");
  await page.reload();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "landscape", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Resource landscape table", exact: true }),
  ).toBeVisible();
  const cell = page.locator("[data-landscape-stage]").first();
  const stage = await cell.getAttribute("data-landscape-stage");
  const kind = await cell.getAttribute("data-landscape-kind");
  await cell.click();
  await expect(
    page.getByRole("button", { name: "list", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.get("stage")).toBe(stage);
  expect(new URL(page.url()).searchParams.get("kind")).toBe(kind);
  expect(new URL(page.url()).searchParams.get("compare")).toBe(pair.join(","));
  await page.goBack();
  await expect(
    page.getByRole("region", { name: "Resource landscape table", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("region", { name: "Resource results table", exact: true }),
  ).toBeVisible();
});

test("four-record selection limit is explicit and selected records can always be removed", async ({
  page,
}) => {
  const selected = [...pair, "model-boltz-2", "model-openfold"];
  await page.goto(`/atlas/?q=Boltz&compare=${selected.join(",")}`);
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Compare BoltzGen", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Compare Boltz-1", { exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Remove Chai-1 from comparison", exact: true })
    .click();
  await expect(
    page.getByLabel("Compare BoltzGen", { exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Compare BoltzGen", { exact: true }).check();
  expect(
    new URL(page.url()).searchParams.get("compare")?.split(","),
  ).toHaveLength(4);
});

test("unavailable index and detail inputs preserve navigation and offer a working retry", async ({
  page,
}) => {
  await page.route("**/data/atlas-index.json", (route) => route.abort());
  await page.goto("/atlas/");
  await expect(page.locator("[data-index-status]")).toContainText(
    "could not load",
  );
  await expect(
    page.getByRole("link", {
      name: "Browse all records without JavaScript",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(12);
  await page.unroute("**/data/atlas-index.json");
  await page
    .getByRole("button", {
      name: "Retry loading the search index",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toBeEnabled();
  await page.route(`**/data/resources/${pair[1]}.json`, (route) =>
    route.abort(),
  );
  await page.goto(`/atlas/?compare=${pair.join(",")}`);
  await expect(page.locator("[data-compare-status]")).toContainText(
    "could not load",
  );
  await page.unroute(`**/data/resources/${pair[1]}.json`);
  await page
    .getByRole("button", { name: "Retry comparison", exact: true })
    .click();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/atlas/?compare=missing-record,model-boltz-1");
  await expect(page.locator("[data-compare-status]")).toContainText(
    "Not in this catalogue: missing-record",
  );
});

test("resource detail launches a real pair comparison through its native form", async ({
  page,
}) => {
  await page.goto(`/atlas/${pair[0]}/`);
  const form = page.locator(".resource-comparison-entry form");
  await form.locator("select").selectOption(pair[1]);
  await form
    .getByRole("button", { name: "Compare resource evidence", exact: true })
    .click();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.getAll("compare")).toEqual(pair);
});

test("malformed index and mismatched detail payloads produce diagnostics rather than accepted comparisons", async ({
  page,
}) => {
  await page.route("**/data/atlas-index.json", (route) =>
    route.fulfill({ json: [resources[0], resources[0]] }),
  );
  await page.goto("/atlas/");
  await expect(page.locator("[data-index-status]")).toContainText(
    "could not load",
  );
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/data/atlas-index.json");
  await page.route(`**/data/resources/${pair[1]}.json`, (route) =>
    route.fulfill({ json: resources.find(({ id }) => id === pair[0]) }),
  );
  await page.goto(`/atlas/?compare=${pair.join(",")}`);
  await expect(page.locator("[data-compare-status]")).toContainText(
    "could not load",
  );
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.unroute(`**/data/resources/${pair[1]}.json`);
  const malformed = structuredClone(
    resources.find(({ id }) => id === pair[1])!,
  );
  malformed.openness.training_code.value = "open";
  await page.route(`**/data/resources/${pair[1]}.json`, (route) =>
    route.fulfill({ json: malformed }),
  );
  await page
    .getByRole("button", { name: "Retry comparison", exact: true })
    .click();
  await expect(page.locator("[data-compare-status]")).toContainText(
    "could not load",
  );
  await page.unroute(`**/data/resources/${pair[1]}.json`);
  await page
    .getByRole("button", { name: "Retry comparison", exact: true })
    .click();
  await openComparisonTable(page);
  await expect(
    page.getByRole("region", {
      name: "Selected resource comparison",
      exact: true,
    }),
  ).toBeVisible();
});

test("comparison and landscape keep accessible tables with no document overflow in both themes", async ({
  page,
}, testInfo) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`/atlas/?q=Boltz&view=landscape&compare=${pair.join(",")}`);
    await openComparisonTable(page);
    await expect(
      page.getByRole("region", {
        name: "Selected resource comparison",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", {
        name: "Resource landscape table",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .exclude("astro-dev-toolbar")
      .analyze();
    expect(
      audit.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
    await page.locator("#compare-title").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`atlas-comparison-${theme}.png`),
      fullPage: false,
    });
  }
});
