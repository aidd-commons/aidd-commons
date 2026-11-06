export interface RetainedPoint { x: number; y: number; label?: string }

export type PlotScale = "linear" | "log";

/** Transform coordinates only. Source coordinates are retained in tables and exports. */
export function plotFraction(value: number, minimum: number, maximum: number, scale: PlotScale = "linear"): number {
  if (![value, minimum, maximum].every(Number.isFinite) || maximum <= minimum)
    throw new Error("Plot coordinates require finite values and increasing limits");
  if (scale === "log" && Math.min(value, minimum, maximum) <= 0)
    throw new Error("A logarithmic plot requires positive source values and limits");
  return scale === "log" ? Math.log(value / minimum) / Math.log(maximum / minimum) : (value - minimum) / (maximum - minimum);
}

export function valueAtPlotFraction(fraction: number, minimum: number, maximum: number, scale: PlotScale = "linear"): number {
  plotFraction(minimum, minimum, maximum, scale);
  return scale === "log" ? minimum * (maximum / minimum) ** fraction : minimum + fraction * (maximum - minimum);
}

/** Sorted source coordinates only: selection never interpolates an observation. */
export function retainedXValues(series: {points: RetainedPoint[]}[]): number[] {
  return [...new Set(series.flatMap(line => line.points.map(point => point.x)))].sort((a,b) => a-b);
}

export function nearestRetainedX(xs: number[], x: number, scale: PlotScale = "linear"): number | undefined {
  if (!xs.length || !Number.isFinite(x) || (scale === "log" && (x <= 0 || xs.some(value => value <= 0)))) return undefined;
  const distance = (value: number) => scale === "log" ? Math.abs(Math.log(value / x)) : Math.abs(value - x);
  return xs.reduce((best,value) => distance(value) < distance(best) ? value : best);
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
