import {describe,it,expect} from 'vitest';
import {figureSourceRows} from '../helpers/figure-source-table.js';
describe('SSR figure source table parser',()=>{
 it('reads scoped table markup, precision, bilingual labels and escaped source text',()=>{
  const html='<section id="figure-source-table" class="astro-x"><table class="astro-x"><tbody class="astro-x" data-scope><tr class="astro-x"><th scope="row" class="astro-x">Mean &amp; baseline</th><td class="astro-x">0.000087</td><td class="astro-x">来源 &#x3b1; &lt; 1</td></tr></tbody></table></section>';
  expect(figureSourceRows(html)).toEqual([['Mean & baseline','0.000087','来源 α < 1']]);
 });
 it('keeps every row and rejects missing table structure with an informative error',()=>{
  expect(figureSourceRows('<section id="figure-source-table"><tbody data-astro-cid-a><tr><td>A</td></tr><tr><td>B</td></tr></tbody></section>')).toEqual([['A'],['B']]);
  expect(()=>figureSourceRows('<section id="figure-source-table"></section>')).toThrow('Missing figure source table body');
  expect(()=>figureSourceRows('<section id="other-table"><tbody></tbody></section>')).toThrow('Missing figure-source-table section');
 });
});
