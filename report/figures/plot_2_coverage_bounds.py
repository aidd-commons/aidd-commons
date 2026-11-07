"""Coverage bounds across the thirteen providers.

Source of every number: `site/public/data/comparison.v1.json`, the frozen
comparison audit, and only its `summaries` array and the provider records that
array is built from. No number here is re-derived by hand and no evaluation was
re-run to produce it.

What the bounds are, in the audit's own terms. Every provider is crossed with
every taxonomy topic, so a provider-topic cell is either a direct observation
or an explicit `coverage_default: unverified`. An unverified cell adds nothing
to the lower bound and one to the upper bound. An absent cell adds nothing to
either. A directly observed cell whose depth reaches the threshold counts in
both bounds. A cell that was observed but sits below the threshold counts in
neither, and it lowers that provider's ceiling.

That is why this project's own row is a set of exact counts and every other
row is an interval. All 93 of this project's cells are direct observations, so
its lower and upper bounds are equal at every threshold. The twelve external
providers are crossed with 93 topics as well, but their cells were classified
only from what each cell's own note and evidence state, and no external
provider was re-read to classify it, so their rows carry a genuine interval.

What the figure does not show. The external survey has not been re-run since
the date the audit froze, so an external bound is a statement about what was
known at that date and not about what a provider holds now. The intervals are
not confidence intervals and no probability attaches to them. A wide interval
says the evidence is thin, not that the provider is weak, and a narrow one
says the opposite. The audit itself records that the evidence does not support
a "most comprehensive" or a "most detailed" claim, and this figure does not
assert one.
"""

from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 2
STEM = "plot_2_coverage_bounds"
SELF_ID = "aidd-commons"
TOTAL_TOPICS = 93

CAPTION = (
    "Coverage bounds for thirteen providers across five thresholds, each bound a lower and an "
    "upper count out of 93 topics. AIDD Commons is the first row and its bounds are equal at "
    "every threshold, {own}, because all 93 of its cells are direct observations. Every external "
    "row is an interval, because unobserved cells contribute to an upper bound and nothing to a "
    "lower one. The bounds are not confidence intervals and no probability attaches to them."
)

#: Short forms of the provider names for the row labels, one line each. They
#: are the audit's own provider ids, spelled out where the id is a handle.
DISPLAY = {
    "aidd-commons": "AIDD Commons",
    "agil": "AGIL",
    "build-ai-drug-discovery-pipelines": "Build AI pipelines",
    "chembl-training": "ChEMBL Quick Tour",
    "deepchem-tutorials": "DeepChem tutorials",
    "european-aidd-network": "EU AIDD network",
    "ml4drug-book": "ML4Drug book",
    "o3dc": "O3DC index",
    "openmm-cookbook": "OpenMM cookbook",
    "practical-cheminformatics": "Practical cheminformatics",
    "rdkit-cookbook": "RDKit cookbook",
    "teachopencadd": "TeachOpenCADD",
    "therapeutics-data-commons": "Therapeutics Data Commons",
}

