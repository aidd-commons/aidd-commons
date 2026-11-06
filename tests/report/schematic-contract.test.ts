import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));

it("keeps all seven schematics source-bound, editable and readable at report size", () => {
  execFileSync(
    join(root, ".venv/bin/python"),
    ["tests/report/test_schematic_contract.py"],
    {
      cwd: root,
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: "1",
        MPLCONFIGDIR: join(tmpdir(), "aidd-schematic-mpl"),
      },
      stdio: "pipe",
    },
  );
}, 60_000);
