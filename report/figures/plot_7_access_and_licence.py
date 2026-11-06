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

FIGURE_NUMBER = 7
STEM = "plot_7_access_and_licence"

#: Licence layers, most permissive first. The order is also the order of
#: restriction used when a record carries more than one licence.
LICENCE_LAYERS: list[tuple[str, list[str]]] = [
    (
        "Public domain dedication",
        [
            "CC0",
            "CC0 1.0",
            "CC0 1.0 Universal",
            "CC0-1.0",
            "United States Government work, public domain",
        ],
    ),
    (
        "Permissive software licence",
        ["MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "New BSD"],
    ),
    (
        "Creative Commons attribution",
        [
            "CC-BY-4.0",
            "CC BY 4.0",
            "CC BY-4.0",
            "Creative Commons Attribution 4.0 International",
            "Creative Commons Attribution 4.0 International Public License",
        ],
    ),
    (
        "Copyleft",
        [
            "GPL-3.0",
            "GPL-2.0",
            "GPL-2.0 with clarifying addendum",
            "LGPL-2.1",
            "MPL-2.0",
            "GNU Affero General Public License v3",
            "CC BY-SA 4.0",
            "Creative Commons Attribution-ShareAlike 3.0 Unported",
        ],
    ),
    (
        "Creative Commons non-commercial",
        [
            "CC BY-NC 4.0",
            "CC-BY-NC-ND-4.0",
            # The share-alike variant is non-commercial first. It adds a
            # share-alike condition, and the non-commercial restriction is the
            # one that decides what a reader may do with the artefact.
            "CC BY-NC-SA 4.0",
        ],
    ),
    (
        "Other stated terms",
        [
            # MACE's ASL checkpoints carry an academic non-commercial licence,
            # not Apache-2.0 or a permissive software grant.
            "ASL",
            # A vendor's own open model licence, published as its own terms
            # rather than as a variant of a standard licence.
            "NVIDIA Open Model License",
            # A specification offered under a community specification licence
            # together with an attribution licence, published as its own terms.
            "Community-Spec-1.0 with CC-BY-3.0",
            # A data portal's own use terms, and an academic licence that
            # permits research use and withholds commercial use. Both are
            # published terms rather than variants of a standard licence.
            "DepMap Portal Data Terms and Conditions",
            "DrugBank Academic License",
            # A portal's own data licence, published as its own terms: it
            # charges nothing and restricts no use, but it does require an
            # acknowledgement and that redistributed products say whether
            # they carry the most current data.
            "GTEx Portal Data License",
            # Apache-2.0 conditioned by the Commons Clause v1.0. The clause
            # withholds the right to sell the software, so the grant is not the
            # permissive one.
            "Apache-2.0 with Commons Clause v1.0",
            "EMBL-EBI Terms of Use",
            "Polaris Platform Agreement",
            "The scFoundation License",
            "Other (Open)",
            "Proprietary, no open-source licence",
            # PIE checkpoints use Arc's custom model terms, separate from the
            # repository's Creative Commons source-code licence.
            "Arc Research Institute PIE Model Non-Commercial License",
        ],
    ),
]
NO_LICENCE = "No licence recorded"

#: Access levels, most open first. The order is a presentational one; the
#: counts are not.
ACCESS_ORDER = [
    "open_weights",
    "open_source",
    "source_available",
    "research_only",
    "gated",
    "closed",
    "unverified",
]


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
    """The most restrictive layer among a record's licences."""
    rank = {name: index for index, (_, members) in enumerate(LICENCE_LAYERS) for name in members}
    unknown = [name for name in names if name not in rank]
    if unknown:
        raise KeyError(f"licence names without a layer: {unknown}")
    return LICENCE_LAYERS[max(rank[name] for name in names)][0]


def build() -> dict[str, Path]:
    """Expose access and licence counts on separate full-width alignments."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    resources = style.load_json(style.DATA_DIR / "resources.v1.json")
    access_counts = Counter(r["access_level"]["value"] for r in resources)
    layer_counts = Counter()
    for record in resources:
        names = [licence["name"] for licence in record.get("licenses", [])]
        layer_counts[_licence_layer(names) if names else NO_LICENCE] += 1
    fig = style.figure(height=6.5)
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
                fontsize=8.8,
                fontweight="bold",
            )
            ax.text(
                1.24,
                y,
                f"{n / len(resources):.1%}",
                transform=ax.get_yaxis_transform(),
                ha="right",
                va="center",
                fontsize=8.4,
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
            fontsize=8,
            color=tokens["muted"],
        )
        ax.text(
            1.24,
            1.04,
            "Share",
            transform=ax.transAxes,
            ha="right",
            fontsize=8,
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
