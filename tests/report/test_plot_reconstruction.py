"""Keep complete source-defined plot populations and diagnose malformed comparisons."""

from __future__ import annotations

import importlib
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
from matplotlib.text import Text  # noqa: E402
from plot_data import load_plot_data  # noqa: E402

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

    def test_all_shared_populations_serialize_without_nonfinite_numbers(self):
        for number in range(1, 14):
            data = load_plot_data(number)
            json.dumps(data, allow_nan=False)
            self.assertEqual(data["source"]["plot"], number)
            self.assertFalse(data["source"]["new_experiment"])
            self.assertTrue(data["source"]["paths"])

    def test_unit_and_highest_depth_stacks_keep_all_tracks_and_zero_practice(self):
        for number, keys in (
            (3, ("core", "research", "practice")),
            (4, ("worked", "executable", "assessed")),
        ):
            module = importlib.import_module(
                next((ROOT / "report/figures").glob(f"plot_{number}_*.py")).stem
            )
            data = module.load_data()
            tracks = [track["id"] for track in data["tracks"]] if number == 3 else data["order"]
            counts = data["counts"] if number == 3 else data["depth_by_track"]

            def inspect(fig, tracks=tracks, keys=keys, counts=counts, number=number):
                self.assertEqual(len(tracks), 18)
                for bars, key in zip(fig.axes[0].containers, keys, strict=True):
                    self.assertEqual(
                        [bar.get_width() for bar in bars], [counts[track][key] for track in tracks]
                    )
                if number == 3:
                    self.assertEqual(
                        sum(text.get_text() == "Practice 0" for text in fig.axes[0].texts), 2
                    )
                else:
                    self.assertEqual(sum(sum(counts[track].values()) for track in tracks), 93)

            self.inspect(module, inspect)

    def test_openness_keeps_every_cell_and_four_state_denominator(self):
        data = load_plot_data(6)
        self.assertEqual(sum(len(cells) for cells in data["cells"].values()), 70)
        for kind, cells in data["cells"].items():
            for cell in cells.values():
                self.assertEqual(set(cell["states"]), set(data["states"]))
                self.assertEqual(sum(cell["states"].values()), data["totals"][kind])
                self.assertEqual(
                    cell["applicable"], cell["total"] - cell["states"]["not_applicable"]
                )

    def test_shared_loader_rejects_duplicate_bounds_and_unknown_access(self):
        defects = fixture("plot-shared-data-defects.json")
        payload = style.load_json(style.DATA_DIR / "comparison.v1.json")
        payload["summaries"].append(
            payload["summaries"][
                defects["duplicate_coverage_interval"]["duplicate_summary_index"]
            ].copy()
        )
        with self.assertRaisesRegex(ValueError, "duplicate coverage interval"):
            load_plot_data(2, read_json=lambda _: payload)
        resources = style.load_json(style.DATA_DIR / "resources.v1.json")
        defect = defects["unrecognized_access_level"]
        resources[defect["record_index"]]["access_level"]["value"] = defect["value"]
        with self.assertRaisesRegex(ValueError, "unexpected access level"):
            load_plot_data(7, read_json=lambda _: resources)

    def test_all_print_masters_keep_native_width_and_inserted_type_floor(self):
        for path in sorted((ROOT / "report/figures").glob("plot_[0-9]*.py")):
            module = importlib.import_module(path.stem)

            def inspect(fig, path=path):
                self.assertAlmostEqual(fig.get_size_inches()[0] * 25.4, 180.0, 8)
                fig.canvas.draw()
                for text in fig.findobj(Text):
                    if text.get_visible() and text.get_text():
                        self.assertGreaterEqual(
                            text.get_fontsize(), 8.9, (path.stem, text.get_text())
                        )
                for ax in fig.axes:
                    for label in (ax.xaxis.label, ax.yaxis.label, ax.title):
                        if label.get_text():
                            self.assertGreaterEqual(label.get_fontsize(), 10)
                plt.close(fig)

            self.inspect(module, inspect)


if __name__ == "__main__":
    unittest.main(verbosity=2)
