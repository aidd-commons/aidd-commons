import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { opennessDimensions, type Resource } from "../../site/src/data/resource.js";
import { assetLabels } from "../../site/src/lib/atlas-presentation.js";
import { labDiscovery } from "../../site/src/lib/lab-discovery.js";

const resources = JSON.parse(
  await readFile("site/public/data/resources.v1.json", "utf8"),
) as Resource[];
const guides = Object.keys(labDiscovery).sort();
const freeSolv = resources.find(({ id }) => id === "freesolv-v0-52")!;
const scopedResource = resources.find(({ id }) => id === "tool-rdkit")!;

test("Atlas shared filters can be removed by keyboard and fully cleared", async ({
  page,
}) => {
  const query = new URLSearchParams({
    q: scopedResource.id,
    stage: scopedResource.stages[0],
    kind: scopedResource.kind,
    access: scopedResource.access_level.value,
    lifecycle: scopedResource.status.value,
  });
  await page.goto(`/atlas/?${query}`);
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(1);
  await expect(page.locator("[data-active-filters] button")).toHaveCount(5);
  await page.reload();
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(1);
  await expect(page.locator("[data-active-filters] button")).toHaveCount(5);
  await expect(
    page.getByRole("combobox", { name: "Stage", exact: true }),
  ).toHaveValue(scopedResource.stages[0]);
  const remove = page.getByRole("button", { name: /^Remove stage:/ });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-active-filters] button")).toHaveCount(4);
  await expect(
    page.getByRole("combobox", { name: "Stage", exact: true }),
  ).toBeFocused();
  expect(new URL(page.url()).searchParams.has("stage")).toBe(false);
  await expect(page.locator("[data-share-query]")).toHaveAttribute(
    "href",
    /q=tool-rdkit/,
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.locator("[data-atlas-results] [data-resource-id]"),
  ).toHaveCount(24);
  await expect(
    page.locator('[data-pagination-position="top"] [data-page-range]'),
  ).toHaveText(`Showing 1–24 of ${resources.length} matching resources`);
  await expect(page.locator("[data-result-count]")).toHaveText(
    `${resources.length} of ${resources.length} resources`,
  );
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toHaveValue("");
  await expect(page.locator("[data-active-filters]")).toHaveText(
    "No active filters",
  );
  expect(new URL(page.url()).search).toBe("");
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("no-resource-has-this-identifier-xyz");
  await expect(page.locator("[data-empty-state]")).toBeVisible();
  await expect(page.locator("[data-result-count]")).toHaveText(
    `0 of ${resources.length} resources`,
  );
});

test("Atlas identifier search retains scoped row claims and working source links", async ({
  page,
}) => {
  const identifier = freeSolv.identifiers[0].value;
  await page.goto(`/atlas/?q=${encodeURIComponent(identifier)}`);
  const row = page.locator(`[data-resource-id="${freeSolv.id}"]`);
  await expect(row).toBeVisible();
  await expect(row.locator("time")).toHaveAttribute(
    "datetime",
    freeSolv.last_verified,
  );
  await expect(
    row.getByText("No verified licence claim", { exact: true }),
  ).toBeVisible();
  for (const [link, fragment] of [
    [row.getByRole("link", { name: /recorded sources/ }), "#evidence-title"],
    [row.getByRole("link", { name: "7 asset dimensions" }), "#openness-title"],
  ] as const) {
    await expect(link).toBeVisible();
    const destination = new URL((await link.getAttribute("href"))!, page.url());
    expect(destination.pathname).toBe(`/atlas/${freeSolv.id}/`);
    expect(destination.hash).toBe(fragment);
    expect(destination.searchParams.get("q")).toBe(identifier);
  }
  await expect(
    row.getByRole("link", { name: "Visit resource", exact: true }),
  ).toHaveAttribute("href", freeSolv.canonical_url);
});

