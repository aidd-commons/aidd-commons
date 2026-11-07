# ruff: noqa: E501
"""Biologic developability by modality and 6-stage functional validation progression on public records.

Covers Track 13 topics:
- t13-expression-developability-manufacturability: expression host, glycosylation, stability,
  self-association/aggregation, immunogenicity/polyreactivity, delivery, formulation and
  manufacturing constraints across six modalities (monoclonal antibody, Fc-fusion dimer,
  enzyme replacement glycoprotein, peptide analog, domain-deletion enzyme, and nucleic-acid /
  antibody-drug conjugate).
- t13-functional-validation: progression from computational sequence/structure plausibility
  to expression/monomeric integrity, biophysical binding (SPR/ITC Kd), paralog/off-target
  specificity, target-positive vs target-negative cellular function, and in vivo / clinical
  pharmacodynamic relevance.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .analysis import load_snapshot
from .protocol import load_protocol

ROOT = Path(__file__).resolve().parents[4]
CONSTRUCT_LAB = ROOT / "labs/biologic_construct_audit"
OBJECTIVE_SUMMARY_PATH = ROOT / "labs/objective_ladder/summary.json"
FUNC_VAL_SUMMARY_PATH = ROOT / "labs/functional_validation_audit/summary.json"

DEVELOPABILITY_MODALITIES: tuple[dict[str, Any], ...] = (
    {
        "entity_id": "adalimumab",
        "modality": "monoclonal_antibody_igg1",
        "source_ids": ["dailymed:a06a9aec-fd5b-4c3e-a81f-eb46bb384100", "PMID:28096333"],
        "construct_summary": "1330-aa human IgG1:k mAb (~148 kDa) from phage display",
        "expression_host": "CHO mammalian cell expression system",
        "glycosylation_and_ptm": "Fc N-linked glycosylation required for FcRn recycling and complement C1q engagement",
        "stability_and_aggregation": "Subcutaneous high-concentration (>50 mg/mL) formulation requires monomer fraction >=95% by SEC and low self-interaction (AC-SINS / HIC)",
        "immunogenicity_and_specificity": "Human-derived VH/VL regions; binds TNF-alpha but not lymphotoxin (TNF-beta); anti-drug antibodies still monitored clinically",
        "delivery_and_compartment": "Subcutaneous injection; extracellular interstitial and synovial fluid distribution; excluded from intracellular targets",
        "manufacturing_and_cmc": "Mammalian cell culture plus dedicated viral inactivation and viral removal purification steps",
        "primary_developability_gate": "SEC monomer >= 0.95, low HIC retention and viral clearance verification",
    },
    {
        "entity_id": "etanercept",
        "modality": "dimeric_fc_fusion_protein",
        "source_ids": ["uniprot:P20333", "dailymed:a002b40c-097d-47a5-957f-7a7b1807af7f"],
        "construct_summary": "934-aa homodimeric p75 TNFR ectodomain linked to human IgG1 Fc (CH2-CH3-hinge, no CH1; ~150 kDa)",
        "expression_host": "CHO mammalian cell expression system",
        "glycosylation_and_ptm": "Heavily O- and N-glycosylated ectodomain-Fc fusion (~150 kDa apparent MW)",
        "stability_and_aggregation": "Hinge-linked receptor ectodomain requires disulphide pairing control and isoform consistency across batches",
        "immunogenicity_and_specificity": "Binds both TNF-alpha and TNF-beta (LT-alpha); fusion junction and glycoforms define non-native epitope risk",
        "delivery_and_compartment": "Subcutaneous administration; soluble extracellular decoy receptor in plasma and synovium",
        "manufacturing_and_cmc": "CHO expression with sialylation/glycoform release specifications Controlling clearance rate",
        "primary_developability_gate": "Intact dimeric assembly without large cross-linked TNF complexes",
    },
    {
        "entity_id": "agalsidase-beta",
        "modality": "enzyme_replacement_glycoprotein",
        "source_ids": ["uniprot:P06280", "dailymed:988513ab-b06f-4dd0-93f7-d2d4531dcce4"],
        "construct_summary": "Homodimeric recombinant human alpha-galactosidase A (2 x 398 aa, ~100 kDa)",
        "expression_host": "CHO mammalian cell line (contrasted in UniProt P06280 with human-cell-line agalsidase alpha)",
        "glycosylation_and_ptm": "3 N-linked glycosylation sites per subunit; mannose-6-phosphate (M6P) content differs by production host",
        "stability_and_aggregation": "Must remain soluble and folded in neutral plasma pH (7.4) before activation in acidic lysosomes (pH ~4.5)",
        "immunogenicity_and_specificity": "IgG anti-drug antibodies frequently develop in classic Fabry patients lacking endogenous enzyme",
        "delivery_and_compartment": "Intravenous infusion -> M6P receptor-mediated endocytosis -> lysosomal compartment to cleave accumulated GL-3",
        "manufacturing_and_cmc": "Specific enzymatic activity release gate (~70 U/mg hydrolyzing p-nitrophenyl-alpha-D-galactopyranoside) plus sialic acid/M6P profiling",
        "primary_developability_gate": "Specific activity ~70 U/mg AND host-dependent M6P glycosylation for lysosomal uptake",
    },
    {
        "entity_id": "insulin-lispro",
        "modality": "engineered_peptide_hormone_analog",
        "source_ids": ["uniprot:P01308"],
        "construct_summary": "Two-chain peptide hormone with B-chain C-terminal inversion 52-Lys-Pro-53 instead of native 52-Pro-Lys-53",
        "expression_host": "Recombinant microbial expression with enzymatic proinsulin cleavage",
        "glycosylation_and_ptm": "Non-glycosylated; 2 inter-chain and 1 intra-chain disulphide bonds required for fold",
        "stability_and_aggregation": "Native human insulin self-associates into dimers and Zn2+-coordinated hexamers that slow subcutaneous absorption; 52-Lys-Pro-53 destabilizes the dimer interface so hexamers dissociate rapidly into monomers",
        "immunogenicity_and_specificity": "Single dipeptide inversion preserves insulin-receptor binding while minimizing IGF-1R cross-reactivity",
        "delivery_and_compartment": "Subcutaneous bolus injection; rapid capillary absorption of monomeric peptide",
        "manufacturing_and_cmc": "Control of amyloid fibrillation under agitation/thermal stress and phenolic preservative compatibility",
        "primary_developability_gate": "Hexamer-to-monomer dissociation kinetics and fibrillation resistance",
    },
    {
        "entity_id": "reteplase",
        "modality": "domain_truncated_protease_biologic",
        "source_ids": ["uniprot:P00750"],
        "construct_summary": "Truncated tissue-type plasminogen activator fragment (kringle 2 + serine protease domain, BM 06.022)",
        "expression_host": "Escherichia coli inclusion bodies (non-glycosylated) followed by in vitro oxidative refolding",
        "glycosylation_and_ptm": "Unglycosylated due to prokaryotic host and deletion of finger, EGF and kringle-1 domains",
        "stability_and_aggregation": "Refolding yield from insoluble inclusion bodies and prevention of autoproteolytic degradation",
        "immunogenicity_and_specificity": "Fibrin-selective plasminogen activation with reduced hepatic clearance receptor binding",
        "delivery_and_compartment": "Intravenous double-bolus administration in acute myocardial infarction (intravascular compartment)",
        "manufacturing_and_cmc": "Disulphide refolding verification and amidstolytic/clot-lysis potency specification",
        "primary_developability_gate": "Refolded active monomer fraction and absence of high-molecular-weight aggregates",
    },
    {
        "entity_id": "conjugate-and-oligonucleotide-panel",
        "modality": "sirna_lnp_and_adc_conjugates",
        "source_ids": ["PMID:29988049", "PMID:31825569", "uniprot:P04626"],
        "construct_summary": "Chemically modified siRNA in ionizable lipid nanoparticle (LNP) and HER2 IgG1 antibody-drug conjugate (DAR ~8)",
        "expression_host": "Chemical solid-phase oligonucleotide synthesis + microfluidic LNP assembly; CHO mAb + enzymatic/interchain-thiol payload bioconjugation",
        "glycosylation_and_ptm": "2'-O-methyl / 2'-fluoro / phosphorothioate backbone modifications (siRNA); interchain cysteine linker-payload conjugation (ADC)",
        "stability_and_aggregation": "High drug-to-antibody ratio (DAR 4-8) increases hydrophobicity (HIC shift) and aggregation propensity; LNP requires particle size (~50-100 nm) and polydispersity (PDI < 0.2) control",
        "immunogenicity_and_specificity": "Innate immune toll-like receptor (TLR3/7/8) activation risk for unmodified RNA; premature plasma linker cleavage causes off-target systemic payload toxicity",
        "delivery_and_compartment": "Two-step bottleneck: tissue biodistribution (hepatic ApoE-LNP uptake or tumour HER2 binding) followed by endosomal escape (~1-2% for LNP siRNA) or lysosomal protease linker cleavage",
        "manufacturing_and_cmc": "DAR distribution, unconjugated payload fraction (<1%), encapsulation efficiency (>90%), and sterile filtration",
        "primary_developability_gate": "Cytosolic/lysosomal productive delivery fraction = uptake x escape/cleavage >= target threshold",
    },
)


def compute_delivery_and_developability_panel() -> list[dict[str, Any]]:
    """Deterministic multi-field developability & delivery evaluation across 6 candidate constructs."""
    # Combines biophysical developability metrics (SEC monomer, HIC retention, T_m, self-interaction)
    # with compartment delivery fractions (uptake x endosomal_escape_or_cleavage).
    candidates = [
        {
            "candidate_id": "MAB-101 (well-behaved IgG1)",
            "modality": "monoclonal_antibody_igg1",
            "sec_monomer_fraction": 0.972,
            "hic_retention_min": 9.1,
            "fab_tm_celsius": 74.5,
            "polyreactivity_psr_score": 0.14,
            "target_pos_delta_func": 42.0,
            "target_neg_delta_func": 6.0,
            "compartment_delivery_fraction": 1.0,  # extracellular target
        },
        {
            "candidate_id": "MAB-102 (aggregation-prone IgG1)",
            "modality": "monoclonal_antibody_igg1",
            "sec_monomer_fraction": 0.785,
            "hic_retention_min": 13.8,
            "fab_tm_celsius": 61.0,
            "polyreactivity_psr_score": 0.18,
            "target_pos_delta_func": 46.0,
            "target_neg_delta_func": 7.0,
            "compartment_delivery_fraction": 1.0,
        },
        {
            "candidate_id": "MAB-103 (polyreactive off-target IgG1)",
            "modality": "monoclonal_antibody_igg1",
            "sec_monomer_fraction": 0.961,
            "hic_retention_min": 9.6,
            "fab_tm_celsius": 72.0,
            "polyreactivity_psr_score": 0.49,
            "target_pos_delta_func": 39.0,
            "target_neg_delta_func": 18.5,
            "compartment_delivery_fraction": 1.0,
        },
        {
            "candidate_id": "ERT-201 (CHO M6P-high enzyme)",
            "modality": "enzyme_replacement_glycoprotein",
            "sec_monomer_fraction": 0.958,
            "hic_retention_min": 8.9,
            "fab_tm_celsius": 68.2,
            "polyreactivity_psr_score": 0.11,
            "target_pos_delta_func": 70.0,
            "target_neg_delta_func": 4.0,
            "cellular_uptake_fraction": 0.42,
            "lysosomal_trafficking_fraction": 0.65,
            "compartment_delivery_fraction": round(0.42 * 0.65, 4),  # 0.2730
        },
        {
            "candidate_id": "SIRNA-301 (naked unformulated siRNA)",
            "modality": "sirna_lnp_and_adc_conjugates",
            "sec_monomer_fraction": 0.990,
            "hic_retention_min": 6.5,
            "fab_tm_celsius": 78.0,
            "polyreactivity_psr_score": 0.08,
            "target_pos_delta_func": 55.0,
            "target_neg_delta_func": 5.0,
            "cellular_uptake_fraction": 0.08,
            "endosomal_escape_fraction": 0.005,
            "compartment_delivery_fraction": round(0.08 * 0.005, 5),  # 0.00040
        },
        {
            "candidate_id": "SIRNA-302 (ionizable LNP siRNA)",
            "modality": "sirna_lnp_and_adc_conjugates",
            "sec_monomer_fraction": 0.965,
            "hic_retention_min": 8.4,
            "fab_tm_celsius": 71.0,
            "polyreactivity_psr_score": 0.16,
            "target_pos_delta_func": 58.0,
            "target_neg_delta_func": 6.5,
            "cellular_uptake_fraction": 0.85,
            "endosomal_escape_fraction": 0.024,
            "compartment_delivery_fraction": round(0.85 * 0.024, 4),  # 0.0204
        },
    ]

    # Gates:
    # 1. physical_gate: sec_monomer_fraction >= 0.95 and hic_retention_min <= 11.5 and fab_tm_celsius >= 65.0
    # 2. specificity_gate: polyreactivity_psr_score <= 0.27 and target_neg_delta_func <= 10.0
    # 3. function_gate: target_pos_delta_func >= 30.0
    # 4. delivery_gate: compartment_delivery_fraction >= 0.015 (for intracellular/lysosomal payloads)
    evaluated: list[dict[str, Any]] = []
    for row in candidates:
        phys_ok = (
            row["sec_monomer_fraction"] >= 0.95
            and row["hic_retention_min"] <= 11.5
            and row["fab_tm_celsius"] >= 65.0
        )
        spec_ok = row["polyreactivity_psr_score"] <= 0.27 and row["target_neg_delta_func"] <= 10.0
        func_ok = row["target_pos_delta_func"] >= 30.0
        deliv_ok = row["compartment_delivery_fraction"] >= 0.015
        failed_gates = [
            name
            for name, ok in (
                ("physical_developability", phys_ok),
                ("specificity_and_negative_control", spec_ok),
                ("target_positive_function", func_ok),
                ("compartment_delivery", deliv_ok),
            )
            if not ok
        ]
        evaluated.append(
            {
                **row,
                "passes_all_gates": not failed_gates,
                "failed_gates": failed_gates,
                "verdict": (
                    "conditional_advance_to_independent_batch"
                    if not failed_gates
                    else f"hold:{','.join(failed_gates)}"
                ),
            }
        )
    return evaluated


def audit_developability_by_modality() -> dict[str, Any]:
    """Combine committed UniProt/DailyMed construct records with modality-specific developability rules."""
    protocol = load_protocol(CONSTRUCT_LAB / "protocol.json")
    snapshot = load_snapshot(CONSTRUCT_LAB, protocol)
    records_by_key = {(r["source"], r["key"]): r for r in snapshot["records"]}

    # Verify exact developability-relevant statements in the committed snapshot
    p01308_text = " ".join(records_by_key[("uniprot", "P01308")]["pharmaceutical_text"])
    p06280_text = " ".join(records_by_key[("uniprot", "P06280")]["pharmaceutical_text"])
    p00750_text = " ".join(records_by_key[("uniprot", "P00750")]["pharmaceutical_text"])
    adalimumab_rec = records_by_key[("dailymed", "a06a9aec-fd5b-4c3e-a81f-eb46bb384100")]
    etanercept_rec = records_by_key[("dailymed", "a002b40c-097d-47a5-957f-7a7b1807af7f")]
    agalsidase_rec = records_by_key[("dailymed", "988513ab-b06f-4dd0-93f7-d2d4531dcce4")]

    adalimumab_desc = " ".join(adalimumab_rec["description"])
    adalimumab_mech = " ".join(adalimumab_rec["mechanism"])
    etanercept_desc = " ".join(etanercept_rec["description"])
    etanercept_mech = " ".join(etanercept_rec["mechanism"])
    agalsidase_desc = " ".join(agalsidase_rec["description"])
    agalsidase_mech = " ".join(agalsidase_rec["mechanism"])

    source_evidence_checks = {
        "insulin_lispro_52_lys_pro_53_monomer_inversion": "52-Lys-Pro-53 instead of 52-Pro-Lys-53"
        in p01308_text,
        "agalsidase_cho_vs_human_glycosylation_difference": (
            "glycosylation patterns" in p06280_text
            and "hamster CHO cell line" in p06280_text
            and "human cell lines" in p06280_text
        ),
        "agalsidase_three_n_linked_sites_and_70_u_per_mg": (
            "three N-linked glycosylation sites" in agalsidase_desc
            and "70 U/mg" in agalsidase_desc
            and "transported into lysosomes" in agalsidase_mech
        ),
        "adalimumab_cho_1330aa_viral_inactivation": (
            "1330 amino acids" in adalimumab_desc
            and "viral inactivation and removal steps" in adalimumab_desc
        ),
        "etanercept_934aa_ch1_deleted_fc_dimer": (
            "934 amino acids" in etanercept_desc and "not the C H 1 domain" in etanercept_desc
        ),
        "reteplase_kringle2_protease_fragment": "kringle 2 and the protease domain" in p00750_text,
        "tnf_specificity_and_complement_lysis_divergence": (
            "does not bind or inivate" not in adalimumab_mech
            and "does not bind or inactivate lymphotoxin (TNF-beta)" in adalimumab_mech
            and "lyses surface TNF expressing cells in vitro in the presence of complement"
            in adalimumab_mech
            and "inhibits binding of TNF-α and TNF-β" in etanercept_mech
            and "are not lysed in the presence or absence of complement" in etanercept_mech
        ),
        "adalimumab_psoriasis_pd_to_clinical_mechanism_unknown": (
            "The relationship between these pharmacodynamic activities and the mechanism(s) by which HUMIRA exerts its clinical effects is unknown"
            in adalimumab_mech
        ),
    }

    panel = compute_delivery_and_developability_panel()
    return {
        "modality_count": len(DEVELOPABILITY_MODALITIES),
        "modalities": list(DEVELOPABILITY_MODALITIES),
        "source_evidence_checks": source_evidence_checks,
        "candidate_panel": panel,
        "surviving_candidates": [r["candidate_id"] for r in panel if r["passes_all_gates"]],
    }


def audit_functional_validation_progression() -> dict[str, Any]:
    """Topic t13-functional-validation: 6-stage progression from sequence/structure to in vivo relevance."""
    obj_summary = json.loads(OBJECTIVE_SUMMARY_PATH.read_text(encoding="utf-8"))
    fv_summary = json.loads(FUNC_VAL_SUMMARY_PATH.read_text(encoding="utf-8"))
    dev = audit_developability_by_modality()

    obj_by_sym = {t["symbol"]: t for t in obj_summary["targets"]}
    egfr = obj_by_sym["EGFR"]
    erbb2 = obj_by_sym["ERBB2"]

    stages = [
        {
            "stage_number": 1,
            "stage_id": "computational_and_structural_plausibility",
            "question": "Does the sequence fold into a geometrically plausible structure matching the target alignment?",
            "public_evidence_record": (
                f"EGFR 1IVO ({egfr['outcomes'][0]['record']}; AF-P00533-F1 pLDDT 75.94; 7,903 entity atoms, 0 clashes) "
                f"& ERBB2 3MZW ({erbb2['outcomes'][0]['record']}; AF-P04626-F1 pLDDT 74.00; 4,387 entity atoms, 0 clashes)"
            ),
            "licensed_claim": "Structural model geometry and reference alignment over the crystallised ectodomain",
            "unlicensed_upgrade": "Does NOT establish soluble expression, binding affinity (Kd), or cellular receptor blockade",
        },
        {
            "stage_id": "soluble_expression_and_physical_developability",
            "stage_number": 2,
            "question": "Can the defined construct be expressed in its production host with intact assembly, glycosylation and monomeric behaviour?",
            "public_evidence_record": (
                "DailyMed CHO expression records: adalimumab (1,330 aa IgG1, 148 kDa, viral clearance), "
                "etanercept (934 aa p75-Fc dimer without CH1, 150 kDa), agalsidase beta (2x398 aa homodimer, 3 N-glycans/subunit)"
            ),
            "licensed_claim": "Defined construct identity, host glycosylation profile and physical batch manufacturability",
            "unlicensed_upgrade": "Does NOT establish high-affinity target engagement or absence of off-target polyreactivity",
        },
        {
            "stage_id": "biophysical_target_engagement",
            "stage_number": 3,
            "question": "Does the purified construct bind the intended target with a measured dissociation constant (Kd or Ki)?",
            "public_evidence_record": (
                f"SKEMPI 2.0 SPR records: EGFR complex 1YY9 (Kd_wt = 1.31e-09 M, Kd_mut = 1.38e-09 M) and "
                f"ERBB2 complex 1N8Z (Kd_wt = 1.31e-09 M, Kd_mut = 1.26e-09 M); ChEMBL 37/PubChem direct binding: "
                f"{fv_summary['licensed_claim_counts']['binding_point']} point + {fv_summary['licensed_claim_counts']['binding_bound']} bound records"
            ),
            "licensed_claim": "Direct biophysical target binding under the stated buffer, temperature and sensor surface",
            "unlicensed_upgrade": "Does NOT establish paralog selectivity or cellular pathway modulation",
        },
        {
            "stage_id": "specificity_and_negative_selection",
            "stage_number": 4,
            "question": "Does the construct discriminate the intended target from closely related paralogs and non-specific surfaces?",
            "public_evidence_record": (
                "DailyMed TNF superfamily contrast: adalimumab binds TNF-alpha and does NOT bind lymphotoxin (TNF-beta), "
                "whereas etanercept binds both TNF-alpha and TNF-beta (LT-alpha)"
            ),
            "licensed_claim": "Paralog selectivity across tested family members (TNF-alpha vs TNF-beta)",
            "unlicensed_upgrade": "Does NOT prove zero off-targets genome-wide or equivalent downstream cellular effector activity",
        },
        {
            "stage_id": "cellular_functional_contrast",
            "stage_number": 5,
            "question": "Does the construct alter the cellular endpoint in target-positive cells without perturbing target-negative controls?",
            "public_evidence_record": (
                f"DailyMed cellular effector divergence: adalimumab blocks p55/p75 TNFR AND lyses transmembrane-TNF cells "
                f"with complement in vitro, whereas etanercept blocks TNFR binding WITHOUT complement lysis; "
                f"agalsidase beta hydrolyzes substrate at 70 U/mg and reduces lysosomal GL-3; "
                f"PubChem BioAssay holds {fv_summary['licensed_claim_counts']['functional_response']} concentration-response curves"
            ),
            "licensed_claim": "Context-specific cellular receptor blockade, effector lysis or lysosomal substrate reduction in vitro",
            "unlicensed_upgrade": "Does NOT establish tissue biodistribution, in vivo pharmacodynamic durability or clinical efficacy",
        },
        {
            "stage_id": "in_vivo_pharmacodynamics_and_clinical_translation",
            "stage_number": 6,
            "question": "Does target engagement in the disease tissue produce a durable pharmacodynamic and clinical outcome in patients?",
            "public_evidence_record": (
                "DailyMed HUMIRA mechanism boundary (setid a06a9aec-fd5b-4c3e-a81f-eb46bb384100): reduces psoriasis epidermal "
                "thickness and inflammatory infiltration, yet explicitly states that the relationship between these PD activities "
                f"and clinical efficacy mechanism is unknown; ChEMBL/PubChem clinical outcome records = {fv_summary['licensed_claim_counts']['clinical_outcome']}"
            ),
            "licensed_claim": "Observed tissue pharmacodynamic marker shift and separated clinical-endpoint requirement",
            "unlicensed_upgrade": "In vitro neutralization or PD biomarker change alone is NOT proof of clinical mechanism of action",
        },
    ]

    return {
        "stage_count": len(stages),
        "stages": stages,
        "objective_ladder_summary": {
            "total_cells": obj_summary["counts"]["cells"],
            "filled_cells": obj_summary["counts"]["filled_cells"],
            "empty_cells": obj_summary["counts"]["empty_cells"],
            "binding_filled_targets": obj_summary["counts"]["filled_per_objective"]["binding"],
        },
        "functional_validation_summary": {
            "chembl_total": fv_summary["tables"]["chembl37"]["total_records"],
            "pubchem_total": fv_summary["tables"]["pubchem_bioassay"]["total_records"],
            "binding_point": fv_summary["licensed_claim_counts"]["binding_point"],
            "binding_bound": fv_summary["licensed_claim_counts"]["binding_bound"],
            "functional_response": fv_summary["licensed_claim_counts"]["functional_response"],
            "clinical_outcome": fv_summary["licensed_claim_counts"]["clinical_outcome"],
            "no_licensed_claim": fv_summary["records_licensing_no_claim"],
        },
        "developability_checks": dev["source_evidence_checks"],
    }


def check_developability_and_validation() -> list[str]:
    """Verify all deterministic invariants for Track 13 developability and functional validation."""
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    dev = audit_developability_by_modality()
    require(
        dev["modality_count"] == 6,
        "developability audit must cover all 6 biologic/conjugate modalities",
    )
    for name, passed in dev["source_evidence_checks"].items():
        require(passed, f"committed UniProt/DailyMed source evidence check failed: {name}")

    require(
        dev["surviving_candidates"]
        == [
            "MAB-101 (well-behaved IgG1)",
            "ERT-201 (CHO M6P-high enzyme)",
            "SIRNA-302 (ionizable LNP siRNA)",
        ],
        f"unexpected surviving candidates across developability/delivery gates: {dev['surviving_candidates']}",
    )

    prog = audit_functional_validation_progression()
    require(prog["stage_count"] == 6, "functional validation progression must contain all 6 stages")
    require(
        prog["objective_ladder_summary"]["filled_cells"] == 31
        and prog["objective_ladder_summary"]["empty_cells"] == 5
        and prog["objective_ladder_summary"]["binding_filled_targets"] == 3,
        "objective ladder counts must match 31/36 filled cells and 3/6 targets with SKEMPI binding records",
    )
    require(
        prog["functional_validation_summary"]["chembl_total"] == 1004
        and prog["functional_validation_summary"]["pubchem_total"] == 1257
        and prog["functional_validation_summary"]["binding_point"] == 22
        and prog["functional_validation_summary"]["functional_response"] == 1204
        and prog["functional_validation_summary"]["clinical_outcome"] == 0,
        "functional validation summary counts must match 1004 ChEMBL, 1257 PubChem, 22 binding_point, 1204 functional_response, 0 clinical_outcome",
    )

    return failures
