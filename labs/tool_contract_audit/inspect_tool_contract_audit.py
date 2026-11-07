# ruff: noqa: E501
"""Show the contract and per-laboratory verdicts, or check the committed audit."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.tool_contract_audit.action_boundary import (  # noqa: E402
    audit_action_boundaries,
    check_action_boundaries,
)
from aidd_commons.tool_contract_audit.analysis import audit_records, load_records  # noqa: E402
from aidd_commons.tool_contract_audit.protocol import load_protocol  # noqa: E402
from aidd_commons.tool_contract_audit.summary import check_summary  # noqa: E402

LAB = Path(__file__).resolve().parent
LABS = LAB.parent


def show_action_boundaries() -> None:
    payload = audit_action_boundaries()
    print("SCIENTIFIC TASK ACTION-BOUNDARY AUDIT")
    print(
        f"audited_laboratories={payload['audited_laboratory_count']}  "
        f"records_with_limit_fields={payload['records_carrying_boundary_or_limit']}"
    )
    pqa = payload["paperqa_local_contract"]
    print(
        f"paperqa_local: version={pqa['paperqa_version']}  llm={pqa['llm']}  "
        f"embedding={pqa['embedding']}  ndim={pqa['embedding_ndim']}  "
        f"local_only={pqa['local_ollama_endpoints_only']}"
    )
    print("\natlas_id\taccess_level\tavailable_dims\tunverified_dims\tlicenses")
    for row in payload["atlas_agent_records"]:
        print(
            f"{row['id']}\t{row['access_level']}\t{len(row['available_dimensions'])}\t"
            f"{len(row['unverified_dimensions'])}\t{','.join(row['license_names'])}"
        )
    print("\ncase_id\trequested_action\toutcome_status\tcontrol_pass\tboundary_verdict\tviolations")
    for c in payload["action_boundary_cases"]:
        print(
            f"{c['case_id']}\t{c['requested_action']}\t{c['outcome_status']}\t"
            f"{c['control_pass']}\t{c['boundary_verdict']}\t{','.join(c['violations']) or '-'}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("show", "check", "action-boundary", "check-action-boundary"),
    )
    args = parser.parse_args()
    try:
        if args.action == "action-boundary":
            show_action_boundaries()
            return 0
        if args.action == "check-action-boundary":
            failures = check_action_boundaries()
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print(
                "PASS: 32 laboratory return records, PaperQA local config, 4 Atlas agent contracts, and 4 action-boundary traces verified"
            )
            return 0
        if args.action == "check":
            failures = check_summary(LAB, LABS, LAB / "summary.json")
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print(
                "PASS: protocol, field counts and per-laboratory verdicts agree with local records"
            )
            return 0
        protocol = load_protocol(LAB / "protocol.json")
        result = audit_records(
            load_records(
                LABS, protocol["source"], exclude=protocol["source"]["exclude_laboratory"]
            ),
            protocol["contract"],
        )
        print(json.dumps(protocol["contract"], indent=2, sort_keys=True))
        print("laboratory\tverdict\tfailed_fields")
        for row in result["per_laboratory"]:
            failures = "; ".join(
                f"{item['field']}={item['reason']}" for item in row["failed_fields"]
            )
            print(f"{row['laboratory']}\t{row['verdict']}\t{failures or '-'}")
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
