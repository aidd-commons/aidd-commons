"""Representation ranking flips.

Source of every number: `labs/chembl_egfr/locked-summary.json`, the reviewed
summary of a completed locked evaluation on the frozen ChEMBL 37 EGFR
contract. It holds the selected penalties, the point metrics of three
baselines on the primary test partition and on the separate assay replication,
and the Spearman correlation of each, including the case where the
correlation is undefined.

What the figure shows. The same three baselines are evaluated twice, on the
primary partition of 132 compounds and on a separate assay replication of 170
compounds, and the ranking is not the same on both. The upper panel pairs
the two mean absolute errors on a common log axis, so the reader can see the two
orderings and the gap between them. The lower panel is the rank correlation of
each baseline on each partition, where the ranking correlation of the Morgan
ridge turns negative on the replication.

The flip is the point of the figure, so it is not hidden. The baseline that
wins the primary partition loses the replication by a wide margin, and both
halves of that are drawn.

What it does not show. The two evaluations are separate comparisons and
success on one does not erase failure on the other. The locked summary records
that the acquisition lab had already accessed labels shared with this
evaluation before it ran, so it is not an entirely untouched independent
confirmatory evaluation, and that the frozen split, the alpha grid and the
selected penalties were not retuned after that exposure. The descriptor
penalty sits at the upper edge of the frozen grid. No confidence intervals, no
p values and no pooled superiority claim are reported, and none is drawn here.
"""

from __future__ import annotations

import sys
from pathlib import Path

from matplotlib.ticker import NullFormatter

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)

FIGURE_NUMBER = 9
STEM = "plot_9_representation_ranking_flips"
SERIES = [
    ("train_mean", "Train-set mean", "slate", "o"),
    ("descriptor_ridge", "Descriptor ridge", "coral", "s"),
    ("morgan_ridge", "Morgan ridge", "teal", "^"),
]
PARTITIONS = ["primary_test", "assay_replication"]
PARTITION_TITLE = {
    "primary_test": "Primary partition, 132 compounds",
    "assay_replication": "Assay replication, 170 compounds",
}

CAPTION = (
    "The same three baselines on the primary partition of 132 compounds and on the separate assay "
    "replication of 170 compounds. {flip}. The two evaluations are separate comparisons and "
    "success on one does not erase failure on the other, the acquisition lab had accessed labels "
    "shared with this evaluation before it ran, and no confidence intervals or p values are "
    "reported."
)


