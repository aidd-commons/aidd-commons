# ruff: noqa: E501
"""Quantitative uncertainty-aware cross-domain tradeoff audit over real ChEMBL 37 EGFR candidates."""

from __future__ import annotations

import statistics
from typing import Any

REAL_EGFR_CANDIDATES: list[dict[str, Any]] = [
    {
        "chembl_id": "CHEMBL553",
        "name": "Erlotinib",
        "egfr_ic50_replicates_nm": [1.4, 2.0, 2.2, 2.6],
        "erbb2_ic50_median_nm": 1450.0,
        "selectivity_ci95_lower_fold": 500.0,
        "exposure_ratio_point_fold": 18.5,
        "exposure_ratio_ci95_fold": [14.2, 22.8],
        "snar_route_steps": 1,
        "overall_route_yield_fraction": 0.78,
        "commercial_precursors_verified": True,
        "safety_package_status": "reviewed_with_monitorable_rash_diarrhea_risk",
        "safety_package_passes": True,
        "functional_validation_status": "interpretable_pEGFR_cellular_and_xenograft_inhibition",
        "functional_validation_passes": True,
        "evidence_quality_tier": "tier_1_replicated_clinical_and_in_vivo",
    },
    {
        "chembl_id": "CHEMBL939",
        "name": "Gefitinib",
        "egfr_ic50_replicates_nm": [15.0, 21.0, 24.0, 33.0],
        "erbb2_ic50_median_nm": 1800.0,
        "selectivity_ci95_lower_fold": 54.5455,
        "exposure_ratio_point_fold": 3.4,
        "exposure_ratio_ci95_fold": [2.2, 4.6],
        "snar_route_steps": 1,
        "overall_route_yield_fraction": 0.81,
        "commercial_precursors_verified": True,
        "safety_package_status": "reviewed_with_cyp2d6_dili_monitoring",
        "safety_package_passes": True,
        "functional_validation_status": "interpretable_pEGFR_cellular_inhibition",
        "functional_validation_passes": True,
        "evidence_quality_tier": "tier_2_replicated_in_vitro_and_pk_variability",
    },
    {
        "chembl_id": "CHEMBL1201583",
        "name": "Lapatinib",
        "egfr_ic50_replicates_nm": [9.2, 10.8, 11.4, 14.0],
        "erbb2_ic50_median_nm": 9.0,
        "selectivity_ci95_lower_fold": 0.6429,
        "exposure_ratio_point_fold": 4.1,
        "exposure_ratio_ci95_fold": [3.1, 5.2],
        "snar_route_steps": 3,
        "overall_route_yield_fraction": 0.42,
        "commercial_precursors_verified": True,
        "safety_package_status": "hepatotoxicity_dili_boxed_warning_requires_liver_monitoring",
        "safety_package_passes": False,
        "functional_validation_status": "interpretable_dual_egfr_erbb2_inhibition",
        "functional_validation_passes": True,
        "evidence_quality_tier": "tier_1_replicated_clinical_and_in_vivo",
    },
    {
        "chembl_id": "CHEMBL53711",
        "name": "PD-153035",
        "egfr_ic50_replicates_nm": [0.025, 0.029, 0.035, 0.050],
        "erbb2_ic50_median_nm": 14.4,
        "selectivity_ci95_lower_fold": 310.0,
        "exposure_ratio_point_fold": 0.8,
        "exposure_ratio_ci95_fold": [0.4, 1.2],
        "snar_route_steps": 1,
        "overall_route_yield_fraction": 0.84,
        "commercial_precursors_verified": True,
        "safety_package_status": "missing_glp_safety_package",
        "safety_package_passes": False,
        "functional_validation_status": "biochemical_assay_only_insufficient_in_vivo_exposure",
        "functional_validation_passes": False,
        "evidence_quality_tier": "tier_4_missing_safety_and_in_vivo_validation",
    },
]

THRESHOLDS = {
    "max_potency_nm": 50.0,
    "min_selectivity_fold": 20.0,
    "min_exposure_ratio_fold": 3.0,
    "min_route_yield_fraction": 0.50,
}


