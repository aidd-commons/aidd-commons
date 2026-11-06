#!/usr/bin/env python3
"""Build source-derived PNG previews and vector PDFs for the figures the site places.

Selected data generators draw their native Matplotlib Figure once. Schematic placements
consume the canonical editable PowerPoint master and its actual PDF/PNG exports through
``ensure_native_master``. No complete schematic is flattened or independently redrawn.
The preview retains the measured light identity on paper in either site theme. No SVG
is generated, transformed or removed.

Plot captions are captured from the same build and must agree with the report's caption
manifest. Schematic captions remain in their canonical authored manifest. The site
manifest binds those captions, meaningful alt text, intrinsic PNG dimensions and vector
PDF downloads to the active page placements.
"""

from __future__ import annotations

import importlib
import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
FIGURE_DIR = REPO_ROOT / "report" / "figures"
DATA_DIR = REPO_ROOT / "site" / "public" / "data"
FIGURE_OUT = REPO_ROOT / "site" / "public" / "figures"
MANIFEST_PATH = REPO_ROOT / "site" / "src" / "data" / "atlas-figures.json"
os.environ.setdefault("SOURCE_DATE_EPOCH", "0")
os.environ.setdefault("MPLBACKEND", "Agg")

if str(FIGURE_DIR) not in sys.path:
    sys.path.insert(0, str(FIGURE_DIR))

from figure_sources import catalogue_projection, reading_series  # noqa: E402
from plot_5_self_record_vs_reading import READING_ID  # noqa: E402


def site_name(stem: str) -> str:
    return stem.replace("_", "-")


def save_preview(fig, stem: str, theme: str = "light") -> dict[str, Path]:
    """Save the same native drawing as a vector PDF and a 300 dpi PNG."""
    import matplotlib as mpl
    import matplotlib.pyplot as plt

    if theme != "light":
        raise ValueError("site previews use the measured light palette on paper")
    FIGURE_OUT.mkdir(parents=True, exist_ok=True)
    pdf = FIGURE_OUT / f"{site_name(stem)}.pdf"
    png = FIGURE_OUT / f"{site_name(stem)}.png"
    with mpl.rc_context({"savefig.bbox": None, "savefig.pad_inches": 0}):
        fig.savefig(
            pdf,
            format="pdf",
            metadata={"CreationDate": None, "Producer": "AIDD Commons report figures"},
        )
        fig.savefig(
            png,
            format="png",
            dpi=300,
            metadata={"Software": "AIDD Commons report figures"},
        )
    plt.close(fig)
    return {"pdf": pdf, "png": png}


