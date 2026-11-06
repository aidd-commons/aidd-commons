"""Curriculum units per track.

Source of every number: `catalog/curriculum/tracks.yaml`, the curriculum
registry that the website renders from and that the coverage audit reads. The
file holds eighteen tracks, each with its ordered lessons, and a flat list of
120 learning units, each carrying the track it belongs to and one of three
layers.

What the figure shows. The aligned count matrix separates learning units
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
from collections import Counter
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)

FIGURE_NUMBER = 3
STEM = "plot_3_curriculum_units_per_track"
LAYERS = ["core", "research", "practice"]
LAYER_COLOUR = {"core": "teal", "research": "coral", "practice": "slate"}

CAPTION = (
    "Curriculum units per track across the {tracks} tracks, split by layer, beside the number of "
    "lessons in each track. The curriculum holds {units} learning units in {lessons} lessons, "
    "{layers}. A unit is a learning objective attached to a lesson, so the two counts differ, and "
    "neither one says how long a track takes or whether a learner reaches its end."
)


def build() -> dict[str, Path]:
    """Separate unit layers from lesson counts on a shared track alignment."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    registry = style.load_yaml(style.REPO_ROOT / "catalog/curriculum/tracks.yaml")
    tracks = sorted(registry["tracks"], key=lambda t: t["order"])
    counts = {t["id"]: Counter() for t in tracks}
    for unit in registry["units"]:
        counts[unit["track_id"]][unit["layer"]] += 1
    fig = style.figure(height=6.45)
    style.heading(
        fig,
        "Learning units and lessons are different objects",
        (
            f"{len(tracks)} tracks · {len(registry['units'])} declared learning units · "
            f"curriculum order"
        ),
    )
    ax = fig.add_axes((0.39, 0.11, 0.56, 0.69))
    ys = list(range(len(tracks)))[::-1]
    for y, t in zip(ys, tracks, strict=True):
        ax.axhline(y, color=tokens["rule"], lw=0.45, zorder=0)
        for x, layer in enumerate(LAYERS):
            n = counts[t["id"]][layer]
            if n:
                ax.scatter(
                    x,
                    y,
                    s=30 + 35 * n,
                    facecolor=style.fill_colours()[LAYER_COLOUR[layer]],
                    edgecolor=colours[LAYER_COLOUR[layer]],
                    linewidth=0.85,
                    marker=style.markers()[LAYER_COLOUR[layer]],
                    zorder=2,
                )
            ax.text(
                x, y, str(n), ha="center", va="center", fontsize=8.4, fontweight="bold", zorder=3
            )
        lessons = len(t["lessons"])
        ax.text(3.25, y, str(lessons), ha="center", va="center", fontweight="bold", fontsize=9)
    ax.axvline(2.62, color=tokens["rule"], lw=0.8)
    ax.set_xticks([0, 1, 2, 3.25], ["Core", "Research", "Practice", "Lessons"])
    ax.xaxis.tick_top()
    ax.tick_params(length=0, pad=10)
    ax.set_yticks(ys, style.track_labels([t["id"] for t in tracks]))
    ax.tick_params(axis="y", pad=10)
    ax.set_xlim(-0.5, 3.7)
    ax.set_ylim(-0.7, len(tracks) - 0.3)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.text(
        0.26,
        1.08,
        "Learning units by layer",
        transform=ax.transAxes,
        ha="center",
        fontsize=9.2,
        fontweight="bold",
    )
    style.footnote(
        fig,
        (
            "Numbers give exact counts; symbol area reinforces unit count. Neither units "
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
