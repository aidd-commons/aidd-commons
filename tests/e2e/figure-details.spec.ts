import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import type {FigureData} from '../../site/src/lib/figure-detail.js';
import {figureSourceRows} from '../helpers/figure-source-table.js';
const details=JSON.parse(readFileSync('site/src/data/figure-details.json','utf8')) as FigureData[];
const manifest=JSON.parse(readFileSync('site/src/data/atlas-figures.json','utf8')).library as {id:string;title:string;reportNumber:number;pdf:string;file:string}[];
function csvRows(text:string):string[][]{const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===','){row.push(cell);cell='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
for(const chinese of [false,true])for(const d of details){
 test(`${chinese?'ZH':'EN'} figure ${d.reportNumber}: SSR identity, all rows and exact CSV values`,async({request})=>{
  const path=`/${chinese?'zh-cn/':''}report/figures/${d.id}/`;const response=await request.get(path);expect(response.ok()).toBe(true);const html=await response.text();const entry=manifest.find(e=>e.id===d.id)!;
  expect(html).toContain(`data-figure-id="${d.id}"`);expect(html).toContain(entry.title);expect(html).toContain(`/figures/${entry.pdf}`);expect(html).toContain(`/figures/${entry.file}`);
  const rows=figureSourceRows(html);
  expect(rows).toEqual(d.table.rows.map(row=>row.map(String)));
  const csv=await request.get(`/data/figures/${d.id}.csv`);expect(csv.ok()).toBe(true);const parsed=csvRows((await csv.text()).replace(/^\uFEFF/,''));expect(parsed[0]).toEqual(d.table.headers);expect(parsed).toHaveLength(d.table.rows.length+1);
  d.table.rows.forEach((row,i)=>row.forEach((cell,j)=>typeof cell==='number'?expect(Number(parsed[i+1][j])).toBe(cell):expect(parsed[i+1][j]).toBe(cell)));
 });
}
for(const width of [390,768,1440])test(`figure selectors and source plots fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/report/figures/plot-6-openness-matrix/');await page.locator('[data-figure-select]').selectOption('model');await expect(page.locator('[data-figure-group]:visible')).toHaveCount(1);await expect(page.locator('[data-figure-group="model"] [data-evidence-state="unverified"]')).toHaveCount(7);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto('/report/figures/plot-9-representation-ranking-flips/');await page.locator('[data-figure-select]').selectOption('mae');const plot=page.locator('[data-science-plot]:visible');await expect(plot).toHaveAttribute('data-x-scale','log');await plot.locator('[data-plot-range]').focus();await page.keyboard.press('End');expect(Number(await plot.locator('[data-plot-x]').getAttribute('data-exact-value'))).toBeGreaterThan(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('policy inspectors synchronize at retained points, including step control',async({page})=>{
 await page.goto('/report/figures/plot-10-acquisition-policy-recovery/');await page.locator('[data-figure-select]').selectOption('CHEMBL5736995');const plots=page.locator('[data-figure-group="CHEMBL5736995"] [data-science-plot]');await plots.first().locator('[data-plot-range]').focus();await page.keyboard.press('End');await expect(plots.nth(1).locator('[data-plot-x]')).toHaveAttribute('data-exact-value','124');await page.locator('[data-step-reset]').click();await page.locator('[data-step-next]').click();await expect(plots.first().locator('[data-plot-x]')).toHaveAttribute('data-exact-value','31');await expect(plots.nth(1).locator('[data-plot-x]')).toHaveAttribute('data-exact-value','31');
});
for(const [id,count,duration] of [['schematic-01-artifacts',4,8],['schematic-03-decision-pipeline',9,27],['schematic-07-frozen-lifecycle',5,15],['plot-10-acquisition-policy-recovery',5,10]] as const)test(`walkthrough ${id} holds its final step until ${duration}s`,async({page})=>{
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.goto(`/report/figures/${id}/`);await page.locator('[data-step-play]').scrollIntoViewIfNeeded();await page.locator('[data-step-play]').click();await expect(page.locator('[data-step-play]')).toHaveText('Pause');await page.clock.runFor(duration*1000-1);await expect(page.locator('[data-step-status]')).toHaveText(`${count} / ${count}`);await expect(page.locator('[data-step-play]')).toHaveText('Pause');await page.clock.runFor(1);await expect(page.locator('[data-step-play]')).toHaveText('Play');
});
test('reduced motion keeps manual steps and does not request motion media',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const requests:string[]=[];page.on('request',request=>requests.push(request.url()));await page.goto('/zh-cn/report/figures/schematic-03-decision-pipeline/');await expect(page.locator('[data-step-play]')).toBeDisabled();await page.locator('[data-step-next]').click();await expect(page.locator('[data-step-status]')).toHaveText('2 / 9');expect(requests.filter(url=>/\.(mp4|webm|gif)(\?|$)/.test(url))).toEqual([]);await expect(page.locator('[data-figure-step-item="1"]')).toHaveAttribute('aria-current','step');
});
test('no-JavaScript readers retain complete tables, CSV and direct original downloads',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false,baseURL,viewport:{width:390,height:844}});const page=await context.newPage();for(const id of ['plot-2-coverage-bounds','plot-10-acquisition-policy-recovery','schematic-04-stage-contracts']){const d=details.find(d=>d.id===id)!;await page.goto(`/report/figures/${id}/`);await page.locator('#figure-source-table summary').click();await expect(page.locator('#figure-source-table tbody tr')).toHaveCount(d.table.rows.length);await expect(page.locator('#figure-source-table a[download]')).toBeVisible();await expect(page.locator('[data-detail-enlarge]')).toHaveAttribute('href',`/figures/${id}.png`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id}: no-JavaScript page should stay inside its viewport`).toBe(true);}await context.close();
});
