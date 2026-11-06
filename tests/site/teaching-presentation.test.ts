import { describe, expect, it } from "vitest";
import {
  teachingDesigns,
  screeningPopulation,
} from "../../site/src/data/teaching-presentation.js";
import { expectedTrackIds } from "../../scripts/curriculum/curriculum.js";

describe("question-specific teaching presentation", () => {
  it("assigns a distinct scientific composition to all 18 canonical tracks", () => {
    expect(Object.keys(teachingDesigns).sort()).toEqual(
      [...expectedTrackIds].sort(),
    );
    expect(new Set(Object.values(teachingDesigns)).size).toBe(18);
  });
  it("draws the shortlist as part of the complete constructed library", () => {
    expect(screeningPopulation).toHaveLength(1000);
    expect(screeningPopulation.filter((item) => item.active)).toHaveLength(20);
    const shortlist = screeningPopulation.filter((item) => item.shortlist);
    expect(shortlist).toHaveLength(50);
    expect(shortlist.filter((item) => item.active)).toHaveLength(8);
    expect(shortlist.filter((item) => !item.active)).toHaveLength(42);
    expect(
      screeningPopulation.filter((item) => !item.shortlist && item.active),
    ).toHaveLength(12);
    expect(8 / 50 / (20 / 1000)).toBe(8);
  });
});
