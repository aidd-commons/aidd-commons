/** The final checkpoint occupies its full interval; no synthetic intermediate point. */
export function walkthroughState(elapsedSeconds:number,count:number,durationSeconds:number):{index:number;finished:boolean}{
 if(!Number.isFinite(elapsedSeconds)||!Number.isInteger(count)||count<1||!Number.isFinite(durationSeconds)||durationSeconds<=0)throw new Error('Invalid walkthrough timing');
 return {index:Math.min(count-1,Math.max(0,Math.floor(elapsedSeconds*count/durationSeconds))),finished:elapsedSeconds>=durationSeconds};
}
export function retainedCheckpointAtStep(series:{points:{x:number}[]}[],index:number):number|undefined{
 const xs=[...new Set(series.flatMap(s=>s.points.map(p=>p.x)))].filter(Number.isFinite).sort((a,b)=>a-b);
 return xs.length?xs[Math.max(0,Math.min(xs.length-1,index))]:undefined;
}
