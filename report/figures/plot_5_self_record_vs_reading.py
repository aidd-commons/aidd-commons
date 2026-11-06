"""Current self record against retained automated readings.

Source of every number: the current `second_readings` aggregate in
`site/public/data/comparison.v1.json`. The retained per-topic readings belong
to a series initiated on the record's `reviewed_on` date, with later batches
documented in its reviewer description. The projection's `as_of` date names
the current aggregate, not the date of a single reading.

What the figure shows. The compact upper numeric strip counts the per-topic outcome of the
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

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from figure_sources import reading_series, validate_count_bounds  # noqa: E402
from plot_data import load_plot_data  # noqa: E402

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
    "comparison.v1 projection dated {as_of}. The compact upper strip gives the three outcome "
    "counts, and the lower markers pair the five threshold counts. The series began on {reviewed}, "
    "and its description "
    "documents re-readings through {documented_through}. These totals aggregate the latest "
    "retained topic scores rather than a single pass. The current aggregate agrees on {equal} "
    "topics, reads {deeper} deeper and {shallower} shallower. At the thresholds "
    "the retained readings give {reading} against the current record's {recorded}. "
    "The reviewer also authored parts of the "
    "course, so this is not an independent replication or evidence of reader learning. The "
    "shallower count is constrained by the audit's rule against inflated self scores."
)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Keep the constrained outcomes adjacent to the complete threshold comparison."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    payload, reading = data["payload"], data["reading"]
    series = reading_series(payload, reading)
    fig = style.figure(height=5.0)
    style.heading(
        fig,
        "What the retained readings agree on",
        (
            f"Aggregate {series.aggregate_as_of} · series "
            f"{series.initiated_on}–{series.documented_through}"
        ),
    )
    fig.text(
        0.035,
        0.855,
        "Not an independent replication · reviewer also authored course material",
        fontsize=10.0,
        fontweight="bold",
        color=colours["coral"],
    )
    outcome_ax = fig.add_axes((0.30, 0.69, 0.61, 0.10))
    keys = ["equal", "reading_deeper", "reading_shallower"]
    values = [reading[k] for k in keys]
    labels = ["Same depth", "Read deeper", "Read shallower*"]
    for x, key, label, n in zip([0.10, 0.50, 0.90], keys, labels, values, strict=True):
        outcome_ax.text(
            x,
            0.95,
            label,
            ha="center",
            va="center",
            fontsize=10,
            transform=outcome_ax.transAxes,
            color=tokens["muted"],
        )
        count_text = outcome_ax.text(
            x,
            0.20,
            str(n),
            ha="center",
            va="center",
            fontsize=20,
            fontweight="bold",
            transform=outcome_ax.transAxes,
            color=tokens["ink"],
        )
        count_text.set_gid(f"reading-outcome-{key}")
    outcome_ax.text(
        0.50,
        -0.40,
        f"Topics out of {series.topics}",
        ha="center",
        va="center",
        fontsize=9.2,
        color=tokens["muted"],
        transform=outcome_ax.transAxes,
    )
    outcome_ax.set_axis_off()
    ax = fig.add_axes((0.30, 0.25, 0.61, 0.32))
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
            fontsize=10.0,
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
        fontsize=10.0,
        color=tokens["muted"],
    )
    fig.legend(
        [_handle(colours["teal"], "o", filled=True), _handle(colours["coral"], "s", filled=False)],
        ["Current self record", "Retained readings"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.58, 0.105),
        fontsize=10.0,
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
    validate_count_bounds(values, (0, series.topics))
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