def build() -> dict[str, Path]:
    """Make the adverse replication visible on shared metric axes."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    summary = style.load_json(style.REPO_ROOT / "labs/chembl_egfr/locked-summary.json")
    results = summary["results"]
    fig = style.figure(height=5.45)
    style.heading(
        fig,
        "The primary winner fails to retain its rank",
        "Frozen ChEMBL EGFR · primary n = 132 · separate assay replication n = 170",
    )
    ax = fig.add_axes((0.25, 0.55, 0.66, 0.24))
    rho = fig.add_axes((0.25, 0.19, 0.66, 0.23))
    for y, (key, _label, colour, marker) in zip([2, 1, 0], SERIES, strict=True):
        a, b = [results[p]["metrics"][key]["mae"] for p in PARTITIONS]
        ax.plot([a, b], [y, y], color=colours[colour], lw=1.8, ls=style.dashes()[colour])
        ax.plot(
            a, y, marker=marker, ms=7, mfc=colours[colour], mec=tokens["ink"], mew=0.5, ls="none"
        )
        ax.plot(
            b, y, marker=marker, ms=8, mfc=tokens["panel"], mec=colours[colour], mew=1.2, ls="none"
        )
        for v, dy in [(a, 8), (b, -10)]:
            ax.annotate(
                f"{v:.3f}",
                (v, y),
                xytext=(0, dy),
                textcoords="offset points",
                ha="center",
                va="center",
                fontsize=8.5,
            )
        r1, r2 = [results[p]["metrics"][key]["spearman"] for p in PARTITIONS]
        if r1 is None or r2 is None:
            rho.text(
                0.02,
                y,
                "Undefined: constant prediction",
                transform=rho.get_yaxis_transform(),
                va="center",
                fontsize=8.3,
                color=tokens["muted"],
            )
        else:
            rho.plot([r1, r2], [y, y], color=colours[colour], lw=1.8, ls=style.dashes()[colour])
            rho.plot(
                r1,
                y,
                marker=marker,
                ms=7,
                mfc=colours[colour],
                mec=tokens["ink"],
                mew=0.5,
                ls="none",
            )
            rho.plot(
                r2,
                y,
                marker=marker,
                ms=8,
                mfc=tokens["panel"],
                mec=colours[colour],
                mew=1.2,
                ls="none",
            )
            for v, dy in [(r1, 8), (r2, -10)]:
                rho.annotate(
                    f"{v:.3f}",
                    (v, y),
                    xytext=(0, dy),
                    textcoords="offset points",
                    ha="center",
                    va="center",
                    fontsize=8.5,
                )
    for axis in [ax, rho]:
        axis.set_yticks([2, 1, 0], [s[1] for s in SERIES])
        axis.set_ylim(-0.65, 2.65)
        style.clean_axis(axis)
    ax.set_xscale("log")
    ax.set_xlim(0.32, 4.7)
    ax.set_xticks([0.4, 0.6, 1, 2, 4], ["0.4", "0.6", "1", "2", "4"])
    ax.xaxis.set_minor_formatter(NullFormatter())
    ax.set_xlabel("Mean absolute error · log scale · lower is better")
    style.title(ax, "(a) Error changes with the assay partition")
    rho.axvline(0, color=tokens["ink"], lw=0.8, ls="--")
    rho.set_xlim(-0.15, 0.65)
    rho.set_xlabel("Spearman rank correlation · higher is better")
    style.title(rho, "(b) Morgan rank correlation changes sign")
    from matplotlib.lines import Line2D

    fig.legend(
        [
            Line2D([], [], marker="o", ms=6, mfc=tokens["ink"], mec=tokens["ink"], ls="none"),
            Line2D([], [], marker="o", ms=7, mfc="none", mec=tokens["ink"], ls="none"),
        ],
        ["Primary partition", "Assay replication"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.57, 0.08),
        fontsize=8.5,
    )
    style.footnote(
        fig,
        (
            "Prior label exposure is disclosed. These are separate comparisons, with no "
            "confidence intervals, p values or pooled superiority claim."
        ),
        y=0.025,
    )
    flip = (
        f"The Morgan ridge is the best of the three on the primary partition at "
        f"{results['primary_test']['metrics']['morgan_ridge']['mae']:.3f} mean absolute "
        f"error, while the descriptor ridge is the best on the replication at "
        f"{results['assay_replication']['metrics']['descriptor_ridge']['mae']:.3f}; the "
        f"Morgan ridge reaches "
        f"{results['assay_replication']['metrics']['morgan_ridge']['mae']:.3f} there and "
        f"its rank correlation falls from "
        f"{results['primary_test']['metrics']['morgan_ridge']['spearman']:.3f} to "
        f"{results['assay_replication']['metrics']['morgan_ridge']['spearman']:.3f}"
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, CAPTION.format(flip=flip))
    return written


def _line_handle(colour: str, marker: str, dash: object):
    """A legend handle in the shape of a line mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        color=colour,
        marker=marker,
        markersize=6.0,
        markerfacecolor=colour,
        markeredgecolor=style.tokens("light")["ink"],
        markeredgewidth=0.5,
        linewidth=1.8,
        linestyle=dash,
    )


def _handle(colour: str, marker: str, *, filled: bool):
    """A legend handle in the shape of a point mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        linestyle="none",
        marker=marker,
        markersize=6.2,
        markerfacecolor=colour if filled else "none",
        markeredgecolor=colour if not filled else style.tokens("light")["ink"],
        markeredgewidth=1.5 if not filled else 0.5,
    )


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
