import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPublicRelease } from "../../scripts/release/build.js";

describe("workbench curated-source release", () => {
  it("ships source, generated data, validators and defect fixtures without the private inventory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aidd-workbench-release-"));
    const destination = join(directory, "public-release");
    const result = await buildPublicRelease({
      sourceRoot: import.meta.dirname + "/../..",
      destination,
      inventoryPath: join(directory, "inventory.txt"),
    });
    for (const path of [
      "catalog/workbench/registry.yaml",
      "scripts/workbench/data.ts",
      "scripts/workbench/search.ts",
      "scripts/workbench/registry.ts",
      "site/src/lib/workbench-data.ts",
      "site/public/data/workbench.v1.json",
      "site/public/data/search.v1.json",
      "tests/workbench/data.test.ts",
      "tests/workbench/fixtures/valid-registry.yaml",
      "tests/workbench/fixtures/bad-unit.yaml",
    ])
      await expect(access(join(destination, path))).resolves.toBeUndefined();
    await expect(
      access(join(destination, "tmp/platform-upgrade-20261026")),
    ).rejects.toThrow();
    expect(result.findings).toEqual([]);
    const exported = JSON.parse(
      await readFile(
        join(destination, "site/public/data/workbench.v1.json"),
        "utf8",
      ),
    );
    for (const object of exported.objects)
      for (const source of object.sources)
        await expect(
          access(join(destination, source.path)),
        ).resolves.toBeUndefined();
  }, 120_000);
});
