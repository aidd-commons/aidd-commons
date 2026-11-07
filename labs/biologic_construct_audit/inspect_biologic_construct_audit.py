# ruff: noqa: E501
"""Show per-source coverage or check the committed construct audit."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.biologic_construct_audit.analysis import (  # noqa: E402
    classified_source_rows,
    load_snapshot,
)
from aidd_commons.biologic_construct_audit.protocol import load_protocol  # noqa: E402
from aidd_commons.biologic_construct_audit.summary import (  # noqa: E402
    build_summary,
    check_summary,
)

LAB = Path(__file__).resolve().parent


def show_developability() -> None:
    from aidd_commons.biologic_construct_audit.developability_and_validation import (
        audit_developability_by_modality,
    )

    dev = audit_developability_by_modality()
    print("1. MODALITY-SPECIFIC EXPRESSION, DEVELOPABILITY, DELIVERY & CMC CONSTRAINTS")
    for mod in dev["modalities"]:
        print(f"  {mod['entity_id']} ({mod['modality']}) [{', '.join(mod['source_ids'])}]")
        print(f"    construct:      {mod['construct_summary']}")
        print(f"    host & PTM:     {mod['expression_host']} | {mod['glycosylation_and_ptm']}")
        print(f"    stability/agg:  {mod['stability_and_aggregation']}")
        print(f"    specificity:    {mod['immunogenicity_and_specificity']}")
        print(f"    delivery:       {mod['delivery_and_compartment']}")
        print(f"    CMC gate:       {mod['primary_developability_gate']}")
    print()
    print("2. COMMITTED UNIPROT & DAILYMED DEVELOPABILITY SOURCE CHECKS")
    for check_name, passed in dev["source_evidence_checks"].items():
        print(f"  {check_name}: {'PASS' if passed else 'FAIL'}")
    print()
    print("3. MULTI-GATE BIOPHYSICAL DEVELOPABILITY & COMPARTMENT DELIVERY PANEL")
    for row in dev["candidate_panel"]:
        print(
            f"  {row['candidate_id']:<38} SEC={row['sec_monomer_fraction']:.3f}"
            f" HIC={row['hic_retention_min']:>4.1f}m Tm={row['fab_tm_celsius']:>4.1f}C"
            f" PSR={row['polyreactivity_psr_score']:.2f}"
            f" dFunc+={row['target_pos_delta_func']:>4.1f} dFunc-={row['target_neg_delta_func']:>4.1f}"
            f" deliv={row['compartment_delivery_fraction']:.5f} -> {row['verdict']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("show", "check", "developability", "check-developability"),
    )
    action = parser.parse_args().action
    try:
        if action == "developability":
            show_developability()
            return 0
        if action == "check-developability":
            from aidd_commons.biologic_construct_audit.developability_and_validation import (
                check_developability_and_validation,
            )

            failures = check_developability_and_validation()
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print(
                "PASS: modality developability rules, committed UniProt/DailyMed PTM/aggregation excerpts and delivery panel checks agree"
            )
            return 0
        if action == "check":
            failures = check_summary(LAB, LAB / "summary.json")
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print("PASS: protocol, committed source snapshot, audit rules and summary agree")
            return 0
        result = build_summary(LAB)
        print(f"entity_count={result['entity_count']}")
        print(f"per_field_counts={result['per_field_counts']}")
        print(f"entities_by_fields={result['entities_by_fields']}")
        protocol = load_protocol(LAB / "protocol.json")
        source_rows = classified_source_rows(load_snapshot(LAB, protocol), protocol)
        print(
            "entity\tsource\tmodality\tconstruct\texpression_system\tintended_function\tassembly\tparts_distinguished\tdefined_construct"
        )
        for row in source_rows:
            values = row["values"]
            print(
                "\t".join(
                    [
                        row["entity"],
                        row["source"],
                        *(values[name] or "unstated" for name in values),
                        row["assembly"],
                        str(row["parts_distinguished"]).lower(),
                        str(row["defined_construct"]).lower(),
                    ]
                )
            )
        print(f"gaps={result['gaps']}")
        print(f"source_coverage_differences={result['source_coverage_differences']}")
        print(f"source_disagreements={result['source_disagreements']}")
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
