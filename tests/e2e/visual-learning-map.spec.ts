import { expect, test } from "@playwright/test";
import { workbenchData } from "../../site/src/lib/workbench-data.js";

for (const prefix of ["", "/zh-cn"]) {
  test(`the learning map inspects canonical direct dependencies and restores selection ${prefix || "English"}`, async ({ page }) => {
    await page.goto(`${prefix}/learn/?track=qsar-properties`);
    const map = page.locator("learning-track-directory");
    await expect(map.locator("[data-hub-track]")).toHaveCount(workbenchData.tracks.length);
    await expect(page.locator("workflow-navigator")).toHaveCount(0);
    const qsar = workbenchData.tracks.find((track) => track.id === "qsar-properties")!;
    await expect(map.locator("[data-track-prerequisites] [data-inspect-track]")).toHaveCount(qsar.prerequisiteIds.length);
    await map.locator('[data-track-choice="structure-and-pockets"]').click();
    await expect(page).toHaveURL(/track=structure-and-pockets/);
    await expect(map.locator("[data-selected-link]")).toHaveAttribute("href", `${prefix}/learn/tracks/structure-and-pockets/`);
    await map.locator('[data-track-choice="structure-and-pockets"]').press("ArrowRight");
    await expect(map.locator("[data-track-choice]:focus")).toHaveCount(1);
    await page.reload();
    await expect(map.locator('[data-hub-track][data-selected="true"]')).toHaveCount(1);
  });

  test(`the resource inspector keeps unit, lesson and source relationships distinct ${prefix || "English"}`, async ({ page }) => {
    await page.goto(`${prefix}/learn/foundations/resource-map/?unit=assay-readout-and-controls`);
    const inspector = page.locator("resource-relationship-inspector");
    await expect(inspector).toHaveAttribute("data-selected-unit", "assay-readout-and-controls");
    await expect(inspector.locator("[data-selected-lesson]")).toHaveAttribute("href", `${prefix}/learn/drug-discovery-foundations/assay-controls-dose-response/`);
    await expect(inspector.locator("[data-selected-resources] a")).toHaveCount(2);
    await inspector.locator("[data-resource-track-choice]").selectOption("machine-learning");
    await expect(page).toHaveURL(/unit=scientific-computing-environments/);
    await expect(inspector.locator("[data-selected-resources] a")).toHaveCount(5);
    await page.reload();
    await expect(inspector).toHaveAttribute("data-selected-unit", "scientific-computing-environments");
  });
}
