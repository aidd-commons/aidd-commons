"""Depth distribution per track.

Source of every number: `site/public/data/comparison.v1.json`, the frozen
comparison audit, and only the rows whose provider is this project. Those 93
rows carry one of three observed depths (worked, executable, assessed) and, for
every row that has a runnable task, the basis that task rests on (real-data or
authored).

What the figure shows. The left stacked bars count each track's topics by
highest observed depth, assigning each topic to one mutually exclusive depth.
Depth is an ordered quantity, so it takes the palette's
ordered ladder, pale for worked and dark for assessed. The separate right stacked bars
partition runnable topics by what their runnable task rests on. A task that computes
on measured records, or that runs a real simulation, docking or structure
prediction, rests on real data; a task that runs on hand-written or synthetic
inputs rests on authored inputs. The audit counts an executable-on-real-data
cell only when the basis is real data, so the split is what decides that
threshold.

What it does not show. The depth is what a reviewer of this project observed
in the material, not what a learner achieved and not what a model scored. The
run basis says what the task rests on, not whether the task is correct. A track with
no runnable topic is labelled explicitly rather than receiving an implied
zero-openness or zero-quality interpretation.
"""

from __future__ import annotations

import sys
from pathlib import Path

from matplotlib.ticker import MaxNLocator

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 4
STEM = "plot_4_depth_distribution_per_track"
SELF_ID = "aidd-commons"
DEPTHS = ["worked", "executable", "assessed"]
BASES = ["real-data", "authored"]
BASE_COLOUR = {"real-data": "ember", "authored": "slate"}

CAPTION = (
    "Highest observed depth per track for this project's {topics} audited topics, "
    "beside the basis each "
    "track's runnable topics rest on. {depths}, and of the {runnable} runnable topics {bases}. "
    "Each topic appears once in the highest-depth stack; the separate run-basis stack partitions "
    "runnable topics. Depth records what a reviewer observed in the material, not what a learner "
    "achieved."
)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Separate mutually exclusive highest depths from runnable-basis counts."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    rows, order = data["rows"], data["order"]
    depth_by_track, base_by_track = data["depth_by_track"], data["base_by_track"]
    fig = style.figure(height=7.4)
    style.heading(
        fig,
        "Observed depth and the basis of runnable work",
        f"{len(rows)} historical topics · highest observed depth, not learner achievement",
    )
    ax = fig.add_axes((0.39, 0.12, 0.32, 0.68))
    basis_ax = fig.add_axes((0.78, 0.12, 0.18, 0.68))
    ys = list(range(len(order)))[::-1]
    from matplotlib.patches import Patch

    depth_handles, basis_handles = [], []
    ladder = style.ladder_steps("light", 3)
    for index, depth in enumerate(DEPTHS):
        values = [depth_by_track[t][depth] for t in order]
        left = [sum(depth_by_track[t][d] for d in DEPTHS[:index]) for t in order]
        hatch = ["//", "xx", "\\"][index]
        bars = ax.barh(
            ys,
            values,
            left=left,
            height=0.64,
            color=ladder[index],
            edgecolor=tokens["ink"],
            linewidth=0.6,
            hatch=hatch,
        )
        for bar, n in zip(bars, values, strict=True):
            if n:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_y() + bar.get_height() / 2,
                    str(n),
                    ha="center",
                    va="center",
                    fontsize=10.0,
                    fontweight="bold",
                    color=tokens["panel"] if index == 2 else tokens["ink"],
                )
        depth_handles.append(
            Patch(
                facecolor=ladder[index], edgecolor=tokens["ink"], hatch=hatch, label=depth.title()
            )
        )
    for index, basis in enumerate(BASES):
        colour = BASE_COLOUR[basis]
        values = [base_by_track[t][basis] for t in order]
        left = [sum(base_by_track[t][b] for b in BASES[:index]) for t in order]
        bars = basis_ax.barh(
            ys,
            values,
            left=left,
            height=0.64,
            color=style.fill_colours()[colour],
            edgecolor=colours[colour],
            linewidth=0.6,
            hatch=style.atlas_palette.HATCH[colour],
        )
        for bar, n in zip(bars, values, strict=True):
            if n:
                basis_ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_y() + bar.get_height() / 2,
                    str(n),
                    ha="center",
                    va="center",
                    fontsize=10.0,
                    fontweight="bold",
                )
        basis_handles.append(
            Patch(
                facecolor=style.fill_colours()[colour],
                edgecolor=colours[colour],
                hatch=style.atlas_palette.HATCH[colour],
                label="Real data" if basis == "real-data" else "Authored",
            )
        )
    for y, track in zip(ys, order, strict=True):
        if not sum(base_by_track[track].values()):
            basis_ax.text(
                0.02,
                y,
                "No runnable topic",
                transform=basis_ax.get_yaxis_transform(),
                va="center",
                fontsize=10.0,
                color=tokens["muted"],
            )
    ax.set_yticks(ys, style.track_labels(order))
    basis_ax.set_yticks(ys, [])
    maximum = max(sum(depth_by_track[t].values()) for t in order)
    ax.set_xlim(0, maximum * 1.04)
    basis_ax.set_xlim(0, maximum * 1.04)
    for axis in (ax, basis_ax):
        axis.set_ylim(-0.7, len(order) - 0.3)
        axis.set_xlabel("Topics")
        axis.xaxis.set_major_locator(MaxNLocator(nbins=4, integer=True))
        style.clean_axis(axis)
    style.title(ax, "(a) Highest observed depth")
    style.title(basis_ax, "(b) Runnable basis")
    fig.legend(
        handles=depth_handles,
        loc="upper left",
        bbox_to_anchor=(0.38, 0.885),
        ncol=3,
        columnspacing=0.6,
        handletextpad=0.3,
        handlelength=1.0,
        fontsize=9.2,
    )
    fig.legend(
        handles=basis_handles,
        loc="upper left",
        bbox_to_anchor=(0.76, 0.885),
        ncol=2,
        handlelength=0.9,
        handletextpad=0.25,
        columnspacing=0.5,
        fontsize=9.2,
    )
    style.footnote(
        fig,
        "Numbers give exact counts; empty run-basis rows mean no runnable topic. Real "
        "data and authored inputs remain distinct.",
    )
    dt = {d: sum(depth_by_track[t][d] for t in order) for d in DEPTHS}
    bt = {b: sum(base_by_track[t][b] for t in order) for b in BASES}
    written = style.save(fig, STEM)
    style.register_caption(
        FIGURE_NUMBER,
        CAPTION.format(
            topics=len(rows),
            depths=style.english_list(f"{dt[d]} {d}" for d in DEPTHS),
            runnable=sum(dt[d] for d in DEPTHS if d != "worked"),
            bases=(
                f"{bt['real-data']} rest on real data and {bt['authored']} rest on authored inputs"
            ),
        ),
    )
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
