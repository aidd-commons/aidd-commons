import { readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const base = process.env.AIDD_REPORT_BASE || "";
const pdfPath = "/reports/aidd-commons-living-report-v0.2.pdf";

for (const language of ["en", "zh-cn"]) {
  test(`Report ${language} offers the canonical v0.2 PDF and preserves v0.1`, async ({
    page,
    request,
  }) => {
    await page.goto(`${base}/${language === "en" ? "" : "zh-cn/"}report/`);
    const current = page.getByRole("link", {
      name:
        language === "en" ? "Download Report v0.2 PDF" : "下载 Report v0.2 PDF",
      exact: true,
    });
    await expect(current).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await current.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      "aidd-commons-living-report-v0.2.pdf",
    );
    expect(
      (await readFile((await download.path())!)).equals(
        await readFile(`site/public${pdfPath}`),
      ),
    ).toBe(true);

    await expect(current).toHaveAttribute("href", `${base}${pdfPath}`);
    const response = await request.get((await current.getAttribute("href"))!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(
      (await response.body()).equals(await readFile(`site/public${pdfPath}`)),
    ).toBe(true);
    const historical = page.getByRole("link", {
      name: "v0.1: An open map for AI drug discovery",
      exact: true,
    });
    const oldResponse = await request.get(
      (await historical.getAttribute("href"))!,
    );
    expect(
      (await oldResponse.body()).equals(
        await readFile(
          "site/public/reports/aidd-commons-living-report-v0.1.pdf",
        ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("the web addendum links to the same current PDF", async ({
  page,
  request,
}) => {
  await page.goto(`${base}/report/v0-2/`);
  const link = page.getByRole("link", {
    name: "download the complete v0.2 PDF",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", `${base}${pdfPath}`);
  const response = await request.get((await link.getAttribute("href"))!);
  expect(
    (await response.body()).equals(await readFile(`site/public${pdfPath}`)),
  ).toBe(true);
  await expect(
    page.getByRole("heading", {
      name: "Remaining work and feedback",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("complete online report preserves all chapters and twenty figures", async ({
  page,
}) => {
  await page.goto(`${base}/reports/aidd-commons-living-report-v0.2.html`);
  await expect(page.locator("main > h1:not(.unnumbered)")).toHaveCount(13);
  await expect(page.locator("figure img")).toHaveCount(20);
  await expect
    .poll(() =>
      page
        .locator("figure img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
