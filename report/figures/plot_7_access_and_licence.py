"""Access level and licence layers.

Source of every number: `site/public/data/resources.v1.json`, the catalogue
export, used as a live projection rather than a historical release snapshot.
Every record carries an access level and a list of licences, each with
its own scope and evidence.

What the figure shows. The upper panel counts records by access level. The lower
panel counts records by licence layer. Both retain the exact count and the
share of the same record population.

The licence layers are a grouping this script makes, so they are stated here in
full and the mapping is enforced rather than assumed: every licence name in the
catalogue must appear in the table below, and a name that does not raise an
error instead of being counted silently. The layers run from the most
permissive to the most restrictive, and a record that carries more than one
licence is counted once, in the most restrictive layer it carries, so that the
unit of the panel is the record rather than the licence entry. The number of
multi-licence records is derived from the same projection in the caption.

What it does not show. The access level is what a reader could establish about
access, not a guarantee that the artefact runs. A licence name is not a legal
opinion, and the scope field on each licence is not folded into the layer
count. A record with no licence recorded is not a record with no licence; it
is a record whose licence has not been read, which is why that bar is drawn
empty rather than coloured.
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
from plot_data import load_plot_data  # noqa: E402

FIGURE_NUMBER = 7
STEM = "plot_7_access_and_licence"

#: Licence layers, most permissive first. The order is also the order of
#: restriction used when a record carries more than one licence.
from plot_data import ACCESS_ORDER, LICENCE_LAYERS, NO_LICENCE, licence_layer  # noqa: E402


def caption(
    resources: list[dict],
    access_counts: Counter,
    layer_counts: Counter,
) -> str:
    """The caption fragment, with its numbers taken from the file that was read."""
    access = ", ".join(
        f"{access_counts[level]} {level.replace('_', ' ')}"
        for level in ACCESS_ORDER
        if access_counts[level] and level != "unverified"
    )
    layers = ", ".join(
        f"{layer_counts[name]} {name.lower()}" for name, _ in LICENCE_LAYERS if layer_counts[name]
    )
    snapshot = catalogue_projection(resources)
    multi_licence = sum(len(record.get("licenses", [])) > 1 for record in resources)
    return (
        f"Access level and licence layer for the {snapshot.records} catalogue records. "
        f"{snapshot.source_note()} "
        f"{access_counts['unverified']} records carry no verified access level and "
        f"{layer_counts[NO_LICENCE]} record no licence. The verified access levels are {access}. "
        f"By licence layer, {layers}. The {multi_licence} records with more than one licence "
        "are counted once, in their most restrictive stated layer."
    )


def _licence_layer(names: list[str]) -> str:
    """The shared most-restrictive stated layer, preserving the public helper."""
    return licence_layer(names)


def load_data() -> dict:
    """Return the complete canonical population used by print and web."""
    return load_plot_data(FIGURE_NUMBER, read_json=style.load_json, read_yaml=style.load_yaml)


def build() -> dict[str, Path]:
    """Expose access and licence counts on separate full-width alignments."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    data = load_data()
    resources = data["resources"]
    access_counts, layer_counts = Counter(data["access_counts"]), Counter(data["layer_counts"])
    fig = style.figure(height=7.2)
    style.heading(
        fig,
        "Access and stated licence answer different questions",
        f"{len(resources)} catalogue records · one count per record in each panel",
    )
    ax1 = fig.add_axes((0.39, 0.53, 0.46, 0.29))
    ax2 = fig.add_axes((0.39, 0.13, 0.46, 0.29))
    licence_order = [name for name, _ in LICENCE_LAYERS] + [NO_LICENCE]
    labels = [
        "Public domain dedication",
        "Permissive software licence",
        "CC attribution",
        "Copyleft",
        "CC non-commercial",
        "Other stated terms",
        "No licence recorded",
    ]
    for ax, order, counts, names, title in [
        (
            ax1,
            ACCESS_ORDER,
            access_counts,
            [s.replace("_", " ") for s in ACCESS_ORDER],
            "(a) Access level",
        ),
        (ax2, licence_order, layer_counts, labels, "(b) Most restrictive stated licence layer"),
    ]:
        ys = list(range(len(order)))[::-1]
        for y, key in zip(ys, order, strict=True):
            n = counts[key]
            unknown = key in ["unverified", NO_LICENCE]
            colour = colours["slate"] if unknown else colours["teal"]
            ax.plot([0, n], [y, y], lw=1.6, color=colour, ls=(0, (2, 2)) if unknown else "-")
            ax.plot(
                n,
                y,
                marker="s" if unknown else "o",
                ms=6,
                mfc="none" if unknown else colour,
                mec=colour,
                mew=1,
            )
            ax.text(
                1.05,
                y,
                str(n),
                transform=ax.get_yaxis_transform(),
                ha="right",
                va="center",
                fontsize=10.0,
                fontweight="bold",
            )
            ax.text(
                1.24,
                y,
                f"{n / len(resources):.1%}",
                transform=ax.get_yaxis_transform(),
                ha="right",
                va="center",
                fontsize=10.0,
                color=tokens["muted"],
            )
        ax.set_yticks(ys, names)
        ax.set_ylim(-0.6, len(order) - 0.4)
        largest = max(max(access_counts.values()), max(layer_counts.values()))
        ax.set_xlim(-largest * 0.035, largest * 1.06)
        ax.set_xlabel("Records")
        style.clean_axis(ax)
        style.title(ax, title)
        ax.text(
            1.05,
            1.04,
            "Count",
            transform=ax.transAxes,
            ha="right",
            fontsize=10.0,
            color=tokens["muted"],
        )
        ax.text(
            1.24,
            1.04,
            "Share",
            transform=ax.transAxes,
            ha="right",
            fontsize=10.0,
            color=tokens["muted"],
        )
    style.footnote(
        fig,
        "Open square = metadata not verified/read. Stated licence layers do not "
        "replace scope-specific terms or a legal assessment.",
        y=0.025,
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, caption(resources, access_counts, layer_counts))
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
