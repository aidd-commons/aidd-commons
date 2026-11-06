import { mkdir } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("unified search crosses content types and restores the query", async ({ page }) => {
  await page.goto("/search/?q=EGFR");
  await expect(page.locator("[data-search-results] li").first()).toBeVisible();
  await expect(page.locator("[data-search-results]")).toContainText("EGFR");
  await page.locator('search-explorer select[name="type"]').selectOption("lab");
  await expect(page).toHaveURL(/type=lab/);
  await expect(page.locator("[data-search-results] li").first()).toBeVisible();
  await page.reload();
  await expect(page.locator('search-explorer select[name="type"]')).toHaveValue("lab");
  await page.locator('search-explorer input[name="q"]').fill("no-such-aidd-object-xyz");
  await expect(page.locator("[data-search-results] li")).toHaveCount(0);
  await expect(page.locator("[data-search-status]")).toContainText("No matching");
});

test("search failure keeps ordinary directory destinations available", async ({ page }) => {
  await page.route("**/data/search.v1.json", route => route.fulfill({status:503,body:"Unavailable"}));
  await page.goto("/search/?q=Boltz");
  await expect(page.locator("[data-search-status]")).toContainText("unavailable");
  await expect(page.getByRole("link", {name:"All resources",exact:true})).toHaveAttribute("href","/atlas/browse/");
  await expect(page.getByRole("link", {name:"Learning directory",exact:true})).toHaveAttribute("href","/learn/");
});

test("saved assay explorer changes the measure without changing the population", async ({ page }) => {
  await page.goto("/labs/");
  const explorer=page.locator("assay-result-explorer");
  const morgan=explorer.locator('output[data-assay="assay_replication"][data-model="morgan_ridge"]');
  await expect(morgan).toHaveText("3.132");
  await explorer.getByRole("combobox",{name:"Error measure"}).selectOption("rmse");
  await expect(morgan).toHaveText("3.224");
  await expect(explorer.locator("[data-axis-max]")).toHaveText("3.5 pChEMBL");
  await explorer.locator("summary").click();
  await expect(explorer.locator("tbody tr")).toHaveCount(6);
  await expect(explorer.locator("table")).toContainText("170");
  await expect(explorer.locator("table")).toContainText("132");
  await expect(explorer.locator("a").first()).toHaveAttribute("href","/labs/chembl-egfr-representation-baselines/");
});

test("contribution composer prepares the real form fields locally", async ({ page }) => {
  await page.goto("/contribute/");
  const composer=page.locator("contribution-draft");
  await composer.getByLabel("Destination",{exact:true}).selectOption("correction");
  await composer.getByLabel("Page, object and version",{exact:true}).fill("/atlas/tool-rdkit/ · licence");
  await composer.getByLabel("Your question or observation",{exact:true}).fill("Check the asset-specific licence.");
  await composer.getByLabel("Reasoning or primary evidence",{exact:true}).fill("A primary licence source.");
  await composer.getByRole("button",{name:"Prepare the GitHub draft"}).click();
  const url=new URL((await composer.locator("[data-draft-link]").getAttribute("href"))!);
  expect(url.origin).toBe("https://github.com");
  expect(url.pathname).toBe("/gxCaesar/aidd-commons/issues/new");
  expect(url.searchParams.get("template")).toBe("correction.yml");
  expect(url.searchParams.get("location")).toContain("tool-rdkit");
  expect(url.searchParams.get("summary")).toBe("Check the asset-specific licence.");
  expect(url.searchParams.get("evidence")).toBe("A primary licence source.");
  await expect(page).toHaveURL(/\/contribute\/$/);
});

const pages=[
  ["home","/"], ["home-zh","/zh-cn/"], ["learn","/learn/"],
  ["track","/learn/tracks/representations/"],
  ["lesson","/learn/representations/small-molecule-representations/"],
  ["atlas","/atlas/"], ["resource","/atlas/tool-rdkit/"],
  ["labs","/labs/"], ["labs-zh","/zh-cn/labs/"],
  ["audit","/audit/"], ["report","/report/"], ["contribute","/contribute/"],
  ["search","/search/?q=EGFR"],
] as const;

for(const theme of ["light","dark"] as const){
  for(const [name,path] of pages){
    test(`page family ${name} remains readable and accessible in ${theme}`,async({page},testInfo)=>{
      const errors:string[]=[];
      page.on("pageerror",error=>errors.push(error.message));
      await page.emulateMedia({colorScheme:theme,reducedMotion:"reduce"});
      await page.addInitScript(value=>localStorage.setItem("starlight-theme",value),theme);
      const folder=`tmp/platform-upgrade-20261026/browser/${testInfo.project.name}-${theme}`;
      await mkdir(folder,{recursive:true});
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      if(name==="search")await expect(page.locator("[data-search-results] li").first()).toBeVisible();
      const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
      expect(width.document,`${path} document overflow`).toBeLessThanOrEqual(width.viewport+1);
      const audit=await new AxeBuilder({page}).exclude("astro-dev-toolbar").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
      expect(audit.violations,`${path}: ${JSON.stringify(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))}`).toEqual([]);
      await page.evaluate(async()=>{
        for(let position=0;position<document.documentElement.scrollHeight;position+=innerHeight){scrollTo(0,position);await new Promise(resolve=>setTimeout(resolve,60));}
        await Promise.all([...document.images].filter(image=>image.checkVisibility() && !image.closest("details:not([open])") && image.complete).map(image=>image.decode().catch(()=>undefined)));
        scrollTo(0,0);
      });
      await page.waitForFunction(()=>[...document.images].filter(image=>image.checkVisibility() && !image.closest("details:not([open])")).every(image=>image.complete && image.naturalWidth>0),undefined,{timeout:10000});
      await page.screenshot({path:`${folder}/${name}.png`,fullPage:true,timeout:30000});
      expect(errors).toEqual([]);
    });
  }
}

test("actual structure coordinates support entry, residue and keyboard view inspection",async({page})=>{
  await page.goto("/learn/tracks/structure-and-pockets/");
  const viewer=page.locator("[data-science-object]");
  const original=await viewer.getAttribute("data-object-states");
  await viewer.getByRole("button",{name:"Enable coordinate rotation"}).click();
  await expect(viewer.locator("canvas")).toBeVisible();
  const initialProjection=await viewer.locator("canvas").evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL());
  await viewer.locator("[data-object-select]").selectOption("1");
  await expect(viewer.locator("[data-object-status]")).toContainText("4HJO");
  expect(await viewer.locator("canvas").evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL())).not.toBe(initialProjection);
  expect(await viewer.locator("[data-object-residue] option").count()).toBeGreaterThan(1);
  const firstResidue=await viewer.locator("[data-object-residue] option").nth(1).getAttribute("value");
  await viewer.locator("[data-object-residue]").selectOption(firstResidue!);
  await expect(viewer.locator("[data-object-status]")).toContainText("Minimum heavy-atom distance");
  const yaw=viewer.locator("[data-object-yaw]");
  await yaw.focus();const initial=Number(await yaw.inputValue());await page.keyboard.press("ArrowRight");
  await expect(yaw).toHaveValue(String(initial+1));
  expect(await viewer.getAttribute("data-object-states")).toBe(original);
  await viewer.locator("summary").click();
  await expect(viewer.getByRole("region",{name:"4HJO contact-distance table",exact:true})).toBeVisible();
});
