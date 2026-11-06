import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(root, "site/src/data/atlas-figures.json"), "utf8"),
) as {
  library: {
    id: string;
    reportNumber: number;
    source_stem: string;
    title: string;
    file: string;
    pdf: string;
    pptx?: string;
  }[];
};
const figures = [...manifest.library].sort(
  (a, b) => a.reportNumber - b.reportNumber,
);
type Figure = (typeof figures)[number];
type Theme = "light" | "dark";
const languages = ["en", "zh-cn"] as const;
const themes = ["light", "dark"] as const;
const widths = [390, 768, 1440] as const;
const representativeNumbers = [3, 8, 11, 19] as const;
const representative = representativeNumbers.map(
  (number) => figures.find((figure) => figure.reportNumber === number)!,
);
const route = (figure: Figure, language: string) =>
  "/" +
  (language === "zh-cn" ? "zh-cn/" : "") +
  "report/figures/" +
  figure.id +
  "/";

test.describe.configure({ mode: "parallel" });
test.setTimeout(60_000);

async function openFigure(
  page: Page,
  figure: Figure,
  language: string,
  theme: Theme,
  width: number,
  height = 900,
) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem("starlight-theme", selectedTheme);
  }, theme);
  const response = await page.goto(route(figure, language));
  expect(response?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const article = page.locator("article[data-figure-id]");
  await expect(article).toHaveAttribute("data-figure-id", figure.id);
  await expect(article).toHaveAttribute("data-ready", "true");
  await expect(article.locator("h1")).toHaveText(figure.title);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return article;
}

/** Failures include actual boxes and nearest clipping/scrolling ancestors. */
async function expectContained(page: Page, state: string) {
  const measurements = await page.evaluate(() => {
    const article = document.querySelector<HTMLElement>(
      "article[data-figure-id]",
    )!;
    const viewport = innerWidth;
    const describe = (element: Element) => {
      const box = element.getBoundingClientRect();
      let ancestor = element.parentElement;
      let scrollContainer = "";
      while (ancestor && ancestor !== document.documentElement) {
        if (
          /(auto|scroll|hidden|clip)/.test(getComputedStyle(ancestor).overflowX)
        ) {
          scrollContainer =
            ancestor.tagName.toLowerCase() +
            (ancestor.id ? "#" + ancestor.id : "") +
            "." +
            String(ancestor.className).trim().replace(/\s+/g, ".");
          break;
        }
        ancestor = ancestor.parentElement;
      }
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        classes: String(element.className),
        left: Math.round(box.left * 10) / 10,
        right: Math.round(box.right * 10) / 10,
        width: Math.round(box.width * 10) / 10,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        scrollContainer,
      };
    };
    const offenders = [...article.querySelectorAll("*")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return (
          element.getClientRects().length &&
          box.width &&
          (box.right > viewport + 2 || box.left < -2)
        );
      })
      .map(describe)
      .sort((a, b) => b.right - a.right)
      .slice(0, 16);
    const regionSelectors = [
      ".figure-detail__header",
      ".figure-detail__section-links",
      ".figure-detail__view",
      ".figure-detail__selector",
      ".figure-detail__section-heading",
      ".figure-steps__controls",
      ".figure-detail__table-scroll",
      ".figure-detail__pagination",
    ];
    const regionLeaks = regionSelectors.flatMap((selector) =>
      [...article.querySelectorAll<HTMLElement>(selector)]
        .filter((element) => element.getClientRects().length)
        .map((element) => ({ selector, ...describe(element) }))
        .filter((box) => box.left < -2 || box.right > viewport + 2),
    );
    return {
      viewport,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      article: describe(article),
      regionLeaks,
      offenders,
    };
  });
  const diagnostic = state + "\n" + JSON.stringify(measurements, null, 2);
  expect(measurements.documentWidth, diagnostic).toBeLessThanOrEqual(
    measurements.viewport + 2,
  );
  expect(measurements.article.left, diagnostic).toBeGreaterThanOrEqual(-2);
  expect(measurements.article.right, diagnostic).toBeLessThanOrEqual(
    measurements.viewport + 2,
  );
  expect(measurements.regionLeaks, diagnostic).toEqual([]);
}

