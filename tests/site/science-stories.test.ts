import { stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderStoryFrame,
  scienceStory,
} from "../../site/src/lib/science-stories.js";
import {
  storyMedia,
  type StoryId,
  type StoryLocale,
} from "../../site/src/lib/story-media.js";
const stories: StoryId[] = ["evidence", "identity", "dmta"];
const locales: StoryLocale[] = ["en", "zh-cn"];
const tokenPosition = (svg: string, id: string) => {
  const match = [
    ...svg.matchAll(
      /<g transform="translate\(([\d.]+) ([\d.]+)\)"><rect width="120"[\s\S]*?<text[^>]*>([^<]+)<\/text><\/g>/gu,
    ),
  ].find((entry) => entry[3] === id);
  if (!match) throw new Error(`Missing token ${id}`);
  return { x: Number(match[1]), y: Number(match[2]) };
};
describe("scientific story evidence boundaries and shared frames", () => {
  it("retains five evidence stages and four steps for the constructed lessons in both languages", () => {
    for (const locale of locales) {
      expect(scienceStory("evidence", locale).steps).toHaveLength(5);
      expect(scienceStory("identity", locale).steps).toHaveLength(4);
      expect(scienceStory("dmta", locale).steps).toHaveLength(4);
    }
    expect(scienceStory("identity", "en").boundary).toContain(
      "not real assay measurements",
    );
    expect(scienceStory("dmta", "en").boundary).toContain(
      "separate from the empirical pool-budget curves",
    );
  });
  it("shows the known row-split defect and then preserves the parent, in wide and narrow scenes", () => {
    for (const narrow of [false, true]) {
      const defect = renderStoryFrame("identity", 0.625, "en", narrow);
      const grouped = renderStoryFrame("identity", 0.999999, "en", narrow);
      expect(tokenPosition(defect, "A · r1").y).toBeLessThan(
        tokenPosition(defect, "A · r2").y,
      );
      expect(defect).toContain("crosses the boundary");
      const first = tokenPosition(grouped, "A · r1"),
        second = tokenPosition(grouped, "A · r2"),
        evaluation = tokenPosition(grouped, "B · r3");
      expect(Math.max(first.y, second.y)).toBeLessThan(evaluation.y);
      expect(grouped).toContain("membership preserved");
      expect(grouped).not.toMatch(/pIC50|RMSE|AUC|accuracy/iu);
    }
  });
  it("bounds invalid animation input and keeps the same identifiers across translations", () => {
    expect(renderStoryFrame("identity", Number.NaN, "en")).toBe(
      renderStoryFrame("identity", 0, "en"),
    );
    expect(renderStoryFrame("identity", 2, "en")).toBe(
      renderStoryFrame("identity", 0.999999, "en"),
    );
    for (const locale of locales)
      for (const progress of [0, 0.375, 0.625, 0.999999]) {
        const frame = renderStoryFrame("identity", progress, locale);
        for (const record of ["A · r1", "A · r2", "B · r3"])
          expect(frame).toContain(record);
      }
  });
  it("ships real download files, with videos below the two-MB contract and no SVG deliverables", async () => {
    for (const story of stories)
      for (const locale of locales) {
        const media = storyMedia(story, locale);
        expect(media.durationSeconds).toBe(10);
        for (const format of ["mp4", "webm", "gif", "poster"] as const) {
          const file = await stat(
            join(process.cwd(), "site/public", media[format]),
          );
          expect(file.isFile()).toBe(true);
          expect(file.size).toBeGreaterThan(1000);
          if (format === "mp4" || format === "webm")
            expect(file.size).toBeLessThanOrEqual(2_000_000);
          expect(media[format]).not.toMatch(/\.svg$/u);
        }
      }
  });
});
