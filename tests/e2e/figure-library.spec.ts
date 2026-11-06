import { readFileSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { teachingViews } from "../../site/src/data/teaching-views.js";

const manifest = JSON.parse(readFileSync("site/src/data/atlas-figures.json", "utf8")) as {
  library: {
    id: string;
    title: string;
    kind: string;
    file: string;
    pdf: string;
    pptx?: string;
    width: number;
    height: number;
    alt: string;
    caption: string;
    source_note: string;
    source_dates: string[];
    visual_revision_date: string;
    reportNumber: number;
    detailHref: string;
    previews: Record<string, string>;
  }[];
};
const figureCount = manifest.library.length;
const viewCount = Object.keys(teachingViews).length;

for (const chinese of [false, true]) {
  const path = `/${chinese ? "zh-cn/" : ""}report/figures/`;
  test(`${chinese ? "Chinese" : "English"} library preserves source captions and every direct download`, async ({ page }) => {
    await page.goto(path);
    const library = page.locator("[data-figure-library]");
    await expect(library.locator("[data-library-figure]")).toHaveCount(figureCount);
    await expect(library.getByRole("link", { name: chinese ? "返回报告" : "Return to the report" })).toHaveAttribute("href", chinese ? "/zh-cn/report/" : "/report/");
    await expect(library.locator('[data-kind="interactive"]')).toHaveCount(viewCount);
    await expect(library.locator("[data-library-count]")).toHaveText(
      chinese
        ? `${figureCount} 张图件中显示 ${figureCount} 张 · ${viewCount} 个教学视图中显示 ${viewCount} 个`
        : `${figureCount} of ${figureCount} figures · ${viewCount} of ${viewCount} teaching views`,
    );
    for (const entry of manifest.library) {
      const figure = library.locator(`[data-library-figure="${entry.id}"]`);
      await expect(figure.locator("h3")).toHaveText(entry.title);
      await expect(figure.locator("[data-figure-caption]")).toHaveText(entry.caption);
      await expect(figure.locator("[data-figure-source]")).toHaveText(entry.source_note);
      expect(await figure.locator("[data-figure-dates] time").evaluateAll(nodes => nodes.map(node => node.getAttribute("datetime")))).toEqual([entry.visual_revision_date, ...entry.source_dates]);
      await expect(figure.locator("img")).toHaveAttribute("alt", entry.alt);
      await expect(figure.locator("img")).toHaveAttribute("src", `/figures/${entry.previews["480"]}`);
      await expect(figure.locator("img")).toHaveAttribute("srcset", `/figures/${entry.previews["480"]} 480w, /figures/${entry.previews["960"]} 960w`);
      await expect(figure.locator("[data-figure-detail]")).toHaveAttribute("href", `${chinese ? "/zh-cn" : ""}${entry.detailHref}`);
      await expect(figure.locator("img")).toHaveAttribute("width", String(entry.width));
      await expect(figure.locator("img")).toHaveAttribute("height", String(entry.height));
      await expect(figure.locator("[data-library-preview]")).toHaveAttribute("href", `/figures/${entry.pdf}`);
      const links = await figure.locator("[data-figure-downloads] a").evaluateAll(anchors =>
        anchors.map(anchor => ({ href: anchor.getAttribute("href"), download: anchor.hasAttribute("download") })),
      );
      expect(links).toEqual([entry.pdf, ...(entry.pptx ? [entry.pptx] : []), entry.file].map(file => ({ href: `/figures/${file}`, download: true })));
    }
    expect(await library.locator("[data-library-figure]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-library-figure")))).toEqual(manifest.library.map(entry => entry.id));
    expect(manifest.library.map(entry => entry.reportNumber)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const labels = await library.locator(".figure-library__figure-heading > span").allTextContents();
    expect(labels).toEqual(Array.from({ length: figureCount }, (_, index) => `${chinese ? "图" : "Figure"} ${String(index + 1).padStart(2, "0")}`));
    for (const [track, view] of Object.entries(teachingViews)) {
      const link = library.locator(`a[href="/${chinese ? "zh-cn/" : ""}learn/${view.lesson}/#scientific-view-${track}"]`);
      await expect(link).toContainText(chinese ? view.question.zh : view.question.en);
      await expect(link.locator("[data-teaching-thumbnail]")).toHaveAttribute("src", `/figures/teaching-views/${track}.png`);
      await link.scrollIntoViewIfNeeded();
      await expect.poll(() => link.locator("img").evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 960 && (image as HTMLImageElement).naturalHeight === 640)).toBe(true);
    }
  });

  test(`${chinese ? "Chinese" : "English"} search filters restore URL state, history and an empty result`, async ({ page }) => {
    await page.goto(`${path}?type=plot&keep=1#plots`);
    const library = page.locator("[data-figure-library]");
    const search = library.locator("[data-library-search]");
    const type = library.locator("[data-library-type]");
    const visibleFigures = library.locator("[data-library-figure]:visible");
    await expect(visibleFigures).toHaveCount(13);
    await type.selectOption("schematic");
    await expect(visibleFigures).toHaveCount(7);
    await page.goBack();
    await expect(type).toHaveValue("plot");
    await expect(visibleFigures).toHaveCount(13);
    await page.goForward();
    await expect(type).toHaveValue("schematic");
    await search.fill("no-figure-matches-this-phrase");
    await expect(library.locator("[data-library-empty]")).toBeVisible();
    await expect(library.locator("[data-library-group]:visible")).toHaveCount(0);
    await page.reload();
    await expect(search).toHaveValue("no-figure-matches-this-phrase");
    await expect(type).toHaveValue("schematic");
    await expect(library.locator("[data-library-empty]")).toBeVisible();
    await library.locator("[data-library-empty] [data-library-reset]").click();
    await expect(visibleFigures).toHaveCount(figureCount);
    await expect(search).toBeFocused();
    expect(new URL(page.url()).searchParams.get("keep")).toBe("1");
    expect(new URL(page.url()).searchParams.has("q")).toBe(false);
    expect(new URL(page.url()).searchParams.has("type")).toBe(false);
    await search.fill("  FREESOLV  ");
    await type.selectOption("plot");
    await expect(visibleFigures).toHaveCount(1);
    await expect(visibleFigures.first().locator("h3")).toHaveText("FreeSolv split and interval metrics");
    expect(new URL(page.url()).searchParams.get("q")).toBe("FREESOLV");
    await type.selectOption("interactive");
    await search.fill("哪种证据能回答下一项发现决策");
    await expect(library.locator('[data-kind="interactive"]:visible')).toHaveCount(1);
    await expect(library.locator('[data-kind="interactive"]:visible')).toContainText(
      chinese ? teachingViews.foundations.question.zh : teachingViews.foundations.question.en,
    );
  });

  test(`${chinese ? "Chinese" : "English"} zoom keeps source text, traps focus and restores its opener`, async ({ page }) => {
    await page.goto(path);
    const entry = manifest.library.find(entry => entry.pptx)!;
    const figure = page.locator(`[data-library-figure="${entry.id}"]`);
    const opener = figure.locator("[data-library-preview]");
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-zoom-title]")).toContainText(entry.title);
    await expect(dialog.locator("[data-zoom-caption]")).toHaveText(entry.caption);
    await expect(dialog.locator("[data-zoom-source]")).toHaveText(entry.source_note);
    expect(await dialog.locator("[data-zoom-dates] time").evaluateAll(nodes => nodes.map(node => node.getAttribute("datetime")))).toEqual([entry.visual_revision_date, ...entry.source_dates]);
    await expect(dialog.locator("[data-zoom-image]")).toHaveAttribute("alt", entry.alt);
    await expect(dialog.locator("[data-zoom-image]")).toHaveAttribute("src", `/figures/${entry.file}`);
    await expect(dialog.locator("[data-zoom-image]")).toHaveAttribute("width", String(entry.width));
    await expect(dialog.locator("[data-zoom-image]")).toHaveAttribute("height", String(entry.height));
    await expect(dialog.locator("[data-zoom-close]")).toBeFocused();
    const downloads = await dialog.locator("[data-zoom-downloads] a").evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute("href")));
    expect(downloads).toEqual([entry.pdf, entry.pptx, entry.file].map(file => `/figures/${file}`));
    for (let index = 0; index < 9; index++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    for (let index = 0; index < 9; index++) {
      await page.keyboard.press("Shift+Tab");
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await dialog.locator("[data-zoom-size]").click();
    await expect(dialog.locator("[data-zoom-size]")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => dialog.locator("[data-zoom-image]").evaluate(image =>
      image.getBoundingClientRect().width > image.parentElement!.clientWidth,
    )).toBe(true);
    await dialog.locator("[data-zoom-size]").click();
    await expect(dialog.locator("[data-zoom-size]")).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.locator("[data-zoom-close]").click();
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });
}