test("resource detail orders purpose, evidence, reuse and reading without dropping registered URLs", async ({
  page,
}) => {
  await page.goto(`/atlas/${freeSolv.id}/`);
  const order = await page
    .locator(
      "#purpose-title, #claim-context-title, #evidence-title, #reuse-title, #reading-title",
    )
    .evaluateAll((elements) => elements.map(({ id }) => id));
  expect(order).toEqual([
    "purpose-title",
    "claim-context-title",
    "evidence-title",
    "reuse-title",
    "reading-title",
  ]);
  const matrix = page.getByRole("region", {
    name: "Openness matrix",
    exact: true,
  });
  await expect(matrix.locator("thead th")).toHaveCount(3);
  await expect(matrix.locator("tbody tr")).toHaveCount(opennessDimensions.length);
  await expect(matrix.locator("tbody th")).toHaveCount(opennessDimensions.length);
  for (const [index, dimension] of opennessDimensions.entries()) {
    const dimensionRow = matrix.locator("tbody tr").nth(index);
    await expect(dimensionRow.locator("th")).toHaveText(assetLabels[dimension]);
    await expect(dimensionRow.locator("td")).toHaveCount(2);
    await expect(dimensionRow.locator("td").first()).toHaveClass(
      new RegExp(`openness-state-${freeSolv.openness[dimension].value}`),
    );
    const expectedSources = freeSolv.evidence
      .filter(({ id }) => freeSolv.openness[dimension].evidence?.includes(id))
      .map(({ url }) => url).sort();
    const actualSources = await dimensionRow.locator("td").last().locator("a")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).sort());
    expect(actualSources, dimension).toEqual(expectedSources);
  }
  await expect(
    page.getByText("No licence claim is currently verified.", { exact: true }),
  ).toBeVisible();
  for (const caveat of freeSolv.caveats)
    await expect(
      page.locator('section[aria-labelledby="caveats-title"]'),
    ).toContainText(caveat);
  const links = await page
    .getByRole("region", { name: "Resource links", exact: true })
    .locator("a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href")),
    );
  const expected = [
    ...new Set([
      freeSolv.canonical_url,
      ...freeSolv.identifiers.flatMap(({ url }) => (url ? [url] : [])),
      ...freeSolv.evidence.map(({ url }) => url),
    ]),
  ];
  expect(links.sort()).toEqual(expected.sort());
  await page.goto("/atlas/db-open-targets-platform/");
  await expect(
    page.locator(
      '[data-resource-learning] a[href="/learn/mechanism-targets/target-resource-guide/"]',
    ),
  ).toBeVisible();
});

test("lab editions share one complete unique route inventory", async ({
  page,
}) => {
  for (const prefix of ["", "/zh-cn"]) {
    await page.goto(`${prefix}/labs/`);
    const rows = page.locator("[data-lab-id]");
    expect(
      (
        await rows.evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-lab-id")),
        )
      ).sort(),
    ).toEqual(guides);
    const links = await rows
      .locator("h3 a")
      .evaluateAll((items) => items.map((item) => item.getAttribute("href")));
    expect(links.every((href) => href?.startsWith(`${prefix}/labs/`))).toBe(
      true,
    );
    expect(new Set(links).size).toBe(guides.length);
    await expect(page.locator(".lab-start__list li")).toHaveCount(4);
    await expect(
      page.locator(
        `.lab-start__list a[href="${prefix}/learn/scientific-agents/agent-resource-guide/"]`,
      ),
    ).toBeVisible();
  }
});

