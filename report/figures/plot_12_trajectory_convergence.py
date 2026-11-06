"""Trajectory convergence.

Source of every number: `site/src/content/docs/labs/rmd17-dynamics-observable.mdx`,
the published lab page for the rMD17 trajectory observable. There is no
`labs/rmd17_system_state/observable-summary.json` in this repository, so the
reviewed artefact for this lab is the page itself, and the convergence table is
parsed out of it rather than transcribed. The parser is shared with the
uncertainty figure, which reads the same page.

What the figure shows. The cumulative mean of the radius of gyration over the
first k chronologically ordered frames, compared with the full 100,000-frame
mean, for both molecules. The horizontal axis is the number of frames included
on a log scale and the vertical axis is the signed difference from the full
trajectory mean. The second panel reuses the same later-frame observations
with a magnified vertical scale, so that small reversals remain visible.

The malonaldehyde curve does not settle monotonically. It is closer at a
thousand frames than it is at ten thousand, so a reader who checked only the
ten-thousand-frame point would conclude that more frames made the estimate
worse. That is in the data and it is drawn as it stands.

What it does not show. One trajectory per molecule and one level of theory, so
nothing here speaks to replicate dependence or force-field sensitivity. No new
simulation is run. A radius of gyration is one scalar for a nine-atom molecule
and its dynamic range is inherently small. Ten percent of a trajectory is not
automatically enough, and a fixed number of frames does not transfer its
adequacy from one molecule to another.
"""

from __future__ import annotations

import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_11_correlated_frames_error_bars import read_observable_page  # noqa: E402

FIGURE_NUMBER = 12
STEM = "plot_12_trajectory_convergence"
SYSTEMS = ["ethanol", "malonaldehyde"]

CAPTION = (
    "The cumulative mean of the radius of gyration against the full 100,000-frame mean, from the "
    "rMD17 lab page. {values}. The malonaldehyde curve is not monotone, being closer at a thousand "
    "frames than at ten thousand, and that is drawn as the data stands. One trajectory per "
    "molecule and one level of theory means nothing here speaks to replicate dependence or "
    "force-field sensitivity."
)


def build() -> dict[str, Path]:
    """Keep the full trajectory and explicitly inspect its later-frame reversals."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    page = read_observable_page()
    convergence = sorted(page["convergence"], key=lambda r: r["frames"])
    frames = [r["frames"] for r in convergence]
    fig = style.figure(height=5.4)
    style.heading(
        fig,
        "More frames do not guarantee monotone convergence",
        (
            "Same retained chronological observations · full-trajectory mean is a "
            "reference, not an independent truth"
        ),
    )
    full = fig.add_axes((0.15, 0.56, 0.79, 0.24))
    late = fig.add_axes((0.15, 0.19, 0.79, 0.23))
    series = [("ethanol", "Ethanol", "teal", "o"), ("malonaldehyde", "Malonaldehyde", "coral", "s")]
    for ax, selected, label in [
        (full, convergence, "(a) Full chronological range"),
        (
            late,
            [r for r in convergence if r["frames"] >= 1000],
            "(b) Later frames · magnified vertical scale",
        ),
    ]:
        ax.axhline(0, color=tokens["muted"], lw=0.8, ls="--")
        for key, name, colour, marker in series:
            xs = [r["frames"] for r in selected]
            ys = [r[key] for r in selected]
            ax.plot(
                xs,
                ys,
                color=colours[colour],
                marker=marker,
                ms=6,
                lw=1.7,
                ls=style.dashes()[colour],
                mec=tokens["ink"],
                mew=0.5,
                label=name,
            )
            for x, y in zip(xs, ys, strict=True):
                if ax == full and x > 1000:
                    continue
                ax.annotate(
                    f"{y:+.5f}",
                    (x, y),
                    xytext=(0, 11 if key == "ethanol" else -14),
                    textcoords="offset points",
                    ha="center",
                    va="center",
                    fontsize=8.1,
                )
        ax.set_xscale("log")
        xs = [r["frames"] for r in selected]
        ax.set_xticks(xs, [f"{x:,}" for x in xs])
        ax.set_xlim(min(xs) / 1.35, max(xs) * 1.35)
        ax.set_xlabel("Chronologically ordered frames · log scale")
        ax.set_ylabel("Mean difference (Å)")
        style.clean_axis(ax, axis="y")
        style.title(ax, label)
    full.set_ylim(-0.035, 0.014)
    ys = [r[k] for r in convergence if r["frames"] >= 1000 for k in SYSTEMS]
    pad = max(max(ys) - min(ys), 0.0001) * 0.45
    late.set_ylim(min(ys) - pad, max(ys) + pad)
    fig.legend(
        *full.get_legend_handles_labels(),
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.56, 0.072),
        fontsize=8.5,
    )
    style.footnote(
        fig,
        (
            "Both panels reuse the same values; no smoothing, new simulation or "
            "independent replication. One trajectory and one level of theory per molecule."
        ),
        y=0.02,
    )
    values_text = style.english_list(
        (
            f"{r['ethanol']:+.5f} Å for ethanol and {r['malonaldehyde']:+.5f} Å for "
            f"malonaldehyde at {r['frames']:,} frames"
        )
        for r in convergence
        if r["frames"] != max(frames)
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, CAPTION.format(values=values_text))
    return written


def _handle(colour: str, marker: str, dash: object):
    """A legend handle in the shape of a line mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        color=colour,
        marker=marker,
        markersize=5.6,
        markerfacecolor=colour,
        markeredgecolor=style.tokens("light")["ink"],
        markeredgewidth=0.5,
        linewidth=1.8,
        linestyle=dash,
    )


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
