import { atPointer } from "./registry.js";
import type { ViewRow } from "./types.js";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: expected a result object`);
  return value as Record<string, unknown>;
}
function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${label}: expected a finite retained value`);
  return value;
}
function count(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isSafeInteger(result) || result < 1)
    throw new Error(`${label}: expected a positive population count`);
  return result;
}
function exactKeys(
  value: Record<string, unknown>,
  keys: string[],
  label: string,
) {
  if (Object.keys(value).sort().join("\n") !== [...keys].sort().join("\n"))
    throw new Error(`${label}: must preserve exactly ${keys.join(", ")}`);
}

/** Copy retained aggregates only. No fitting, pooling, averaging or uncertainty construction. */
export function retainedViewRows(adapter: string, value: unknown): ViewRow[] {
  const summary = record(value, adapter);
  const rows: ViewRow[] = [];
  if (adapter === "egfr-mae") {
    const results = record(summary.results, "EGFR results");
    exactKeys(
      results,
      ["primary_test", "assay_replication"],
      "EGFR populations",
    );
    for (const population of ["primary_test", "assay_replication"]) {
      const result = record(results[population], population);
      const metrics = record(result.metrics, `${population}.metrics`);
      exactKeys(
        metrics,
        ["train_mean", "descriptor_ridge", "morgan_ridge"],
        "EGFR baselines",
      );
      for (const model of ["train_mean", "descriptor_ridge", "morgan_ridge"]) {
        const sourcePointer = `/results/${population}/metrics/${model}/mae`;
        rows.push({
          population,
          model,
          quantity: "mean absolute error",
          unit: "pChEMBL",
          value: number(atPointer(summary, sourcePointer), sourcePointer),
          count: count(result.count, `${population}.count`),
          sourcePointer,
        });
      }
    }
  } else if (adapter === "rmd17-mae") {
    const results = record(summary.results, "rMD17 results");
    exactKeys(results, ["benzene", "uracil"], "rMD17 systems");
    for (const population of ["benzene", "uracil"]) {
      exactKeys(
        record(results[population], population),
        ["train_mean", "ridge"],
        "rMD17 baselines",
      );
      for (const model of ["train_mean", "ridge"]) {
        const sourcePointer = `/results/${population}/${model}/mae`;
        rows.push({
          population,
          model,
          quantity: "mean absolute error",
          unit: "kcal/mol",
          value: number(atPointer(summary, sourcePointer), sourcePointer),
          count: count(
            atPointer(summary, "/partitions_per_system/evaluation"),
            "evaluation frames",
          ),
          sourcePointer,
        });
      }
    }
  } else if (adapter === "pool-recovery") {
    const assays = record(summary.assays, "pool-budget assays");
    exactKeys(assays, ["CHEMBL5736995", "CHEMBL3705421"], "pool-budget assays");
    for (const population of ["CHEMBL5736995", "CHEMBL3705421"]) {
      const assay = record(assays[population], population);
      const checkpoints = atPointer(assay, "/budget/checkpoints");
      if (
        !Array.isArray(checkpoints) ||
        checkpoints.length !== 5 ||
        checkpoints[0] !== 0 ||
        checkpoints.some(
          (v, i) =>
            !Number.isSafeInteger(v) ||
            v < 0 ||
            (i > 0 && v <= checkpoints[i - 1]),
        )
      )
        throw new Error(`${population}: invalid declared checkpoints`);
      if (!Array.isArray(assay.policies))
        throw new Error(`${population}: missing fixed policies`);
      const policies = assay.policies.map((policy) =>
        record(policy, "fixed policy"),
      );
      const names = policies.map((policy) => String(policy.name));
      if (
        [...names].sort().join() !==
        ["maxmin", "random-0", "random-1", "random-2", "random-3", "random-4"]
          .sort()
          .join()
      )
        throw new Error(
          `${population}: must preserve MaxMin and all five fixed random policies`,
        );
      for (const [index, policy] of policies.entries()) {
        if (
          !Array.isArray(policy.recovery) ||
          policy.recovery.length !== checkpoints.length
        )
          throw new Error(
            `${population}: recovery/checkpoint population mismatch`,
          );
        for (const [checkpointIndex, item] of policy.recovery.entries()) {
          const sourcePointer = `/assays/${population}/policies/${index}/recovery/${checkpointIndex}`;
          const recovery = number(item, sourcePointer);
          if (recovery < 0 || recovery > 1)
            throw new Error(
              `${sourcePointer}: recovery must be a fraction in [0, 1]`,
            );
          rows.push({
            population,
            model: String(policy.name),
            quantity: "top-decile recovery",
            unit: "fraction",
            value: recovery,
            checkpoint: checkpoints[checkpointIndex],
            count: count(
              atPointer(assay, "/budget/original_pool_parent_count"),
              "original pool parent count",
            ),
            sourcePointer,
          });
        }
      }
    }
  } else throw new Error(`Unsupported retained-view adapter: ${adapter}`);
  return rows;
}