def build_previews() -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Draw placed data panels and copy the actual native schematic master exports."""
    import figure_style
    import matplotlib
    import schematic_style
    from PIL import Image

    written: list[dict[str, Any]] = []
    captions: dict[str, str] = {}

    def capture_caption(number: int, text: str) -> Path:
        captions[str(number)] = text
        return MANIFEST_PATH

    with (
        patch.object(figure_style, "save", save_preview),
        patch.object(figure_style, "register_caption", capture_caption),
    ):
        for row in library_rows():
            module_name = row["stem"].replace("-", "_")
            matplotlib.rcParams.update(matplotlib.rcParamsDefault)
            if module_name.startswith("schematic_"):
                matplotlib.rcParams.update(schematic_style.house_rc())
            module = importlib.import_module(module_name)
            if site_name(module.STEM) != row["stem"]:
                raise ValueError(f"{module_name}: generator stem does not match its placement")
            extra = {}
            if module_name.startswith("schematic_"):
                products = schematic_style.ensure_native_master(module.STEM)
                FIGURE_OUT.mkdir(parents=True, exist_ok=True)
                for suffix in ("pdf", "png", "pptx"):
                    source = Path(products[suffix])
                    if not source.is_file() or source.is_symlink():
                        raise ValueError(f"{module.STEM}: missing regular native {suffix} export")
                    destination = FIGURE_OUT / f"{row['stem']}.{suffix}"
                    shutil.copyfile(source, destination)
                extra = {
                    "pptx": f"{row['stem']}.pptx",
                    "native_source": "report/figures/build_schematic_masters.mjs",
                }
            else:
                module.build()
            png = FIGURE_OUT / f"{row['stem']}.png"
            with Image.open(png) as image:
                width, height = image.size
            written.append({"stem": module.STEM, "width": width, "height": height, **extra})
    return written, captions


def comparison_payload() -> dict[str, Any]:
    """The canonical comparison projection read by the audit figures."""
    return json.loads((DATA_DIR / "comparison.v1.json").read_text(encoding="utf-8"))


def placement_rows() -> list[dict[str, Any]]:
    """The figures the site places, with the alt text of each.

    The alt text states what a reader should take from the figure. It is not the caption
    again: the caption says what the figure is, the alt says what it settles. Every
    number in an alt text is read from the committed file its figure reads, and is
    formatted in here rather than typed.
    """
    comparison = comparison_payload()
    topics = comparison["taxonomy"]["topics"]
    reading = next(row for row in comparison["second_readings"] if row["id"] == READING_ID)
    series = reading_series(comparison, reading)

    # Active placements only. Historical homepage products and their native sources remain.
    return [
        {
            "id": "coverage-bounds",
            "stem": "plot-2-coverage-bounds",
            "pages": ["/audit/"],
            "alt": (
                f"The audit reports an interval rather than a leaderboard: all {topics} AIDD "
                "Commons cells are direct observations, so this project's own row is an exact "
                "count at every threshold, while an external interval can remain open where "
                "depth or run basis is unverified, including in material that has been read."
            ),
        },
        {
            "id": "second-reading",
            "stem": "plot-5-self-record-vs-reading",
            "pages": ["/audit/"],
            "alt": (
                f"The retained topic readings agree with the current self record on "
                f"{reading['equal']} of {reading['cells']} topics, with "
                f"{reading['reading_deeper']} deeper and {reading['reading_shallower']} "
                f"shallower, in the comparison projection dated {series.aggregate_as_of}. "
                f"The series began on {series.initiated_on} and documents re-readings through "
                f"{series.documented_through}. These latest retained rows include reviewer "
                "authored material and constrained shallower outcomes, so they are not "
                "independent replication or evidence of reader learning."
            ),
        },
        {
            "id": "representation-flips",
            "stem": "plot-9-representation-ranking-flips",
            "pages": ["/", "/zh-cn/", "/labs/", "/zh-cn/labs/"],
            "alt": (
                "The baseline that wins the primary partition loses the separate assay "
                "replication by a wide margin, so a frozen evaluation fixes a protocol and a "
                "result, not a ranking that holds on the next evaluation."
            ),
        },
        {
            "id": "frozen-lifecycle",
            "stem": "schematic-07-frozen-lifecycle",
            "pages": ["/labs/", "/zh-cn/labs/"],
            "alt": (
                "A frozen lab writes the protocol before the held-out result is seen, runs its "
                "pretests on training and validation data, opens the test set once, and treats "
                "a bug found after the opening as an error that invalidates the protocol rather "
                "than a result to be reported."
            ),
        },
        {
            "id": "statement-classes",
            "stem": "schematic-02-statement-classes",
            "pages": ["/report/"],
            "alt": (
                "Every statement in the report belongs to one of four classes, and the two "
                "classes that assert something are drawn apart from the two that do not, so a "
                "reader can tell an observed fact from a decision, an open question or a plan."
            ),
        },
    ]


def library_rows() -> list[dict[str, Any]]:
    """Describe all maintained drawings without promoting their source-review dates."""
    import yaml

    comparison = comparison_payload()
    curriculum = yaml.safe_load(
        (REPO_ROOT / "catalog/curriculum/tracks.yaml").read_text(encoding="utf-8")
    )
    resources = json.loads((DATA_DIR / "resources.v1.json").read_text(encoding="utf-8"))
    projection = catalogue_projection(resources)
    reading = next(row for row in comparison["second_readings"] if row["id"] == READING_ID)
    series = reading_series(comparison, reading)
    active = {row["stem"]: row for row in placement_rows()}
    catalog_dates = [projection.verified_from, projection.verified_through]
    catalog_note = (
        "Canonical Atlas resources.v1 projection; individual record verification dates range "
        f"from {projection.verified_from} to {projection.verified_through}. "
        "The visual reconstruction does not establish a new review of every record."
    )
    audit_note = (
        f"Historical comparison projection as of {comparison['as_of']}; bounds are evidence bounds."
    )
    definitions = {
        1: (
            "Registry composition",
            "Ranked catalogue record counts and their shares by object kind; no "
            "verification or quality ranking is implied.",
        ),
        2: ("Historical coverage bounds", active["plot-2-coverage-bounds"]["alt"]),
        3: (
            "Curriculum units and lessons",
            "The exact core, research and practice unit counts are aligned by track, "
            "beside separate lesson counts. These are curriculum objects, not measured "
            "learning outcomes.",
        ),
        4: (
            "Observed depth and run basis",
            "Source-recorded topic depths and real-data versus authored run bases are "
            "kept separate for every track; a runnable task is not evidence of learner "
            "achievement.",
        ),
        5: ("Retained reading agreement", active["plot-5-self-record-vs-reading"]["alt"]),
        6: (
            "Seven-dimensional openness",
            "Every kind is crossed with seven availability dimensions. Exact "
            "available/applicable fractions sit above strips that retain available, "
            "unverified, unavailable and not-applicable records separately.",
        ),
        7: (
            "Access and stated licence",
            "Access counts and the most restrictive stated licence layer describe the "
            "same record population in separate views, retaining unknown access and "
            "unread licence metadata.",
        ),
        8: (
            "FreeSolv split and interval metrics",
            "Frozen scaffold and random split metrics are paired within each teaching "
            "baseline. The training-set mean has no interval; empirical coverage is "
            "marginal, and its reviewed source states no nominal interval level.",
        ),
        9: ("Representation ranking changes", active["plot-9-representation-ranking-flips"]["alt"]),
        10: (
            "Retrospective acquisition policies",
            "All policy recovery and evaluation-error paths are retained for two "
            "retrospective assay replays, with the normalized recovery integral beside "
            "them. Five random seeds are fixed policy instances, not biological "
            "replicates.",
        ),
        11: (
            "Correlated frames and uncertainty",
            "Naive and block standard errors, their reported ratios and block-count "
            "sensitivity are shown from the same retained rMD17 page; there is one "
            "trajectory per molecule.",
        ),
        12: (
            "Trajectory convergence",
            "The full chronological convergence series and a magnified later-frame "
            "view use the same observations, retaining the nonmonotone malonaldehyde "
            "error.",
        ),
        13: (
            "Assay-system disagreement",
            "Source-recorded coefficients and shared counts for CYP and clearance "
            "system pairs appear beside six selected CYP disagreement extremes. These "
            "examples are extremes, not a sample of the distribution.",
        ),
    }
    source_info: dict[int, tuple[list[str], str]] = {
        1: (catalog_dates, catalog_note),
        2: ([comparison["as_of"]], audit_note),
        3: (
            [],
            f"Canonical curriculum tracks.yaml, version {curriculum['version']}. "
            "The source declares no "
            "review date; this drawing does not establish a new content review.",
        ),
        4: ([comparison["as_of"]], audit_note),
        5: (
            sorted({series.initiated_on, series.documented_through, series.aggregate_as_of}),
            "Latest retained readings are aggregated separately from the series "
            "initiation and documented re-reading dates; they are not independent "
            "replication.",
        ),
        6: (catalog_dates, catalog_note),
        7: (catalog_dates, catalog_note),
    }
    for number, paths, date_key in (
        (8, ["labs/freesolv/reviewed-results.json"], "reviewed_on"),
        (9, ["labs/chembl_egfr/locked-summary.json"], "reviewed_on"),
        (
            10,
            ["labs/pool_budget/real-summary.json", "labs/pool_budget/uncertainty-summary.json"],
            "completed_on",
        ),
        (
            13,
            ["labs/cyp_assay_system/summary.json", "labs/az_clearance_system/summary.json"],
            "computed_on",
        ),
    ):
        dates = sorted(
            {json.loads((REPO_ROOT / path).read_text(encoding="utf-8"))[date_key] for path in paths}
        )
        source_info[number] = (
            dates,
            f"Retained source summaries: {', '.join(paths)}. The dates describe their "
            f"{date_key.replace('_', ' ')} metadata; no experiment was rerun for this "
            f"visual reconstruction.",
        )
    observable = (REPO_ROOT / "site/src/content/docs/labs/rmd17-dynamics-observable.mdx").read_text(
        encoding="utf-8"
    )
    observable_dates = sorted(
        set(re.findall(r"(?:Computed on |reviewed: )(\d{4}-\d{2}-\d{2})", observable))
    )
    for number in (11, 12):
        source_info[number] = (
            observable_dates,
            "The published rMD17 observable page is the retained numerical source. Its "
            "computation/review dates are separate from this visual reconstruction; no "
            "new simulation was run.",
        )
    rows = []
    for path in sorted(FIGURE_DIR.glob("plot_*.py"), key=lambda item: int(item.stem.split("_")[1])):
        number = int(path.stem.split("_")[1])
        title, alt = definitions[number]
        dates, note = source_info[number]
        rows.append(
            {
                "id": site_name(path.stem),
                "stem": site_name(path.stem),
                "title": title,
                "kind": "plot",
                "alt": alt,
                "source_dates": dates,
                "source_note": note,
            }
        )
    schematic_definitions = [
        (
            "schematic-01-artifacts",
            "Four connected artifacts",
            "Four distinct learning artifacts share a source identifier and an "
            "editorial correction route. The drawing describes intended coupling, not "
            "measured propagation or learning.",
        ),
        (
            "schematic-02-statement-classes",
            "Four classes of statement",
            active["schematic-02-statement-classes"]["alt"],
        ),
        (
            "schematic-03-decision-pipeline",
            "Decisions from target to candidate",
            "Nine target-to-candidate stages each pair a decision with a recorded "
            "failure mode. Arrows denote stage order and do not report candidate "
            "survival.",
        ),
        (
            "schematic-04-stage-contracts",
            "Stage evidence contracts",
            "Each of nine stages names the evidence its decision requires. Checklist "
            "marks denote required fields, not completed measurements.",
        ),
        (
            "schematic-05-prerequisite-graph",
            "Learning-path prerequisites",
            "An incidence matrix maps shared prerequisites across six learning paths "
            "and separately marks lessons also included in the core route. Badges "
            "count declared relationships, not difficulty or learning.",
        ),
        (
            "schematic-06-openness-dimensions",
            "Openness remains seven questions",
            "Two actual catalogue records retain seven separate availability "
            "dimensions, while lifecycle and access remain distinct. Conceptual "
            "illustrations add no implementation or data evidence.",
        ),
        (
            "schematic-07-frozen-lifecycle",
            "Frozen evaluation lifecycle",
            active["schematic-07-frozen-lifecycle"]["alt"],
        ),
    ]
    schematic_captions = json.loads(
        (FIGURE_DIR / "out/captions-schematics.json").read_text(encoding="utf-8")
    )
    for stem, title, alt in schematic_definitions:
        key = f"S{int(stem.split('-')[1])}"
        dates = sorted(
            set(re.findall(r"last verified (\d{4}-\d{2}-\d{2})", schematic_captions[key]))
        )
        rows.append(
            {
                "id": stem,
                "stem": stem,
                "title": title,
                "kind": "schematic",
                "alt": alt,
                "source_dates": dates,
                "source_note": (
                    "Native educational schematic derived from the canonical source "
                    "relationships named in its caption. Illustration assets are "
                    "conceptual. The visual date is not a new scientific measurement or "
                    "source-review date."
                ),
            }
        )
    return rows


def caption_for(stem: str, captions: dict[str, str], schematics: dict[str, str]) -> str:
    """The committed caption of one figure, by the figure's site name."""
    schematic = re.match(r"schematic-(\d+)-", stem)
    if schematic:
        return schematics[f"S{int(schematic.group(1))}"]
    plot = re.match(r"plot-(\d+)-", stem)
    if not plot:
        raise SystemExit(f"{stem} is not a figure name")
    return captions[plot.group(1)]


