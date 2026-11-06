import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));

it("retains complete scientific plot populations and rejects four known defects", () => {
  execFileSync(join(root, ".venv/bin/python"), ["tests/report/test_plot_reconstruction.py"], {
    cwd: root,
    env: {
      ...process.env,
      MPLBACKEND: "Agg",
      MPLCONFIGDIR: process.env.MPLCONFIGDIR || join(root, ".cache", "matplotlib"),
    },
    stdio: "pipe",
  });
}, 60_000);
