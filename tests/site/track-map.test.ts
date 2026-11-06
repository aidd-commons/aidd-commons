import { describe, expect, it } from "vitest";
import { prerequisiteLayers } from "../../site/src/lib/track-map.js";
import { workbenchData } from "../../site/src/lib/workbench-data.js";

describe("the curriculum prerequisite map", () => {
  it("places every canonical track once and every prerequisite in an earlier layer", () => {
    const layers = prerequisiteLayers(workbenchData.tracks);
    expect(layers.flat().map((track) => track.id).sort()).toEqual(
      workbenchData.tracks.map((track) => track.id).sort(),
    );
    const position = new Map(layers.flatMap((layer, index) => layer.map((track) => [track.id, index])));
    for (const track of workbenchData.tracks) {
      for (const prerequisite of track.prerequisiteIds) {
        expect(position.get(prerequisite)).toBeLessThan(position.get(track.id)!);
      }
    }
    expect(layers).toHaveLength(6);
    expect(layers[0].map((track) => track.id)).toEqual(["foundations"]);
  });

  it("uses the longest prerequisite chain and preserves declared order within a layer", () => {
    const tracks = [
      { id: "end", order: 4, prerequisiteIds: ["start", "middle"] },
      { id: "peer", order: 3, prerequisiteIds: ["start"] },
      { id: "start", order: 1, prerequisiteIds: [] },
      { id: "middle", order: 2, prerequisiteIds: ["start"] },
    ];
    expect(prerequisiteLayers(tracks).map((layer) => layer.map((track) => track.id))).toEqual([
      ["start"], ["middle", "peer"], ["end"],
    ]);
    expect(tracks[0].id).toBe("end");
  });
});
