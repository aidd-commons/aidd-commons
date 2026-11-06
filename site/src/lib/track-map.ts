/** Layout follows declared prerequisites; track order only orders peers. */
export function prerequisiteLayers<T extends { id: string; order: number; prerequisiteIds: string[] }>(tracks: T[]): T[][] {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const depths = new Map<string, number>();
  const depth = (id: string): number => {
    if (depths.has(id)) return depths.get(id)!;
    const prerequisites = byId.get(id)?.prerequisiteIds ?? [];
    const value = prerequisites.length ? 1 + Math.max(...prerequisites.map(depth)) : 0;
    depths.set(id, value);
    return value;
  };
  const layers: T[][] = [];
  for (const track of [...tracks].sort((a, b) => a.order - b.order)) {
    const index = depth(track.id);
    (layers[index] ??= []).push(track);
  }
  return layers;
}
