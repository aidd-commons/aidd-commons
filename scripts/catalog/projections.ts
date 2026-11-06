import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Resource } from "../../catalog/schema/resource.js";

const csvColumns: Array<keyof Resource> = [
  "id",
  "name",
  "kind",
  "summary",
  "canonical_url",
  "identifiers",
  "stages",
  "modalities",
  "tasks",
  "relations",
  "status",
  "access_level",
  "openness",
  "licenses",
  "evidence",
  "caveats",
  "acknowledgements",
  "last_verified",
];

function csvValue(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

export type CatalogArtifacts = Record<
  "resources.v1.json" | "resources.v1.csv" | "openness.v1.json",
  string
>;

export function renderCatalogArtifacts(
  input: readonly Resource[],
): CatalogArtifacts {
  if (
    !input.length ||
    new Set(input.map(({ id }) => id)).size !== input.length
  ) {
    throw new Error(
      "Catalog exports require a nonempty catalogue with unique resource IDs",
    );
  }
  const resources = [...input].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  const openness = resources.map(({ evidence, id, openness }) => {
    const referenced = new Set(
      Object.values(openness).flatMap((claim) => claim.evidence ?? []),
    );
    return {
      id,
      openness,
      evidence: evidence.filter((item) => referenced.has(item.id)),
    };
  });
  const rows = resources.map((resource) =>
    csvColumns.map((column) => csvValue(resource[column])).join(","),
  );
  return {
    "resources.v1.json": `${JSON.stringify(resources, null, 2)}\n`,
    "resources.v1.csv": `${csvColumns.join(",")}\n${rows.join("\n")}\n`,
    "openness.v1.json": `${JSON.stringify(openness, null, 2)}\n`,
  };
}

/** Compare canonical projections without modifying generated data or native figure assets. */
export async function checkCatalogArtifacts(
  resources: readonly Resource[],
  directory: string,
): Promise<void> {
  const problems: string[] = [];
  for (const [name, expected] of Object.entries(
    renderCatalogArtifacts(resources),
  )) {
    const path = join(directory, name);
    try {
      if (!(await lstat(path)).isFile())
        problems.push(`${name}: not a regular generated file`);
      else if ((await readFile(path, "utf8")) !== expected)
        problems.push(`${name}: stale generated catalogue data`);
    } catch {
      problems.push(`${name}: missing or unreadable generated catalogue data`);
    }
  }
  if (problems.length)
    throw new Error(
      `${problems.join("\n")}\nRegenerate with npm run catalog:build from the repository root.`,
    );
}
