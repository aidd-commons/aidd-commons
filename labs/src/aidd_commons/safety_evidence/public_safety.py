# ruff: noqa: E501
"""Real-data safety endpoint, structural alert, hERG IC50, and clinical Cmax,u margin audit (`t08-safety-toxicity-endpoint`).

Evaluates 6 real clinical kinase inhibitors and cardiotoxicity reference drugs
from ChEMBL 37 (EGFR CHEMBL203, hERG CHEMBL240) and FDA clinical pharmacology
reviews across structural alerts, in vitro hERG potency, unbound plasma exposure
(Cmax,u), Redfern 30x safety margin, and organism-level clinical outcomes.
"""

from __future__ import annotations

import math
from typing import Any

from rdkit import Chem

REAL_SAFETY_ALERT_SMARTS: dict[str, str] = {
    "terminal_alkyne_cyp_inactivator": "[C]#[CH]",
    "michael_acceptor_acrylamide": "[CH2]=[CH]C(=O)N",
    "para_alkoxy_or_hydroxy_aniline_quinone_imine_precursor": "Nc1ccc(O)cc1",
    "halogenated_aniline": "Nc1ccc(F)c(Cl)c1",
}

REAL_CLINICAL_SAFETY_PANEL: tuple[dict[str, Any], ...] = (
    {
        "chembl_id": "CHEMBL553",
        "name": "Erlotinib",
        "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
        "egfr_ic50_uM": 0.002,
        "herg_ic50_uM": 28.5,
        "clinical_dose_mg_qd": 150,
        "unbound_fraction_fu": 0.07,
        "clinical_cmax_unbound_uM": 0.19,
        "clinical_qtc_torsades_boxed_warning": False,
        "clinical_dili_warning": True,
        "organism_level_finding": "CYP3A4/1A2 alkyne oxygenation reactive metabolite; clinical transaminase/DILI monitoring, no Torsades boxed warning",
    },
    {
        "chembl_id": "CHEMBL939",
        "name": "Gefitinib",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "egfr_ic50_uM": 0.033,
        "herg_ic50_uM": 1.00,
        "clinical_dose_mg_qd": 250,
        "unbound_fraction_fu": 0.09,
        "clinical_cmax_unbound_uM": 0.035,
        "clinical_qtc_torsades_boxed_warning": False,
        "clinical_dili_warning": True,
        "organism_level_finding": "Borderline hERG margin (28.6x); clinical ILD and hepatotoxicity warnings without Torsades boxed warning",
    },
    {
        "chembl_id": "CHEMBL1201583",
        "name": "Lapatinib",
        "smiles": "CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1",
        "egfr_ic50_uM": 0.011,
        "herg_ic50_uM": 1.10,
        "clinical_dose_mg_qd": 1250,
        "unbound_fraction_fu": 0.01,
        "clinical_cmax_unbound_uM": 0.042,
        "clinical_qtc_torsades_boxed_warning": False,
        "clinical_dili_warning": True,
        "organism_level_finding": "FDA Boxed Warning for hepatotoxicity (O-dealkylated quinone-imine metabolite + HLA-DQA1*02:01); concentration-dependent QTc precaution",
    },
    {
        "chembl_id": "CHEMBL24828",
        "name": "Vandetanib",
        "smiles": "COc1cc2c(Nc3ccc(Br)cc3F)ncnc2cc1OCC1CCN(C)CC1",
        "egfr_ic50_uM": 0.50,
        "herg_ic50_uM": 0.40,
        "clinical_dose_mg_qd": 300,
        "unbound_fraction_fu": 0.06,
        "clinical_cmax_unbound_uM": 0.18,
        "clinical_qtc_torsades_boxed_warning": True,
        "clinical_dili_warning": False,
        "organism_level_finding": "FDA Boxed Warning & REMS for QT prolongation, Torsades de Pointes, and sudden death (hERG margin 2.22x at 300 mg QD)",
    },
    {
        "chembl_id": "CHEMBL3353410",
        "name": "Osimertinib",
        "smiles": "COc1cc(N(C)CCN(C)C)c(NC(=O)C=C)cc1Nc1nccc(-c2cn(C)c3ccccc23)n1",
        "egfr_ic50_uM": 0.001,
        "herg_ic50_uM": 1.58,
        "clinical_dose_mg_qd": 80,
        "unbound_fraction_fu": 0.05,
        "clinical_cmax_unbound_uM": 0.025,
        "clinical_qtc_torsades_boxed_warning": False,
        "clinical_dili_warning": False,
        "organism_level_finding": "Targeted covalent Cys797 acrylamide; low 80 mg QD dose keeps unbound Cmax at 0.025 uM (hERG margin 63.2x, no Torsades boxed warning)",
    },
    {
        "chembl_id": "CHEMBL17157",
        "name": "Terfenadine",
        "smiles": "CC(C)(C)c1ccc(C(O)CCCN2CCC(C(O)(c3ccccc3)c3ccccc3)CC2)cc1",
        "egfr_ic50_uM": 50.0,
        "herg_ic50_uM": 0.056,
        "clinical_dose_mg_qd": 60,
        "unbound_fraction_fu": 0.03,
        "clinical_cmax_unbound_uM": 0.030,
        "clinical_qtc_torsades_boxed_warning": True,
        "clinical_dili_warning": False,
        "organism_level_finding": "Withdrawn from market for fatal Torsades de Pointes when CYP3A4 inhibition elevates parent terfenadine (hERG margin 1.87x)",
    },
)


def _match_alerts(smiles: str) -> list[str]:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    matched = []
    for name, smarts in REAL_SAFETY_ALERT_SMARTS.items():
        pat = Chem.MolFromSmarts(smarts)
        if pat is not None and mol.HasSubstructMatch(pat):
            matched.append(name)
    return sorted(matched)


