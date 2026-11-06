"""Openness matrix by record kind.

Source of every number: `site/public/data/openness.v1.json`, the openness
projection of the catalogue export, joined to `site/public/data/resources.v1.json`
on the record id to recover the record's kind. The join key is the id and
nothing else; the openness values are not recomputed.
This is the live canonical projection, not a historical release snapshot.

What the figure shows. Each cell crosses one record kind with one of the seven
openness dimensions. The fraction gives the number available over applicable
records, because a dimension that does not apply is outside that question.
The adjacent strip covers the complete record population, retaining available,
unverified, not-available and not-applicable states separately. A dotted
unverified segment is unknown, not evidence of unavailability.

What it does not show. Openness is recorded per dimension and never collapsed
into a single label, so this figure does not collapse it either. A cell that
reads available says that the resource for that dimension was seen; it does not
say that the artefact runs, that it is maintained, or that it does what its
documentation claims. The largest cell in this matrix is unverified, and that
is a statement about what has been read rather than about what exists.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from matplotlib.patches import Rectangle

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from figure_sources import catalogue_projection, validate_openness_join  # noqa: E402

FIGURE_NUMBER = 6
STEM = "plot_6_openness_matrix"
DIMENSIONS = [
    ("inference_code", "inference\ncode"),
    ("training_code", "training\ncode"),
    ("weights", "weights"),
    ("architecture", "architecture"),
    ("data_recipe", "data\nrecipe"),
    ("training_data", "training\ndata"),
    ("evaluation_code", "evaluation\ncode"),
]
HATCH_BY_STATE = {"unverified": "//", "not_available": "xx", "not_applicable": "\\\\"}
BIN_EDGES = [0.0, 0.25, 0.5, 0.75, 1.0]
BIN_LABELS = ["none", "up to 25%", "up to 50%", "up to 75%", "all"]


def caption(resources: list[dict]) -> str:
    """The caption fragment, with its numbers taken from the file that was read."""
    snapshot = catalogue_projection(resources)
    return (
        f"Openness by record kind and by the seven openness dimensions, over {snapshot.records} "
        f"catalogue records. {snapshot.source_note()} "
        "Each cell labels available records over applicable records. Its strip retains "
        "all records in four separate states: available, unverified, not available and "
        "not applicable; not-applicable records are excluded only from the displayed fraction. "
        "Openness is recorded per dimension and is never collapsed here into a single open or "
        "closed label."
    )


def _bin_index(proportion: float) -> int:
    for index, edge in enumerate(BIN_EDGES[1:], start=1):
        if proportion <= edge:
            return index
    return len(BIN_EDGES) - 1


def build() -> dict[str, Path]:
    """Show complete openness-state distributions rather than a dominant remainder."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    openness = style.load_json(style.DATA_DIR / "openness.v1.json")
    resources = style.load_json(style.DATA_DIR / "resources.v1.json")
    validate_openness_join(resources, openness)
    kind_of = {r["id"]: r["kind"] for r in resources}
    totals = Counter(kind_of.values())
    kinds = [k for k, _ in sorted(totals.items(), key=lambda p: (-p[1], p[0]))]
    fig = style.figure(height=5.45)
    style.heading(
        fig,
        "Seven questions of openness remain separate",
        f"{len(resources)} records · fraction available / applicable · strip retains "
        f"every evidence state",
    )
    ax = fig.add_axes((0.215, 0.22, 0.75, 0.58))
    states_order = ["available", "unverified", "not_available", "not_applicable"]
    fills = {
        "available": colours["teal"],
        "unverified": tokens["panel"],
        "not_available": style.fill_colours()["coral"],
        "not_applicable": style.fill_colours()["slate"],
    }
    hatches = {"available": "", "unverified": "..", "not_available": "xx", "not_applicable": "//"}
    for y, kind in enumerate(kinds):
        records = [r for r in openness if kind_of[r["id"]] == kind]
        for x, (dim, _) in enumerate(DIMENSIONS):
            states = Counter(r["openness"][dim]["value"] for r in records)
            if set(states) - set(states_order):
                raise ValueError(f"unexpected openness states {states}")
            applicable = sum(states[s] for s in states_order[:-1])
            ax.text(
                x + 0.5,
                y + 0.28,
                f"{states['available']}/{applicable}" if applicable else "n/a",
                ha="center",
                va="center",
                fontsize=8.1,
                fontweight="bold",
            )
            left = x + 0.08
            for state in states_order:
                width = 0.84 * states[state] / len(records)
                if width:
                    ax.add_patch(
                        Rectangle(
                            (left, y + 0.56),
                            width,
                            0.20,
                            facecolor=fills[state],
                            edgecolor=tokens["muted"],
                            lw=0.4,
                            hatch=hatches[state],
                        )
                    )
                left += width
    ax.set_xlim(0, len(DIMENSIONS))
    ax.set_ylim(len(kinds), 0)
    ax.set_xticks([x + 0.5 for x in range(len(DIMENSIONS))], [label for _, label in DIMENSIONS])
    ax.xaxis.tick_top()
    ax.set_yticks(
        [y + 0.40 for y in range(len(kinds))],
        [f"{k.replace('-', ' ')} ({totals[k]})" for k in kinds],
    )
    ax.tick_params(length=0, pad=10)
    for y in range(1, len(kinds)):
        ax.axhline(y, color=tokens["rule"], lw=0.5)
    for s in ax.spines.values():
        s.set_visible(False)
    handles = [
        Rectangle(
            (0, 0), 1, 1, facecolor=fills[s], edgecolor=tokens["muted"], lw=0.5, hatch=hatches[s]
        )
        for s in states_order
    ]
    fig.legend(
        handles,
        ["Available", "Unverified", "Not available", "Not applicable"],
        ncol=2,
        loc="lower left",
        bbox_to_anchor=(0.21, 0.095),
        fontsize=8.4,
        handlelength=1.8,
        columnspacing=2.5,
    )
    style.footnote(
        fig,
        "A strip covers all records of that kind. The fraction excludes not-applicable "
        "records; n/a is not zero openness.",
        y=0.03,
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, caption(resources))
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
