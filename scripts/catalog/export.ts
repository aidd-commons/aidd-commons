import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  CatalogValidationError,
  formatDiagnostic,
  loadCatalog,
} from "./catalog.js";
import { renderCatalogArtifacts } from "./projections.js";

function parseArguments(argumentsList: string[]): {
  input: string;
  output: string;
  today?: string;
} {
  let input = "catalog/resources";
  let output = "site/public/data";
  let today: string | undefined;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--output" || argument === "--today") {
      const value = argumentsList[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a value`);
      }
      if (argument === "--output") {
        output = value;
      } else {
        today = value;
      }
      index += 1;
    } else if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      input = argument;
    }
  }

  return { input, output, today };
}

async function main(): Promise<void> {
  const { input, output, today } = parseArguments(process.argv.slice(2));
  const resources = await loadCatalog(input, { today });
  const outputDirectory = resolve(output);
  const artifacts = renderCatalogArtifacts(resources);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(artifacts).map(([name, source]) =>
      writeFile(`${outputDirectory}/${name}`, source),
    ),
  );

  console.log(
    `Exported ${resources.length} resource${resources.length === 1 ? "" : "s"}.`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof CatalogValidationError) {
    for (const diagnostic of error.diagnostics) {
      console.error(formatDiagnostic(diagnostic));
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});
