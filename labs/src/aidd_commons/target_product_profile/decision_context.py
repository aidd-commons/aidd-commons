# ruff: noqa: E501
"""Therapeutic decision context connecting clinical need, modality choice, TPP gates and next falsifier.

Covers Track 2 topic `t02-therapeutic-decision-context`:
- Connect unmet clinical disease need, biological intervention hypothesis, modality comparison
  (oral small molecule, monoclonal antibody, PROTAC degrader, LNP-siRNA), committed ChEMBL 37
  target-product-profile (TPP) gate outcomes, and the next falsifiable experimental decision.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[4]
TPP_SUMMARY_PATH = ROOT / "labs/target_product_profile/summary.json"

MODALITY_COMPARISON_MATRIX: tuple[dict[str, Any], ...] = (
    {
        "modality_id": "oral_small_molecule_tki",
        "modality_label": "Oral brain-penetrant small-molecule kinase inhibitor",
        "reaches_intracellular_kinase": True,
        "crosses_intact_bbb_for_cns_metastases": True,
        "oral_convenience_for_chronic_dosing": True,
        "engages_catalytic_pocket_or_allosteric_site": True,
        "primary_modality_specific_risk": "CYP3A4 drug-drug interaction, hepatic microsome clearance, and on-target wild-type epithelial EGFR rash/diarrhea",
        "programme_fit_for_cns_egfr_nsclc": "selected_primary_modality",
    },
    {
        "modality_id": "monoclonal_antibody_igg1",
        "modality_label": "Extracellular anti-EGFR IgG1 monoclonal antibody (e.g. cetuximab)",
        "reaches_intracellular_kinase": False,
        "crosses_intact_bbb_for_cns_metastases": False,
        "oral_convenience_for_chronic_dosing": False,
        "engages_catalytic_pocket_or_allosteric_site": False,
        "primary_modality_specific_risk": "~150 kDa IgG1 has <0.1% CSF-to-plasma penetration across an intact blood-brain barrier and cannot discriminate intracellular L858R/T790M from wild-type ectodomain",
        "programme_fit_for_cns_egfr_nsclc": "rejected_for_intracellular_cns_indication",
    },
    {
        "modality_id": "heterobifunctional_protac_degrader",
        "modality_label": "Heterobifunctional E3-recruiting EGFR PROTAC degrader",
        "reaches_intracellular_kinase": True,
        "crosses_intact_bbb_for_cns_metastases": False,
        "oral_convenience_for_chronic_dosing": False,
        "engages_catalytic_pocket_or_allosteric_site": True,
        "primary_modality_specific_risk": "Beyond-Rule-of-5 molecular weight (850-1100 Da) and high TPSA (>160 A^2) cause high efflux and poor oral/CNS exposure without specialized formulation",
        "programme_fit_for_cns_egfr_nsclc": "backup_for_catalytic_independent_scaffolding_resistance",
    },
    {
        "modality_id": "lnp_sirna_knockdown",
        "modality_label": "Lipid-nanoparticle encapsulated EGFR siRNA",
        "reaches_intracellular_kinase": True,
        "crosses_intact_bbb_for_cns_metastases": False,
        "oral_convenience_for_chronic_dosing": False,
        "engages_catalytic_pocket_or_allosteric_site": False,
        "primary_modality_specific_risk": "Systemic ionizable LNPs distribute predominantly to liver hepatocytes via ApoE rather than extrahepatic lung/CNS solid tumours",
        "programme_fit_for_cns_egfr_nsclc": "rejected_due_to_extrahepatic_tumour_delivery_bottleneck",
    },
)


def audit_therapeutic_decision_context() -> dict[str, Any]:
    """Build the complete end-to-end disease-need-to-modality-to-TPP decision record."""
    from aidd_commons.mechanism_consistency.target_evidence import (
        audit_disease_state_definition,
        load_target_evidence_snapshot,
    )

    tpp = json.loads(TPP_SUMMARY_PATH.read_text(encoding="utf-8"))
    ot_snap = load_target_evidence_snapshot()
    ds = audit_disease_state_definition(ot_snap)
    egfr_ot = ot_snap["targets"]["EGFR"]

    clinical_need = {
        "indication": "EGFR-mutant (exon 19 deletion / L858R) advanced non-small-cell lung cancer (MONDO_0005233) with high incidence of central nervous system (CNS) brain metastases",
        "unmet_need": (
            "1st-generation reversible quinazolines (gefitinib/erlotinib, IPASS mutant PFS HR=0.48 vs wild-type HR=2.85, "
            "reversal ratio 5.94x) suffer from acquired Thr790Met (T790M) gatekeeper resistance (3.14-3.48 A contact in "
            "1M17/4HJO/1XKK) and incomplete CNS penetration, while wild-type EGFR inhibition causes 21 curated safety liabilities (rash, diarrhea, ILD)."
        ),
        "open_targets_nsclc_overall_score": egfr_ot["top_diseases"][0]["overall_score"],
        "open_targets_nsclc_somatic_score": egfr_ot["top_diseases"][0]["datatype_scores"][
            "somatic_mutation"
        ],
        "open_targets_safety_liability_count": egfr_ot["safety_liability_count"],
        "ipass_hr_reversal_ratio": ds["hr_reversal_ratio_wt_over_mut"],
    }

    tpp_funnel = {
        "source_union_compounds": tpp["counts"]["source_union_compound_count"],
        "single_family_excluded": tpp["counts"]["single_family_excluded_count"],
        "multi_family_cohort": tpp["counts"]["cohort_compound_count"],
        "contradicted_by_measured_gates": tpp["counts"]["contradicted_compound_count"],
        "no_observed_gate_failure": tpp["counts"]["no_observed_gate_failure_count"],
        "profile_satisfying_compounds": tpp["counts"]["profile_satisfying_compound_count"],
        "gate_failures_by_endpoint": {
            gate_id: {
                "pass": gate_data["pass"],
                "fail": gate_data["fail"],
                "unmeasured": gate_data["unmeasured"],
            }
            for gate_id, gate_data in tpp["per_gate"].items()
        },
        "unmeasured_mandatory_gates": tpp["unmeasured_requirements"],
    }

    next_falsifiable_decisions = [
        {
            "decision_step": 1,
            "target_cohort": "37 ChEMBL 37 parents with no observed gate failure (of 58 multi-family compounds)",
            "missing_in_vitro_gate": "57 of 58 cohort parents lack an admitted response_ic50 measurement in the joined table",
            "falsifying_experiment": "Measure paired cellular phospho-EGFR IC50 in mutant (L858R/T790M H1975) vs wild-type (A431) cells",
            "falsification_criterion": "Reject any compound with mutant IC50 > 100 nM or wild-type/mutant selectivity ratio < 10x",
        },
        {
            "decision_step": 2,
            "target_cohort": "Compounds passing mutant selectivity + HLM clearance (<= 50 mL/min/g) + CYP3A4 (pChEMBL <= 5.0)",
            "missing_in_vitro_gate": "Blood-brain barrier efflux liability for CNS metastasis coverage",
            "falsifying_experiment": "Bidirectional MDCK-MDR1 and MDCK-BCRP permeability and efflux ratio assay",
            "falsification_criterion": "Reject any compound with P_app < 5e-6 cm/s or efflux ratio ER > 2.0 before in vivo K_p,uu studies",
        },
    ]

    return {
        "clinical_need": clinical_need,
        "modality_comparison": list(MODALITY_COMPARISON_MATRIX),
        "selected_modality_id": "oral_small_molecule_tki",
        "tpp_funnel": tpp_funnel,
        "next_falsifiable_decisions": next_falsifiable_decisions,
    }


def check_therapeutic_decision_context(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify all deterministic invariants for Track 2 therapeutic decision context."""
    data = payload or audit_therapeutic_decision_context()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    need = data["clinical_need"]
    require(
        need["open_targets_nsclc_overall_score"] == 0.8503
        and need["open_targets_nsclc_somatic_score"] == 0.8316
        and need["open_targets_safety_liability_count"] == 21
        and need["ipass_hr_reversal_ratio"] == 5.94,
        "clinical need record must match Open Targets EGFR NSCLC scores (0.8503, somatic 0.8316, 21 safety events) and IPASS 5.94x reversal",
    )

    mods = {m["modality_id"]: m for m in data["modality_comparison"]}
    require(len(mods) == 4, "modality comparison must evaluate all 4 modalities")
    require(
        mods["oral_small_molecule_tki"]["reaches_intracellular_kinase"]
        and mods["oral_small_molecule_tki"]["crosses_intact_bbb_for_cns_metastases"]
        and not mods["monoclonal_antibody_igg1"]["reaches_intracellular_kinase"]
        and not mods["monoclonal_antibody_igg1"]["crosses_intact_bbb_for_cns_metastases"],
        "modality comparison must separate oral brain-penetrant SM TKI from extracellular mAb across intracellular and BBB access",
    )

    funnel = data["tpp_funnel"]
    require(
        funnel["source_union_compounds"] == 7908
        and funnel["multi_family_cohort"] == 58
        and funnel["contradicted_by_measured_gates"] == 21
        and funnel["no_observed_gate_failure"] == 37
        and funnel["profile_satisfying_compounds"] == 0,
        "TPP funnel counts must match committed summary (7908 union, 58 cohort, 21 contradicted, 37 no observed failure, 0 satisfying)",
    )
    require(
        len(data["next_falsifiable_decisions"]) == 2,
        "must specify both next falsifiable experimental gates (mutant/WT cellular selectivity and BBB efflux)",
    )
    return failures
