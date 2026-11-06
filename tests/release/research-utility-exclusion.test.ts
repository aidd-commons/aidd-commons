import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  buildPublicRelease,
  exclusionReason,
} from "../../scripts/release/build.js";
import {
  isTestMaterialFinding,
  scanPublicTree,
} from "../../scripts/release/hygiene.js";

it("keeps ordinary docs while excluding unreleased study preparation under the docs allowlist", async () => {
  const root = await mkdtemp(join(tmpdir(), "aidd-study-release-"));
  const sourceRoot = join(root, "source");
  const destination = join(root, "public");
  await mkdir(join(sourceRoot, "docs/research-utility"), { recursive: true });
  await writeFile(join(sourceRoot, "README.md"), "# Public tutorial fixture\n");
  await writeFile(
    join(sourceRoot, "docs/ARCHITECTURE.md"),
    "# Public architecture\n",
  );
  const privatePath = "docs/research-utility/development-traces.json";
  await writeFile(
    join(sourceRoot, privatePath),
    '{"fixture":"synthetic unreleased study preparation"}\n',
  );
  const result = await buildPublicRelease({
    sourceRoot,
    destination,
    inventoryPath: join(root, "inventory.md"),
  });
  expect(result.files.map(({ path }) => path)).toContain(
    "docs/ARCHITECTURE.md",
  );
  expect(result.files.map(({ path }) => path)).not.toContain(privatePath);
  expect(
    result.skipped.some((path) => path.includes("docs/research-utility")),
  ).toBe(true);
  await expect(access(join(destination, privatePath))).rejects.toThrow();
  expect(await readFile(join(sourceRoot, privatePath), "utf8")).toContain(
    "synthetic",
  );
  expect(exclusionReason(privatePath)).toMatch(/unreleased.*study planning/u);
  expect(result.findings).toEqual([]);
});

it("rejects an already leaked study-planning directory without a test-material exemption", async () => {
  const root = await mkdtemp(join(tmpdir(), "aidd-leaked-study-"));
  await mkdir(join(root, "docs/research-utility"), { recursive: true });
  await writeFile(
    join(root, "docs/research-utility/development-traces.json"),
    '{"fixture":"synthetic"}\n',
  );
  const findings = await scanPublicTree(root);
  expect(findings).toEqual([
    {
      path: "docs/research-utility",
      rule: "unreleased-study-planning",
      detail: "unreleased registration provenance and study planning",
    },
  ]);
  expect(findings.some(isTestMaterialFinding)).toBe(false);
});
