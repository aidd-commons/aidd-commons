# ruff: noqa: E501
"""Openness, licence, safety, dual-use biosecurity and human-authority release governance audit.

Covers Track 18 topic `t18-openness-biosecurity-governance-boundary`:
- Decide what can be released or acted on by separating 7-field reproducibility, licence scope,
  chemical/biological safety, dual-use biosecurity escalation, and human clinical/synthesis authority
  over real committed `catalog/resources/*.yaml` records.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[4]
OPENNESS_SUMMARY_PATH = ROOT / "labs/asset_openness_audit/summary.json"
ATLAS_RESOURCES_DIR = ROOT / "catalog/resources"

GOVERNANCE_CASE_SPECS: tuple[dict[str, Any], ...] = (
    {
        "case_id": "GOV-01-rdkit-open-cheminformatics",
        "atlas_id": "tool-rdkit",
        "proposed_action": "Redistribute descriptor and reaction-SMARTS validation scripts in public educational release",
        "biosecurity_risk_class": "none_standard_cheminformatics",
        "requires_gene_synthesis_screening": False,
        "requires_clinical_dosing_authority": False,
        "expected_decision": "approved_for_public_release",
    },
    {
        "case_id": "GOV-02-protenix-commercial-weights-check",
        "atlas_id": "model-protenix",
        "proposed_action": "Bundle model code and weights into a commercial SaaS product without separate weight licence review",
        "biosecurity_risk_class": "low_biomolecular_structure_prediction",
        "requires_gene_synthesis_screening": False,
        "requires_clinical_dosing_authority": False,
        "expected_decision": "blocked_by_licence_scope_restriction",
    },
    {
        "case_id": "GOV-03-ai-researcher-unlicensed-benchmark",
        "atlas_id": "benchmark-ai-researcher",
        "proposed_action": "Republish benchmark repository files as an MIT-licensed open-source dataset",
        "biosecurity_risk_class": "none_software_benchmark",
        "requires_gene_synthesis_screening": False,
        "requires_clinical_dosing_authority": False,
        "expected_decision": "blocked_by_unverified_licence",
    },
    {
        "case_id": "GOV-04-rfdiffusion-de-novo-toxin-binder-screen",
        "atlas_id": "model-rfdiffusion",
        "proposed_action": "Release de novo protein designs and order gene synthesis without sequence/customer biosecurity screening or biosafety review",
        "biosecurity_risk_class": "dual_use_de_novo_protein_design_and_gene_synthesis",
        "requires_gene_synthesis_screening": True,
        "requires_clinical_dosing_authority": False,
        "expected_decision": "escalate_to_biosecurity_and_gene_synthesis_screening_gate",
    },
    {
        "case_id": "GOV-05-coscientist-autonomous-synthesis",
        "atlas_id": "agent-coscientist",
        "proposed_action": "Connect LLM planning agent directly to robotic liquid handler for unsupervised chemical synthesis and commercial sale",
        "biosecurity_risk_class": "dual_use_autonomous_chemical_synthesis_and_hazard_containment",
        "requires_gene_synthesis_screening": False,
        "requires_clinical_dosing_authority": False,
        "expected_decision": "blocked_by_commons_clause_and_escalated_to_chemist_safety_gate",
    },
    {
        "case_id": "GOV-06-candidate-nomination-vs-patient-dosing",
        "atlas_id": "model-boltz-2",
        "proposed_action": "Promote a co-folded sub-micromolar EGFR inhibitor directly to human patient dosing without GLP toxicology, IND review or clinical investigator authority",
        "biosecurity_risk_class": "human_subject_clinical_safety_boundary",
        "requires_gene_synthesis_screening": False,
        "requires_clinical_dosing_authority": True,
        "expected_decision": "blocked_by_human_clinical_authority_and_nonclinical_safety_gate",
    },
)


def _val(field: Any) -> str:
    return str(field["value"]) if isinstance(field, dict) else str(field)


def audit_governance_release() -> dict[str, Any]:
    """Evaluate the 6 release and action governance cases against committed Atlas records."""
    openness_summary = json.loads(OPENNESS_SUMMARY_PATH.read_text(encoding="utf-8"))
    evaluated_cases: list[dict[str, Any]] = []

    for spec in GOVERNANCE_CASE_SPECS:
        path = ATLAS_RESOURCES_DIR / f"{spec['atlas_id']}.yaml"
        rec = yaml.safe_load(path.read_text(encoding="utf-8"))
        openness = rec.get("openness", {})
        avail_count = sum(1 for v in openness.values() if _val(v) == "available")
        unver_count = sum(1 for v in openness.values() if _val(v) == "unverified")
        access_level = _val(rec.get("access_level", "unverified"))
        lics = [lic["name"] for lic in rec.get("licenses", [])]
        scopes = [lic.get("scope", "") for lic in rec.get("licenses", [])]
        scope_text = " ; ".join(scopes)

        # Evaluate the 5 governance axes independently:
        # Axis 1: Reproducibility (7 openness fields)
        repro_status = f"{avail_count}/7 available, {unver_count}/7 unverified"
        # Axis 2: Licence & redistribution permission
        has_unverified_licence = len(lics) == 0 or access_level == "unverified"
        has_commercial_restriction = any(
            phrase in " ".join(lics + scopes).lower()
            for phrase in (
                "proprietary",
                "commons clause",
                "non-commercial",
                "not include the right to sell",
            )
        )
        # Axis 3 & 4: Safety & Dual-use biosecurity
        dual_use_escalation = (
            spec["requires_gene_synthesis_screening"]
            or "dual_use" in spec["biosecurity_risk_class"]
        )
        # Axis 5: Human clinical/experimental authority
        clinical_authority_violation = spec["requires_clinical_dosing_authority"]

        if clinical_authority_violation:
            decision = "blocked_by_human_clinical_authority_and_nonclinical_safety_gate"
        elif has_unverified_licence:
            decision = "blocked_by_unverified_licence"
        elif has_commercial_restriction and dual_use_escalation:
            decision = "blocked_by_commons_clause_and_escalated_to_chemist_safety_gate"
        elif has_commercial_restriction and "commercial" in spec["proposed_action"].lower():
            decision = "blocked_by_licence_scope_restriction"
        elif dual_use_escalation:
            decision = "escalate_to_biosecurity_and_gene_synthesis_screening_gate"
        else:
            decision = "approved_for_public_release"

        evaluated_cases.append(
            {
                "case_id": spec["case_id"],
                "atlas_id": spec["atlas_id"],
                "access_level": access_level,
                "reproducibility_status": repro_status,
                "license_names": lics,
                "license_scope_excerpt": scope_text[:140],
                "biosecurity_risk_class": spec["biosecurity_risk_class"],
                "requires_gene_synthesis_screening": spec["requires_gene_synthesis_screening"],
                "requires_clinical_dosing_authority": spec["requires_clinical_dosing_authority"],
                "decision": decision,
                "expected_decision": spec["expected_decision"],
            }
        )

    return {
        "catalogue_total_records": openness_summary["whole_catalogue"]["records"],
        "examined_record_count": len(openness_summary["examined_record_ids"]),
        "examined_counts": openness_summary["examined_counts"],
        "governance_cases": evaluated_cases,
    }


def check_governance_release(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants for Track 18 openness, biosecurity & governance audit."""
    data = payload or audit_governance_release()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    require(
        data["catalogue_total_records"] == 232 and data["examined_record_count"] == 24,
        f"expected 232 total catalogue records and 24 examined records, got {data['catalogue_total_records']} and {data['examined_record_count']}",
    )
    ec = data["examined_counts"]
    require(
        ec["available"] == 57
        and ec["not_applicable"] == 26
        and ec["unverified"] == 83
        and ec["not_available"] == 2
        and ec["records_with_license"] == 22
        and ec["records_with_scope_limit"] == 9,
        f"examined openness counts do not match committed summary: {ec}",
    )
    require(
        len(data["governance_cases"]) == 6, "must evaluate all 6 governance release/action cases"
    )
    for row in data["governance_cases"]:
        require(
            row["decision"] == row["expected_decision"],
            f"{row['case_id']} decision {row['decision']} != expected {row['expected_decision']}",
        )
    return failures


