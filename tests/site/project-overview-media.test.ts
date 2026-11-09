import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OVERVIEW_STAGES,
  projectOverviewMedia,
} from "../../site/src/lib/project-overview-media.js";

const publicDir = resolve(process.cwd(), "site/public");

describe("project overview walkthrough media", () => {
  it("defines ten contiguous 12-second chapters covering 120 seconds (2 minutes)", () => {
    expect(OVERVIEW_STAGES).toHaveLength(10);
    OVERVIEW_STAGES.forEach((stage, idx) => {
      expect(stage.index).toBe(idx);
      expect(stage.startSeconds).toBe(idx * 12);
      expect(stage.endSeconds).toBe((idx + 1) * 12);
      expect(stage.titleEn.length).toBeGreaterThan(10);
      expect(stage.titleZh.length).toBeGreaterThan(6);
      expect(stage.subphasesEn).toHaveLength(3);
      expect(stage.subphasesZh).toHaveLength(3);
    });
  });

  it("ships non-empty English and Chinese 2-minute overview video, GIF, poster, and 10 chapter stills", () => {
    for (const locale of ["en", "zh-cn"] as const) {
      const media = projectOverviewMedia(locale);
      expect(media.durationSeconds).toBe(120);
      for (const relPath of [media.poster, media.mp4, media.webm, media.gif]) {
        const fullPath = resolve(publicDir, relPath.replace(/^\//, ""));
        expect(existsSync(fullPath), `${relPath} should exist`).toBe(true);
        expect(statSync(fullPath).size).toBeGreaterThan(10_000);
      }
      for (let stageNum = 1; stageNum <= 10; stageNum += 1) {
        const stillPath = resolve(
          publicDir,
          `media/overview/aidd-commons-overview-${locale}-stage-${stageNum}.webp`,
        );
        expect(existsSync(stillPath), `${stillPath} should exist`).toBe(true);
        expect(statSync(stillPath).size).toBeGreaterThan(10_000);
      }
    }
  });
});