THRESHOLD_TITLES = {
    "explained": "Explained",
    "worked": "Worked",
    "executable": "Executable",
    "executable-on-real-data": "Executable on real data",
    "assessed": "Assessed",
}


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Show every interval in one aligned provider-by-threshold matrix."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    payload, names, classes = data["payload"], data["names"], data["classes"]
    thresholds, bounds, order, total = (data[k] for k in ("thresholds", "bounds", "order", "total"))
    class_order = ["curriculum", "tutorial-collection", "benchmark-hub", "specialist-reference"]
    markers = {
        "curriculum": "o",
        "tutorial-collection": "s",
        "benchmark-hub": "^",
        "specialist-reference": "D",
    }
    fig = style.figure(height=7.8)
    style.heading(
        fig,
        "Evidence bounds, rather than a leaderboard",
        (
            f"{len(order)} providers × {len(thresholds)} thresholds · {total} historical "
            f"topics · {payload['as_of']}"
        ),
    )
    axes = style.axes_grid(fig, 1, 5, left=0.31, right=0.978, bottom=0.14, top=0.82, wspace=0.16)
    ys = list(range(len(order)))[::-1]
    for col, (ax, threshold) in enumerate(zip(axes, thresholds, strict=True)):
        for idx, (y, p) in enumerate(zip(ys, order, strict=True)):
            lo, hi = bounds[p][threshold]
            own = p == SELF_ID
            if own:
                ax.axhspan(y - 0.44, y + 0.44, color="#eef6f7", zorder=0)
            elif idx % 2 == 1:
                ax.axhspan(y - 0.44, y + 0.44, color="#f7f9fa", zorder=0)
            colour = colours["teal"] if own else colours["slate"]
            ax.plot([0, total], [y, y], color=tokens["rule"], lw=0.5, zorder=1)
            if own:
                ax.plot(lo, y, marker="D", ms=6, color=colour, mec=tokens["ink"], mew=0.5, zorder=4)
            else:
                ax.plot([lo, hi], [y, y], color=colour, lw=1.8, zorder=2)
                ax.plot(
                    lo,
                    y,
                    marker=markers[classes[p]],
                    ms=5,
                    mfc=tokens["panel"],
                    mec=colour,
                    mew=0.9,
                    zorder=3,
                )
                ax.plot(
                    hi,
                    y,
                    marker=markers[classes[p]],
                    ms=5,
                    mfc=colour,
                    mec=colour,
                    mew=0.6,
                    zorder=3,
                )
            ax.annotate(
                str(lo) if lo == hi else f"{lo}–{hi}",
                (total / 2, y),
                xytext=(0, -9.8),
                textcoords="offset points",
                ha="center",
                va="center",
                fontsize=9.4,
                fontweight="bold" if own else "normal",
                color=tokens["ink"] if own else tokens["muted"],
            )
        ax.set_xlim(-5, total + 5)
        ax.set_ylim(-0.9, len(order) - 0.1)
        ax.set_xticks([0, total])
        ax.set_yticks(ys)
        ax.set_yticklabels([DISPLAY.get(p, names[p]) for p in order] if col == 0 else [])
        if col == 0:
            ax.get_yticklabels()[0].set_fontweight("bold")
        ax.tick_params(axis="y", length=0, pad=9)
        for spine in ["top", "right", "left"]:
            ax.spines[spine].set_visible(False)
        label = THRESHOLD_TITLES[threshold].replace(
            "Executable on real data", "Real-data\nexecution"
        )
        style.title(ax, label)
        ax.set_xlabel("Topics", fontsize=10.0)
    from matplotlib.lines import Line2D

    handles = [
        Line2D(
            [], [], marker=markers[c], ms=4.5, mfc=tokens["panel"], mec=colours["slate"], ls="none"
        )
        for c in class_order
    ]
    fig.legend(
        handles,
        ["Curriculum", "Tutorial collection", "Benchmark hub", "Specialist reference"],
        ncol=2,
        loc="lower left",
        bbox_to_anchor=(0.29, 0.025),
        fontsize=10.0,
        handlelength=1,
        handletextpad=0.4,
        columnspacing=1.5,
    )
    fig.text(
        0.035,
        0.095,
        "Open marker: lower\nFilled marker: upper",
        fontsize=10.0,
        color=tokens["muted"],
        va="top",
    )
    style.footnote(
        fig,
        (
            "Bounds express unresolved evidence, not statistical uncertainty; the first "
            "row has direct observations at every threshold."
        ),
        y=0.014,
        wrap_width=132,
    )
    written = style.save(fig, STEM)
    own = style.english_list(
        f"{bounds[SELF_ID][t][0]} {THRESHOLD_TITLES[t].lower()}" for t in thresholds
    )
    style.register_caption(FIGURE_NUMBER, CAPTION.format(own=own))
    return written


def _legend_handle(colour: str, marker: str):
    """A legend handle in the shape of an interval mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        color=colour,
        marker=marker,
        markersize=4.2,
        markeredgecolor=style.tokens("light")["ink"],
        markeredgewidth=0.5,
        linewidth=1.7,
    )


def _point_handle(colour: str, marker: str, *, filled: bool):
    """A legend handle in the shape of a point mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        linestyle="none",
        marker=marker,
        markersize=5.2,
        markerfacecolor=colour if filled else "none",
        markeredgecolor=colour if not filled else style.tokens("light")["ink"],
        markeredgewidth=1.1 if not filled else 0.4,
    )


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