for (const figure of figures) {
  for (const language of languages) {
    for (const theme of themes) {
      for (const width of widths) {
        test(
          "geometry F" +
            figure.reportNumber +
            " " +
            language +
            " " +
            theme +
            " " +
            width,
          async ({ page }) => {
            const article = await openFigure(
              page,
              figure,
              language,
              theme,
              width,
            );
            await expectContained(page, "default");
            await article.locator("#figure-source-table summary").click();
            await expect(
              article.locator("#figure-source-table table"),
            ).toBeVisible();
            await expectContained(page, "complete source table open");
          },
        );
      }
    }
  }

  for (const scenario of [
    { language: "en", theme: "light", width: 1440 },
    { language: "zh-cn", theme: "dark", width: 390 },
  ] as const) {
    test(
      "WCAG AA F" +
        figure.reportNumber +
        " " +
        scenario.language +
        " " +
        scenario.theme +
        " " +
        scenario.width,
      async ({ page }) => {
        const article = await openFigure(
          page,
          figure,
          scenario.language,
          scenario.theme,
          scenario.width,
        );
        await article.locator("#figure-source-table summary").click();
        const audit = await new AxeBuilder({ page })
          .include("article[data-figure-id]")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          audit.violations,
          JSON.stringify(audit.violations, null, 2),
        ).toEqual([]);
      },
    );
  }

  test(
    "canonical original downloads F" + figure.reportNumber,
    async ({ request }) => {
      for (const suffix of ["pdf", "png", ...(figure.pptx ? ["pptx"] : [])]) {
        const delivered =
          suffix === "png"
            ? figure.file
            : suffix === "pdf"
              ? figure.pdf
              : figure.pptx!;
        const response = await request.get("/figures/" + delivered);
        expect(response.ok(), delivered).toBe(true);
        const canonical = readFileSync(
          join(root, "report/figures/out", figure.source_stem + "." + suffix),
        );
        expect(
          Buffer.compare(await response.body(), canonical),
          delivered,
        ).toBe(0);
      }
    },
  );
}

