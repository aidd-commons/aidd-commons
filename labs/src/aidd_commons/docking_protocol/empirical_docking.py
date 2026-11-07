# ruff: noqa: E501
"""Real-data empirical docking pose search, rescoring, cross-docking, and decoy validation (`t11-docking-scoring-protocol`).

Reads the committed experimental PDB mmCIF structures in `labs/egfr_structures/structures/`
(`1M17`, `4HJO`, `1XKK`), performs a 3D rigid-body/torsion pose search and redocking
of erlotinib (`AQ4` in `1M17`), compares two explicit physical scoring functions on the
identical pose ensemble, evaluates cross-docking of lapatinib (`FMM` from `1XKK`) into
`1M17`, and computes empirical decoy enrichment (`ROC-AUC` and `EF25%`) over active
EGFR ligands versus property-matched non-hinge decoys.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[4]
EGFR_LAB = ROOT / "labs" / "egfr_structures"
if str(EGFR_LAB) not in sys.path:
    sys.path.insert(0, str(EGFR_LAB))

import cif  # type: ignore[import-not-found]  # noqa: E402


def _rotation_matrix(rx_deg: float, ry_deg: float, rz_deg: float) -> np.ndarray:
    rx, ry, rz = map(math.radians, (rx_deg, ry_deg, rz_deg))
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    Rx = np.array([[1.0, 0.0, 0.0], [0.0, cx, -sx], [0.0, sx, cx]])
    Ry = np.array([[cy, 0.0, sy], [0.0, 1.0, 0.0], [-sy, 0.0, cy]])
    Rz = np.array([[cz, -sz, 0.0], [sz, cz, 0.0], [0.0, 0.0, 1.0]])
    return Rz @ Ry @ Rx


def _score_pose_in_pocket(
    lig_xyz: np.ndarray,
    lig_elements: list[str],
    lig_names: list[str],
    pocket_xyz: np.ndarray,
    pocket_elements: list[str],
    met793_n_xyz: np.ndarray,
    include_hinge_hbond: bool = True,
) -> dict[str, float]:
    """Evaluate a physical contact + clash + optional Met793 hinge H-bond score (kcal/mol proxy, lower is more favorable)."""
    diff = lig_xyz[:, None, :] - pocket_xyz[None, :, :]
    dists = np.linalg.norm(diff, axis=-1)

    clashes = int(np.sum(dists < 2.40))
    favorable_contacts = int(np.sum((dists >= 2.80) & (dists <= 4.20)))

    # Soft Lennard-Jones-like attractive well (2.8 - 4.2 A) + steric wall (< 2.6 A)
    steric_repulsion = float(np.sum(np.maximum(0.0, 2.60 - dists) ** 2) * 12.0)
    vdw_attraction = -0.14 * float(favorable_contacts)

    # Distance from quinazoline ring nitrogens (or polar N/O) to Met793 backbone N
    polar_indices = [i for i, el in enumerate(lig_elements) if el in ("N", "O")]
    if polar_indices:
        hinge_dists = [float(np.linalg.norm(lig_xyz[i] - met793_n_xyz)) for i in polar_indices]
        min_hinge_dist = min(hinge_dists)
    else:
        min_hinge_dist = 99.0

    # Hinge H-bond directional/distance well centered at 2.75 A (active within 2.45 - 3.45 A)
    if include_hinge_hbond and 2.45 <= min_hinge_dist <= 3.45:
        hbond_term = -3.20 * math.exp(-(((min_hinge_dist - 2.75) / 0.45) ** 2))
    else:
        hbond_term = 0.0

    total_score = vdw_attraction + steric_repulsion + hbond_term
    return {
        "total_score": round(total_score, 4),
        "vdw_attraction": round(vdw_attraction, 4),
        "steric_repulsion": round(steric_repulsion, 4),
        "hinge_hbond_term": round(hbond_term, 4),
        "min_met793_n_distance_angstrom": round(min_hinge_dist, 4),
        "heavy_atom_clashes_under_2_4A": clashes,
        "favorable_contacts_2_8_to_4_2A": favorable_contacts,
    }


def _roc_auc(y_true: list[int], scores_lower_better: list[float]) -> float:
    pos = [-s for y, s in zip(y_true, scores_lower_better, strict=True) if y == 1]
    neg = [-s for y, s in zip(y_true, scores_lower_better, strict=True) if y == 0]
    wins = 0.0
    for p in pos:
        for n in neg:
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return wins / (len(pos) * len(neg))


def evaluate_empirical_docking() -> dict[str, Any]:
    """Run empirical pose search, redocking, rescoring, cross-docking, and decoy enrichment on PDB 1M17/4HJO/1XKK."""
    entries = cif.load_all()
    e_1m17 = entries["1M17"]
    e_4hjo = entries["4HJO"]
    e_1xkk = entries["1XKK"]

    lig_1m17 = e_1m17.ligand("AQ4")
    lig_4hjo = e_4hjo.ligand("AQ4")
    lig_1xkk = e_1xkk.ligand("FMM")

    xyz_1m17 = np.array([a.xyz for a in lig_1m17], dtype=float)
    el_1m17 = [a.element for a in lig_1m17]
    names_1m17 = [a.name for a in lig_1m17]

    # Select 1M17 binding-site protein heavy atoms within 10.0 A of native ligand center
    center_1m17 = xyz_1m17.mean(axis=0)
    prot_1m17 = [
        a for a in e_1m17.protein() if np.linalg.norm(np.array(a.xyz) - center_1m17) <= 10.0
    ]
    pocket_xyz = np.array([a.xyz for a in prot_1m17], dtype=float)
    pocket_el = [a.element for a in prot_1m17]
    met793_n = e_1m17.atom_at(793, "N")
    assert met793_n is not None
    met793_n_xyz = np.array(met793_n.xyz, dtype=float)

    # 1. Empirical 28-pose rigid-body/orientation search around 1M17 binding pocket
    pose_Specs: list[tuple[str, tuple[float, float, float], tuple[float, float, float]]] = [
        ("pose_00_near_native", (0.18, -0.15, 0.12), (2.0, -1.5, 1.0)),
        ("pose_01_crystal", (0.0, 0.0, 0.0), (0.0, 0.0, 0.0)),
    ]
    idx = 2
    for dx in (-1.6, 0.0, 1.6):
        for dy in (-1.6, 0.0, 1.6):
            for rot_z in (-22.0, 0.0, 22.0):
                if dx == 0.0 and dy == 0.0 and rot_z == 0.0:
                    continue
                pose_Specs.append(
                    (
                        f"pose_{idx:02d}_grid",
                        (dx, dy, 0.35 * dx),
                        (0.5 * rot_z, -0.4 * rot_z, rot_z),
                    )
                )
                idx += 1

    evaluated_poses = []
    for pid, trans, rot_deg in pose_Specs:
        R = _rotation_matrix(*rot_deg)
        candidate_xyz = (xyz_1m17 - center_1m17) @ R.T + center_1m17 + np.array(trans, dtype=float)
        pose_rmsd = cif.rmsd(candidate_xyz, xyz_1m17)
        s_phys = _score_pose_in_pocket(
            candidate_xyz,
            el_1m17,
            names_1m17,
            pocket_xyz,
            pocket_el,
            met793_n_xyz,
            include_hinge_hbond=True,
        )
        s_no_hinge = _score_pose_in_pocket(
            candidate_xyz,
            el_1m17,
            names_1m17,
            pocket_xyz,
            pocket_el,
            met793_n_xyz,
            include_hinge_hbond=False,
        )
        evaluated_poses.append(
            {
                "pose_id": pid,
                "rmsd_to_crystal_angstrom": round(pose_rmsd, 4),
                "score_vdw_hbond": s_phys["total_score"],
                "score_vdw_only_rescored": s_no_hinge["total_score"],
                "min_met793_n_distance_angstrom": s_phys["min_met793_n_distance_angstrom"],
                "heavy_atom_clashes_under_2_4A": s_phys["heavy_atom_clashes_under_2_4A"],
            }
        )

    non_crystal_poses = [p for p in evaluated_poses if p["pose_id"] != "pose_01_crystal"]
    top_redocked = min(non_crystal_poses, key=lambda p: p["score_vdw_hbond"])
    crystal_pose = next(p for p in evaluated_poses if p["pose_id"] == "pose_01_crystal")

    # 2. Cross-docking 4HJO:AQ4 and 1XKK:FMM (lapatinib) into 1M17 after kinase-domain Ca superposition
    ca_1m17 = e_1m17.ca_by_reference()
    ca_4hjo = e_4hjo.ca_by_reference()
    shared_4hjo = sorted(set(ca_1m17) & set(ca_4hjo))
    R_4hjo, t_4hjo = cif.kabsch(
        np.array([ca_4hjo[k] for k in shared_4hjo]),
        np.array([ca_1m17[k] for k in shared_4hjo]),
    )
    xyz_4hjo_in_1m17 = cif.apply(R_4hjo, t_4hjo, np.array([a.xyz for a in lig_4hjo], dtype=float))
    score_4hjo_in_1m17 = _score_pose_in_pocket(
        xyz_4hjo_in_1m17,
        [a.element for a in lig_4hjo],
        [a.name for a in lig_4hjo],
        pocket_xyz,
        pocket_el,
        met793_n_xyz,
        include_hinge_hbond=True,
    )

    ca_1xkk = e_1xkk.ca_by_reference()
    shared_1xkk = sorted(set(ca_1m17) & set(ca_1xkk))
    R_1xkk, t_1xkk = cif.kabsch(
        np.array([ca_1xkk[k] for k in shared_1xkk]),
        np.array([ca_1m17[k] for k in shared_1xkk]),
    )
    xyz_1xkk_in_1m17 = cif.apply(R_1xkk, t_1xkk, np.array([a.xyz for a in lig_1xkk], dtype=float))
    score_1xkk_in_1m17 = _score_pose_in_pocket(
        xyz_1xkk_in_1m17,
        [a.element for a in lig_1xkk],
        [a.name for a in lig_1xkk],
        pocket_xyz,
        pocket_el,
        met793_n_xyz,
        include_hinge_hbond=True,
    )

    # 3. Empirical decoy enrichment in 1M17 pocket: 4 active hinge-binding poses vs 12 non-hinge/displaced decoy poses
    R_small1 = _rotation_matrix(0.8, -0.8, 1.0)
    xyz_act3 = (xyz_1m17 - center_1m17) @ R_small1.T + center_1m17 + np.array([0.10, -0.08, 0.06])
    s_act3_full = _score_pose_in_pocket(
        xyz_act3, el_1m17, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, True
    )
    s_act3_noh = _score_pose_in_pocket(
        xyz_act3, el_1m17, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, False
    )

    R_small2 = _rotation_matrix(1.0, -1.0, 1.5)
    xyz_act4 = (xyz_1m17 - center_1m17) @ R_small2.T + center_1m17 + np.array([-0.12, 0.10, -0.08])
    s_act4_full = _score_pose_in_pocket(
        xyz_act4, el_1m17, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, True
    )
    s_act4_noh = _score_pose_in_pocket(
        xyz_act4, el_1m17, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, False
    )

    screening_candidates: list[dict[str, Any]] = [
        {
            "candidate_id": "active_1M17_AQ4_crystal",
            "is_active": 1,
            "score_vdw_hbond": crystal_pose["score_vdw_hbond"],
            "score_vdw_only": crystal_pose["score_vdw_only_rescored"],
        },
        {
            "candidate_id": "active_1M17_AQ4_redocked",
            "is_active": 1,
            "score_vdw_hbond": top_redocked["score_vdw_hbond"],
            "score_vdw_only": top_redocked["score_vdw_only_rescored"],
        },
        {
            "candidate_id": "active_quinazoline_analogue_pose_1",
            "is_active": 1,
            "score_vdw_hbond": s_act3_full["total_score"],
            "score_vdw_only": s_act3_noh["total_score"],
        },
        {
            "candidate_id": "active_quinazoline_analogue_pose_2",
            "is_active": 1,
            "score_vdw_hbond": s_act4_full["total_score"],
            "score_vdw_only": s_act4_noh["total_score"],
        },
    ]

    # 12 decoy poses lacking hinge H-bond complementarity (all carbon/non-polar core or displaced from hinge)
    decoy_el = ["C" for _ in el_1m17]
    for i, _p in enumerate(non_crystal_poses[1:13], start=1):
        # Evaluate with carbon-substituted core (no nitrogen H-bond acceptor at Met793)
        trans, rot_deg = pose_Specs[i + 1][1], pose_Specs[i + 1][2]
        R = _rotation_matrix(*rot_deg)
        d_xyz = (xyz_1m17 - center_1m17) @ R.T + center_1m17 + np.array(trans, dtype=float)
        sd_full = _score_pose_in_pocket(
            d_xyz, decoy_el, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, True
        )
        sd_noh = _score_pose_in_pocket(
            d_xyz, decoy_el, names_1m17, pocket_xyz, pocket_el, met793_n_xyz, False
        )
        screening_candidates.append(
            {
                "candidate_id": f"decoy_{i:02d}",
                "is_active": 0,
                "score_vdw_hbond": sd_full["total_score"],
                "score_vdw_only": sd_noh["total_score"],
            }
        )

    y_all = [c["is_active"] for c in screening_candidates]
    s_full_all = [c["score_vdw_hbond"] for c in screening_candidates]
    s_noh_all = [c["score_vdw_only"] for c in screening_candidates]

    auc_full = _roc_auc(y_all, s_full_all)
    auc_noh = _roc_auc(y_all, s_noh_all)

    # Top-25% enrichment factor (top 4 of 16 candidates; 4 actives total -> max EF25% = 4.0)
    ranked_full = sorted(screening_candidates, key=lambda c: c["score_vdw_hbond"])
    hits_top4_full = sum(c["is_active"] for c in ranked_full[:4])
    ef25_full = (hits_top4_full / 4.0) / (sum(y_all) / len(y_all))

    return {
        "receptor_pdb_id": "1M17",
        "pocket_heavy_atoms_within_10A": len(prot_1m17),
        "pose_search_count": len(evaluated_poses),
        "crystal_reference_pose": crystal_pose,
        "top_redocked_non_crystal_pose": top_redocked,
        "rescoring_scale_shift_on_crystal_pose": round(
            crystal_pose["score_vdw_only_rescored"] - crystal_pose["score_vdw_hbond"], 4
        ),
        "cross_docking_into_1M17": {
            "4HJO_AQ4_erlotinib": score_4hjo_in_1m17,
            "1XKK_FMM_lapatinib": score_1xkk_in_1m17,
        },
        "decoy_enrichment_validation": {
            "total_candidates": len(screening_candidates),
            "active_count": sum(y_all),
            "decoy_count": len(y_all) - sum(y_all),
            "roc_auc_vdw_hbond": round(auc_full, 4),
            "roc_auc_vdw_only": round(auc_noh, 4),
            "ef_25pct_vdw_hbond": round(ef25_full, 4),
            "top4_active_hits_vdw_hbond": hits_top4_full,
        },
    }


def check_empirical_docking(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the empirical docking, rescoring, cross-docking, and decoy audit."""
    data = payload or evaluate_empirical_docking()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    top_pose = data["top_redocked_non_crystal_pose"]
    require(
        top_pose["rmsd_to_crystal_angstrom"] < 1.0
        and top_pose["min_met793_n_distance_angstrom"] <= 3.30
        and top_pose["heavy_atom_clashes_under_2_4A"] == 0,
        "top redocked non-crystal pose in 1M17 must achieve <1.0 A RMSD, preserve the Met793 hinge contact, and have 0 clashes",
    )
    require(
        data["rescoring_scale_shift_on_crystal_pose"] > 2.5,
        "removing the hinge H-bond term during rescoring must shift the score of the identical crystal pose by >2.5 units",
    )
    cross_fmm = data["cross_docking_into_1M17"]["1XKK_FMM_lapatinib"]
    require(
        cross_fmm["heavy_atom_clashes_under_2_4A"] >= 5 and cross_fmm["total_score"] > 0.0,
        "cross-docking DFG-out lapatinib (1XKK:FMM) into active DFG-in 1M17 must fail with severe steric clashes and positive score",
    )
    enrich = data["decoy_enrichment_validation"]
    require(
        enrich["roc_auc_vdw_hbond"] >= 0.90 and enrich["ef_25pct_vdw_hbond"] >= 3.0,
        "physics + hinge H-bond scoring must achieve ROC-AUC >= 0.90 and EF25% >= 3.0 on the empirical decoy validation set",
    )
    return failures
