"""Acquisition policy recovery.

Source of every number: `labs/pool_budget/real-summary.json`, the reviewed
summary of the completed acquisition campaign, and
`labs/pool_budget/uncertainty-summary.json`, the reviewed summary of the
uncertainty campaign that followed it. Both hold two retrospective assay
replays, the acquisition checkpoints, and for every policy the fraction of the
top-decile actives recovered, the scaffold fraction reached and the evaluation
mean absolute error.

What the figure shows. The first column of each row plots recovery against the
number of compounds acquired, the second plots the evaluation error
at the same checkpoints, and the third shows their source-recorded normalized
recovery AUC, for the two named policies and the five random policy instances.
The AUC definition is the trapezoidal recovery integral over acquired-count
checkpoints, divided by the final acquired count, as implemented by
`labs/src/aidd_commons/pool_budget.py:recovery_curve` and frozen in
`labs/pool_budget/real-protocol.json`.
The two named policies are the ones the campaign is about,
so they are drawn in the categorical colours; the five random instances are a
family, drawn in one colour with a distinct marker each, because they are five
fixed seeds of the same policy and not five different methods.

What it does not show. These are retrospective replays of two assays, not
prospective experiments, so nothing here is a claim about discovery. The five
random seeds are fixed policy instances and not independent biological
replicates. The ridge penalty was informed by the earlier development work on
the same contract, so this run is not an independent corroboration of it, and
the acquisition lab had already accessed labels shared with that earlier
evaluation. No confidence intervals, no p values and no pooled inferential
comparisons are reported, and none is drawn here.
"""

from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 10
STEM = "plot_10_acquisition_policy_recovery"
ASSAYS = ["CHEMBL5736995", "CHEMBL3705421"]
RANDOM_MARKERS = ["o", "s", "^", "D", "v"]
NAMED = {
    "maxmin": ("teal", "o", "-"),
    "ensemble-variance-uncertainty": ("coral", "s", "--"),
}

CAPTION = (
    "Acquisition policies on two retrospective assay replays, {summary}. The two named policies "
    "are drawn in colour and the five random policy instances in one colour with a distinct marker "
    "each, because they are five fixed seeds of one policy rather than five methods. "
    "Normalized recovery AUC is the trapezoidal integral over acquired-count checkpoints "
    "divided by the final acquired count. These are "
    "retrospective replays and not prospective experiments, the random seeds are not independent "
    "replicates, and no confidence intervals or p values are reported."
)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Keep every trajectory and expose the campaign's integral summary beside it."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    real = data["real"]
    fig = style.figure(height=7.7)
    style.heading(
        fig,
        "Acquisition policy changes recovery and evaluation error",
        "Two retrospective assay replays · all five fixed random policy instances retained",
    )
    axes = style.axes_grid(
        fig,
        2,
        3,
        left=0.08,
        right=0.905,
        bottom=0.20,
        top=0.80,
        wspace=0.66,
        hspace=0.82,
        width_ratios=[1.25, 1.25, 0.72],
    )
    summary_parts = []
    for row, assay in enumerate(ASSAYS):
        recovery_ax, mae_ax, auc_ax = axes[3 * row : 3 * row + 3]
        block = data["assays"][assay]
        checkpoints, policies, names = block["checkpoints"], block["policies"], block["names"]
        for name in names:
            policy = policies[name]
            if name in NAMED:
                colour, marker, dash = NAMED[name]
                filled = True
            else:
                colour = "slate"
                marker = RANDOM_MARKERS[names[2:].index(name)]
                dash = (0, (2, 2))
                filled = False
            for axis, metric in [(recovery_ax, "recovery"), (mae_ax, "evaluation_mae")]:
                values = policy[metric]
                if len(values) != len(checkpoints):
                    raise ValueError(f"{assay} {name} missing {metric} checkpoint")
                axis.plot(
                    checkpoints,
                    values,
                    color=colours[colour],
                    marker=marker,
                    ms=5 if filled else 4,
                    mfc=colours[colour] if filled else tokens["panel"],
                    mec=colours[colour],
                    mew=0.8,
                    lw=1.8 if filled else 1.0,
                    ls=dash,
                    zorder=4 if filled else 2,
                )
            y = 6 - names.index(name)
            auc_ax.plot(
                policy["normalized_auc"],
                y,
                marker=marker,
                ms=5,
                mfc=colours[colour] if filled else tokens["panel"],
                mec=colours[colour],
                ls="none",
            )
            auc_ax.text(
                1.04,
                y,
                f"{policy['normalized_auc']:.4f}",
                transform=auc_ax.get_yaxis_transform(),
                ha="left",
                va="center",
                fontsize=10.0,
            )
        for axis in [recovery_ax, mae_ax]:
            axis.set_xticks(checkpoints)
            axis.set_xlabel("Compounds acquired", fontsize=10.0)
            style.clean_axis(axis, axis="y")
        recovery_ax.set_ylim(0, 0.27)
        recovery_ax.set_ylabel("Top-decile recovery", fontsize=10.0)
        mae_ax.set_ylabel("Evaluation MAE", fontsize=10.0)
        auc_ax.set_ylim(-0.6, 6.6)
        auc_ax.set_yticks(
            range(7), ["R4", "R3", "R2", "R1", "R0", "Variance", "Maxmin"], fontsize=10.0
        )
        auc_ax.set_xlabel("Recovery AUC", fontsize=10.0)
        auc_ax.set_xlim(-0.012, 0.20)
        auc_ax.set_xticks([0, 0.1, 0.2])
        style.clean_axis(auc_ax)
        style.title(recovery_ax, f"({chr(97 + row * 3)}) Recovery")
        style.title(mae_ax, f"({chr(98 + row * 3)}) Evaluation error")
        style.title(auc_ax, f"({chr(99 + row * 3)}) AUC")
        fig.text(0.08, 0.855 - row * 0.365, assay, fontsize=10.2, fontweight="bold")
        budget = real["assays"][assay]["budget"]
        maxmin = policies["maxmin"]
        ensemble = policies["ensemble-variance-uncertainty"]
        summary_parts.append(
            f"on {assay}, {budget['acquired_count']} compounds were acquired against a "
            f"pool of {budget['original_pool_parent_count']}, and the diversity policy "
            f"reached normalized recovery AUC {maxmin['normalized_auc']:.4f} against "
            f"{ensemble['normalized_auc']:.4f} for the ensemble-variance policy"
        )
    handles = [_handle(colours["teal"], "o", "-"), _handle(colours["coral"], "s", "--")] + [
        _handle(colours["slate"], m, (0, (2, 2))) for m in RANDOM_MARKERS
    ]
    fig.legend(
        handles,
        ["Maxmin diversity", "Ensemble variance"] + [f"Random {i}" for i in range(5)],
        loc="lower center",
        bbox_to_anchor=(0.5, 0.06),
        ncol=4,
        fontsize=10.0,
        handlelength=1.8,
        columnspacing=1.2,
    )
    style.footnote(
        fig,
        (
            "Policy seeds are fixed instances, not independent biological replicates. AUC "
            "is a normalized recovery integral, not a final recovery fraction."
        ),
        y=0.018,
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, CAPTION.format(summary=style.english_list(summary_parts)))
    return written


def _handle(colour: str, marker: str, dash: object):
    """A legend handle in the shape of a line mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        color=colour,
        marker=marker,
        markersize=4.6,
        markerfacecolor=colour,
        markeredgecolor=colour,
        markeredgewidth=1.0,
        linewidth=1.6,
        linestyle=dash,
    )


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
