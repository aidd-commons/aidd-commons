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
from pathlib import Path

from matplotlib.patches import Rectangle

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from figure_sources import catalogue_projection  # noqa: E402
from plot_data import load_plot_data  # noqa: E402

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


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Show complete openness-state distributions rather than a dominant remainder."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    resources, totals, kinds = (data[k] for k in ("resources", "totals", "kinds"))
    fig = style.figure(height=7.6)
    style.heading(
        fig,
        "Seven questions of openness remain separate",
        f"{len(resources)} records · fraction available / applicable · strip retains "
        f"every evidence state",
    )
    ax = fig.add_axes((0.225, 0.18, 0.745, 0.65))
    states_order = ["available", "unverified", "not_available", "not_applicable"]
    fills = {
        "available": colours["teal"],
        "unverified": tokens["panel"],
        "not_available": style.fill_colours()["coral"],
        "not_applicable": style.fill_colours()["slate"],
    }
    hatches = {"available": "", "unverified": "..", "not_available": "xx", "not_applicable": "//"}
    for x in range(1, len(DIMENSIONS)):
        ax.axvline(x, color=tokens["rule"], lw=0.45, ls=":", zorder=0)
    for y, kind in enumerate(kinds):
        if y % 2 == 0:
            ax.add_patch(
                Rectangle(
                    (0, y),
                    len(DIMENSIONS),
                    1.0,
                    facecolor="#f7f9fa",
                    edgecolor="none",
                    zorder=0,
                )
            )
        for x, (dim, _) in enumerate(DIMENSIONS):
            cell = data["cells"][kind][dim]
            states, applicable = cell["states"], cell["applicable"]
            ax.text(
                x + 0.5,
                y + 0.25,
                f"{states['available']}/{applicable}" if applicable else "n/a",
                ha="center",
                va="center",
                fontsize=10.0,
                fontweight="bold" if applicable and states["available"] > 0 else "normal",
                color=tokens["ink"] if applicable else tokens["muted"],
            )
            left = x + 0.08
            for state in states_order:
                width = 0.84 * states[state] / totals[kind]
                if width:
                    ax.add_patch(
                        Rectangle(
                            (left, y + 0.49),
                            width,
                            0.31,
                            facecolor=fills[state],
                            edgecolor=tokens["muted"],
                            lw=0.4,
                            hatch=hatches[state],
                            zorder=2,
                        )
                    )
                left += width
    ax.set_xlim(0, len(DIMENSIONS))
    ax.set_ylim(len(kinds), 0)
    ax.set_xticks([x + 0.5 for x in range(len(DIMENSIONS))], [label for _, label in DIMENSIONS])
    ax.xaxis.tick_top()
    ax.set_yticks(
        [y + 0.42 for y in range(len(kinds))],
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
        bbox_to_anchor=(0.22, 0.072),
        fontsize=10.0,
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
