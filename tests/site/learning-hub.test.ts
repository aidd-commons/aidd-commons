import { describe, expect, it } from "vitest";
import {
  learningProgress,
  learningStepClosure,
  nextLearningStep,
  type LearningStep,
} from "../../site/src/lib/learning-hub.js";
import { workbenchData } from "../../site/src/lib/workbench-data.js";

const lessons: LearningStep[] = [
  {
    id: "evidence/source",
    title: "Read the source",
    href: "/source/",
    prerequisiteIds: [],
  },
  {
    id: "model/data",
    title: "Build the table",
    href: "/data/",
    prerequisiteIds: ["evidence/source"],
  },
  {
    id: "model/fit",
    title: "Fit the model",
    href: "/fit/",
    prerequisiteIds: ["model/data"],
  },
  {
    id: "model/interpret",
    title: "Interpret the result",
    href: "/interpret/",
    prerequisiteIds: ["model/fit"],
  },
  {
    id: "other/unrelated",
    title: "Another task",
    href: "/other/",
    prerequisiteIds: [],
  },
];

describe("declared learning route continuation", () => {
  it("returns the earliest unfinished prerequisite, including outside the route", () => {
    const route = {
      lessonIds: ["model/fit", "model/interpret"],
      prerequisiteIds: [],
    };
    expect(nextLearningStep(route, lessons, [])).toEqual({
      id: "evidence/source",
      reason: "lesson-prerequisite",
    });
    expect(nextLearningStep(route, lessons, ["evidence/source"])).toEqual({
      id: "model/data",
      reason: "lesson-prerequisite",
    });
    expect(
      nextLearningStep(route, lessons, ["evidence/source", "model/data"]),
    ).toEqual({ id: "model/fit", reason: "next" });
  });

  it("honours explicit route prerequisites and never adds completion credit", () => {
    const completed = ["legacy/retained-id"];
    expect(
      nextLearningStep(
        { lessonIds: ["model/fit"], prerequisiteIds: ["model/data"] },
        lessons,
        completed,
      ),
    ).toEqual({ id: "evidence/source", reason: "route-prerequisite" });
    expect(completed).toEqual(["legacy/retained-id"]);
  });

  it("counts each declared lesson once while preserving unrelated stored records", () => {
    expect(
      learningProgress(
        ["model/data", "model/data", "model/fit"],
        ["model/data", "legacy/retained-id"],
      ),
    ).toEqual({ completed: 1, total: 2 });
    expect(
      nextLearningStep(
        { lessonIds: ["model/fit", "model/interpret"], prerequisiteIds: [] },
        lessons,
        lessons.map(({ id }) => id),
      ),
    ).toBeNull();
  });

  it("sends only the route and its transitive prerequisites to the browser", () => {
    expect(
      learningStepClosure(
        [{ lessonIds: ["model/fit"], prerequisiteIds: [] }],
        lessons,
      ).map(({ id }) => id),
    ).toEqual(["evidence/source", "model/data", "model/fit"]);
  });
});

describe("canonical learning hub destinations", () => {
  it("keeps all 18 bilingual track hubs separate from Starlight lesson routes", () => {
    expect(workbenchData.tracks).toHaveLength(18);
    for (const track of workbenchData.tracks) {
      expect(track.href).toBe(`/learn/tracks/${track.id}/`);
      expect(track.hrefZh).toBe(`/zh-cn/learn/tracks/${track.id}/`);
      expect(track.lessons.length).toBeGreaterThan(0);
      for (const lesson of track.lessons) {
        expect(lesson.href).toBe(`/learn/${lesson.id}/`);
        expect(lesson.hrefZh).toBe(`/zh-cn/learn/${lesson.id}/`);
      }
    }
  });

  it("resolves every possible route continuation to a published lesson", () => {
    const canonicalLessons = workbenchData.tracks.flatMap(
      (track) => track.lessons,
    );
    const ids = new Set(canonicalLessons.map(({ id }) => id));
    for (const route of workbenchData.routes) {
      const completed: string[] = [];
      const selected = new Set<string>();
      let next = nextLearningStep(route, canonicalLessons, completed);
      while (next) {
        expect(ids.has(next.id), `${route.id}: ${next.id}`).toBe(true);
        expect(
          selected.has(next.id),
          `${route.id}: repeated continuation ${next.id}`,
        ).toBe(false);
        selected.add(next.id);
        completed.push(next.id);
        next = nextLearningStep(route, canonicalLessons, completed);
      }
      expect(route.lessonIds.every((id) => selected.has(id))).toBe(true);
    }
  });
});
