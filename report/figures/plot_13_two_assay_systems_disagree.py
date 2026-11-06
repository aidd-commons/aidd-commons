"""Two assay systems disagree.

Source of every number: `labs/cyp_assay_system/summary.json` and
`labs/az_clearance_system/summary.json`, the reviewed summaries of two
completed assay-system labs. The first holds the correlation between the
CYP2D6 and CYP3A4 assay systems and the molecules on which they disagree
most; the second holds the correlation between three clearance assay systems
and the molecules on which they disagree most.

What the figure shows. The upper panel puts the two correlations of every
system pair side by side, with the number of shared molecules on each row, so
that the size of the overlap is visible next to the size of the correlation.
The lower panel takes the six molecules the CYP lab names as its largest
disagreements and draws both systems' pChEMBL values for each, which is the
form the disagreement takes at the level of one molecule: three molecules the
first system rates far above the second, and three the second rates far above
the first.

What it does not show. A correlation near 0.3 between two assay systems means
that a measurement in one system carries little information about the
measurement in the other, which is not the same as saying that either system
is wrong. The divergence examples are the extremes the review found and they
are not a sample of the distribution. The clearance pairs differ in species,
in matrix or in both, which is recorded on each row in the summary and is the
reason those rows are not interchangeable with the CYP rows. The p values in
the summaries are not drawn here, because with a correlation this low they say
only that the sample is not zero.
"""

from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 13
STEM = "plot_13_two_assay_systems_disagree"

CAPTION = (
    "Agreement between CYP and clearance assay systems. {correlation}. The six largest "
    "disagreements "
    "between the two CYP systems span {spread} pChEMBL in both directions, with the first "
    "system higher on three molecules and the second on three. A correlation near "
    "0.3 means a measurement in one system carries little information about the other, which is "
    "not the same as saying either system is wrong, and the six molecules are the extremes the "
    "review found rather than a sample of the distribution."
)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Give pairwise evidence and named extreme examples separate full-width rows."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    cyp, clearance, rows, examples = (data[k] for k in ("cyp", "clearance", "rows", "examples"))
    fig = style.figure(height=7.5)
    style.heading(
        fig,
        "Assay-system agreement is an empirical question",
        "System-pair correlations above · selected CYP molecule extremes below",
    )
    ax = fig.add_axes((0.42, 0.56, 0.30, 0.26))
    ex = fig.add_axes((0.23, 0.16, 0.50, 0.26))
    names = [
        r[0]
        .replace(" against ", " / ")
        .replace(", all pairs", " · all")
        .replace(", clean pairs", " · clean")
        for r in rows
    ]
    for y, (_label, n, r, rho) in zip(list(range(len(rows)))[::-1], rows, strict=True):
        ax.plot([r, rho], [y, y], color=tokens["rule"], lw=1.7)
        ax.plot(r, y, "o", ms=6, mfc=colours["slate"], mec=tokens["ink"], mew=0.5)
        ax.plot(rho, y, "s", ms=6, mfc="none", mec=colours["coral"], mew=1)
        ax.text(
            1.08,
            y,
            f"{r:.3f} / {rho:.3f}",
            transform=ax.get_yaxis_transform(),
            ha="left",
            va="center",
            fontsize=10.0,
        )
        ax.text(
            1.60,
            y,
            f"{n:,}",
            transform=ax.get_yaxis_transform(),
            ha="left",
            va="center",
            fontsize=10.0,
        )
    ax.set_yticks(list(range(len(rows)))[::-1], names, fontsize=10.0)
    ax.set_ylim(-0.65, len(rows) - 0.35)
    ax.set_xlim(-0.02, 0.72)
    ax.set_xticks([0, 0.2, 0.4, 0.6])
    ax.set_xlabel("Correlation coefficient")
    style.clean_axis(ax)
    style.title(ax, "(a) System-pair correlations")
    ax.text(1.08, 1.03, "r / ρ", transform=ax.transAxes, fontsize=10.0, color=tokens["muted"])
    ax.text(1.60, 1.03, "Shared n", transform=ax.transAxes, fontsize=10.0, color=tokens["muted"])
    for y, (_identifier, a, b) in zip(list(range(len(examples)))[::-1], examples, strict=True):
        ex.plot([a, b], [y, y], color=tokens["rule"], lw=1.7)
        ex.plot(a, y, "o", ms=6, mfc=colours["teal"], mec=tokens["ink"], mew=0.5)
        ex.plot(b, y, "s", ms=6, mfc="none", mec=colours["coral"], mew=1)
        ex.text(
            1.04,
            y,
            f"{a:.2f} / {b:.2f}",
            transform=ex.get_yaxis_transform(),
            ha="left",
            va="center",
            fontsize=10.0,
        )
        ex.text(
            1.37,
            y,
            f"{a - b:+.2f}",
            transform=ex.get_yaxis_transform(),
            ha="left",
            va="center",
            fontsize=10.0,
            fontweight="bold",
        )
    ex.set_yticks(list(range(len(examples)))[::-1], [r[0] for r in examples])
    ex.set_ylim(-0.65, len(examples) - 0.35)
    ex.set_xlim(0, 8.6)
    ex.set_xlabel("pChEMBL in each system")
    style.clean_axis(ex)
    style.title(ex, "(b) Largest CYP disagreements · selected extremes")
    ex.text(1.04, 1.02, "2D6 / 3A4", transform=ex.transAxes, fontsize=10.0, color=tokens["muted"])
    ex.text(1.37, 1.02, "Δ", transform=ex.transAxes, fontsize=10.0, color=tokens["muted"])
    from matplotlib.lines import Line2D

    fig.legend(
        [
            Line2D([], [], marker="o", mfc=colours["slate"], mec=tokens["ink"], ls="none"),
            Line2D([], [], marker="s", mfc="none", mec=colours["coral"], ls="none"),
        ],
        ["(a) Pearson r · (b) CYP2D6", "(a) Spearman ρ · (b) CYP3A4"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.55, 0.065),
        fontsize=10.0,
    )
    style.footnote(
        fig,
        "Species and matrix differ across clearance pairs. Selected extremes do not "
        "represent the distribution; neither assay system is declared wrong.",
        y=0.02,
    )
    correlation_text = style.english_list(
        f"{label} reaches a Pearson r of {r:.4f} and a Spearman rho of {rho:.4f} over "
        f"{n} shared molecules"
        for label, n, r, rho in rows
    )
    divergence_text = style.english_list(
        f"{name} at {a:.2f} against {b:.2f}" for name, a, b in examples
    )
    spread = (
        f"{min(abs(a - b) for _, a, b in examples):.2f} to "
        f"{max(abs(a - b) for _, a, b in examples):.2f}"
    )
    written = style.save(fig, STEM)
    style.register_caption(
        FIGURE_NUMBER,
        CAPTION.format(correlation=correlation_text, divergence=divergence_text, spread=spread),
    )
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
