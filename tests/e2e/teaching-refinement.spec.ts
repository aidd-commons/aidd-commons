import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const tracks = (parse(readFileSync("catalog/curriculum/tracks.yaml", "utf8")).tracks as { id: string }[]).map(track => track.id);

for (const track of tracks) {
  test(`refined teaching view ${track}`, async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes("mobile");
    await page.emulateMedia({ colorScheme: mobile ? "dark" : "light", reducedMotion: "reduce" });
    await page.goto(`/${mobile ? "zh-cn/" : ""}learn/tracks/${track}/`);
    const view = page.locator(`[data-teaching-view="${track}"]`);
    await expect(view).toBeVisible();
    await view.scrollIntoViewIfNeeded();
    await expect(view.locator(".teaching-view__sources a").first()).toBeVisible();
    const context = view.locator(".teaching-context-disclosure");
    if (await context.count()) {
      await expect(context).not.toHaveAttribute("open", "");
      const primary = view.locator(".teaching-view__visual > :first-child");
      expect(await primary.evaluate(node => node.classList.contains("teaching-context-disclosure"))).toBe(false);
      await context.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(context.locator("ol")).toBeVisible();
      await page.keyboard.press("Enter");
    }
    const selector = view.locator("[data-panel-select]");
    if (await selector.count()) {
      const values = await selector.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
      for (const value of values) {
        await selector.selectOption(value);
        await expect(view.locator(`[data-teaching-panel="${value}"]`)).toBeVisible();
      }
      await selector.selectOption(values[0]);
    }
    const width = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(width.actual).toBeLessThanOrEqual(width.viewport + 1);
    const audit = await new AxeBuilder({ page }).include(`[data-teaching-view="${track}"]`).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    if (!mobile) {
      await view.locator("img").evaluateAll(async images => { await Promise.all(images.map(image => { (image as HTMLImageElement).loading = "eager"; return (image as HTMLImageElement).decode().catch(() => undefined); })); });
      await view.screenshot({ path: testInfo.outputPath(`${track}.png`), style: ".skip-link:not(:focus) { visibility: hidden !important; } astro-dev-toolbar { display:none !important; }" });
    }
  });
}

test("plot filters, table and CSV share exact displayed source rows", async ({ page }, testInfo) => {
  const prefix = testInfo.project.name.includes("mobile") ? "/zh-cn" : "";
  for (const track of ["drug-discovery-foundations", "machine-learning", "admet-pk", "molecular-generation", "active-learning"]) {
    await page.goto(`${prefix}/learn/tracks/${track}/`);
    const plot = page.locator("[data-science-plot]:visible").first();
    const toggles = plot.locator("[data-series-toggle]");
    await expect(toggles.first()).toBeEnabled();
    const points = await plot.locator("[data-x]").evaluateAll(nodes => nodes.map(node => [node.getAttribute("data-x"), node.getAttribute("data-y")]));
    const axisText = await plot.locator(".science-plot__grid, .science-plot__x-ticks").allTextContents();
    await plot.locator("summary").click();
    const allCount = await plot.locator("tbody tr").count();
    await toggles.first().focus();
    await page.keyboard.press("Space");
    await expect(toggles.first()).toHaveAttribute("aria-pressed", "false");
    expect(await plot.locator("tbody tr:visible").count()).toBeLessThan(allCount);
    expect(await plot.locator(".science-plot__grid, .science-plot__x-ticks").allTextContents()).toEqual(axisText);
    expect(await plot.locator("[data-x]").evaluateAll(nodes => nodes.map(node => [node.getAttribute("data-x"), node.getAttribute("data-y")]))).toEqual(points);
    const cells = await plot.locator("table").evaluate(table => [Array.from(table.querySelectorAll("thead th"), cell => cell.textContent ?? ""), ...Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter(row => !row.hidden).map(row => Array.from(row.cells, cell => cell.textContent ?? ""))]);
    const expectedCsv = "\ufeff" + cells.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(",")).join("\r\n");
    const href = await plot.locator("[data-plot-download]").getAttribute("href");
    expect(decodeURIComponent(href!.slice(href!.indexOf(",") + 1))).toBe(expectedCsv);
    for (const button of await toggles.all()) {
      if (await button.getAttribute("aria-pressed") === "true") await button.click();
    }
    await expect(plot.locator("tbody tr:visible")).toHaveCount(0);
    for (const series of await plot.locator("[data-series-index]").all()) await expect(series).toBeHidden();
    await expect(plot.locator("[data-plot-status]")).toContainText(testInfo.project.name.includes("mobile") ? "显示 0 /" : "0 of");
    const emptyHref = await plot.locator("[data-plot-download]").getAttribute("href");
    const headerOnlyCsv = "\ufeff" + cells[0].map(value => '"' + value.replaceAll('"', '""') + '"').join(",");
    expect(decodeURIComponent(emptyHref!.slice(emptyHref!.indexOf(",") + 1))).toBe(headerOnlyCsv);
    expect(await plot.locator(".science-plot__grid, .science-plot__x-ticks").allTextContents()).toEqual(axisText);
    expect(await plot.locator("[data-x]").evaluateAll(nodes => nodes.map(node => [node.getAttribute("data-x"), node.getAttribute("data-y")]))).toEqual(points);
    await plot.locator("[data-series-reset]").click();
    expect(await plot.locator("tbody tr:visible").count()).toBe(allCount);
    await expect(toggles.first()).toHaveAttribute("aria-pressed", "true");
  }
});

