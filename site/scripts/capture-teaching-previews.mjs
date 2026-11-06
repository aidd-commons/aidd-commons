/** Capture the actual default teaching views from an explicitly supplied local site. */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2];
if (!base || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//u.test(base)) {
  throw new Error(
    "Supply a running local site URL, including its trailing slash and optional site base.",
  );
}
const output = new URL("../public/figures/teaching-views/", import.meta.url);
// Show a legible native detail rather than shrinking a long teaching unit into a stamp.
const details = {
  "drug-discovery-foundations": ".science-plot__body",
  "machine-learning": ".science-plot__body",
  "data-governance": ".identity-lineage",
  representations: ".representation-workbench",
  "mechanism-targets": ".variant-region",
  "admet-pk": ".science-plot__body",
  "dti-screening": ".screening-library",
  "structure-and-pockets": ".science-object__stage",
  "physics-based-modeling": ".science-object__stage",
  "molecular-generation": ".science-plot__body",
  "biologics-design": ".construct-assembly",
  "synthesis-and-automation": ".retrosynthesis-tree",
  "active-learning": ".science-plot__body",
  "evaluation-and-reproducibility": ".identity-comparison",
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  await page.addInitScript(() =>
    localStorage.setItem("starlight-theme", "light"),
  );
  await page.goto(new URL("report/figures/", base).href);
  const views = await page
    .locator("[data-teaching-thumbnail]")
    .evaluateAll((images) =>
      images.map((image) => ({
        track: image.getAttribute("data-teaching-thumbnail"),
        href: image.closest("a").href,
      })),
    );
  if (
    views.length !== 18 ||
    new Set(views.map((view) => view.track)).size !== 18
  ) {
    throw new Error(
      `Expected 18 distinct source views; found ${views.length}.`,
    );
  }
  for (const view of views) {
    const source = new URL(
      `learn/tracks/${view.track}/#scientific-view-${view.track}`,
      base,
    ).href;
    await page.goto(source, { waitUntil: "networkidle" });
    const fullView = page.locator(
      `[data-teaching-view="${view.track}"] .teaching-view__visual`,
    );
    const visual = details[view.track]
      ? fullView.locator(details[view.track]).first()
      : fullView;
    await visual.waitFor({ state: "visible" });
    await visual.scrollIntoViewIfNeeded();
    await visual.evaluate(async (element) => {
      await document.fonts.ready;
      await Promise.all(
        [...element.querySelectorAll("img")]
          .filter((image) => image.getClientRects().length > 0)
          .map((image) => image.decode()),
      );
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    const bounds = await visual.boundingBox();
    const screenshot = await visual.screenshot({ animations: "disabled" });
    await sharp(screenshot)
      .resize(960, 640, { fit: "contain", background: "#fffdf8" })
      .png()
      .toFile(fileURLToPath(new URL(`${view.track}.png`, output)));
    console.log(
      JSON.stringify({
        track: view.track,
        source,
        selector: `.teaching-view__visual${details[view.track] ? ` ${details[view.track]} (first)` : ""}`,
        capturedWidth: bounds.width,
        capturedHeight: bounds.height,
        previewWidth: 960,
        previewHeight: 640,
      }),
    );
  }
} finally {
  await browser.close();
}