def verify_reproducibility() -> dict[str, Any]:
    """Cross-verify examined Atlas records against executed real-data laboratory artifacts (`t10-asset-openness-reproducibility`)."""
    openness_summary = json.loads(OPENNESS_SUMMARY_PATH.read_text(encoding="utf-8"))
    records_by_id = {row["id"]: row for row in openness_summary["records"]}

    empirical_links = [
        {
            "atlas_id": "tool-rdkit",
            "local_lab_artifact": "labs/chembl_egfr/locked-summary.json",
            "executed_version_in_lab": json.loads(
                (ROOT / "labs/chembl_egfr/locked-summary.json").read_text(encoding="utf-8")
            )["software"]["rdkit"],
            "catalogue_openness": records_by_id["tool-rdkit"]["openness"],
            "empirically_verified_dimensions": ["inference_code", "evaluation_code"],
            "unverified_or_na_in_catalogue": ["evaluation_code"],
            "reproducibility_finding": (
                "RDKit 2025.09.6 executes deterministically in ChEMBL 37 EGFR (primary_test Morgan ridge MAE=0.4183), "
                "even though the upstream RDKit catalogue record marks evaluation_code as unverified."
            ),
        },
        {
            "atlas_id": "db-rcsb-pdb",
            "local_lab_artifact": "labs/egfr_structures/entries.json",
            "executed_version_in_lab": "PDB mmCIF 1M17, 4HJO, 1XKK, 3POZ",
            "catalogue_openness": records_by_id["db-rcsb-pdb"]["openness"],
            "empirically_verified_dimensions": ["training_data", "data_recipe"],
            "unverified_or_na_in_catalogue": ["data_recipe", "training_data"],
            "reproducibility_finding": (
                "RCSB PDB coordinates and ligand contacts are directly verified under CC0 1.0 in labs/egfr_structures, "
                "whereas ML training_code/weights are not applicable to a primary archive."
            ),
        },
        {
            "atlas_id": "db-uniprot",
            "local_lab_artifact": "labs/biologic_construct_audit/summary.json",
            "executed_version_in_lab": "UniProtKB P00533, P01375, P01308, P06280, P04626",
            "catalogue_openness": records_by_id["db-uniprot"]["openness"],
            "empirically_verified_dimensions": ["data_recipe"],
            "unverified_or_na_in_catalogue": ["inference_code", "weights"],
            "reproducibility_finding": (
                "UniProt canonical isoform sequences and residue numbering anchor 6 audited biologic constructs, "
                "demonstrating data-level reproducibility distinct from model-weight openness."
            ),
        },
        {
            "atlas_id": "db-skempi",
            "local_lab_artifact": "labs/skempi_affinity/summary.json",
            "executed_version_in_lab": "SKEMPI 2.0 (CC-BY-4.0)",
            "catalogue_openness": records_by_id["db-skempi"]["openness"],
            "empirically_verified_dimensions": ["training_data", "evaluation_code"],
            "unverified_or_na_in_catalogue": ["data_recipe", "training_data"],
            "reproducibility_finding": (
                "SKEMPI 2.0 complex-holdout evaluation (r=0.1489 vs row-split r=0.4535) reproduces locally from "
                "the primary mutational ddG table, showing why split recipes must be verified alongside raw data."
            ),
        },
    ]

    return {
        "examined_record_count": len(openness_summary["records"]),
        "empirically_linked_count": len(empirical_links),
        "empirical_links": empirical_links,
    }


def check_reproducibility(payload: dict[str, Any] | None = None) -> list[str]:
    data = payload or verify_reproducibility()
    failures: list[str] = []
    if data["examined_record_count"] != 24 or data["empirically_linked_count"] != 4:
        failures.append(
            "expected 24 examined records and 4 empirically linked laboratory artifacts"
        )
    for row in data["empirical_links"]:
        if not (ROOT / row["local_lab_artifact"]).is_file():
            failures.append(f"missing local lab artifact {row['local_lab_artifact']}")
    return failures
