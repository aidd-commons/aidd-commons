import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {figureGroups,commonPanels,type FigureData} from '../../site/src/lib/figure-detail.js';
import {walkthroughState,retainedCheckpointAtStep} from '../../site/src/lib/figure-steps.js';
const details=JSON.parse(readFileSync('site/src/data/figure-details.json','utf8')) as FigureData[];
const data=(key:string)=>details.find(d=>d.key===key) as unknown as FigureData;
describe('source-bound figure detail views',()=>{
 it('provides every canonical report number and all 65 coverage bounds',()=>{
  expect(details.map(d=>d.reportNumber)).toEqual(Array.from({length:20},(_,i)=>i+1));
  const d=data('P2');expect(d.table.rows).toHaveLength(65);expect(figureGroups(d)).toHaveLength(5);
  for(const group of figureGroups(d)){expect(group.panels[0].rows).toHaveLength(13);for(const r of group.panels[0].rows!)expect(r.lower<=r.upper&&r.upper<=93).toBe(true);}
 });
 it('preserves all four openness states and applicable denominators in every cell',()=>{
  const d=data('P6');expect(d.table.rows).toHaveLength(70);
  for(const group of figureGroups(d))for(const row of group.panels[0].rows!){expect(row.segments.map((s:any)=>s.label)).toEqual(['available','unverified','not_available','not_applicable']);const total=row.segments.reduce((n:number,s:any)=>n+s.value,0);expect(total).toBe(d.totals[group.id]);}
 });
 it('keeps every fixed policy instance and both synchronized retained curves',()=>{
  const d=data('P10');expect(figureGroups(d)).toHaveLength(2);expect(d.table.rows).toHaveLength(70);
  for(const group of figureGroups(d)){const [recovery,error,auc]=group.panels;expect(recovery.series).toHaveLength(7);expect(recovery.series.filter((s:any)=>s.name.startsWith('random'))).toHaveLength(5);expect(error.syncGroup).toBe(recovery.syncGroup);expect(auc.rows).toHaveLength(7);for(const series of recovery.series)expect(series.points.map((p:any)=>p.x)).toEqual(d.assays[group.id].checkpoints);}
 });
 it('retains undefined intervals, adverse rank correlation, and six CYP extremes',()=>{
  expect(data('P8').table.rows.filter(r=>r[1]==='train_mean'&&['coverage','mean_width'].includes(String(r[0]))).every(r=>String(r[2]).startsWith('undefined'))).toBe(true);
  expect(data('P9').results.assay_replication.metrics.morgan_ridge.spearman).toBeLessThan(0);
  expect(commonPanels(data('P13'))[0].rows).toHaveLength(6);expect(commonPanels(data('P13'))[0].title).toContain('CYP');
 });
 it('uses discrete block samples and the complete unsmoothed log-frame range',()=>{
  const block=figureGroups(data('P11'))[1].panels[0];expect(block.series[0].connect).toBe(false);expect(block.series[0].points.map((p:any)=>p.x)).toEqual([10,100,1000]);
  const trajectory=figureGroups(data('P12'))[0].panels[0];expect(trajectory.xScale).toBe('log');expect(trajectory.series[0].points.map((p:any)=>p.x)).toEqual([100,1000,10000,100000]);
 });
 it('holds the final retained step for its full interval for all four approved durations',()=>{
  for(const [count,duration] of [[4,8],[9,27],[5,15],[5,10]]){expect(walkthroughState(duration-duration/count,count,duration)).toEqual({index:count-1,finished:false});expect(walkthroughState(duration-.001,count,duration)).toEqual({index:count-1,finished:false});expect(walkthroughState(duration,count,duration)).toEqual({index:count-1,finished:true});}
  expect(()=>walkthroughState(1,0,8)).toThrow();
 });
 it('never sends an undefined or interpolated checkpoint to an ancillary inspector',()=>{
  const series=[{points:[{x:62},{x:0},{x:31}]}];expect(retainedCheckpointAtStep(series,1)).toBe(31);expect(retainedCheckpointAtStep(series,8)).toBe(62);expect(retainedCheckpointAtStep([],3)).toBeUndefined();
 });
});