test("lab filters survive a language change, reset completely, and expose an empty state", async ({
  page,
}, testInfo) => {
  await page.goto("/labs/?q=EGFR&mode=inspect&input=molecular");
  await expect(page.locator("[data-lab-id]")).toHaveCount(1);
  await expect(
    page.locator('[data-lab-id="egfr-structure-evidence"]'),
  ).toBeVisible();
  await page
    .locator("lab-explorer")
    .screenshot({ path: testInfo.outputPath("labs-filtered-en.png") });
  await page.locator("[data-lab-language]").click();
  await expect(page).toHaveURL(
    /\/zh-cn\/labs\/\?q=EGFR&mode=inspect&input=molecular/,
  );
  await expect(page.locator("[data-lab-id]")).toHaveCount(1);
  await expect(
    page.getByRole("combobox", { name: "执行模式", exact: true }),
  ).toHaveValue("inspect");
  await page.reload();
  await expect(page.locator("[data-lab-id]")).toHaveCount(1);
  await page
    .locator("lab-explorer")
    .screenshot({ path: testInfo.outputPath("labs-filtered-zh.png") });
  await page.getByRole("button", { name: "清空筛选", exact: true }).click();
  await expect(page.locator("[data-lab-id]")).toHaveCount(guides.length);
  expect(new URL(page.url()).search).toBe("");
  await page
    .getByRole("searchbox", { name: "搜索", exact: true })
    .fill("no-lab-has-this-question-xyz");
  await expect(page.locator("[data-lab-empty]")).toBeVisible();
  await expect(page.locator("[data-lab-count]")).toHaveText(
    `0 / ${guides.length} 项实验指南`,
  );
});

test("catalogue and lab entry points remain available without JavaScript", async ({
  browser,
  baseURL,
  request,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  try {
    await page.goto("/atlas/");
    await expect(
      page.locator("[data-atlas-results] [data-resource-id]"),
    ).toHaveCount(12);
    await page
      .getByRole("link", {
        name: "Browse all records without JavaScript",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/atlas\/browse\/$/);
    await expect(
      page.getByRole("link", { name: "Visit resource", exact: true }),
    ).toHaveCount(resources.length);
    const canonicalLinks = await page
      .getByRole("link", { name: "Visit resource", exact: true })
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(canonicalLinks.sort()).toEqual(
      resources.map(({ canonical_url }) => canonical_url).sort(),
    );
    for (const [name, file] of [
      ["Catalogue JSON", "resources.v1.json"],
      ["Catalogue CSV", "resources.v1.csv"],
      ["Asset states JSON", "openness.v1.json"],
    ]) {
      await expect(
        page.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", `/data/${file}`);
      const response = await request.get(`/data/${file}`);
      expect(response.status(), file).toBe(200);
      expect(await response.text(), file).toBe(
        await readFile(`site/public/data/${file}`, "utf8"),
      );
    }
    await page.goto("/labs/");
    await expect(page.locator("[data-lab-id]")).toHaveCount(guides.length);
  } finally {
    await context.close();
  }
});

test("Atlas and lab discovery remain readable and accessible in both themes", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const route of [
      "/atlas/?q=FreeSolv",
      "/atlas/freesolv-v0-52/",
      "/labs/?mode=exercise",
      "/zh-cn/labs/?mode=exercise",
    ]) {
      await page.goto(route);
      const heading = route.startsWith("/atlas/freesolv")
        ? "FreeSolv v0.52"
        : route.startsWith("/atlas/")
          ? "Scientific Atlas"
          : route.startsWith("/zh-cn/")
            ? "实验室"
            : "Labs";
      await expect(
        page.getByRole("heading", { level: 1, name: heading, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} ${theme}`,
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .exclude("astro-dev-toolbar")
        .analyze();
      expect(
        audit.violations.filter(
          ({ impact }) => impact === "serious" || impact === "critical",
        ),
        `${route} ${theme}`,
      ).toEqual([]);
      const label = route.startsWith("/atlas/freesolv")
        ? "resource"
        : route.startsWith("/atlas/")
          ? "atlas"
          : route.startsWith("/zh-cn/")
            ? "labs-zh"
            : "labs-en";
      await page.screenshot({
        path: testInfo.outputPath(`${label}-${theme}.png`),
        fullPage: false,
      });
    }
  }
});