test("contact sheet opens one source inspector and browses only the filtered figures", async ({
  page,
}) => {
  await page.goto("/report/figures/?type=plot&q=assay");
  const figures = page.locator("[data-library-figure]:visible");
  expect(await figures.count()).toBeGreaterThan(1);
  await figures.first().locator("summary").click();
  await expect(figures.first().locator("[data-figure-caption]")).toBeVisible();
  await figures.nth(1).locator("summary").click();
  await expect(figures.first().locator("[data-figure-caption]")).toBeHidden();
  await expect(figures.nth(1).locator("[data-figure-caption]")).toBeVisible();
  const titles = await figures.locator("h3").allTextContents();
  const opener = figures.first().locator("[data-library-preview]");
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-zoom-previous]")).toBeDisabled();
  await expect(dialog.locator("[data-zoom-position]")).toHaveText(
    `1 / ${titles.length}`,
  );
  await dialog.locator("[data-zoom-next]").click();
  await expect(dialog.locator("[data-zoom-title]")).toContainText(titles[1]);
  await expect(dialog.locator("[data-zoom-position]")).toHaveText(
    `2 / ${titles.length}`,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("[data-zoom-title]")).toContainText(titles[0]);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("without JavaScript all figures, teaching links and direct PDF previews remain available", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/report/figures/?type=plot&q=no-match");
    const library = page.locator("[data-figure-library]");
    await expect(library.locator("[data-library-controls]")).toBeHidden();
    await expect(library.locator("[data-library-figure]:visible")).toHaveCount(figureCount);
    await expect(library.locator('[data-kind="interactive"]:visible')).toHaveCount(viewCount);
    await expect(library.locator("[data-library-preview]").first()).toHaveAccessibleName(/^Open PDF:/);
    await expect(library.locator("[data-library-preview]").first()).not.toHaveAttribute("aria-haspopup");
  } finally {
    await context.close();
  }
});

test("library and zoom stay readable at narrow and wide widths in both themes", async ({ page }, testInfo) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/report/figures/?type=schematic");
      const library = page.locator("[data-figure-library]");
      await expect(library.locator("[data-library-controls]")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const audit = await new AxeBuilder({ page }).include("[data-figure-library]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(audit.violations, JSON.stringify(audit.violations)).toEqual([]);
      await library.locator("[data-library-preview]:visible").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const dialogAudit = await new AxeBuilder({ page }).include("[data-library-dialog]").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(dialogAudit.violations, JSON.stringify(dialogAudit.violations)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (testInfo.project.name === "chromium") {
        await page.screenshot({ path: testInfo.outputPath(`figure-zoom-${width}-${theme}.png`) });
      }
      await page.keyboard.press("Escape");
    }
  }
});