test("retained checkpoint uses the acquired-parent value in keyboard feedback", async ({ page }) => {
  await page.goto("/learn/tracks/active-learning/");
  const panel = page.locator("[data-budget-panel]:visible").first();
  const range = panel.locator("[data-budget-range]");
  await range.focus();
  await page.keyboard.press("Home");
  await expect(range).toHaveValue("0");
  const step = panel.locator("[data-budget-step]:visible");
  const count = await step.getAttribute("data-budget-count");
  await expect(range).toHaveAttribute("aria-valuetext", `${count} acquired parents`);
  await expect(panel.locator("[data-budget-output]")).toHaveText(count!);
});

test("all teaching data and exact CSV remain available without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  try {
    for (const track of tracks) {
      await page.goto(`/learn/tracks/${track}/`);
      const view = page.locator(`[data-teaching-view="${track}"]`);
      await expect(view).toBeVisible();
      for (const selector of await view.locator("[data-panel-select], [data-identity-select], [data-object-select]").all()) await expect(selector).toBeHidden();
      for (const panel of await view.locator("[data-teaching-panel], [data-identity-state], [data-budget-step]").all()) await expect(panel).toBeVisible();
      for (const plot of await view.locator("[data-science-plot]").all()) {
        await expect(plot.locator("[data-series-toggle]").first()).toBeDisabled();
        await plot.locator("summary").click();
        const rows = await plot.locator("table").evaluate(table => [Array.from(table.querySelectorAll("thead th"), cell => cell.textContent ?? ""), ...Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr")).map(row => Array.from(row.cells, cell => cell.textContent ?? ""))]);
        const csv = "\ufeff" + rows.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(",")).join("\r\n");
        const href = await plot.locator("[data-plot-download]").getAttribute("href");
        expect(decodeURIComponent(href!.slice(href!.indexOf(",") + 1))).toBe(csv);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  } finally { await context.close(); }
});


test("source coordinate states and keyboard rotation preserve the retained geometry", async ({ page }, testInfo) => {
  const prefix = testInfo.project.name.includes("mobile") ? "/zh-cn" : "";
  for (const track of ["structure-and-pockets", "physics-based-modeling"]) {
    await page.goto(`${prefix}/learn/tracks/${track}/`);
    const view = page.locator("[data-science-object]");
    const source = await view.getAttribute("data-object-states");
    const states = JSON.parse(source!);
    for (let index = 0; index < states.length; index++) {
      await view.locator("[data-object-select]").selectOption(String(index));
      await expect(view.locator("[data-object-title]")).toHaveText(states[index].label);
      await expect(view.locator("[data-object-preview]")).toHaveAttribute("src", states[index].preview);
    }
    await view.locator("[data-object-enable]").click();
    const canvas = view.locator("canvas");
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await expect(view.locator("[data-object-yaw]")).toHaveValue("40");
    await page.keyboard.press("Home");
    await expect(view.locator("[data-object-yaw]")).toHaveValue("35");
    await expect(view.locator("[data-object-pitch]")).toHaveValue("-20");
    expect(await view.getAttribute("data-object-states")).toBe(source);
    if (track === "structure-and-pockets") {
      const residues = view.locator("[data-object-residue]");
      await residues.selectOption({ index: 1 });
      const selected = await residues.inputValue();
      const contact = states.at(-1).contacts.find((item: { chain: string; author_seq: number }) => `${item.chain}:${item.author_seq}` === selected);
      await expect(view.locator("[data-object-status]")).toContainText(contact.minimum_distance_angstrom.toFixed(3));
    }
  }
});
