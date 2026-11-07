# ruff: noqa: E501
"""Show source claims or check the seven-field evidence contract."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.asset_openness_audit.analysis import analyze, check_invariants  # noqa: E402
from aidd_commons.asset_openness_audit.governance_release import (  # noqa: E402
    audit_governance_release,
    check_governance_release,
    check_reproducibility,
    verify_reproducibility,
)
from aidd_commons.asset_openness_audit.protocol import EXAMINED_IDS, load_protocol  # noqa: E402
from aidd_commons.asset_openness_audit.records import load_catalogue  # noqa: E402

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]


def show_governance_release() -> None:
    payload = audit_governance_release()
    print("OPENNESS, LICENCE, DUAL-USE BIOSECURITY & HUMAN-AUTHORITY GOVERNANCE AUDIT")
    print(
        f"catalogue_records={payload['catalogue_total_records']}  "
        f"examined_records={payload['examined_record_count']}  "
        f"available_cells={payload['examined_counts']['available']}  "
        f"unverified_cells={payload['examined_counts']['unverified']}  "
        f"scope_limited_records={payload['examined_counts']['records_with_scope_limit']}"
    )
    print("\ncase_id\tatlas_id\treproducibility\tlicenses\tbiosecurity_risk\tdecision")
    for row in payload["governance_cases"]:
        print(
            f"{row['case_id']}\t{row['atlas_id']}\t{row['reproducibility_status']}\t"
            f"{','.join(row['license_names']) or 'unverified'}\t{row['biosecurity_risk_class']}\t{row['decision']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=(
            "show",
            "check",
            "governance-release",
            "check-governance-release",
            "verify-reproducibility",
            "check-reproducibility",
        ),
    )
    action = parser.parse_args().action
    if action == "governance-release":
        show_governance_release()
        return 0
    if action == "check-governance-release":
        failures = check_governance_release()
        for failure in failures:
            print(f"FAIL: {failure}")
        if failures:
            return 1
        print(
            "PASS: 232-record openness audit and 6 licence/safety/biosecurity/clinical governance decisions verified"
        )
        return 0
    if action == "verify-reproducibility":
        payload = verify_reproducibility()
        for row in payload["empirical_links"]:
            print(json.dumps(row, ensure_ascii=False))
        return 0
    if action == "check-reproducibility":
        failures = check_reproducibility()
        for failure in failures:
            print(f"FAIL: {failure}")
        if failures:
            return 1
        print(
            "PASS: 4 empirical laboratory reproducibility links verified against 24 catalogue records"
        )
        return 0
    try:
        load_protocol(LAB / "protocol.json")
        result = analyze(load_catalogue(ROOT / "catalog/resources", EXAMINED_IDS), EXAMINED_IDS)
    except (OSError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    failures = check_invariants(result, EXAMINED_IDS)
    if action == "show":
        print(
            "scope_limit_rule=case-insensitive whole words: "
            "only | not | no separate terms | does not"
        )
        print("scope_limit_rule_is_text_only=true")
        for row in result["records"]:
            print(json.dumps(row, ensure_ascii=False))
        print(
            json.dumps(
                {
                    "examined_counts": result["examined_counts"],
                    "whole_catalogue": result["whole_catalogue"],
                }
            )
        )
    else:
        for failure in failures:
            print(f"FAIL: {failure}")
        print(f"invariants={len(failures)} failure(s)")
        print("PASS" if not failures else "FAIL")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
