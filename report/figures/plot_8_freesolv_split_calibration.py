"""FreeSolv split and calibration.

Source of every number: `labs/freesolv/reviewed-results.json`, the reviewed
aggregate of a completed lab run. It holds the counts of both splits, the
point metrics of two fixed teaching baselines and of the training-set mean, and
the interval metrics of the two models that carry intervals.

What the figure shows. The scaffold split is the predeclared primary result
and the random split is the easier contrast, so the scaffold split is drawn
first in every panel. In each panel the training-set mean comes first, because
it is the cheap baseline and a baseline that is not shown first is a baseline
that gets read as a comparison. The last two panels are the interval metrics:
the empirical marginal coverage of the intervals and their mean width. The
training-set mean carries no interval, so it is marked as undefined in those two panels.

What it does not show. The coverage is marginal coverage over the test set,
not conditional coverage, so a model can hold its marginal coverage and still
be badly calibrated on the part of the space a reader cares about. The
intervals are the intervals this lab built, and their nominal level is not
stated in the reviewed results, so no reference line for a nominal level is
drawn here; inventing one would be a number that no file supports. These
fixed teaching baselines do not establish a state of the art, and they say
nothing about prospective drug-discovery utility.
"""

from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 8
STEM = "plot_8_freesolv_split_calibration"
SPLITS = ["scaffold", "random"]
SPLIT_TITLE = {"scaffold": "Scaffold split (primary)", "random": "Random split (contrast)"}
SERIES = [
    ("train_mean", "Train-set mean", "slate"),
    ("morgan_ridge", "Morgan ridge", "teal"),
    ("morgan_random_forest", "Morgan random forest", "coral"),
]
GROUP_GAP = 0.8

CAPTION = (
    "FreeSolv point and interval metrics for two fixed teaching baselines, on the predeclared "
    "scaffold split and the easier random split. {point}. {interval}. The coverage is marginal "
    "coverage and not conditional calibration, the nominal level of the intervals is not stated in "
    "the reviewed results, and these teaching baselines establish no state of the art."
)


def _group_centre(split_index: int) -> float:
    """The x position of the middle of a split group."""
    return split_index * (len(SERIES) + GROUP_GAP) + (len(SERIES) - 1) / 2


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Pair the two frozen splits within each model and metric."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    results, splits = data["results"], data["splits"]
    fig = style.figure(height=6.4)
    style.heading(
        fig,
        "Split choice changes error and interval behaviour",
        (
            f"FreeSolv · fixed teaching baselines · reviewed {results['reviewed_on']} · "
            f"{splits['scaffold']['counts']['test']} test molecules per split"
        ),
    )
    axes = style.axes_grid(
        fig, 2, 2, left=0.13, right=0.965, bottom=0.20, top=0.81, wspace=0.43, hspace=0.82
    )
    metrics = [
        ("point_metrics", "mae", "(a) Mean absolute error", "kcal/mol", "{:.2f}"),
        ("point_metrics", "rmse", "(b) Root mean squared error", "kcal/mol", "{:.2f}"),
        (
            "interval_metrics",
            "coverage",
            "(c) Marginal interval coverage",
            "Empirical fraction",
            "{:.3f}",
        ),
        ("interval_metrics", "mean_width", "(d) Mean interval width", "kcal/mol", "{:.2f}"),
    ]
    for ax, (source, metric, label, unit, fmt) in zip(axes, metrics, strict=True):
        maximum = max(
            splits[s][source][key][metric]
            for s in SPLITS
            for key, _, _ in SERIES
            if key in splits[s][source]
        )
        for y, (key, _, colour) in zip([2, 1, 0], SERIES, strict=True):
            if key not in splits["scaffold"][source]:
                ax.text(
                    0.04,
                    y,
                    "No interval defined",
                    transform=ax.get_yaxis_transform(),
                    va="center",
                    fontsize=10.0,
                    color=tokens["muted"],
                )
                continue
            a, b = [splits[s][source][key][metric] for s in SPLITS]
            ax.plot([a, b], [y, y], color=colours[colour], lw=1.5, zorder=2)
            ax.plot(a, y, "o", ms=6.5, mfc=colours[colour], mec=tokens["ink"], mew=0.5, zorder=3)
            ax.plot(b, y, "s", ms=6.5, mfc=tokens["panel"], mec=colours[colour], mew=1.1, zorder=3)
            close = abs(a - b) < 0.12 * maximum
            offsets = (
                [(a, (-4 if a <= b else 4, 10)), (b, (4 if a <= b else -4, -10.5))]
                if close
                else [(a, (0, 10)), (b, (0, -10.5))]
            )
            for value, xy_offset in offsets:
                ax.annotate(
                    fmt.format(value),
                    (value, y),
                    xytext=xy_offset,
                    textcoords="offset points",
                    ha="center",
                    va="center",
                    fontsize=10.0,
                )
        ax.set_yticks([2, 1, 0], ["Mean", "Ridge", "Forest"])
        ax.yaxis.grid(True, color=tokens["rule"], linestyle=":", linewidth=0.6, alpha=0.8)
        ax.set_axisbelow(True)
        ax.set_ylim(-0.65, 2.65)
        ax.set_xlim(0, 1.05 if metric == "coverage" else maximum * 1.18)
        ax.set_xlabel(unit)
        style.clean_axis(ax)
        style.title(ax, label)
    from matplotlib.lines import Line2D

    fig.legend(
        [
            Line2D([], [], marker="o", mfc=tokens["ink"], mec=tokens["ink"], ls="none"),
            Line2D([], [], marker="s", mfc="none", mec=tokens["ink"], ls="none"),
        ],
        ["Scaffold split · primary", "Random split · contrast"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.5, 0.09),
        fontsize=10.0,
        handletextpad=0.5,
    )
    style.footnote(
        fig,
        (
            "Mean = training-set mean; Ridge/Forest = Morgan baselines. Coverage is "
            "marginal; the source states no nominal interval level."
        ),
        y=0.025,
    )
    point = (
        f"The ridge reaches "
        f"{splits['scaffold']['point_metrics']['morgan_ridge']['mae']:.2f} kcal/mol mean "
        f"absolute error on the scaffold split against "
        f"{splits['scaffold']['point_metrics']['train_mean']['mae']:.2f} for the "
        f"training-set mean, and "
        f"{splits['random']['point_metrics']['morgan_ridge']['mae']:.2f} against "
        f"{splits['random']['point_metrics']['train_mean']['mae']:.2f} on the random split"
    )
    interval = (
        f"On the scaffold split the intervals reach an empirical coverage of "
        f"{splits['scaffold']['interval_metrics']['morgan_ridge']['coverage']:.3f} for the "
        f"ridge and "
        f"{splits['scaffold']['interval_metrics']['morgan_random_forest']['coverage']:.5f} "
        f"for the forest, at mean widths of "
        f"{splits['scaffold']['interval_metrics']['morgan_ridge']['mean_width']:.2f} and "
        f"{splits['scaffold']['interval_metrics']['morgan_random_forest']['mean_width']:.2f} "
        "kcal/mol"
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, CAPTION.format(point=point, interval=interval))
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
