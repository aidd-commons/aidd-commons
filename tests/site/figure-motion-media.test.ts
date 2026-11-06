import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { figureMotionMedia } from "../../site/src/lib/figure-motion-media.js";

describe("localized native figure movie delivery", () => {
  it.each([
    ["decision-pipeline", "en", 27, 9],
    ["decision-pipeline", "zh-cn", 27, 9],
    ["frozen-lifecycle", "en", 15, 5],
    ["frozen-lifecycle", "zh-cn", 15, 5],
  ] as const)(
    "ships real %s / %s containers and a final poster",
    async (figure, locale, seconds, stages) => {
      const media = figureMotionMedia(figure, locale);
      expect(media.durationSeconds).toBe(seconds);
      expect(media.stepCount).toBe(stages);
      const paths = new Set<string>();
      for (const format of ["mp4", "webm", "gif", "poster"] as const) {
        const publicPath = media[format];
        const extension = format === "poster" ? "webp" : format;
        expect(publicPath).toBe(
          `/media/figures/${figure}-${locale}.${extension}`,
        );
        paths.add(publicPath);
        const path = join(process.cwd(), "site/public", publicPath);
        const file = await stat(path);
        expect(file.isFile()).toBe(true);
        expect(file.size).toBeGreaterThan(1000);
        const bytes = await readFile(path);
        // Presence alone could admit a server error page saved as a movie.
        if (format === "mp4")
          expect(bytes.subarray(4, 8).toString("ascii")).toBe("ftyp");
        else if (format === "webm")
          expect([...bytes.subarray(0, 4)]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
        else if (format === "gif") {
          expect(bytes.subarray(0, 6).toString("ascii")).toMatch(
            /^GIF8[79]a$/u,
          );
          expect([bytes.readUInt16LE(6), bytes.readUInt16LE(8)]).toEqual([
            960, 648,
          ]);
        } else {
          expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
          expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
        }
      }
      expect(paths.size).toBe(4);
    },
  );
});
