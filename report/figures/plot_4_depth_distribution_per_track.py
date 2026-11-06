"""Depth distribution per track.

Source of every number: `site/public/data/comparison.v1.json`, the frozen
comparison audit, and only the rows whose provider is this project. Those 93
rows carry one of three observed depths (worked, executable, assessed) and, for
every row that has a runnable task, the basis that task rests on (real-data or
authored).

What the figure shows. The first three columns count each track's topics by
observed depth. Depth is an ordered quantity, so it takes the palette's
ordered ladder, pale for worked and dark for assessed. The final two columns
separate runnable topics by what their runnable task rests on. A task that computes
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
from collections import Counter, defaultdict
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)

FIGURE_NUMBER = 4
STEM = "plot_4_depth_distribution_per_track"
SELF_ID = "aidd-commons"
DEPTHS = ["worked", "executable", "assessed"]
BASES = ["real-data", "authored"]
BASE_COLOUR = {"real-data": "ember", "authored": "slate"}

CAPTION = (
    "Observed depth per track for this project's {topics} audited topics, beside the basis each "
    "track's runnable topics rest on. {depths}, and of the {runnable} runnable topics {bases}. "
    "Depth records what a reviewer observed in the material, not what a learner achieved."
)


def build() -> dict[str, Path]:
    """Retain all depth and run-basis counts without stacked-bar ambiguity."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    payload = style.load_json(style.DATA_DIR / "comparison.v1.json")
    rows = [r for r in payload["rows"] if r["provider_id"] == SELF_ID]
    order = []
    depth_by_track = defaultdict(Counter)
    base_by_track = defaultdict(Counter)
    for row in sorted(rows, key=lambda r: r["track_order"]):
        track = row["track_id"]
        if track not in depth_by_track:
            order.append(track)
        depth_by_track[track][row["depth"]] += 1
        if row["run_basis"]:
            base_by_track[track][row["run_basis"]] += 1
    fig = style.figure(height=6.45)
    style.heading(
        fig,
        "Observed depth and the basis of runnable work",
        f"{len(rows)} historical topics · material observations, not learner achievements",
    )
    ax = fig.add_axes((0.39, 0.12, 0.57, 0.68))
    ys = list(range(len(order)))[::-1]
    for y, track in zip(ys, order, strict=True):
        ax.axhline(y, color=tokens["rule"], lw=0.45, zorder=0)
        for x, depth in enumerate(DEPTHS):
            n = depth_by_track[track][depth]
            if n:
                ax.scatter(
                    x,
                    y,
                    s=30 + 12 * n,
                    facecolor=style.ladder_steps("light", 3)[x],
                    edgecolor=tokens["ink"],
                    linewidth=0.55,
                    marker=["o", "s", "D"][x],
                )
            ax.text(
                x,
                y,
                str(n),
                ha="center",
                va="center",
                fontsize=8.2,
                color=tokens["panel"] if x == 2 and n else tokens["ink"],
                fontweight="bold" if n else "normal",
            )
        if not sum(base_by_track[track].values()):
            ax.text(
                3.55,
                y,
                "no runnable topic",
                ha="center",
                va="center",
                fontsize=8.0,
                color=tokens["muted"],
            )
        else:
            for x, basis in zip([3.1, 4.0], BASES, strict=True):
                n = base_by_track[track][basis]
                ax.text(
                    x,
                    y,
                    str(n),
                    ha="center",
                    va="center",
                    fontweight="bold",
                    fontsize=9,
                    color=colours[BASE_COLOUR[basis]],
                )
    ax.axvline(2.55, color=tokens["rule"], lw=0.8)
    ax.set_xticks(
        [0, 1, 2, 3.1, 4.0], ["Worked", "Executable", "Assessed", "Real data", "Authored"]
    )
    ax.xaxis.tick_top()
    ax.tick_params(length=0, pad=10)
    ax.set_yticks(ys, style.track_labels(order))
    ax.tick_params(axis="y", pad=10)
    ax.set_xlim(-0.5, 4.5)
    ax.set_ylim(-0.7, len(order) - 0.3)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.text(
        0.27,
        1.08,
        "Topics by observed depth",
        transform=ax.transAxes,
        ha="center",
        fontweight="bold",
        fontsize=9.2,
    )
    ax.text(
        0.82,
        1.08,
        "Runnable basis",
        transform=ax.transAxes,
        ha="center",
        fontweight="bold",
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
