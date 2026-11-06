"""Canonical, JSON-serializable data for all thirteen report plots and web views.

Read the committed catalogue projections and frozen lab summaries once through
these loaders. Rendering code does not run experiments, retune models or create
uncertainty estimates. The same complete populations feed print and HTML views.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict
from pathlib import Path

from figure_sources import catalogue_projection, reading_series, validate_openness_join

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "site/public/data"
PAGE = Path("site/src/content/docs/labs/rmd17-dynamics-observable.mdx")
SYSTEMS = ["Ethanol", "Malonaldehyde"]
DIMENSIONS = [
    "inference_code",
    "training_code",
    "weights",
    "architecture",
    "data_recipe",
    "training_data",
    "evaluation_code",
]
STATES = ["available", "unverified", "not_available", "not_applicable"]
SELF_ID = "aidd-commons"
READING_ID = "aidd-commons-blind-2026-09-11"
ASSAYS = ["CHEMBL5736995", "CHEMBL3705421"]


def _json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def _yaml(path):
    import yaml

    return yaml.safe_load(path.read_text(encoding="utf-8"))


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


def licence_layer(names: list[str]) -> str:
    """The most restrictive layer among a record's licences."""
    rank = {name: index for index, (_, members) in enumerate(LICENCE_LAYERS) for name in members}
    unknown = [name for name in names if name not in rank]
    if unknown:
        raise KeyError(f"licence names without a layer: {unknown}")
    return LICENCE_LAYERS[max(rank[name] for name in names)][0]


def read_observable_page() -> dict:
    """Read the numbers of the rMD17 observable lab page.

    The page carries two markdown tables and one sentence with the block
    sweep. All three are parsed rather than transcribed, and a missing number
    raises instead of being silently dropped.
    """
    path = ROOT / PAGE
    text = path.read_text(encoding="utf-8").replace("−", "-")

    sem: dict[str, dict[str, float]] = {}
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells[0] in SYSTEMS and len(cells) == 5:
            sem[cells[0]] = {
                "mean_rg": float(cells[1]),
                "naive_sem": float(cells[2]),
                "block_sem": float(cells[3]),
                "ratio": float(cells[4]),
            }
    missing = [system for system in SYSTEMS if system not in sem]
    if missing:
        raise ValueError(f"the observable page has no standard error row for {missing}")

    convergence: list[dict[str, float]] = []
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0].replace(",", "").isdigit():
            convergence.append(
                {
                    "frames": int(cells[0].replace(",", "")),
                    "ethanol": float(cells[1]),
                    "malonaldehyde": float(cells[2]),
                }
            )
    if not convergence:
        raise ValueError("the observable page has no convergence table")

    sweep = [
        {"blocks": int(blocks.replace(",", "")), "sem": float(value)}
        for blocks, value in re.findall(
            r"(?:block SEM )?at ([\d,]+) blocks \([^)]*\)\s+(?:is|it is)\s+([0-9.]+)",
            re.sub(r"\s+", " ", text),
        )
    ]
    if len(sweep) < 2:
        raise ValueError("the observable page has no block-count sweep")

    # The page reports the hundred-block estimate in the table and the other
    # block counts in the sentence, so the sweep is completed from the table.
    if not any(entry["blocks"] == 100 for entry in sweep):
        sweep.append({"blocks": 100, "sem": sem["Ethanol"]["block_sem"]})

    return {"sem": sem, "convergence": convergence, "sweep": sweep}


