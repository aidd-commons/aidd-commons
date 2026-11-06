import { expect, test } from "@playwright/test";

test("Chinese Atlas hydrates and preserves filters across detail and language navigation", async ({ page }) => {
  await page.goto("/zh-cn/atlas/?kind=dataset&q=FreeSolv");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { name: "科学资源图谱", exact: true })).toBeVisible();
  await expect(page.locator('[data-result-count]')).toContainText("项资源");
  const record = page.locator('[data-atlas-results] h2 a').filter({ hasText: "FreeSolv v0.52" });
  await expect(record).toBeVisible();
  const href = new URL((await record.getAttribute("href"))!, page.url());
  expect(href.pathname).toBe("/zh-cn/atlas/freesolv-v0-52/");
  expect(href.searchParams.get("kind")).toBe("dataset");
  await record.click();
  await expect(page.getByRole("heading", { name: "科学用途", exact: true })).toBeVisible();
  await expect(page.locator('[data-source-language="en"]')).toContainText("原文");
  await page.locator('[data-atlas-return]').click();
  await expect(page).toHaveURL(url => url.pathname === "/zh-cn/atlas/" && url.searchParams.get("q") === "FreeSolv");
  await page.locator('[data-language-link]').dispatchEvent("click");
  await expect(page).toHaveURL(url => url.pathname === "/atlas/" && url.searchParams.get("kind") === "dataset" && url.searchParams.get("q") === "FreeSolv");
});

test("Chinese Atlas comparison, empty and error states remain in Chinese", async ({ page }) => {
  await page.goto("/zh-cn/atlas/?compare=freesolv-v0-52,db-chembl-37");
  await expect(page.locator('[data-compare-status]')).toContainText("已比较 2 条记录");
  await expect(page.locator('[data-compare-panel] th').first()).toHaveText("主张 / 资产");
  await page.locator('[data-atlas-controls] input[name="q"]').fill("no-such-resource-localization-check");
  await expect(page.locator('[data-empty-state]')).toBeVisible();
  await expect(page.locator('[data-empty-state]')).toContainText("没有匹配");
  await page.route("**/data/atlas-index.json", route => route.abort());
  await page.reload();
  await expect(page.locator('[data-index-status]')).toContainText("交互索引未能加载");
  await expect(page.getByRole("button", { name: "重新加载检索索引" })).toBeVisible();
});

test("Chinese Audit keeps source names and numerical cells through filtering", async ({ page }) => {
  await page.goto("/zh-cn/audit/");
  await expect(page.getByRole("heading", { name: "AIDD 覆盖审计", exact: true })).toBeVisible();
  await page.getByLabel("学习方向", { exact: true }).selectOption("representations");
  await page.getByLabel("主题", { exact: true }).selectOption("t05-small-molecule-representation");
  await page.getByLabel("仅直接观察").check();
  await page.locator("[data-comparison-records] > summary").click();
  const source = page.locator('[data-provider-id="teachopencadd"][data-topic-id="t05-small-molecule-representation"]');
  await expect(source).toBeVisible();
  await source.locator("summary").click();
  await expect(source.getByRole("link", { name: "T007 Ligand-based screening — machine learning" })).toBeVisible();
  await expect(page.locator('[data-comparison-count]')).toContainText("个比较单元格");
  const map = page.locator('[data-overview-track="representations"]');
  await expect(map.locator('th[scope="col"]').first()).toHaveText("提供方");
});

test("Chinese Report and Contribute keep source downloads and local-only drafting", async ({ page }) => {
  await page.goto("/zh-cn/report/");
  await expect(page.getByRole("heading", { name: "从资源出发，形成可检查的决策。" })).toBeVisible();
  await expect(page.getByRole("link", { name: "阅读完整报告", exact: true })).toHaveAttribute("href", "/reports/aidd-commons-living-report-v0.2.html");
  await expect(page.getByRole("link", { name: "浏览图表库" })).toHaveAttribute("href", "/zh-cn/report/figures/");
  await page.goto("/zh-cn/contribute/");
  await page.getByLabel("页面、对象与版本").fill("/zh-cn/atlas/freesolv-v0-52/");
  await page.getByLabel("问题或观察").fill("许可范围如何核查？");
  await page.getByRole("button", { name: "准备 GitHub 草稿" }).click();
  await expect(page.locator('[data-draft-status]')).toContainText("草稿已在本地准备");
  const draft = new URL((await page.locator('[data-draft-link]').getAttribute("href"))!);
  expect(draft.hostname).toBe("github.com");
  expect(draft.searchParams.get("question")).toBe("许可范围如何核查？");
  expect(new URL(page.url()).pathname).toBe("/zh-cn/contribute/");
});

test("Chinese catalogue remains readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/zh-cn/atlas/browse/");
    await expect(page.getByRole("heading", { name: "浏览全部图谱记录" })).toBeVisible();
    await expect(page.locator('.atlas-results > li').first()).toBeVisible();
    await expect(page.locator('.atlas-results h2 a').first()).toHaveAttribute("href", /^\/zh-cn\/atlas\//);
  } finally { await context.close(); }
});
