import { readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { parse } from "yaml";

const curriculum = parse(
  await readFile("catalog/curriculum/tracks.yaml", "utf8"),
);

for (const route of ["/", "/zh-cn/"]) {
  test(`Home opens the canonical track hubs through Learn from ${route}`, async ({
    page,
    request,
  }) => {
    const prefix = route === "/" ? "" : "/zh-cn";
    await page.goto(route);
    await page
      .getByRole("link", {
        name: route === "/" ? "Find your learning route" : "选择学习路径",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/learn/$`));
    const links = page.locator("[data-hub-track] h3 a");
    await expect(links).toHaveCount(curriculum.tracks.length);
    const hrefs = await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")!),
    );
    expect(hrefs).toEqual(
      curriculum.tracks.map(
        (track: { id: string }) => `${prefix}/learn/tracks/${track.id}/`,
      ),
    );
    expect(new Set(hrefs).size).toBe(curriculum.tracks.length);
    for (const href of hrefs) {
      expect((await request.get(href)).ok()).toBe(true);
    }
  });
}

test("a new reader reaches the light lab and its completed predictive follow-up", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Find your learning route", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Start a first session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your first session", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("tmp/molecule-representations/report.json", { exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Run the label-free inspector", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Expected relationships", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Read the completed ChEMBL comparison",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Completed ChEMBL evaluations",
      exact: true,
    }),
  ).toBeVisible();
});

test("report readers can read the complete current report and retrieve the unmodified historical PDF", async ({
  page,
  request,
}) => {
  await page.goto("/report/");
  const pdfLink = page.getByRole("link", {
    name: "v0.1: An open map for AI drug discovery",
    exact: true,
  });
  const pdfResponse = await request.get((await pdfLink.getAttribute("href"))!);
  expect(pdfResponse.ok()).toBe(true);
  expect(
    (await pdfResponse.body()).equals(
      await readFile("site/public/reports/aidd-commons-living-report-v0.1.pdf"),
    ),
  ).toBe(true);
  const citationResponse = await request.get(
    (await page
      .getByRole("link", {
        name: "Download the software version citation",
        exact: true,
      })
      .getAttribute("href"))!,
  );
  expect(citationResponse.ok()).toBe(true);
  const citation = parse(await citationResponse.text());
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  expect(citation.version).toBe(manifest.version);
  await page
    .getByRole("link", { name: "Read the complete report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "9 The completed laboratory evidence",
      exact: true,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
