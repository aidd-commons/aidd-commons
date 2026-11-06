export interface RetainedPoint { x: number; y: number; label?: string }

/** Sorted source coordinates only: selection never interpolates an observation. */
export function retainedXValues(series: {points: RetainedPoint[]}[]): number[] {
  return [...new Set(series.flatMap(line => line.points.map(point => point.x)))].sort((a,b) => a-b);
}

export function nearestRetainedX(xs: number[], x: number): number | undefined {
  if (!xs.length || !Number.isFinite(x)) return undefined;
  return xs.reduce((best,value) => Math.abs(value-x)<Math.abs(best-x) ? value : best);
}

/** Keep every observation at a repeated x; scatter points are never deduplicated. */
export function pointsAtNearestX(points: RetainedPoint[], x: number): {point: RetainedPoint; index: number}[] {
  const selected=nearestRetainedX(points.map(point=>point.x),x);
  return selected === undefined ? [] : points.flatMap((point,index)=>point.x===selected ? [{point,index}] : []);
}

/** Display precision only; source values remain available in DOM attributes and exports. */
export function readablePlotValue(value: number): string {
  return Number(value.toPrecision(6)).toString();
}
