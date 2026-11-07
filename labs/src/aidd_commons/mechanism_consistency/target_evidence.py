# ruff: noqa: E501
"""Committed Open Targets Platform v4, clinical subgroup and genetic instrument audit for Track 6."""

from __future__ import annotations

import json
import math
from typing import Any

SNAPSHOT_JSON = '{"clinical_subgroup_records": {"citation": "Mok et al., N. Engl. J. Med. 361, 947-957 (2009), PMID:19692680 (IPASS); Pao et al., PLoS Med. 2, e73 (2005), PMID:15737014", "indication_id": "MONDO_0005061", "indication_name": "lung adenocarcinoma", "subgroups": [{"cell_state": "malignant alveolar/bronchiolar adenocarcinoma", "chemo_orr_pct": 47.3, "favours": "gefitinib", "gatekeeper_thr790_status": "Thr790 wild-type (3.14-3.48 A contact to quinazoline core)", "gefitinib_orr_pct": 71.2, "molecular_phenotype": "EGFR exon 19 deletion or L858R", "patient_subgroup": "EGFR mutation-positive (n=261)", "pfs_ci_95": [0.36, 0.64], "pfs_hazard_ratio": 0.48, "sample_size": 261, "subgroup_id": "egfr_activating_mutant_1L", "temporal_line": "first_line_treatment_naive", "tissue": "lung epithelium"}, {"cell_state": "malignant adenocarcinoma without EGFR driver", "chemo_orr_pct": 23.5, "favours": "carboplatin_paclitaxel", "gatekeeper_thr790_status": "Thr790 wild-type but no oncogenic EGFR addiction", "gefitinib_orr_pct": 1.1, "molecular_phenotype": "EGFR wild-type (no activating kinase mutation)", "patient_subgroup": "EGFR mutation-negative (n=176)", "pfs_ci_95": [2.05, 3.98], "pfs_hazard_ratio": 2.85, "sample_size": 176, "subgroup_id": "egfr_wild_type_1L", "temporal_line": "first_line_treatment_naive", "tissue": "lung epithelium"}, {"cell_state": "TKI-resistant clone selected under 1st-gen quinazoline exposure", "chemo_orr_pct": null, "favours": "3rd_gen_mutant_selective_covalent_inhibitor", "gatekeeper_thr790_status": "Met790 steric hindrance at 3.14-3.48 A + restored ATP Km", "gefitinib_orr_pct": 0.0, "molecular_phenotype": "EGFR activating mutation + secondary Thr790Met (T790M)", "patient_subgroup": "acquired resistance post-gefitinib/erlotinib", "pfs_ci_95": null, "pfs_hazard_ratio": null, "sample_size": 6, "subgroup_id": "egfr_t790m_relapsed_2L", "temporal_line": "second_line_post_1st_gen_tki", "tissue": "lung epithelium (post-TKI progression biopsy)"}], "trial_id": "IPASS_NCT00322452"}, "fetched_at_utc": "2026-11-07T09:20:00+00:00", "mendelian_randomization_records": {"citation": "Cohen et al., N. Engl. J. Med. 354, 1264-1272 (2006), PMID:16554528; Ference et al., N. Engl. J. Med. 375, 2144-2153 (2016), PMID:27959767", "instruments": [{"beta_zx": -0.35, "beta_zy": -0.33, "coloc_pp_h3": 0.03, "coloc_pp_h4": 0.94, "exposure_trait": "LDL cholesterol (mmol/L)", "instrument_id": "PCSK9_rs11591147_R46L", "outcome_trait": "coronary heart disease log-odds", "pleiotropy_flag": "none_detected", "se_zx": 0.03, "se_zy": 0.09, "target_symbol": "PCSK9", "variant": "rs11591147 (c.137G>T, p.Arg46Leu)", "variant_type": "cis_coding_loss_of_function"}, {"beta_zx": 0.25, "beta_zy": 0.1, "coloc_pp_h3": 0.81, "coloc_pp_h4": 0.12, "exposure_trait": "whole-blood mRNA expression (SD)", "instrument_id": "confounded_ld_eqtl_locus", "outcome_trait": "coronary heart disease log-odds", "pleiotropy_flag": "distinct_causal_variants_pp_h3_dominant", "se_zx": 0.04, "se_zy": 0.03, "target_symbol": "CANDIDATE_GENE_X", "variant": "rs_ld_proxy_noncoding", "variant_type": "noncoding_eqtl_in_ld_with_neighbour"}]}, "schema_version": "aidd-commons.track06-target-evidence-snapshot.v1", "source_api": "https://api.platform.opentargets.org/api/v4/graphql", "targets": {"BRAF": {"approved_name": "B-Raf proto-oncogene, serine/threonine kinase", "approved_symbol": "BRAF", "depmap_essential_line_count_lt_minus_1": 61, "depmap_median_gene_effect": -0.0908, "depmap_min_gene_effect": -2.6355, "depmap_screen_count": 1258, "ensembl_id": "ENSG00000157764", "positive_tractability": [{"label": "Approved Drug", "modality": "SM"}, {"label": "Structure with Ligand", "modality": "SM"}, {"label": "High-Quality Ligand", "modality": "SM"}, {"label": "High-Quality Pocket", "modality": "SM"}, {"label": "Druggable Family", "modality": "SM"}, {"label": "UniProt loc high conf", "modality": "AB"}, {"label": "GO CC high conf", "modality": "AB"}, {"label": "Human Protein Atlas loc", "modality": "AB"}, {"label": "Literature", "modality": "PR"}, {"label": "UniProt Ubiquitination", "modality": "PR"}, {"label": "Database Ubiquitination", "modality": "PR"}, {"label": "Half-life Data", "modality": "PR"}, {"label": "Small Molecule Binder", "modality": "PR"}], "record_tag": "331864bdb525", "retrieved_bytes": 169858, "safety_events": ["heart disease"], "safety_liability_count": 1, "top_diseases": [{"datatype_scores": {"affected_pathway": 0.8275, "animal_model": 0.452, "genetic_association": 0.9442, "genetic_literature": 0.856, "literature": 0.5315, "somatic_mutation": 0.0}, "disease_id": "MONDO_0015280", "disease_name": "cardiofaciocutaneous syndrome", "overall_score": 0.877}, {"datatype_scores": {"affected_pathway": 0.9191, "animal_model": 0.4383, "genetic_association": 0.8767, "genetic_literature": 0.823, "literature": 0.1247}, "disease_id": "MONDO_0018997", "disease_name": "Noonan syndrome", "overall_score": 0.8381}, {"datatype_scores": {"affected_pathway": 0.4344, "clinical": 0.9778, "genetic_association": 0.6991, "literature": 0.9984, "somatic_mutation": 0.7964}, "disease_id": "MONDO_0005105", "disease_name": "melanoma", "overall_score": 0.8195}]}, "EGFR": {"approved_name": "epidermal growth factor receptor", "approved_symbol": "EGFR", "depmap_essential_line_count_lt_minus_1": 57, "depmap_median_gene_effect": -0.1308, "depmap_min_gene_effect": -2.7841, "depmap_screen_count": 1258, "ensembl_id": "ENSG00000146648", "positive_tractability": [{"label": "Approved Drug", "modality": "SM"}, {"label": "Structure with Ligand", "modality": "SM"}, {"label": "High-Quality Ligand", "modality": "SM"}, {"label": "High-Quality Pocket", "modality": "SM"}, {"label": "Druggable Family", "modality": "SM"}, {"label": "Approved Drug", "modality": "AB"}, {"label": "UniProt loc high conf", "modality": "AB"}, {"label": "GO CC high conf", "modality": "AB"}, {"label": "UniProt loc med conf", "modality": "AB"}, {"label": "UniProt SigP or TMHMM", "modality": "AB"}, {"label": "Human Protein Atlas loc", "modality": "AB"}, {"label": "Literature", "modality": "PR"}, {"label": "UniProt Ubiquitination", "modality": "PR"}, {"label": "Database Ubiquitination", "modality": "PR"}, {"label": "Half-life Data", "modality": "PR"}, {"label": "Small Molecule Binder", "modality": "PR"}, {"label": "Advanced Clinical", "modality": "OC"}], "record_tag": "f3887a2fad4b", "retrieved_bytes": 170635, "safety_events": ["ALT increase", "AST increase", "Diarrhea", "Hepatotoxicity", "Skin rash", "alopecia", "cardiomyopathy", "conjunctival hemorrhage", "decreased appetite", "diarrhea", "diarrhoea", "drug toxicity", "epithelial inflammation", "heart disease", "hypertension", "interstitial lung disease", "ocular keratitis", "rash", "regulation of catalytic activity", "weight loss"], "safety_liability_count": 21, "top_diseases": [{"datatype_scores": {"affected_pathway": 0.821, "clinical": 0.9959, "genetic_association": 0.6991, "genetic_literature": 0.6079, "literature": 0.9997, "somatic_mutation": 0.8316}, "disease_id": "MONDO_0005233", "disease_name": "non-small cell lung carcinoma", "overall_score": 0.8503}, {"datatype_scores": {"affected_pathway": 0.8275, "clinical": 0.6619, "genetic_association": 0.7194, "literature": 0.9974, "somatic_mutation": 0.8671}, "disease_id": "MONDO_0005061", "disease_name": "lung adenocarcinoma", "overall_score": 0.7745}, {"datatype_scores": {"affected_pathway": 0.992, "clinical": 0.7924, "literature": 0.9941}, "disease_id": "MONDO_0004992", "disease_name": "cancer", "overall_score": 0.7369}]}, "ERBB2": {"approved_name": "erb-b2 receptor tyrosine kinase 2", "approved_symbol": "ERBB2", "depmap_essential_line_count_lt_minus_1": 47, "depmap_median_gene_effect": -0.2756, "depmap_min_gene_effect": -3.4743, "depmap_screen_count": 1258, "ensembl_id": "ENSG00000141736", "positive_tractability": [{"label": "Approved Drug", "modality": "SM"}, {"label": "Structure with Ligand", "modality": "SM"}, {"label": "High-Quality Ligand", "modality": "SM"}, {"label": "High-Quality Pocket", "modality": "SM"}, {"label": "Druggable Family", "modality": "SM"}, {"label": "Approved Drug", "modality": "AB"}, {"label": "UniProt loc high conf", "modality": "AB"}, {"label": "GO CC high conf", "modality": "AB"}, {"label": "UniProt SigP or TMHMM", "modality": "AB"}, {"label": "Human Protein Atlas loc", "modality": "AB"}, {"label": "Literature", "modality": "PR"}, {"label": "Database Ubiquitination", "modality": "PR"}, {"label": "Half-life Data", "modality": "PR"}, {"label": "Small Molecule Binder", "modality": "PR"}, {"label": "Approved Drug", "modality": "OC"}], "record_tag": "535d582074fa", "retrieved_bytes": 169412, "safety_events": ["cardiotoxicity", "heart disease", "more sensitive to trastuzamab"], "safety_liability_count": 3, "top_diseases": [{"datatype_scores": {"affected_pathway": 0.6079, "clinical": 0.9817, "literature": 0.9938, "somatic_mutation": 0.7147}, "disease_id": "MONDO_0005233", "disease_name": "non-small cell lung carcinoma", "overall_score": 0.7795}, {"datatype_scores": {"affected_pathway": 0.9654, "clinical": 0.8971, "literature": 0.9968}, "disease_id": "MONDO_0004992", "disease_name": "cancer", "overall_score": 0.7753}, {"datatype_scores": {"clinical": 0.9273, "genetic_association": 0.5493, "genetic_literature": 0.6079, "literature": 0.9976, "somatic_mutation": 0.5471}, "disease_id": "MONDO_0001056", "disease_name": "gastric cancer", "overall_score": 0.729}]}, "PCSK9": {"approved_name": "proprotein convertase subtilisin/kexin type 9", "approved_symbol": "PCSK9", "depmap_essential_line_count_lt_minus_1": 0, "depmap_median_gene_effect": -0.2279, "depmap_min_gene_effect": -0.9723, "depmap_screen_count": 1257, "ensembl_id": "ENSG00000169174", "positive_tractability": [{"label": "Structure with Ligand", "modality": "SM"}, {"label": "High-Quality Ligand", "modality": "SM"}, {"label": "High-Quality Pocket", "modality": "SM"}, {"label": "Approved Drug", "modality": "AB"}, {"label": "GO CC high conf", "modality": "AB"}, {"label": "UniProt loc med conf", "modality": "AB"}, {"label": "UniProt SigP or TMHMM", "modality": "AB"}, {"label": "Database Ubiquitination", "modality": "PR"}, {"label": "Small Molecule Binder", "modality": "PR"}, {"label": "Advanced Clinical", "modality": "OC"}], "record_tag": "fb5c7deb49b8", "retrieved_bytes": 169432, "safety_events": [], "safety_liability_count": 0, "top_diseases": [{"datatype_scores": {"animal_model": 0.5097, "clinical": 0.972, "genetic_association": 0.8659, "genetic_literature": 0.8644, "literature": 0.7754}, "disease_id": "MONDO_0005439", "disease_name": "familial hypercholesterolemia", "overall_score": 0.8557}, {"datatype_scores": {"clinical": 0.9704, "genetic_association": 0.9535, "genetic_literature": 0.6079, "literature": 0.8585}, "disease_id": "HP_0003124", "disease_name": "Hypercholesterolemia", "overall_score": 0.8257}, {"datatype_scores": {"animal_model": 0.5097, "genetic_association": 0.939, "genetic_literature": 0.8365, "literature": 0.0578, "somatic_mutation": 0.0304}, "disease_id": "MONDO_0011369", "disease_name": "hypercholesterolemia, autosomal dominant, 3", "overall_score": 0.8157}]}}}'


