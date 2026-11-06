"""Current self record against retained automated readings.

Source of every number: the current `second_readings` aggregate in
`site/public/data/comparison.v1.json`. The retained per-topic readings belong
to a series initiated on the record's `reviewed_on` date, with later batches
documented in its reviewer description. The projection's `as_of` date names
the current aggregate, not the date of a single reading.

What the figure shows. The upper panel counts the per-topic outcome of the
retained readings against the current self record: how many topic scores agree,
how many read deeper, and how many read shallower. The lower panel
puts the two counts side by side at each threshold, so the reader can see which
thresholds the disagreement sits at and how large it is.

What it does not show. The reading is not an independent replication of the
material, because the reviewer had also written parts of the course. It is a
second reading by a different model family, which is a weaker instrument than a
blind replication and is reported as such. No topic was read shallower, and the
audit's validator refuses to publish a record in which one is, so that number is
a constraint on the record rather than an observation about the material. The
retained scores include successive re-readings after material changed, so their
agreement with an updated self record is not the original pass's outcome.
"""

from __future__ import annotations

import sys
from pathlib import Path

from matplotlib.ticker import MaxNLocator

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from figure_sources import reading_series, validate_count_bounds  # noqa: E402

FIGURE_NUMBER = 5
STEM = "plot_5_self_record_vs_reading"
READING_ID = "aidd-commons-blind-2026-09-11"

OUTCOME_COLOUR = {"equal": "slate", "reading_deeper": "coral", "reading_shallower": "ember"}
THRESHOLD_TITLES = {
    "explained": "Explained",
    "worked": "Worked",
    "executable": "Executable",
    "executable-on-real-data": "Executable on real data",
    "assessed": "Assessed",
}

CAPTION = (
    "The current self record against the retained automated readings of {cells} topics in the "
    "comparison.v1 projection dated {as_of}. The series began on {reviewed}, and its description "
    "documents re-readings through {documented_through}. These totals aggregate the latest "
    "retained topic scores rather than a single pass. The current aggregate agrees on {equal} "
    "topics, reads {deeper} deeper and {shallower} shallower. At the thresholds "
    "the retained readings give {reading} against the current record's {recorded}. "
    "The reviewer also authored parts of the "
    "course, so this is not an independent replication or evidence of reader learning. The "
    "shallower count is constrained by the audit's rule against inflated self scores."
)


def build() -> dict[str, Path]:
    """Keep the constrained outcomes adjacent to the complete threshold comparison."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    payload = style.load_json(style.DATA_DIR / "comparison.v1.json")
    reading = next(r for r in payload["second_readings"] if r["id"] == READING_ID)
    series = reading_series(payload, reading)
    fig = style.figure(height=5.15)
    style.heading(
        fig,
        "What the retained readings agree on",
        (
            f"Aggregate {series.aggregate_as_of} · series "
            f"{series.initiated_on}–{series.documented_through}"
        ),
    )
    outcome_ax = fig.add_axes((0.30, 0.61, 0.61, 0.20))
    keys = ["equal", "reading_deeper", "reading_shallower"]
    values = [reading[k] for k in keys]
    ys = [2, 1, 0]
    bars = outcome_ax.barh(
        ys,
        values,
        height=0.45,
        color=[style.fill_colours()[OUTCOME_COLOUR[k]] for k in keys],
        edgecolor=[colours[OUTCOME_COLOUR[k]] for k in keys],
        linewidth=0.8,
    )
    for bar, k in zip(bars, keys, strict=True):
        bar.set_hatch(style.atlas_palette.HATCH[OUTCOME_COLOUR[k]])
    for y, n in zip(ys, values, strict=True):
        outcome_ax.plot(n, y, marker="|", ms=9, mew=1, color=tokens["ink"])
        outcome_ax.text(
            1.04,
            y,
            str(n),
            transform=outcome_ax.get_yaxis_transform(),
            ha="right",
            va="center",
            fontweight="bold",
        )
    outcome_ax.set_yticks(ys, ["Same depth", "Read deeper", "Read shallower* "])
    outcome_ax.set_xlim(0, series.topics * 1.1)
    outcome_ax.set_ylim(-0.6, 2.6)
    outcome_ax.set_xlabel(f"Topics out of {series.topics}")
    outcome_ax.xaxis.set_major_locator(MaxNLocator(nbins=5, integer=True))
    style.clean_axis(outcome_ax)
    ax = fig.add_axes((0.30, 0.17, 0.61, 0.30))
    rows = list(reading["thresholds"])
    ys = list(range(len(rows)))[::-1]
    for row, y in zip(rows, ys, strict=True):
        a, b = row["recorded"], row["reading"]
        ax.plot([a, b], [y, y], lw=2, color=tokens["rule"])
        ax.plot(a, y, "o", ms=7, mfc=colours["teal"], mec=tokens["ink"], mew=0.5)
        ax.plot(b, y, "s", ms=8, mfc="none", mec=colours["coral"], mew=1)
        ax.text(
            1.04,
            y,
            f"{a} / {b}",
            transform=ax.get_yaxis_transform(),
            ha="right",
            va="center",
            fontsize=8.4,
        )
    ax.set_yticks(
        ys,
        [
            THRESHOLD_TITLES[r["threshold"]].replace(
                "Executable on real data", "Real-data execution"
            )
            for r in rows
        ],
    )
    ax.set_xlim(-3, series.topics * 1.1)
    ax.set_ylim(-0.6, len(rows) - 0.4)
    ax.set_xlabel(f"Topics out of {series.topics}")
    style.clean_axis(ax)
    ax.text(
        1.04,
        1.06,
        "Record / reading",
        transform=ax.transAxes,
        ha="right",
        fontsize=8.2,
        color=tokens["muted"],
    )
    fig.legend(
        [_handle(colours["teal"], "o", filled=True), _handle(colours["coral"], "s", filled=False)],
        ["Current self record", "Retained readings"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.58, 0.055),
        fontsize=8.3,
        handletextpad=0.4,
    )
    style.footnote(
        fig,
        (
            "* Shallower outcomes are constrained by the audit rule. Reviewer-authored "
            "material and re-readings preclude independent replication."
        ),
        y=0.025,
    )
    validate_count_bounds(values, outcome_ax.get_xlim())
    validate_count_bounds([r[k] for r in rows for k in ("recorded", "reading")], ax.get_xlim())
    written = style.save(fig, STEM)
    style.register_caption(
        FIGURE_NUMBER,
        CAPTION.format(
            cells=reading["cells"],
            reviewed=series.initiated_on,
            as_of=series.aggregate_as_of,
            documented_through=series.documented_through,
            equal=reading["equal"],
            deeper=reading["reading_deeper"],
            shallower=reading["reading_shallower"],
            reading=style.english_list(
                f"{r['reading']} {THRESHOLD_TITLES[r['threshold']].lower()}" for r in rows
            ),
            recorded=style.english_list(
                f"{r['recorded']} {THRESHOLD_TITLES[r['threshold']].lower()}" for r in rows
            ),
        ),
    )
    return written


def _handle(colour: str, marker: str, *, filled: bool):
    """A legend handle in the shape of a point mark."""
    from matplotlib.lines import Line2D

    return Line2D(
        [0],
        [0],
        linestyle="none",
        marker=marker,
        markersize=6.0,
        markerfacecolor=colour if filled else "none",
        markeredgecolor=colour if not filled else style.tokens("light")["ink"],
        markeredgewidth=1.3 if not filled else 0.5,
    )


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