for (const figure of representative) {
  for (const language of languages) {
    test(
      "keyboard F" + figure.reportNumber + " " + language,
      async ({ page }) => {
        const article = await openFigure(
          page,
          figure,
          language,
          language === "en" ? "light" : "dark",
          768,
        );
        const selector = article.locator("[data-figure-select]");
        if (await selector.count()) {
          const lastOption = selector.locator("option").last();
          const last = await lastOption.getAttribute("value");
          const label = (await lastOption.textContent())!.trim();
          await selector.focus();
          // Full-label typeahead is verified for native macOS Chrome selects.
          await page.keyboard.type(label, { delay: 80 });
          await page.keyboard.press("Enter");
          await expect(selector).toBeFocused();
          await expect(selector).toHaveValue(last!);
        }
        const next = article.locator("[data-step-next]");
        if (await next.count()) {
          await next.focus();
          await page.keyboard.press("Enter");
          await expect(article.locator("[data-step-status]")).toHaveText(
            /^2 \/ \d+$/,
          );
        }
        const summary = article.locator("#figure-source-table summary");
        await summary.focus();
        await page.keyboard.press("Enter");
        await expect(
          article.locator("#figure-source-table table"),
        ).toBeVisible();
        await expectContained(page, "keyboard-opened source table");
        const opener = article.locator("[data-detail-enlarge]");
        await opener.focus();
        await page.keyboard.press("Enter");
        const dialog = article.locator("[data-detail-dialog]");
        await expect(dialog).toBeVisible();
        for (let index = 0; index < 5; index++) {
          await page.keyboard.press("Tab");
          expect(
            await dialog.evaluate((element) =>
              element.contains(document.activeElement),
            ),
          ).toBe(true);
        }
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
      },
    );

    for (const physicalWidth of [1280, 1440]) {
      // A 200% desktop-equivalent viewport: half the CSS width at DPR 2.
      // This tests responsive reflow, not a browser toolbar or OS zoom control.
      test(
        "200% desktop equivalent reflow F" +
          figure.reportNumber +
          " " +
          language +
          " " +
          physicalWidth,
        async ({ browser, baseURL }) => {
          const cssWidth = physicalWidth / 2;
          const theme = language === "en" ? "light" : "dark";
          const context = await browser.newContext({
            baseURL,
            viewport: { width: cssWidth, height: 450 },
            deviceScaleFactor: 2,
            colorScheme: theme,
            reducedMotion: "reduce",
          });
          try {
            const page = await context.newPage();
            const article = await openFigure(
              page,
              figure,
              language,
              theme,
              cssWidth,
              450,
            );
            expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
            expect(await page.evaluate(() => innerWidth)).toBe(cssWidth);
            await expectContained(
              page,
              "200% desktop-equivalent responsive reflow",
            );
            await article.locator("#figure-source-table summary").click();
            await expect(
              article.locator("#figure-source-table table"),
            ).toBeVisible();
            await expectContained(
              page,
              "200% desktop-equivalent reflow and complete source table open",
            );
            await expect(
              article.locator("[data-detail-enlarge]"),
            ).toBeVisible();
            await expect(
              article.locator("#figure-source-table a[download]"),
            ).toBeVisible();
          } finally {
            await context.close();
          }
        },
      );
    }
  }
}

const screenshots = [
  {
    number: 3,
    language: "en",
    theme: "light",
    width: 1440,
    fullPage: true,
    focus: "",
  },
  {
    number: 3,
    language: "zh-cn",
    theme: "dark",
    width: 390,
    fullPage: true,
    focus: "",
  },
  {
    number: 8,
    language: "en",
    theme: "light",
    width: 1440,
    fullPage: true,
    focus: "",
  },
  {
    number: 8,
    language: "zh-cn",
    theme: "dark",
    width: 390,
    fullPage: false,
    focus: "#web-view",
  },
  {
    number: 11,
    language: "en",
    theme: "light",
    width: 1440,
    fullPage: true,
    focus: "",
  },
  {
    number: 19,
    language: "zh-cn",
    theme: "dark",
    width: 390,
    fullPage: false,
    focus: "[data-science-plot]",
  },
] as const;

for (const scenario of screenshots) {
  test(
    "visual receipt F" +
      scenario.number +
      " " +
      scenario.language +
      " " +
      scenario.width,
    async ({ page }, testInfo) => {
      const figure = figures.find(
        (entry) => entry.reportNumber === scenario.number,
      )!;
      const article = await openFigure(
        page,
        figure,
        scenario.language,
        scenario.theme,
        scenario.width,
      );
      if (scenario.fullPage) {
        const preview = article.locator("#original-figure > a > img");
        await preview.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            preview.evaluate(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          )
          .toBe(true);
        await page.evaluate(() => scrollTo(0, 0));
      } else {
        await article
          .locator(scenario.focus)
          .first()
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
      }
      const name =
        "F" +
        String(scenario.number).padStart(2, "0") +
        "-" +
        scenario.language +
        "-" +
        scenario.theme +
        "-" +
        scenario.width +
        "-" +
        (scenario.fullPage ? "full" : "viewport") +
        ".png";
      const path = testInfo.outputPath(name);
      await page.screenshot({
        path,
        fullPage: scenario.fullPage,
        animations: "disabled",
      });
      await testInfo.attach(name, { path, contentType: "image/png" });
    },
  );
}
