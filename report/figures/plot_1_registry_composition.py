"""Registry composition by kind.

Source of every number: `site/public/data/resources.v1.json`, the catalogue
export that `scripts/catalog/export.ts` generates from `catalog/resources/*.yaml`.
This is a live projection, not a frozen release snapshot. Its caption identifies
the projection schema and the range of record verification dates. Nothing in
this script is estimated or carried over from an earlier export.

What the figure shows: ranked record counts by kind, with the exact record
count and its share of the same catalogue population adjacent to each mark.

What it does not show: whether a record is any good. A count of kinds is not a
count of working resources. The registry records a lifecycle status, an access
level and seven openness dimensions per record, and none of those is folded into
this figure, because most records are still unverified and the interesting
question about the registry is not how many records it has but how much of it
has been read.
"""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from figure_sources import catalogue_projection  # noqa: E402

FIGURE_NUMBER = 1
STEM = "plot_1_registry_composition"


def caption(resources: list[dict], ordered: list[tuple[str, int]]) -> str:
    """The caption fragment, with its numbers taken from the file that was read."""
    kinds = ", ".join(f"{count} {name.replace('-', ' ')}" for name, count in ordered)
    snapshot = catalogue_projection(resources)
    return (
        f"Registry composition by kind. {snapshot.records} catalogue records: {kinds}. "
        f"{snapshot.source_note()} "
        "A count of records says nothing about whether a record has been verified, and the figure "
        "carries no status, access or openness information."
    )


def build() -> dict[str, Path]:
    """Rank the canonical record counts, retaining exact counts and shares."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    resources = style.load_json(style.DATA_DIR / "resources.v1.json")
    ordered = sorted(
        Counter(record["kind"] for record in resources).items(),
        key=lambda item: (-item[1], item[0]),
    )
    snapshot = catalogue_projection(resources)
    fig = style.figure(height=4.05)
    style.heading(
        fig,
        "What the Atlas contains",
        f"{snapshot.records} records · kinds describe objects, not verification",
    )
    ax = fig.add_axes((0.24, 0.17, 0.56, 0.64))
    positions = list(range(len(ordered)))[::-1]
    for y, (_name, count) in zip(positions, ordered, strict=True):
        ax.plot([0, count], [y, y], color=style.fill_colours()["teal"], lw=5, solid_capstyle="butt")
        ax.plot(count, y, marker="o", ms=7, color=colours["teal"], mec=tokens["ink"], mew=0.6)
        ax.text(
            1.04,
            y,
            f"{count}",
            transform=ax.get_yaxis_transform(),
            va="center",
            ha="right",
            fontweight="bold",
        )
        ax.text(
            1.23,
            y,
            f"{count / snapshot.records:.1%}",
            transform=ax.get_yaxis_transform(),
            va="center",
            ha="right",
            color=tokens["muted"],
        )
    ax.set_yticks(positions, [name.replace("-", " ") for name, _ in ordered])
    ax.set_ylim(-0.6, len(ordered) - 0.4)
    ax.set_xlim(0, max(count for _, count in ordered) * 1.07)
    ax.set_xlabel("Records in the catalogue")
    style.clean_axis(ax)
    ax.text(
        1.04,
        1.04,
        "Records",
        transform=ax.transAxes,
        ha="right",
        fontsize=8.2,
        color=tokens["muted"],
    )
    ax.text(
        1.23, 1.04, "Share", transform=ax.transAxes, ha="right", fontsize=8.2, color=tokens["muted"]
    )
    style.footnote(
        fig,
        (
            f"Evidence dates {snapshot.verified_from}–{snapshot.verified_through} · no "
            f"quality or openness ranking"
        ),
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, caption(resources, ordered))
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
