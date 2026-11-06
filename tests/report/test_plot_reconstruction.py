"""Keep complete source-defined plot populations and diagnose malformed comparisons."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "report/figures"))

import figure_style as style  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import plot_2_coverage_bounds as coverage  # noqa: E402
import plot_8_freesolv_split_calibration as freesolv  # noqa: E402
import plot_10_acquisition_policy_recovery as acquisition  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def line_present(ax, x, y) -> bool:
    return any(
        np.shape(line.get_xdata()) == np.shape(x)
        and np.shape(line.get_ydata()) == np.shape(y)
        and np.allclose(line.get_xdata(), x, rtol=0, atol=1e-13)
        and np.allclose(line.get_ydata(), y, rtol=0, atol=1e-13)
        for line in ax.lines
    )


class PlotReconstructionTests(unittest.TestCase):
    def tearDown(self):
        plt.close("all")

    def inspect(self, module, inspect_figure):
        def save(fig, _stem):
            inspect_figure(fig)
            return {}

        with (
            patch.object(style, "save", side_effect=save),
            patch.object(style, "register_caption"),
        ):
            module.build()

    def test_complete_coverage_contains_all_65_source_bound_pairs(self):
        payload = style.load_json(style.DATA_DIR / "comparison.v1.json")
        providers = {row["id"]: row["name"] for row in payload["providers"]}
        order = [coverage.SELF_ID] + sorted(
            (key for key in providers if key != coverage.SELF_ID),
            key=lambda key: providers[key],
        )
        bounds = {
            (row["provider_id"], row["threshold"]): (row["lower"], row["upper"])
            for row in payload["summaries"]
        }

        def inspect(fig):
            self.assertEqual(len(fig.axes), len(payload["thresholds"]))
            count = 0
            for ax, threshold in zip(fig.axes, payload["thresholds"], strict=True):
                for y, provider in zip(range(len(order) - 1, -1, -1), order, strict=True):
                    low, high = bounds[provider, threshold]
                    x = [low] if provider == coverage.SELF_ID else [low, high]
                    ys = [y] if provider == coverage.SELF_ID else [y, y]
                    self.assertTrue(line_present(ax, x, ys), (provider, threshold))
                    count += 1
            self.assertEqual(count, len(bounds))

        self.inspect(coverage, inspect)

    def test_complete_freesolv_pairs_all_metrics_and_retains_undefined_mean_intervals(self):
        splits = style.load_json(ROOT / "labs/freesolv/reviewed-results.json")["splits"]
        sources = [
            ("point_metrics", "mae"),
            ("point_metrics", "rmse"),
            ("interval_metrics", "coverage"),
            ("interval_metrics", "mean_width"),
        ]

        def inspect(fig):
            count = 0
            for ax, (source, metric) in zip(fig.axes, sources, strict=True):
                for y, (key, _, _) in zip([2, 1, 0], freesolv.SERIES, strict=True):
                    if key not in splits["scaffold"][source]:
                        self.assertTrue(
                            any(text.get_text() == "No interval defined" for text in ax.texts)
                        )
                        continue
                    values = [splits[split][source][key][metric] for split in freesolv.SPLITS]
                    self.assertTrue(line_present(ax, values, [y, y]))
                    count += 2
            self.assertEqual(count, 20)

        self.inspect(freesolv, inspect)

    def test_campaign_retains_every_curve_and_auc_matches_its_real_definition(self):
        real = style.load_json(ROOT / "labs/pool_budget/real-summary.json")
        uncertainty = style.load_json(ROOT / "labs/pool_budget/uncertainty-summary.json")

        def inspect(fig):
            curve_count = auc_count = 0
            for row, assay in enumerate(acquisition.ASSAYS):
                block = real["assays"][assay]
                checkpoints = block["budget"]["checkpoints"]
                policies = {policy["name"]: policy for policy in block["policies"]}
                policies["ensemble-variance-uncertainty"] = uncertainty["assays"][assay]["policy"]
                names = ["maxmin", "ensemble-variance-uncertainty"] + sorted(
                    name for name in policies if name.startswith("random")
                )
                for ax, metric in [
                    (fig.axes[3 * row], "recovery"),
                    (fig.axes[3 * row + 1], "evaluation_mae"),
                ]:
                    for name in names:
                        self.assertTrue(line_present(ax, checkpoints, policies[name][metric]))
                        curve_count += 1
                for y, name in zip(range(6, -1, -1), names, strict=True):
                    policy = policies[name]
                    self.assertTrue(
                        line_present(fig.axes[3 * row + 2], [policy["normalized_auc"]], [y])
                    )
                    # pool_budget.py recovery_curve: trapezoid over acquired counts / final count.
                    area = sum(
                        (left + right) * (end - start) / 2
                        for start, end, left, right in zip(
                            checkpoints,
                            checkpoints[1:],
                            policy["recovery"],
                            policy["recovery"][1:],
                            strict=False,
                        )
                    )
                    self.assertAlmostEqual(policy["normalized_auc"], area / checkpoints[-1], 12)
                    auc_count += 1
            self.assertEqual(curve_count, 28)
            self.assertEqual(auc_count, 14)

        self.inspect(acquisition, inspect)

    def test_missing_declared_provider_is_rejected(self):
        with patch.object(style, "load_json", return_value=fixture("plot-missing-provider.json")):
            with self.assertRaisesRegex(ValueError, "every declared provider"):
                coverage.build()

    def test_interval_outside_denominator_is_rejected(self):
        with patch.object(
            style, "load_json", return_value=fixture("plot-bound-outside-denominator.json")
        ):
            with self.assertRaisesRegex(ValueError, "invalid coverage interval"):
                coverage.build()

    def test_absent_required_freesolv_baseline_is_rejected(self):
        with patch.object(
            style, "load_json", return_value=fixture("plot-missing-freesolv-baseline.json")
        ):
            with self.assertRaisesRegex(ValueError, "random: incomplete.*point_metrics"):
                freesolv.build()

    def test_incomplete_acquisition_trajectory_is_rejected(self):
        uncertainty = style.load_json(ROOT / "labs/pool_budget/uncertainty-summary.json")
        with patch.object(
            style,
            "load_json",
            side_effect=[fixture("plot-missing-acquisition-checkpoint.json"), uncertainty],
        ):
            with self.assertRaisesRegex(
                ValueError, "CHEMBL5736995 maxmin missing recovery checkpoint"
            ):
                acquisition.build()


if __name__ == "__main__":
    unittest.main(verbosity=2)
