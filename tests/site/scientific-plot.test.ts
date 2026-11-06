import {describe,expect,it} from "vitest";
import {nearestRetainedX,pointsAtNearestX,retainedXValues,readablePlotValue,plotFraction,valueAtPlotFraction} from "../../site/src/lib/scientific-plot.js";

describe("retained scientific plot inspection",()=>{
  it("uses logarithmic display coordinates without replacing original data",()=>{
    const source=[.01,.1,1,10];
    source.forEach((value,index)=>expect(plotFraction(value,.01,10,"log")).toBeCloseTo(index/3));
    expect(valueAtPlotFraction(2/3,.01,10,"log")).toBeCloseTo(1);
    expect(source).toEqual([.01,.1,1,10]);
    expect(nearestRetainedX([.1,1],.4,"log")).toBe(1);
    expect(nearestRetainedX([.1,1],0,"log")).toBeUndefined();
    expect(()=>plotFraction(0,.01,10,"log")).toThrow(/positive/);
    expect(()=>plotFraction(1,0,10,"log")).toThrow(/positive/);
  });
  it("rounds human readouts without changing source precision",()=>{
    const source=-.3979400086720376;
    expect(readablePlotValue(source)).toBe("-0.39794");
    expect(readablePlotValue(79.10199999999999)).toBe("79.102");
    expect(String(source)).toBe("-0.3979400086720376");
  });
  it("keeps both observations at a duplicated scatter x and their source identity",()=>{
    const points=[{x:1,y:2,label:"parent A"},{x:1,y:7,label:"parent B"},{x:3,y:4,label:"parent C"}];
    expect(pointsAtNearestX(points,1)).toEqual([{point:points[0],index:0},{point:points[1],index:1}]);
    expect(pointsAtNearestX(points,2.8)).toEqual([{point:points[2],index:2}]);
    expect(points).toEqual([{x:1,y:2,label:"parent A"},{x:1,y:7,label:"parent B"},{x:3,y:4,label:"parent C"}]);
  });
  it("selects only retained coordinates, with a stable lower-x tie for the slider",()=>{
    const xs=retainedXValues([{points:[{x:5,y:1},{x:0,y:2}]},{points:[{x:2,y:4},{x:5,y:8}]}]);
    expect(xs).toEqual([0,2,5]);
    expect(nearestRetainedX(xs,1)).toBe(0);
    expect(nearestRetainedX(xs,4.9)).toBe(5);
  });
  it("treats empty series and invalid external cursor values as no selection",()=>{
    expect(retainedXValues([{points:[]}])).toEqual([]);
    expect(nearestRetainedX([],0)).toBeUndefined();
    expect(nearestRetainedX([0,1],Number.NaN)).toBeUndefined();
    expect(pointsAtNearestX([],1)).toEqual([]);
  });
});
