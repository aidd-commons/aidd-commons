import { expect, test } from "@playwright/test";
import { workbenchData } from "../../site/src/lib/workbench-data.js";

const coreRoute = workbenchData.routes.find((route) => route.kind === "core")!;
const foundations = workbenchData.tracks.find(
  (track) => track.id === "foundations",
)!;

test("home workflow selects a real scientific explanation and route with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const workflow = page.locator("workflow-navigator");
  await expect(workflow.getByRole("tab")).toHaveCount(5);
  const activity = workflow.getByRole("tab", { name: /Activity & screening/ });
  await activity.click();
  await expect(activity).toHaveAttribute("aria-selected", "true");
  await expect(workflow.getByRole("tabpanel")).toHaveCount(1);
  await expect(
    workflow.getByRole("heading", {
      name: "Fix the assay and chemical unit before comparing representations",
    }),
  ).toBeVisible();
  await expect(
    workflow.getByRole("link", { name: "Open the learning track" }),
  ).toHaveAttribute("href", "/learn/tracks/qsar-properties/");
  await activity.press("ArrowRight");
  await expect(
    workflow.getByRole("tab", { name: /Design & feedback/ }),
  ).toBeFocused();
  await expect(
    workflow.getByRole("heading", {
      name: /Bring properties, synthesis constraints/,
    }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "What are you working on?" })
    .fill("EGFR");
  await page.getByRole("button", { name: "Search Commons" }).click();
  await expect(page).toHaveURL(/\/search\/\?q=EGFR/);
});

test("learning hub reuses stored progress and keeps route/view URL state", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "aidd-commons:v1:progress",
      JSON.stringify({
        completed: ["foundations/getting-started", "legacy/retained-id"],
      }),
    ),
  );
  await page.goto("/learn/?view=list");
  await expect(page.locator("learning-track-directory")).toHaveAttribute(
    "data-view",
    "list",
  );
  await expect(page.locator("[data-hub-track]")).toHaveCount(18);
  await expect(
    page.locator("learning-resume [data-next-link]"),
  ).toHaveAttribute("href", "/learn/foundations/first-session/");
  await expect(
    page.locator("learning-resume [data-progress-fraction]"),
  ).toHaveText(`1 / ${coreRoute.lessonIds.length}`);
  await page
    .getByRole("button", { name: "Device progress", exact: true })
    .click();
  await expect(page).toHaveURL(/view=progress/);
  await expect(
    page.locator('[data-hub-track="foundations"] [data-track-progress]'),
  ).toHaveText(`1 / ${foundations.lessons.length} marked`);
  await page.locator("[data-route-select]").selectOption("structure-physics");
  await expect(page).toHaveURL(/route=structure-physics/);
  await page.reload();
  await expect(page.locator("[data-route-select]")).toHaveValue(
    "structure-physics",
  );
  await expect(page.locator("learning-track-directory")).toHaveAttribute(
    "data-view",
    "progress",
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("aidd-commons:v1:progress") ?? "{}")
          .completed,
    ),
  ).toEqual(["foundations/getting-started", "legacy/retained-id"]);
});

test("every canonical track has an actual bilingual hub with lessons and source links", async ({
  request,
}) => {
  for (const track of workbenchData.tracks) {
    for (const href of [track.href, track.hrefZh]) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
      const html = await response.text();
      expect(html, href).toContain('id="track-hub-title"');
      expect(html, href).toContain(
        `data-track-lesson="${track.lessons[0].id}"`,
      );
      expect(html, href).toContain('id="track-sources-title"');
      expect(html, href).toContain('id="track-prerequisites-title"');
    }
  }
});

test("Chinese home and learning hub preserve translated routes and mark original source material", async ({
  page,
}) => {
  await page.goto("/zh-cn/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "从靶点到候选，循着证据前进。",
  );
  await page.locator('[data-workflow-tab="activity"]').click();
  await expect(
    page.locator('[data-workflow-panel="activity"] a').first(),
  ).toHaveAttribute(
    "href",
    "/zh-cn/learn/qsar-properties/regression-classification-errors/",
  );
  await expect(page.locator(".aidd-home-language-label")).toContainText(
    "原始英文图",
  );
  await page.goto("/zh-cn/learn/");
  await expect(page.locator("[data-hub-track]")).toHaveCount(18);
  await page.locator('[data-hub-track="qsar-properties"] h3 a').click();
  await expect(page).toHaveURL(/\/zh-cn\/learn\/tracks\/qsar-properties\//);
  await expect(
    page.locator("[data-track-lesson] h3 a").first(),
  ).toHaveAttribute(
    "href",
    "/zh-cn/learn/qsar-properties/property-prediction/",
  );
});

test("home and learning hubs keep a useful ordinary-link fallback without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL as string,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-workflow-panel]")).toHaveCount(5);
  await expect(page.locator('[data-workflow-panel="activity"]')).toBeVisible();
  await page.goto("/learn/");
  await expect(page.locator("[data-hub-track] h3 a")).toHaveCount(18);
  await expect(page.locator(".learning-view-controls")).toBeHidden();
  await expect(page.locator("[data-route-control]")).toBeHidden();
  await page.locator("#route-core summary").click();
  await expect(
    page.locator("#route-core .learning-route__body > ol > li"),
  ).toHaveCount(coreRoute.lessonIds.length);
  await page
    .locator("#route-core .learning-route__body > ol > li a")
    .first()
    .click();
  await expect(page).toHaveURL(/\/learn\/foundations\/getting-started\//);
  await context.close();
});