def load_target_evidence_snapshot() -> dict[str, Any]:
    """Load the committed Open Targets v4 + clinical/genetic target-evidence snapshot."""
    data = json.loads(SNAPSHOT_JSON)
    if not isinstance(data, dict):
        raise ValueError("target evidence snapshot must be a JSON object")
    return data


def audit_disease_state_definition(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Topic t06-disease-state-definition: 6-field disease state, subgroup reversal and temporal T790M shift."""
    data = snapshot or load_target_evidence_snapshot()
    subgroups = data["clinical_subgroup_records"]["subgroups"]
    required_fields = (
        "subgroup_id",
        "molecular_phenotype",
        "tissue",
        "cell_state",
        "patient_subgroup",
        "temporal_line",
    )
    field_complete = all(all(bool(sg.get(f)) for f in required_fields) for sg in subgroups)
    mut_1l = next(sg for sg in subgroups if sg["subgroup_id"] == "egfr_activating_mutant_1L")
    wt_1l = next(sg for sg in subgroups if sg["subgroup_id"] == "egfr_wild_type_1L")
    relapsed_2l = next(sg for sg in subgroups if sg["subgroup_id"] == "egfr_t790m_relapsed_2L")

    hr_ratio = round(wt_1l["pfs_hazard_ratio"] / mut_1l["pfs_hazard_ratio"], 2)
    orr_gap_mut = round(mut_1l["gefitinib_orr_pct"] - mut_1l["chemo_orr_pct"], 1)
    orr_gap_wt = round(wt_1l["gefitinib_orr_pct"] - wt_1l["chemo_orr_pct"], 1)

    egfr_ot = data["targets"]["EGFR"]["top_diseases"]
    braf_ot = data["targets"]["BRAF"]["top_diseases"]

    return {
        "six_fields_complete": field_complete,
        "subgroup_count": len(subgroups),
        "mutant_1l_hr": mut_1l["pfs_hazard_ratio"],
        "wild_type_1l_hr": wt_1l["pfs_hazard_ratio"],
        "hr_reversal_ratio_wt_over_mut": hr_ratio,
        "mutant_1l_orr_advantage_pct": orr_gap_mut,
        "wild_type_1l_orr_advantage_pct": orr_gap_wt,
        "direction_reverses_when_subgroup_omitted": (
            mut_1l["pfs_hazard_ratio"] < 1.0 and wt_1l["pfs_hazard_ratio"] > 1.0
        ),
        "temporal_resistance_subgroup": relapsed_2l["subgroup_id"],
        "egfr_open_targets_diseases": [
            {
                "disease_id": d["disease_id"],
                "disease_name": d["disease_name"],
                "overall_score": d["overall_score"],
                "somatic_mutation": d["datatype_scores"].get("somatic_mutation", 0.0),
                "genetic_association": d["datatype_scores"].get("genetic_association", 0.0),
            }
            for d in egfr_ot[:2]
        ],
        "braf_germline_vs_somatic_diseases": [
            {
                "disease_id": d["disease_id"],
                "disease_name": d["disease_name"],
                "overall_score": d["overall_score"],
                "genetic_association": d["datatype_scores"].get("genetic_association", 0.0),
                "somatic_mutation": d["datatype_scores"].get("somatic_mutation", 0.0),
            }
            for d in braf_ot
        ],
    }


def audit_causal_target_evidence(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Topic t06-causal-target-evidence: Wald ratio MR, delta-method SE, colocalization and germline vs somatic split."""
    data = snapshot or load_target_evidence_snapshot()
    instruments = data["mendelian_randomization_records"]["instruments"]
    mr_results: list[dict[str, Any]] = []

    for inst in instruments:
        bx = float(inst["beta_zx"])
        sex = float(inst["se_zx"])
        by = float(inst["beta_zy"])
        sey = float(inst["se_zy"])
        wald_ratio = by / bx
        # First-order delta-method SE for ratio estimator: sqrt((se_zy / beta_zx)^2 + (beta_zy * se_zx / beta_zx^2)^2)
        wald_se = math.sqrt((sey / bx) ** 2 + ((by * sex) / (bx**2)) ** 2)
        f_stat = (bx / sex) ** 2
        coloc_supports_shared_variant = float(inst["coloc_pp_h4"]) >= 0.80 and float(
            inst["coloc_pp_h4"]
        ) > float(inst["coloc_pp_h3"])
        mr_results.append(
            {
                "instrument_id": inst["instrument_id"],
                "target_symbol": inst["target_symbol"],
                "wald_ratio": round(wald_ratio, 4),
                "wald_se": round(wald_se, 4),
                "instrument_f_statistic": round(f_stat, 2),
                "coloc_pp_h4": float(inst["coloc_pp_h4"]),
                "coloc_pp_h3": float(inst["coloc_pp_h3"]),
                "coloc_supports_shared_causal_variant": coloc_supports_shared_variant,
                "causal_verdict": (
                    "supported_cis_coding_instrument"
                    if coloc_supports_shared_variant
                    and f_stat >= 10.0
                    and inst["pleiotropy_flag"] == "none_detected"
                    else "rejected_ld_confounding_or_pleiotropy"
                ),
            }
        )

    # Compare Open Targets genetic_association vs somatic_mutation across PCSK9, EGFR and BRAF
    pcsk9_fh = data["targets"]["PCSK9"]["top_diseases"][0]
    braf_cfc = data["targets"]["BRAF"]["top_diseases"][0]
    braf_mel = data["targets"]["BRAF"]["top_diseases"][2]

    return {
        "mr_instruments": mr_results,
        "pcsk9_germline_fh_genetic_score": pcsk9_fh["datatype_scores"].get(
            "genetic_association", 0.0
        ),
        "braf_cfc_germline_genetic_score": braf_cfc["datatype_scores"].get(
            "genetic_association", 0.0
        ),
        "braf_cfc_somatic_score": braf_cfc["datatype_scores"].get("somatic_mutation", 0.0),
        "braf_melanoma_somatic_score": braf_mel["datatype_scores"].get("somatic_mutation", 0.0),
    }


def audit_tractability_and_risk(snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Topic t06-tractability-target-risk: modality buckets, DepMap essentiality, safety liabilities and paralog risk."""
    data = snapshot or load_target_evidence_snapshot()
    targets = data["targets"]
    rows: list[dict[str, Any]] = []

    for symbol in ("EGFR", "ERBB2", "PCSK9", "BRAF"):
        t = targets[symbol]
        mods: dict[str, list[str]] = {"SM": [], "AB": [], "PR": [], "OC": []}
        for item in t["positive_tractability"]:
            mods.setdefault(item["modality"], []).append(item["label"])
        rows.append(
            {
                "symbol": symbol,
                "ensembl_id": t["ensembl_id"],
                "sm_pocket_or_ligand": (
                    "High-Quality Pocket" in mods["SM"] or "Structure with Ligand" in mods["SM"]
                ),
                "sm_approved_drug": "Approved Drug" in mods["SM"],
                "ab_approved_drug": "Approved Drug" in mods["AB"],
                "oc_clinical_or_approved": bool(mods["OC"]),
                "pr_binder_or_literature": bool(mods["PR"]),
                "safety_liability_count": t["safety_liability_count"],
                "safety_events": t["safety_events"][:4],
                "depmap_screen_count": t["depmap_screen_count"],
                "depmap_essential_line_count_lt_minus_1": t[
                    "depmap_essential_line_count_lt_minus_1"
                ],
                "depmap_essential_fraction": round(
                    t["depmap_essential_line_count_lt_minus_1"] / t["depmap_screen_count"], 4
                ),
                "depmap_min_gene_effect": t["depmap_min_gene_effect"],
                "depmap_median_gene_effect": t["depmap_median_gene_effect"],
            }
        )

    by_sym = {r["symbol"]: r for r in rows}
    return {
        "target_profiles": rows,
        "pcsk9_pocket_without_sm_approval": (
            by_sym["PCSK9"]["sm_pocket_or_ligand"] and not by_sym["PCSK9"]["sm_approved_drug"]
        ),
        "pcsk9_ab_and_oc_validated": (
            by_sym["PCSK9"]["ab_approved_drug"] and by_sym["PCSK9"]["oc_clinical_or_approved"]
        ),
        "egfr_erbb2_paralog_safety_divergence": {
            "egfr_safety_count": by_sym["EGFR"]["safety_liability_count"],
            "egfr_key_liabilities": by_sym["EGFR"]["safety_events"],
            "erbb2_safety_count": by_sym["ERBB2"]["safety_liability_count"],
            "erbb2_key_liabilities": by_sym["ERBB2"]["safety_events"],
        },
    }


def check_target_evidence(snapshot: dict[str, Any] | None = None) -> list[str]:
    """Verify all Track 6 disease-state, causal-genetics and tractability/risk invariants."""
    data = snapshot or load_target_evidence_snapshot()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    ds = audit_disease_state_definition(data)
    require(
        ds["six_fields_complete"] and ds["subgroup_count"] == 3,
        "all three EGFR clinical subgroups must specify all six disease-state fields",
    )
    require(
        ds["direction_reverses_when_subgroup_omitted"]
        and ds["hr_reversal_ratio_wt_over_mut"] == 5.94,
        "IPASS EGFR-mutant (HR=0.48) vs wild-type (HR=2.85) subgroups must reverse treatment benefit (ratio 5.94x)",
    )

    causal = audit_causal_target_evidence(data)
    inst_by_id = {r["instrument_id"]: r for r in causal["mr_instruments"]}
    require(
        inst_by_id["PCSK9_rs11591147_R46L"]["wald_ratio"] == 0.9429
        and inst_by_id["PCSK9_rs11591147_R46L"]["wald_se"] == 0.2695
        and inst_by_id["PCSK9_rs11591147_R46L"]["causal_verdict"]
        == "supported_cis_coding_instrument",
        "PCSK9 R46L cis-coding instrument must yield Wald ratio 0.9429 (SE 0.2695) with PP.H4=0.94",
    )
    require(
        inst_by_id["confounded_ld_eqtl_locus"]["causal_verdict"]
        == "rejected_ld_confounding_or_pleiotropy"
        and inst_by_id["confounded_ld_eqtl_locus"]["coloc_pp_h3"] == 0.81,
        "LD-confounded noncoding eQTL instrument with PP.H3=0.81 > PP.H4=0.12 must be rejected",
    )
    require(
        causal["braf_cfc_germline_genetic_score"] == 0.9442
        and causal["braf_cfc_somatic_score"] == 0.0
        and causal["braf_melanoma_somatic_score"] == 0.7964,
        "Open Targets BRAF records must separate germline developmental syndrome (genetic=0.9442, somatic=0.0) from adult somatic melanoma (somatic=0.7964)",
    )

    tract = audit_tractability_and_risk(data)
    require(
        tract["pcsk9_pocket_without_sm_approval"] and tract["pcsk9_ab_and_oc_validated"],
        "Open Targets PCSK9 record must show SM pocket presence without SM drug approval alongside validated AB/OC modalities",
    )
    by_sym = {r["symbol"]: r for r in tract["target_profiles"]}
    require(
        by_sym["EGFR"]["safety_liability_count"] == 21
        and by_sym["ERBB2"]["safety_liability_count"] == 3
        and by_sym["PCSK9"]["safety_liability_count"] == 0
        and by_sym["PCSK9"]["depmap_essential_line_count_lt_minus_1"] == 0
        and by_sym["EGFR"]["depmap_essential_line_count_lt_minus_1"] == 57,
        "Open Targets safety and DepMap essentiality counts must match EGFR (21 safety, 57/1258 essential), ERBB2 (3 safety, 47/1258 essential) and PCSK9 (0 safety, 0/1257 essential)",
    )

    return failures
