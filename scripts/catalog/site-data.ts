import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSiteOverview, parseLabPage, type LabPage } from "./overview.js";
import { loadCatalog } from "./catalog.js";
import { checkCatalogArtifacts } from "./projections.js";
import { loadCurriculum } from "../curriculum/curriculum.js";
import { checkWorkbenchArtifacts } from "../workbench/data.js";

export async function loadLabPages(root: string): Promise<LabPage[]> {
  const pages: LabPage[] = [];
  async function visit(
    directory: string,
    locale: LabPage["locale"],
    prefix = "",
  ) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory())
        await visit(path, locale, `${prefix}${entry.name}/`);
      else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        pages.push(
          parseLabPage(
            await readFile(path, "utf8"),
            `${prefix}${entry.name.slice(0, -4)}`,
            locale,
          ),
        );
      }
    }
  }
  await visit(join(root, "site/src/content/docs/labs"), "en");
  await visit(join(root, "site/src/content/docs/zh-cn/labs"), "zh-cn");
  return pages;
}

export async function checkSiteData(root: string) {
  const resources = await loadCatalog(join(root, "catalog/resources"));
  const curriculum = await loadCurriculum(
    join(root, "catalog/curriculum/tracks.yaml"),
    { resources },
  );
  await checkCatalogArtifacts(resources, join(root, "site/public/data"));
  await checkWorkbenchArtifacts(root);
  return buildSiteOverview(resources, curriculum, await loadLabPages(root));
}
