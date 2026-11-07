# ruff: noqa: E501
"""Show every selected cell or recompute the evidence and claim invariants."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.claims_evidence_audit.analysis import analyze, check_invariants  # noqa: E402
from aidd_commons.claims_evidence_audit.protocol import load_protocol  # noqa: E402
from aidd_commons.claims_evidence_audit.records import load_sources  # noqa: E402
from aidd_commons.claims_evidence_audit.source_content_verification import (  # noqa: E402
    check_real_source_content,
    verify_real_source_content,
)

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("show", "check", "verify-source-content", "check-source-content"),
    )
    action = parser.parse_args().action
    if action == "verify-source-content":
        payload = verify_real_source_content(ROOT)
        print("REAL-SOURCE CONTENT VERIFICATION (6 COMMITTED BENCHMARK/EXPERIMENTAL SUMMARIES)")
        for row in payload["statements"]:
            print(json.dumps(row, ensure_ascii=False))
        return 0
    if action == "check-source-content":
        failures = check_real_source_content()
        for failure in failures:
            print(f"FAIL: {failure}")
        if failures:
            return 1
        print(
            "PASS: 6 real-data laboratory summaries and source-content claim classifications verified"
        )
        return 0
    try:
        protocol = load_protocol(LAB / "protocol.json")
        result = analyze(load_sources(ROOT, protocol), protocol, ROOT)
        failures = check_invariants(result, protocol)
    except (OSError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    if action == "show":
        for cell in result["cells"]:
            print(json.dumps(cell, ensure_ascii=False))
        print(json.dumps({"state_counts": result["state_counts"]}, ensure_ascii=False))
        print(json.dumps({"unsupported_claims": result["unsupported_claims"]}, ensure_ascii=False))
        print(json.dumps({"disagreements": result["disagreements"]}, ensure_ascii=False))
        print(json.dumps({"claims": result["claims"]}, ensure_ascii=False))
        print(
            "A default unknown does not establish absence. The own row is a stated floor, "
            "not a measure of teaching quality."
        )
    else:
        for failure in failures:
            print(f"FAIL: {failure}")
        print(f"invariants={len(failures)} failure(s)")
        print("PASS" if not failures else "FAIL")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
