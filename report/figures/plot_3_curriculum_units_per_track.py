"""Curriculum units per track.

Source of every number: `catalog/curriculum/tracks.yaml`, the curriculum
registry that the website renders from and that the coverage audit reads. The
file holds eighteen tracks, each with its ordered lessons, and a flat list of
120 learning units, each carrying the track it belongs to and one of three
layers.

What the figure shows. The stacked count bars separate learning units
by layer: core, research and practice. A separate last column counts lessons per
track, because a unit is attached to a lesson and the two counts are not the
same thing. The tracks are in curriculum order, so the figure reads as the
sequence the learner walks.

What it does not show. A unit is a learning objective attached to a lesson, not
a piece of content and not an assessment. The counts say nothing about how
long a track takes, how hard it is, or whether a learner reaches the end of
it. Nothing here is a coverage claim, and nothing here is a measure of
learning.
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

FIGURE_NUMBER = 3
STEM = "plot_3_curriculum_units_per_track"
LAYERS = ["core", "research", "practice"]
LAYER_COLOUR = {"core": "teal", "research": "coral", "practice": "slate"}

CAPTION = (
    "Curriculum units per track across the {tracks} tracks, split by layer, beside the number of "
    "lessons in each track. Stacked segments count core, research and practice units, with zero "
    "practice counts labelled explicitly; separate lollipops count lessons. The curriculum holds "
    "{units} learning units in {lessons} lessons, "
    "{layers}. A unit is a learning objective attached to a lesson, so the two counts differ, and "
    "neither one says how long a track takes or whether a learner reaches its end."
)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Separate unit layers from lesson counts on a shared track alignment."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    registry, tracks, counts = data["registry"], data["tracks"], data["counts"]
    fig = style.figure(height=7.4)
    style.heading(
        fig,
        "Learning units and lessons are different objects",
        f"{len(tracks)} tracks · {len(registry['units'])} learning units · curriculum order",
    )
    ax = fig.add_axes((0.39, 0.12, 0.38, 0.68))
    lessons_ax = fig.add_axes((0.84, 0.12, 0.12, 0.68))
    ys = list(range(len(tracks)))[::-1]
    totals = [sum(counts[t["id"]].values()) for t in tracks]
    from matplotlib.patches import Patch

    handles = []
    for index, layer in enumerate(LAYERS):
        colour = LAYER_COLOUR[layer]
        values = [counts[t["id"]][layer] for t in tracks]
        left = [sum(counts[t["id"]][previous] for previous in LAYERS[:index]) for t in tracks]
        bars = ax.barh(
            ys,
            values,
            left=left,
            height=0.64,
            color=style.fill_colours()[colour],
            edgecolor=colours[colour],
            linewidth=0.65,
            hatch=style.atlas_palette.HATCH[colour],
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
                )
        handles.append(
            Patch(
                facecolor=style.fill_colours()[colour],
                edgecolor=colours[colour],
                hatch=style.atlas_palette.HATCH[colour],
                label=layer.title(),
            )
        )
    for y, track, total in zip(ys, tracks, totals, strict=True):
        if counts[track["id"]]["practice"] == 0:
            ax.annotate(
                "Practice 0",
                (total, y),
                xytext=(6, 0),
                textcoords="offset points",
                ha="left",
                va="center",
                fontsize=10,
                color=colours["slate"],
            )
    lesson_values = [len(t["lessons"]) for t in tracks]
    for y, n in zip(ys, lesson_values, strict=True):
        lessons_ax.plot([0, n], [y, y], color=colours["slate"], lw=1.6)
        lessons_ax.plot(
            n, y, marker="D", ms=5.5, color=colours["slate"], mec=tokens["ink"], mew=0.5
        )
        lessons_ax.annotate(
            str(n),
            (n, y),
            xytext=(6, 0),
            textcoords="offset points",
            ha="left",
            va="center",
            fontsize=10.0,
            fontweight="bold",
        )
    ax.set_yticks(ys, style.track_labels([t["id"] for t in tracks]))
    lessons_ax.set_yticks(ys, [])
    for axis in (ax, lessons_ax):
        axis.set_ylim(-0.7, len(tracks) - 0.3)
        style.clean_axis(axis)
        axis.xaxis.set_major_locator(MaxNLocator(nbins=4, integer=True))
    ax.set_xlim(0, max(totals) * 1.04)
    lessons_ax.set_xlim(0, max(lesson_values) * 1.35)
    ax.set_xlabel("Learning units")
    lessons_ax.set_xlabel("Lessons")
    style.title(ax, "(a) Units by layer")
    style.title(lessons_ax, "(b) Lessons")
    fig.legend(
        handles=handles,
        loc="upper left",
        bbox_to_anchor=(0.38, 0.885),
        ncol=3,
        columnspacing=1.3,
        handlelength=1.4,
        fontsize=10.0,
    )
    style.footnote(
        fig,
        (
            "Stacked segments give exact unit counts; the separate alignment counts lessons. "
            "Neither units "
            "nor lessons measure reader learning."
        ),
    )
    layer_totals = {layer: sum(counts[t["id"]][layer] for t in tracks) for layer in LAYERS}
    written = style.save(fig, STEM)
    style.register_caption(
        FIGURE_NUMBER,
        CAPTION.format(
            tracks=len(tracks),
            units=sum(layer_totals.values()),
            lessons=sum(len(t["lessons"]) for t in tracks),
            layers=style.english_list(
                f"{layer_totals[layer]} {layer}" for layer in LAYERS if layer_totals[layer]
            ),
        ),
    )
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
