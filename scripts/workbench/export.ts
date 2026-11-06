import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkWorkbenchArtifacts,
  loadWorkbenchData,
  renderWorkbenchArtifacts,
} from "./data.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
async function main() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== "--check"))
    throw new Error("Usage: workbench/export.ts [--check]");
  const input = await loadWorkbenchData(root);
  if (args.includes("--check")) await checkWorkbenchArtifacts(root, input);
  else {
    await mkdir(join(root, "site/public/data"), { recursive: true });
    for (const [name, text] of Object.entries(
      renderWorkbenchArtifacts(input.data, input.search),
    ))
      await writeFile(join(root, "site/public/data", name), text);
  }
  console.log(
    `${args.includes("--check") ? "Checked" : "Generated"} workbench: ${input.data.objects.length} objects, ${input.data.relations.length} declared relations, ${input.data.tracks.length} tracks, ${input.data.cases.length} retained cases and ${input.search.entries.length} search entries.`,
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
