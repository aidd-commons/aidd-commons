import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { expectedTrackIds } from "../../scripts/curriculum/curriculum.js";
import {
  teachingViews,
  type TeachingSource,
} from "../../site/src/data/teaching-views.js";
import badLink from "./fixtures/teaching-projections/metadata-bad-link.json" with { type: "json" };

const root = fileURLToPath(new URL("../..", import.meta.url));
const docs = join(root, "site/src/content/docs");

function unresolvedSources(sources: TeachingSource[]): string[] {
  return sources.flatMap((source) => {
    if (!source.url.startsWith("/")) return [];
    const path = source.url.split("#")[0].replace(/^\/|\/$/g, "");
    return ["", "zh-cn/"]
      .filter((prefix) => !existsSync(join(docs, prefix + path + ".mdx")))
      .map((prefix) => prefix + path);
  });
}

async function mdxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? mdxFiles(join(directory, entry.name))
          : Promise.resolve(
              entry.name.endsWith(".mdx") ? [join(directory, entry.name)] : [],
            ),
      ),
    )
  ).flat();
}

describe("scientific teaching destinations and bilingual evidence", () => {
  it("covers every canonical track with an embedded bilingual source-linked view", async () => {
    expect(Object.keys(teachingViews).sort()).toEqual(
      [...expectedTrackIds].sort(),
    );
    for (const track of expectedTrackIds) {
      const view = teachingViews[track];
      expect(view.sources.length, track).toBeGreaterThan(0);
      expect(unresolvedSources(view.sources), track).toEqual([]);
      for (const prefix of ["", "zh-cn/"]) {
        const text = await readFile(
          join(docs, prefix + "learn/" + view.lesson + ".mdx"),
          "utf8",
        );
        expect(text, view.lesson).toContain("<ScientificTeachingView");
        expect(text, view.lesson).toContain('track="' + track + '"');
      }
      if (view.lab) {
        expect(
          existsSync(join(docs, "labs", view.lab + ".mdx")),
          view.lab,
        ).toBe(true);
        expect(
          existsSync(join(docs, "zh-cn/labs", view.lab + ".mdx")),
          view.lab,
        ).toBe(true);
      }
    }
  });

  it("does not silently accept a nonexistent source destination", () => {
    expect(unresolvedSources([badLink])).toEqual([
      "labs/paperqa-local-documents",
      "zh-cn/labs/paperqa-local-documents",
    ]);
  });

  it("preserves significant quantities in bilingual scientific-view prose", () => {
    const significant = /\d+\.\d+|\d{3,}/g;
    for (const [track, view] of Object.entries(teachingViews)) {
      for (const field of [
        "question",
        "mechanism",
        "worked",
        "task",
        "answer",
        "limit",
        "state",
      ] as const) {
        const english = [
          ...new Set(view[field].en.match(significant) ?? []),
        ].sort();
        const chinese = [
          ...new Set(view[field].zh.match(significant) ?? []),
        ].sort();
        expect(chinese, track + "/" + field).toEqual(english);
      }
    }
  });

  it("connects every existing Learn page to its track's scientific object", async () => {
    const files = await mdxFiles(join(docs, "learn"));
    expect(files.length).toBeGreaterThan(100);
    for (const file of files) {
      const text = await readFile(file, "utf8");
      expect(
        /<(?:TeachingViewLink|ScientificTeachingView)\s+track=/.test(text),
        file,
      ).toBe(true);
    }
  });
});