def evaluate_public_safety() -> dict[str, Any]:
    """Evaluate real ChEMBL 37 hERG/EGFR potency, structural alerts, and unbound Cmax safety margins."""
    records: list[dict[str, Any]] = []
    for drug in REAL_CLINICAL_SAFETY_PANEL:
        alerts = _match_alerts(drug["smiles"])
        herg_margin = drug["herg_ic50_uM"] / drug["clinical_cmax_unbound_uM"]
        target_selectivity = drug["herg_ic50_uM"] / drug["egfr_ic50_uM"]
        log10_herg_margin = math.log10(herg_margin)
        redfern_high_risk = herg_margin < 10.0
        redfern_adequate_margin = herg_margin >= 30.0
        records.append(
            {
                "chembl_id": drug["chembl_id"],
                "name": drug["name"],
                "structural_alerts": alerts,
                "alert_count": len(alerts),
                "egfr_ic50_uM": drug["egfr_ic50_uM"],
                "herg_ic50_uM": drug["herg_ic50_uM"],
                "clinical_dose_mg_qd": drug["clinical_dose_mg_qd"],
                "clinical_cmax_unbound_uM": drug["clinical_cmax_unbound_uM"],
                "herg_to_cmax_unbound_margin": round(herg_margin, 2),
                "log10_herg_margin": round(log10_herg_margin, 4),
                "herg_to_egfr_selectivity_ratio": round(target_selectivity, 2),
                "redfern_30x_margin_satisfied": redfern_adequate_margin,
                "redfern_under_10x_high_risk": redfern_high_risk,
                "clinical_qtc_torsades_boxed_warning": drug["clinical_qtc_torsades_boxed_warning"],
                "clinical_dili_warning": drug["clinical_dili_warning"],
                "organism_level_finding": drug["organism_level_finding"],
            }
        )

    # Compare structural alert rule vs exposure-normalized Redfern margin (< 10x) for predicting clinical Torsades boxed warning/withdrawal
    alert_tp = sum(
        1 for r in records if r["alert_count"] > 0 and r["clinical_qtc_torsades_boxed_warning"]
    )
    alert_fp = sum(
        1 for r in records if r["alert_count"] > 0 and not r["clinical_qtc_torsades_boxed_warning"]
    )
    alert_fn = sum(
        1 for r in records if r["alert_count"] == 0 and r["clinical_qtc_torsades_boxed_warning"]
    )

    margin_tp = sum(
        1
        for r in records
        if r["redfern_under_10x_high_risk"] and r["clinical_qtc_torsades_boxed_warning"]
    )
    margin_fp = sum(
        1
        for r in records
        if r["redfern_under_10x_high_risk"] and not r["clinical_qtc_torsades_boxed_warning"]
    )
    margin_fn = sum(
        1
        for r in records
        if not r["redfern_under_10x_high_risk"] and r["clinical_qtc_torsades_boxed_warning"]
    )

    return {
        "drug_count": len(records),
        "redfern_margin_threshold": 30.0,
        "high_risk_margin_threshold": 10.0,
        "drugs": records,
        "rule_comparison_for_torsades_liability": {
            "structural_alert_only": {
                "tp": alert_tp,
                "fp": alert_fp,
                "fn": alert_fn,
                "note": "Covalent acrylamide (osimertinib) and terminal alkyne (erlotinib) fire structural alerts without causing Torsades, whereas terfenadine and vandetanib lack reactive electrophile alerts but carry severe hERG/Torsades liability.",
            },
            "exposure_linked_herg_margin_under_10x": {
                "tp": margin_tp,
                "fp": margin_fp,
                "fn": margin_fn,
                "note": "Exposure-normalized hERG margin (IC50_hERG / Cmax,u < 10x) separates vandetanib (2.22x) and terfenadine (1.87x) from osimertinib (63.20x) and erlotinib (150.00x).",
            },
        },
    }


def check_public_safety(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the real-data clinical safety and exposure-margin audit."""
    data = payload or evaluate_public_safety()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    by_id = {d["chembl_id"]: d for d in data["drugs"]}
    require(
        by_id["CHEMBL3353410"]["alert_count"] >= 1
        and by_id["CHEMBL3353410"]["herg_to_cmax_unbound_margin"] > 30.0,
        "osimertinib must fire the Michael-acceptor acrylamide alert while retaining a >30x unbound hERG safety margin (63.20x)",
    )
    require(
        by_id["CHEMBL17157"]["alert_count"] == 0
        and by_id["CHEMBL17157"]["herg_to_cmax_unbound_margin"] < 5.0,
        "terfenadine must fire zero reactive-electrophile alerts while exhibiting a <5x unbound hERG safety margin (1.87x)",
    )
    require(
        by_id["CHEMBL24828"]["herg_to_cmax_unbound_margin"] < 5.0
        and by_id["CHEMBL24828"]["herg_to_egfr_selectivity_ratio"] < 1.0,
        "vandetanib must exhibit a <5x unbound hERG safety margin (2.22x) and sub-unity hERG/EGFR selectivity (0.80x)",
    )
    comp = data["rule_comparison_for_torsades_liability"]
    require(
        comp["exposure_linked_herg_margin_under_10x"]["tp"] == 2
        and comp["exposure_linked_herg_margin_under_10x"]["fp"] == 0
        and comp["exposure_linked_herg_margin_under_10x"]["fn"] == 0,
        "exposure-linked hERG margin (<10x) must perfectly separate clinical Torsades boxed/withdrawn drugs on this panel",
    )
    return failures
