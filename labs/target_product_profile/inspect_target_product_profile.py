# ruff: noqa: E501
"""Show parent-level profile outcomes or audit the committed result."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.target_product_profile.decision_context import (  # noqa: E402
    audit_therapeutic_decision_context,
    check_therapeutic_decision_context,
)
from aidd_commons.target_product_profile.protocol import load_protocol_document  # noqa: E402
from aidd_commons.target_product_profile.summary import check_summary, compute  # noqa: E402

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]


def show(summary: dict[str, Any], evaluations: list[dict[str, Any]]) -> None:
    print("Profile declared before the measurements were read")
    print(json.dumps(summary["profile"], indent=2, ensure_ascii=False))
    print("Per-parent mandatory gate and preference outcomes")
    for row in evaluations:
        print(json.dumps(row, ensure_ascii=False))
    print("Counts and contradictions")
    print(json.dumps(summary["counts"], indent=2))
    print(json.dumps(summary["per_gate"], indent=2))
    print(json.dumps(summary["per_preference"], indent=2))
    print("Unmeasured requirements:", ", ".join(summary["unmeasured_requirements"]))
    if summary["no_contradictions_note"]:
        print(summary["no_contradictions_note"])
    print(summary["boundary_statement"])


def show_decision_context(payload: dict[str, Any]) -> None:
    print(
        "THERAPEUTIC DECISION CONTEXT (CLINICAL NEED -> MODALITY -> TPP FUNNEL -> NEXT FALSIFIER)"
    )
    need = payload["clinical_need"]
    print(f"indication={need['indication']}")
    print(
        f"open_targets_nsclc_overall={need['open_targets_nsclc_overall_score']}  "
        f"somatic={need['open_targets_nsclc_somatic_score']}  "
        f"safety_events={need['open_targets_safety_liability_count']}  "
        f"ipass_hr_reversal={need['ipass_hr_reversal_ratio']}x"
    )
    print("\nmodality_id\tintracellular\tbbb_cns\toral\tprogramme_fit")
    for m in payload["modality_comparison"]:
        print(
            f"{m['modality_id']}\t{m['reaches_intracellular_kinase']}\t"
            f"{m['crosses_intact_bbb_for_cns_metastases']}\t"
            f"{m['oral_convenience_for_chronic_dosing']}\t{m['programme_fit_for_cns_egfr_nsclc']}"
        )
    f = payload["tpp_funnel"]
    print(
        f"\ntpp_funnel: union={f['source_union_compounds']}  "
        f"cohort={f['multi_family_cohort']}  "
        f"contradicted={f['contradicted_by_measured_gates']}  "
        f"no_observed_failure={f['no_observed_gate_failure']}  "
        f"profile_satisfying={f['profile_satisfying_compounds']}"
    )
    print("\nnext_falsifiable_decisions:")
    for step in payload["next_falsifiable_decisions"]:
        print(
            f"step={step['decision_step']}  experiment={step['falsifying_experiment']}  "
            f"criterion={step['falsification_criterion']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=["show", "check", "decision-context", "check-decision-context"],
    )
    parser.add_argument("--cache-root", type=Path, default=ROOT / ".cache")
    args = parser.parse_args()
    try:
        if args.action == "decision-context":
            show_decision_context(audit_therapeutic_decision_context())
            return 0
        if args.action == "check-decision-context":
            failures = check_therapeutic_decision_context()
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print(
                "PASS: clinical need, 4-modality comparison, 58-compound TPP funnel, and next falsifiers verified"
            )
            return 0
        load_protocol_document(LAB / "protocol.json")
        summary, evaluations = compute(args.cache_root)
        if args.action == "check":
            committed = json.loads((LAB / "summary.json").read_text(encoding="utf-8"))
            check_summary(committed, summary)
            print("PASS: frozen profile, cached measurements and committed summary agree")
        else:
            show(summary, evaluations)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