def load_plot_data(plot_id: str | int, *, read_json=None, read_yaml=None) -> dict:
    """Return the complete source-defined plot population without drawing it.

    ``plot_id`` accepts an integer, ``P1`` or the historical plot stem. Optional
    readers support source-defect fixtures; normal callers use canonical files.
    All return values, including metadata, are JSON serializable.
    """
    number = int(re.search(r"\d+", str(plot_id)).group())
    read_json = read_json or _json
    read_yaml = read_yaml or _yaml
    data = {}
    paths = []

    def read(path):
        paths.append(str(path.relative_to(ROOT)))
        return read_json(path)

    if number in (1, 6, 7):
        resources = read(DATA / "resources.v1.json")
        data["resources"] = resources
        data["snapshot"] = asdict(catalogue_projection(resources))
    if number == 1:
        data["ordered"] = sorted(
            Counter(r["kind"] for r in resources).items(), key=lambda item: (-item[1], item[0])
        )
    elif number == 2:
        payload = read(DATA / "comparison.v1.json")
        names = {p["id"]: p["name"] for p in payload["providers"]}
        classes = {p["id"]: p["provider_class"] for p in payload["providers"]}
        thresholds = list(payload["thresholds"])
        bounds = defaultdict(dict)
        seen = set()
        total = payload["taxonomy"]["topics"]
        for row in payload["summaries"]:
            pair = [row["lower"], row["upper"]]
            identity = (row["provider_id"], row["threshold"])
            if identity in seen:
                raise ValueError(f"duplicate coverage interval {identity}")
            seen.add(identity)
            if not 0 <= pair[0] <= pair[1] <= total:
                raise ValueError(f"invalid coverage interval {row}")
            bounds[row["provider_id"]][row["threshold"]] = pair
        if set(bounds) != set(names):
            raise ValueError("coverage summaries do not contain every declared provider")
        order = [SELF_ID] + sorted((p for p in bounds if p != SELF_ID), key=lambda p: names[p])
        if any(set(bounds[p]) != set(thresholds) for p in order):
            raise ValueError("a provider is missing a required threshold")
        data.update(
            payload=payload,
            names=names,
            classes=classes,
            thresholds=thresholds,
            bounds=dict(bounds),
            order=order,
            total=total,
        )
    elif number == 3:
        path = ROOT / "catalog/curriculum/tracks.yaml"
        paths.append(str(path.relative_to(ROOT)))
        registry = read_yaml(path)
        tracks = sorted(registry["tracks"], key=lambda t: t["order"])
        counts = {t["id"]: {layer: 0 for layer in ("core", "research", "practice")} for t in tracks}
        for unit in registry["units"]:
            counts[unit["track_id"]][unit["layer"]] += 1
        data.update(registry=registry, tracks=tracks, counts=counts)
    elif number == 4:
        payload = read(DATA / "comparison.v1.json")
        rows = [r for r in payload["rows"] if r["provider_id"] == SELF_ID]
        order, depths, bases = [], {}, {}
        for row in sorted(rows, key=lambda r: r["track_order"]):
            track = row["track_id"]
            if track not in depths:
                order.append(track)
                depths[track] = {d: 0 for d in ("worked", "executable", "assessed")}
                bases[track] = {b: 0 for b in ("real-data", "authored")}
            depths[track][row["depth"]] += 1
            if row["run_basis"]:
                bases[track][row["run_basis"]] += 1
        data.update(
            payload=payload, rows=rows, order=order, depth_by_track=depths, base_by_track=bases
        )
    elif number == 5:
        payload = read(DATA / "comparison.v1.json")
        reading = next(r for r in payload["second_readings"] if r["id"] == READING_ID)
        data.update(
            payload=payload, reading=reading, series=asdict(reading_series(payload, reading))
        )
    elif number == 6:
        openness = read(DATA / "openness.v1.json")
        validate_openness_join(resources, openness)
        kind_of = {r["id"]: r["kind"] for r in resources}
        totals = Counter(kind_of.values())
        kinds = [k for k, _ in sorted(totals.items(), key=lambda p: (-p[1], p[0]))]
        cells = {}
        for kind in kinds:
            records = [r for r in openness if kind_of[r["id"]] == kind]
            cells[kind] = {}
            for dim in DIMENSIONS:
                states = Counter(r["openness"][dim]["value"] for r in records)
                if set(states) - set(STATES):
                    raise ValueError(f"unexpected openness states {states}")
                cells[kind][dim] = {
                    "states": {s: states[s] for s in STATES},
                    "available": states["available"],
                    "applicable": sum(states[s] for s in STATES[:-1]),
                    "total": len(records),
                }
        data.update(
            openness=openness,
            totals=dict(totals),
            kinds=kinds,
            cells=cells,
            dimensions=DIMENSIONS,
            states=STATES,
        )
    elif number == 7:
        access_counts = Counter(r["access_level"]["value"] for r in resources)
        if set(access_counts) - set(ACCESS_ORDER):
            raise ValueError("unexpected access level")
        layer_counts = Counter()
        for record in resources:
            names = [licence["name"] for licence in record.get("licenses", [])]
            layer_counts[licence_layer(names) if names else NO_LICENCE] += 1
        data.update(
            access_counts={k: access_counts[k] for k in ACCESS_ORDER},
            layer_counts={
                k: layer_counts[k] for k in [name for name, _ in LICENCE_LAYERS] + [NO_LICENCE]
            },
            access_order=ACCESS_ORDER,
            licence_order=[name for name, _ in LICENCE_LAYERS] + [NO_LICENCE],
        )
    elif number == 8:
        results = read(ROOT / "labs/freesolv/reviewed-results.json")
        splits = results["splits"]
        for split in ("scaffold", "random"):
            for source, expected in (
                ("point_metrics", {"train_mean", "morgan_ridge", "morgan_random_forest"}),
                ("interval_metrics", {"morgan_ridge", "morgan_random_forest"}),
            ):
                if set(splits[split][source]) != expected:
                    raise ValueError(f"{split}: incomplete or unexpected {source} model set")
        data.update(results=results, splits=splits)
    elif number == 9:
        summary = read(ROOT / "labs/chembl_egfr/locked-summary.json")
        data.update(summary=summary, results=summary["results"])
    elif number == 10:
        real = read(ROOT / "labs/pool_budget/real-summary.json")
        uncertainty = read(ROOT / "labs/pool_budget/uncertainty-summary.json")
        assays = {}
        for assay in ASSAYS:
            block = real["assays"][assay]
            checkpoints = block["budget"]["checkpoints"]
            if checkpoints != uncertainty["assays"][assay]["budget"]["checkpoints"]:
                raise ValueError("campaign checkpoints differ")
            policies = {p["name"]: p for p in block["policies"]}
            policies["ensemble-variance-uncertainty"] = uncertainty["assays"][assay]["policy"]
            names = ["maxmin", "ensemble-variance-uncertainty"] + sorted(
                n for n in policies if n.startswith("random")
            )
            if len(names) != 7 or set(names) != set(policies):
                raise ValueError("expected two named policies and five fixed random instances")
            for name in names:
                for metric in ("recovery", "evaluation_mae"):
                    if len(policies[name][metric]) != len(checkpoints):
                        raise ValueError(f"{assay} {name} missing {metric} checkpoint")
            assays[assay] = {
                "checkpoints": checkpoints,
                "policies": policies,
                "names": names,
                "budget": block["budget"],
            }
        data.update(real=real, uncertainty=uncertainty, assays=assays)
    elif number in (11, 12):
        data.update(read_observable_page())
        paths.append(str(PAGE))
    elif number == 13:
        cyp = read(ROOT / "labs/cyp_assay_system/summary.json")
        clearance = read(ROOT / "labs/az_clearance_system/summary.json")
        rows = []
        for key, label in (
            ("full", "CYP2D6 against CYP3A4, all pairs"),
            ("clean_pairs_only", "CYP2D6 against CYP3A4, clean pairs"),
        ):
            r = cyp["correlation"][key]
            rows.append([label, r["count"], r["pearson_r"], r["spearman_rho"]])
        short = {
            "CHEMBL3301370": "microsome",
            "CHEMBL3301371": "rat hepatocyte",
            "CHEMBL3301372": "human hepatocyte",
        }
        for pair in clearance["pairs"].values():
            rows.append(
                [
                    f"{short[pair['primary_system']]} against {short[pair['secondary_system']]}",
                    pair["clean_pair_count"],
                    pair["correlation"]["pearson_r"],
                    pair["correlation"]["spearman_rho"],
                ]
            )
        examples = [
            [r["parent_molecule_chembl_id"], r["primary_pchembl"], r["secondary_pchembl"]]
            for direction in ("primary_selective", "secondary_selective")
            for r in cyp["divergent_examples"][direction]
        ]
        examples.sort(key=lambda r: r[1] - r[2], reverse=True)
        data.update(cyp=cyp, clearance=clearance, rows=rows, examples=examples)
    else:
        raise ValueError(f"unknown plot {plot_id}")
    data["source"] = {
        "plot": number,
        "paths": paths,
        "kind": "canonical projection" if number in (1, 3, 6, 7) else "retained reviewed evidence",
        "new_experiment": False,
    }
    return data


def load_data(plot_id: str | int) -> dict:
    """Short public alias used by data-export consumers."""
    return load_plot_data(plot_id)