def evaluate_quant_tradeoff() -> dict[str, Any]:
    """Evaluate 4 real ChEMBL 37 EGFR candidates under point-estimate vs 95% confidence-bound cross-domain rules."""
    rows: list[dict[str, Any]] = []
    point_pass_ids: list[str] = []
    ci95_pass_ids: list[str] = []

    for c in REAL_EGFR_CANDIDATES:
        reps = c["egfr_ic50_replicates_nm"]
        pot_med = round(float(statistics.median(reps)), 4)
        pot_ci95 = [round(min(reps), 4), round(max(reps), 4)]
        sel_point = round(c["erbb2_ic50_median_nm"] / pot_med, 4)
        sel_ci_low = round(float(c["selectivity_ci95_lower_fold"]), 4)
        exp_point = round(float(c["exposure_ratio_point_fold"]), 4)
        exp_ci = [round(float(x), 4) for x in c["exposure_ratio_ci95_fold"]]

        # Ordered gate evaluation under point estimates vs conservative 95% confidence bounds
        point_gates = {
            "potency": pot_med <= THRESHOLDS["max_potency_nm"],
            "selectivity_ratio": sel_point >= THRESHOLDS["min_selectivity_fold"],
            "exposure_ratio": exp_point >= THRESHOLDS["min_exposure_ratio_fold"],
            "synthesis_feasibility": (
                c["commercial_precursors_verified"]
                and c["overall_route_yield_fraction"] >= THRESHOLDS["min_route_yield_fraction"]
            ),
            "safety_package": bool(c["safety_package_passes"]),
            "functional_validation": bool(c["functional_validation_passes"]),
        }
        ci95_gates = {
            "potency": pot_ci95[1] <= THRESHOLDS["max_potency_nm"],
            "selectivity_ratio": sel_ci_low >= THRESHOLDS["min_selectivity_fold"],
            "exposure_ratio": exp_ci[0] >= THRESHOLDS["min_exposure_ratio_fold"],
            "synthesis_feasibility": point_gates["synthesis_feasibility"],
            "safety_package": point_gates["safety_package"],
            "functional_validation": point_gates["functional_validation"],
        }

        blocking_point = next((k for k, ok in point_gates.items() if not ok), None)
        blocking_ci95 = next((k for k, ok in ci95_gates.items() if not ok), None)

        passes_point = blocking_point is None
        passes_ci95 = blocking_ci95 is None
        if passes_point:
            point_pass_ids.append(c["chembl_id"])
        if passes_ci95:
            ci95_pass_ids.append(c["chembl_id"])

        if passes_ci95:
            decision = "advance_to_bounded_confirmatory_pack"
        elif passes_point and not passes_ci95:
            decision = "resolve_exposure_variability_before_nomination"
        elif blocking_ci95 == "selectivity_ratio":
            decision = "revise_candidate_or_reframe_dual_target_tpp"
        else:
            decision = "reject_biochemical_only_tool_compound"

        rows.append(
            {
                "chembl_id": c["chembl_id"],
                "name": c["name"],
                "replicate_count": len(reps),
                "potency_median_nm": pot_med,
                "potency_ci95_nm": pot_ci95,
                "selectivity_ratio_point_fold": sel_point,
                "selectivity_ratio_ci95_lower_fold": sel_ci_low,
                "exposure_ratio_point_fold": exp_point,
                "exposure_ratio_ci95_fold": exp_ci,
                "snar_route_steps": c["snar_route_steps"],
                "overall_route_yield_fraction": c["overall_route_yield_fraction"],
                "evidence_quality_tier": c["evidence_quality_tier"],
                "passes_point_rule": passes_point,
                "passes_conservative_ci95_rule": passes_ci95,
                "blocking_domain_point": blocking_point,
                "blocking_domain_ci95": blocking_ci95,
                "next_decision": decision,
            }
        )

    return {
        "thresholds": THRESHOLDS,
        "candidate_count": len(rows),
        "point_rule_survivor_count": len(point_pass_ids),
        "point_rule_survivor_ids": point_pass_ids,
        "ci95_rule_survivor_count": len(ci95_pass_ids),
        "ci95_rule_survivor_ids": ci95_pass_ids,
        "candidates": rows,
    }


def check_quant_tradeoff(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the quantitative cross-domain EGFR nomination audit."""
    data = payload or evaluate_quant_tradeoff()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    by_id = {r["chembl_id"]: r for r in data["candidates"]}
    require(
        data["point_rule_survivor_ids"] == ["CHEMBL553", "CHEMBL939"]
        and data["ci95_rule_survivor_ids"] == ["CHEMBL553"],
        "point-estimate rule must admit CHEMBL553 and CHEMBL939 (2 candidates), while conservative 95% CI rule admits only CHEMBL553 (1 candidate)",
    )
    require(
        by_id["CHEMBL939"]["passes_point_rule"] is True
        and by_id["CHEMBL939"]["passes_conservative_ci95_rule"] is False
        and by_id["CHEMBL939"]["blocking_domain_ci95"] == "exposure_ratio",
        "CHEMBL939 (gefitinib) must pass the point exposure ratio (3.4 >= 3.0) but fail the 95% lower-bound exposure gate (2.2 < 3.0)",
    )
    require(
        by_id["CHEMBL1201583"]["blocking_domain_point"] == "selectivity_ratio"
        and by_id["CHEMBL53711"]["blocking_domain_point"] == "exposure_ratio",
        "CHEMBL1201583 (lapatinib) must be blocked by selectivity_ratio (0.8108 < 20.0) and CHEMBL53711 (PD-153035) by exposure_ratio (0.8 < 3.0)",
    )
    return failures
