import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
const home = process.env.SCIENCE_STORY_BASE ?? "/";
const storySelector = 'science-story[data-story="evidence"]';
test("story pauses, steps and synchronizes with the five workflow stages", async ({
  page,
}) => {
  await page.goto(home);
  const story = page.locator(storySelector).first();
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-enhanced", "true");
  await page.locator('[data-workflow-tab="activity"]').click();
  await expect(story).toHaveAttribute("data-playing", "false");
  await expect(story.locator('[data-story-step="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const progress = await story.locator("progress").getAttribute("value");
  await page.waitForTimeout(150);
  await expect(story.locator("progress")).toHaveAttribute(
    "value",
    String(progress),
  );
  await expect(page.locator('[data-workflow-tab="activity"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.locator('[data-workflow-tab="nomination"]').click();
  await expect(story.locator('[data-story-step="4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await story.locator("[data-story-replay]").click();
  await expect(story).toHaveAttribute("data-playing", "true");
  await story.locator("[data-story-play]").click();
  await expect(story).toHaveAttribute("data-playing", "false");
});
test("reduced motion keeps a static scene and allows explicit step reading", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(home);
  const story = page.locator(storySelector).first();
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-playing", "false");
  await expect(story.locator('[data-story-step="4"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(story.locator("[data-story-play]")).toBeHidden();
  await page.locator('[data-workflow-tab="target"]').click();
  await expect(story.locator('[data-story-step="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("offscreen stories stop advancing and download links do not preload movies", async ({
  page,
}) => {
  const movies: string[] = [];
  page.on("request", (request) => {
    if (/\/media\/stories\/.*\.(mp4|webm|gif)$/u.test(request.url()))
      movies.push(request.url());
  });
  await page.goto(home);
  const story = page.locator(storySelector).first();
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-enhanced", "true");
  await story.locator("[data-story-replay]").click();
  await expect(story).toHaveAttribute("data-playing", "true");
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(story).toHaveAttribute("data-playing", "false");
  const value = await story.locator("progress").getAttribute("value");
  await page.waitForTimeout(200);
  await expect(story.locator("progress")).toHaveAttribute("value", value ?? "");
  expect(movies).toEqual([]);
});
test("without JavaScript the localized static scene and full transcript remain readable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL as string,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(home);
  const story = page.locator(storySelector).first();
  await expect(story.locator("[data-story-controls]")).toBeHidden();
  await expect(story.locator(".science-story__static-narrow")).toBeVisible();
  await story.locator(".science-story__transcript summary").click();
  await expect(story.locator(".science-story__transcript li")).toHaveCount(5);
  await story.locator(".science-story__downloads summary").click();
  await expect(story.locator('a[href$="evidence-en.gif"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("native image and exact movie downloads resolve under the configured site path", async ({
  page,
}) => {
  await page.goto(home);
  const story = page.locator(storySelector).first();
  await story.scrollIntoViewIfNeeded();
  const image = story.locator("img");
  await expect
    .poll(() =>
      image.evaluate(
        (node) =>
          (node as HTMLImageElement).complete &&
          (node as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  const imageUrl = await image.evaluate(
    (node) => (node as HTMLImageElement).currentSrc,
  );
  expect(
    (await page.request.get(imageUrl)).headers()["content-type"],
  ).toContain("image/webp");
  await story.locator(".science-story__downloads summary").click();
  for (const [suffix, mime] of [
    ["mp4", "video/mp4"],
    ["webm", "video/webm"],
    ["gif", "image/gif"],
    ["webp", "image/webp"],
  ]) {
    const anchor = story.locator(`a[href$="evidence-en.${suffix}"]`);
    await expect(anchor).toHaveAttribute("download", "");
    const href = await anchor.getAttribute("href");
    if (!href) throw new Error("Missing story download URL");
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(mime);
    const delivered = await response.body();
    const canonical = await readFile(
      join(process.cwd(), "site/public/media/stories", basename(href)),
    );
    expect(delivered.equals(canonical)).toBe(true);
  }
});

test("identity and DMTA lesson stories retain their scientific state under localized step controls", async ({
  page,
}) => {
  const prefix = home.replace(/\/$/u, "");
  for (const locale of ["en", "zh-cn"])
    for (const [kind, track] of [
      ["identity", "data-governance"],
      ["dmta", "active-learning"],
    ]) {
      await test.step(`${kind}/${locale}`, async () => {
        await page.goto(
          `${prefix}/${locale === "zh-cn" ? "zh-cn/" : ""}learn/tracks/${track}/`,
        );
        const story = page
          .locator(`science-story[data-story="${kind}"]`)
          .first();
        await story.scrollIntoViewIfNeeded();
        await expect(story).toHaveAttribute("data-enhanced", "true");
        await story.locator('[data-story-step="2"]').click();
        await expect(story).toHaveAttribute("data-playing", "false");
        await expect(story.locator('[data-story-step="2"]')).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        const tokenY = async (record: string) =>
          story
            .locator(".science-story__native svg text")
            .filter({ hasText: new RegExp(`^${record}$`, "u") })
            .evaluate((element) => {
              const position = element
                .closest("g")
                ?.getAttribute("transform")
                ?.match(/translate\(([\d.]+)\s+([\d.]+)\)/u);
              if (!position) throw new Error("Missing native record position");
              return Number(position[2]);
            });
        if (kind === "identity")
          expect(await tokenY("A · r1")).toBeLessThan(await tokenY("A · r2"));
        else
          await expect(story.locator("[data-story-title]")).toHaveText(
            locale === "en" ? "Test and retain failures" : "测定并保留失败",
          );
        await story.locator('[data-story-step="3"]').focus();
        await page.keyboard.press("Enter");
        await expect(story.locator('[data-story-step="3"]')).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        if (kind === "identity")
          expect(
            Math.max(await tokenY("A · r1"), await tokenY("A · r2")),
          ).toBeLessThan(await tokenY("B · r3"));
        else
          await expect(story.locator("[data-story-title]")).toHaveText(
            locale === "en" ? "Analyze, then decide again" : "分析后再次决策",
          );
        expect(
          await story.evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
        ).toBe(true);
      });
    }
});
