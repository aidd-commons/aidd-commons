import { fileURLToPath } from "node:url";
import { checkSiteData } from "./site-data.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
checkSiteData(root)
  .then(({ catalog, curriculum, labs }) => {
    console.log(
      `Checked ${catalog.count} resource records, ${curriculum.trackCount} tracks and ${labs.guideCount} bilingual lab guides; generated catalogue, workbench and search data are current.`,
    );
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
