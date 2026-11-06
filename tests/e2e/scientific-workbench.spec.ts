import { readFileSync, mkdirSync } from "node:fs";
import { parse } from "yaml";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const tracks = (parse(readFileSync("catalog/curriculum/tracks.yaml", "utf8")).tracks as {id:string}[]).map(track=>track.id);

for(const track of tracks){
  test(`scientific view ${track} has usable controls and a readable source boundary`,async({page},testInfo)=>{
    const mobile=testInfo.project.name.includes("mobile");
    await page.emulateMedia({colorScheme:mobile?"dark":"light",reducedMotion:"reduce"});
    await page.goto(`/${mobile?"zh-cn/":""}learn/tracks/${track}/`);
    const view=page.locator(`[data-teaching-view="${track}"]`);
    await expect(view).toBeVisible();
    await view.scrollIntoViewIfNeeded();
    const selector=view.locator("[data-panel-select]").first();
    if(await selector.count()){
      const options=selector.locator("option");
      if(await options.count()>1){
        const value=await options.last().getAttribute("value");
        await selector.selectOption(value!);
        await expect(view.locator(`[data-teaching-panel="${value}"]`)).toBeVisible();
      }
    }
    const width=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    expect(width.width).toBeLessThanOrEqual(width.viewport+1);
    const audit=await new AxeBuilder({page}).include(`[data-teaching-view="${track}"]`).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations,JSON.stringify(audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})))).toEqual([]);
    await view.evaluate(async element=>{
      for(const image of element.querySelectorAll("img")){
        if(image.checkVisibility() && !image.closest("details:not([open])")){
          image.loading="eager";
          await Promise.race([image.decode().catch(()=>undefined),new Promise(resolve=>setTimeout(resolve,2000))]);
        }
      }
    });
    const folder=`tmp/platform-upgrade-20261026/scientific-views/${testInfo.project.name}`;
    mkdirSync(folder,{recursive:true});
    // Chrome's expanded element capture can paint the offscreen fixed skip link.
    // Preserve focused links; suppress only its already-hidden state for the capture.
    await view.screenshot({path:`${folder}/${track}.png`,timeout:30000,style:".skip-link:not(:focus) { visibility: hidden !important; }"});
  });
}

test("scientific views keep all declared states readable without scripting",async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false,baseURL});
  try{
    const page=await context.newPage();
    await page.goto("/learn/tracks/drug-discovery-foundations/");
    const view=page.locator("[data-teaching-view]");
    await expect(view.locator("[data-teaching-panel=residual]")).toBeVisible();
    await expect(view.locator("[data-teaching-panel=inhibition]")).toBeVisible();
    await expect(view.locator("select")).toBeHidden();
  }finally{await context.close();}
});