def write_manifest(written: list[dict[str, Any]], emitted: dict[str, str]) -> dict[str, Any]:
    """Bind the actual products to their source captions and page placements."""
    captions = json.loads((FIGURE_DIR / "out/captions.json").read_text(encoding="utf-8"))
    schematics = json.loads(
        (FIGURE_DIR / "out/captions-schematics.json").read_text(encoding="utf-8")
    )
    for key, caption in emitted.items():
        if captions.get(key) != caption:
            raise ValueError(
                f"plot {key}: report caption is stale; run its native figure generator first"
            )
    products = {site_name(entry["stem"]): entry for entry in written}
    figures = []
    for row in placement_rows():
        product = products.get(row["stem"])
        if product is None:
            raise ValueError(f"{row['stem']}: no drawing was produced")
        figures.append(
            {
                "id": row["id"],
                "file": f"{row['stem']}.png",
                "pdf": f"{row['stem']}.pdf",
                "source_stem": product["stem"],
                "width": product["width"],
                "height": product["height"],
                "alt": row["alt"],
                "caption": caption_for(row["stem"], captions, schematics),
                "pages": row["pages"],
                **{key: product[key] for key in ("pptx", "native_source") if key in product},
            }
        )
    library = []
    for row in library_rows():
        product = products[row["stem"]]
        library.append(
            {
                "id": row["id"],
                "title": row["title"],
                "kind": row["kind"],
                "file": f"{row['stem']}.png",
                "pdf": f"{row['stem']}.pdf",
                "source_stem": product["stem"],
                "width": product["width"],
                "height": product["height"],
                "alt": row["alt"],
                "caption": caption_for(row["stem"], captions, schematics),
                "source_dates": row["source_dates"],
                "source_note": row["source_note"],
                "visual_revision_date": (
                    "2026-11-06"
                    if row["stem"]
                    in {
                        "plot-3-curriculum-units-per-track",
                        "plot-4-depth-distribution-per-track",
                        "plot-11-correlated-frames-error-bars",
                        "schematic-03-decision-pipeline",
                        "schematic-04-stage-contracts",
                    }
                    else "2026-10-26"
                ),
                **{key: product[key] for key in ("pptx", "native_source") if key in product},
            }
        )
    payload = {
        "name": "atlas-figures",
        "description": (
            "Source-derived data plots and native editable illustrated schematic masters, with "
            "PNG previews and actual PDF exports at their authored dimensions. The existing "
            "measured light identity is retained on paper; schematics include a PPTX source."
        ),
        "generated_by": "site/scripts/make-site-figures.py",
        "drawings_from": "report/figures/",
        "captions_from": [
            "report/figures/out/captions.json",
            "report/figures/out/captions-schematics.json",
        ],
        "figures": figures,
        "library": library,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return payload


def main() -> int:
    written, emitted = build_previews()
    payload = write_manifest(written, emitted)
    print(f"wrote {len(written)} PNG/PDF pairs and 7 native PPTX files to {FIGURE_OUT}")
    print(
        f"registered {len(payload['library'])} library entries and "
        f"{len(payload['figures'])} active placement records"
    )
    for figure in payload["figures"]:
        print(f"  {figure['id']}: {figure['width']} x {figure['height']}; {figure['pdf']}")
    print("existing SVGs were left untouched")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
