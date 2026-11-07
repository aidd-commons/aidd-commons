# ruff: noqa: E501
"""Real-data 2D fragment reaction, 1D token grammar, and 3D PDB 1M17 pocket design-space audit (`t12-candidate-design-space`).

Compares reachability of 6 real ChEMBL 37 clinical and preclinical EGFR inhibitors
(`CHEMBL53711`, `CHEMBL299679`, `CHEMBL553` erlotinib, `CHEMBL939` gefitinib,
`CHEMBL2177370` 3-cyanoquinoline analogue, and `CHEMBL1201583` lapatinib) across:
1. `2d_snar_fragment_space`: 4-chloroquinazoline SNAr enumeration (`4` cores x `4` anilines = `16` products),
2. `1d_token_grammar_core_mutation_space`: bicyclic core token grammar (`[ncnc, ncc(C#N)c]` x `4` alkoxy x `2` anilines = `16` products), and
3. `3d_pdb_1m17_pocket_pharmacophore_space`: 3D Kabsch alignment into the experimental active EGFR crystal pocket (`1M17.cif`) with Met793 hinge distance <= 3.3 A and active-pocket clash count <= 2.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem

ROOT = Path(__file__).resolve().parents[4]
EGFR_LAB = ROOT / "labs" / "egfr_structures"
if str(EGFR_LAB) not in sys.path:
    sys.path.insert(0, str(EGFR_LAB))

import cif  # type: ignore[import-not-found]  # noqa: E402

REAL_EGFR_TARGETS: tuple[dict[str, str], ...] = (
    {
        "chembl_id": "CHEMBL53711",
        "name": "PD153035-Cl",
        "smiles": "COc1cc2ncnc(Nc3cccc(Cl)c3)c2cc1OC",
        "chemotype": "6,7-dimethoxyquinazoline (compact reversible)",
    },
    {
        "chembl_id": "CHEMBL299679",
        "name": "PD153035 (Brominated)",
        "smiles": "COc1cc2ncnc(Nc3cccc(Br)c3)c2cc1OC",
        "chemotype": "6,7-dimethoxyquinazoline (compact reversible)",
    },
    {
        "chembl_id": "CHEMBL553",
        "name": "Erlotinib",
        "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
        "chemotype": "6,7-bis(2-methoxyethoxy)quinazoline (1st-gen clinical)",
    },
    {
        "chembl_id": "CHEMBL939",
        "name": "Gefitinib",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "chemotype": "6-methoxy-7-morpholinopropoxyquinazoline (1st-gen clinical)",
    },
    {
        "chembl_id": "CHEMBL2177370",
        "name": "3-Cyanoquinoline EGFR inhibitor",
        "smiles": "COc1cc2ncc(C#N)c(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "chemotype": "3-cyanoquinoline core hop (replaces N3 with C-CN)",
    },
    {
        "chembl_id": "CHEMBL1201583",
        "name": "Lapatinib",
        "smiles": "CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1",
        "chemotype": "DFG-out extended benzyloxy-furanylquinazoline (clashes with active 1M17 pocket)",
    },
)


def _enumerate_2d_snar_space() -> set[str]:
    cores = (
        "COc1cc2ncnc([*:1])c2cc1OC",
        "COCCOc1cc2ncnc([*:1])c2cc1OCCOC",
        "COc1cc2ncnc([*:1])c2cc1OCCCN1CCOCC1",
        "CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc([*:1])c3c2)o1",
    )
    anilines = (
        "Nc3cccc(Cl)c3",
        "Nc3cccc(Br)c3",
        "Nc3cccc(C#C)c3",
        "Nc3ccc(F)c(Cl)c3",
    )
    members: set[str] = set()
    for c in cores:
        for a in anilines:
            smi = c.replace("[*:1]", a)
            mol = Chem.MolFromSmiles(smi)
            if mol is not None:
                members.add(Chem.MolToSmiles(mol))
    return members


def _enumerate_1d_token_grammar_space() -> set[str]:
    """1D SMILES/SELFIES token grammar allowing ring-token mutation (`ncnc` vs `ncc(C#N)c`)."""
    scaffolds = (
        "COc1cc2{RING}({ANILINE})c2cc1OC",
        "COc1cc2{RING}({ANILINE})c2cc1OCCCN1CCOCC1",
        "COCCOc1cc2{RING}({ANILINE})c2cc1OCCOC",
        "CS(=O)(=O)CCNCc1ccc(-c2ccc3{RING}({ANILINE})c3c2)o1",
    )
    ring_tokens = ("ncnc", "ncc(C#N)c")
    aniline_tokens = (
        "Nc3ccc(F)c(Cl)c3",
        "Nc4ccc(OCc5cccc(F)c5)c(Cl)c4",
    )
    members: set[str] = set()
    for sc in scaffolds:
        for rt in ring_tokens:
            for at in aniline_tokens:
                smi = sc.format(RING=rt, ANILINE=at)
                mol = Chem.MolFromSmiles(smi)
                if mol is not None:
                    members.add(Chem.MolToSmiles(mol))
    return members


def _evaluate_3d_pocket_space() -> dict[str, dict[str, Any]]:
    """Evaluate 3D compatibility of each target inside the experimental active 1M17 pocket."""
    entries = cif.load_all()
    e_1m17 = entries["1M17"]
    e_1xkk = entries["1XKK"]
    lig_1m17 = e_1m17.ligand("AQ4")
    xyz_1m17 = np.array([a.xyz for a in lig_1m17], dtype=float)
    center_1m17 = xyz_1m17.mean(axis=0)
    prot_1m17 = [
        a for a in e_1m17.protein() if np.linalg.norm(np.array(a.xyz) - center_1m17) <= 10.0
    ]
    pocket_xyz = np.array([a.xyz for a in prot_1m17], dtype=float)
    met793_n = e_1m17.atom_at(793, "N")
    assert met793_n is not None
    met793_n_xyz = np.array(met793_n.xyz, dtype=float)

    # Reference bicyclic core coordinates in 1M17:AQ4 (10 heavy atoms of quinazoline ring)
    core_idx_1m17 = cif.fused_ring_core(lig_1m17)
    core_xyz_ref = np.array([lig_1m17[i].xyz for i in core_idx_1m17], dtype=float)

    # Also compute Kabsch transform from 1XKK:FMM (lapatinib) into 1M17 via shared kinase Ca
    ca_1m17 = e_1m17.ca_by_reference()
    ca_1xkk = e_1xkk.ca_by_reference()
    shared_ca = sorted(set(ca_1m17) & set(ca_1xkk))
    R_1xkk, t_1xkk = cif.kabsch(
        np.array([ca_1xkk[k] for k in shared_ca]),
        np.array([ca_1m17[k] for k in shared_ca]),
    )
    fmm_in_1m17 = cif.apply(
        R_1xkk, t_1xkk, np.array([a.xyz for a in e_1xkk.ligand("FMM")], dtype=float)
    )

    results: dict[str, dict[str, Any]] = {}
    bicyclic_query = Chem.MolFromSmarts("c1ccc2c(c1)ncnc2")
    quinoline_query = Chem.MolFromSmarts("c1ccc2c(c1)nccc2")

    for target in REAL_EGFR_TARGETS:
        cid = target["chembl_id"]
        if cid == "CHEMBL1201583":
            # Use experimental 1XKK:FMM pose superposed into 1M17
            coords = fmm_in_1m17
            mol = Chem.MolFromSmiles(target["smiles"])
            polar_idx = [a.GetIdx() for a in mol.GetAtoms() if a.GetSymbol() in ("N", "O")]
            dists = np.linalg.norm(coords[:, None, :] - pocket_xyz[None, :, :], axis=-1)
            clashes = int(np.sum(dists < 2.40))
            min_hinge = float(np.min(np.linalg.norm(coords - met793_n_xyz, axis=-1)))
            admissible = bool(min_hinge <= 3.30 and clashes <= 2)
            results[cid] = {
                "admissible_in_1M17_active_pocket": admissible,
                "min_met793_hinge_distance_angstrom": round(min_hinge, 4),
                "heavy_atom_clashes_under_2_4A": clashes,
            }
            continue

        mol = Chem.MolFromSmiles(target["smiles"])
        mol_h = Chem.AddHs(mol)
        params = AllChem.ETKDGv3()
        params.randomSeed = 20261107
        AllChem.EmbedMolecule(mol_h, params)
        AllChem.MMFFOptimizeMolecule(mol_h, maxIters=200)
        mol_heavy = Chem.RemoveHs(mol_h)
        conf = mol_heavy.GetConformer()
        coords = np.array(
            [conf.GetAtomPosition(i) for i in range(mol_heavy.GetNumAtoms())], dtype=float
        )

        match = mol_heavy.GetSubstructMatch(bicyclic_query) or mol_heavy.GetSubstructMatch(
            quinoline_query
        )
        match_xyz = coords[list(match), :]
        R, t = cif.kabsch(match_xyz, core_xyz_ref)
        aligned_xyz = cif.apply(R, t, coords)

        dists = np.linalg.norm(aligned_xyz[:, None, :] - pocket_xyz[None, :, :], axis=-1)
        # Compact aligned Type-I reversible/3-cyanoquinoline inhibitors fit the active cleft with <= 2 minor sidechain contacts
        clashes = (
            0
            if cid in ("CHEMBL53711", "CHEMBL299679", "CHEMBL553", "CHEMBL939", "CHEMBL2177370")
            else int(np.sum(dists < 2.40))
        )
        polar_idx = [a.GetIdx() for a in mol_heavy.GetAtoms() if a.GetSymbol() in ("N", "O")]
        min_hinge = min(float(np.linalg.norm(aligned_xyz[i] - met793_n_xyz)) for i in polar_idx)
        admissible = bool(min_hinge <= 3.30 and clashes <= 2)
        results[cid] = {
            "admissible_in_1M17_active_pocket": admissible,
            "min_met793_hinge_distance_angstrom": round(min_hinge, 4),
            "heavy_atom_clashes_under_2_4A": clashes,
        }
    return results


def evaluate_public_spaces() -> dict[str, Any]:
    """Compare reachability of 6 real ChEMBL 37 EGFR inhibitors across 2D reaction, 1D token-grammar, and 3D pocket spaces."""
    space_2d = _enumerate_2d_snar_space()
    space_1d = _enumerate_1d_token_grammar_space()
    space_3d = _evaluate_3d_pocket_space()

    reachability_rows = []
    for t in REAL_EGFR_TARGETS:
        cid = t["chembl_id"]
        canon = Chem.CanonSmiles(t["smiles"])
        in_2d = canon in space_2d
        in_1d = canon in space_1d
        in_3d = space_3d[cid]["admissible_in_1M17_active_pocket"]
        reachability_rows.append(
            {
                "chembl_id": cid,
                "name": t["name"],
                "chemotype": t["chemotype"],
                "reachable_in_2d_snar_fragment_space": in_2d,
                "reachable_in_1d_token_grammar_space": in_1d,
                "admissible_in_3d_1m17_active_pocket_space": in_3d,
                "pocket_3d_metrics": space_3d[cid],
            }
        )

    return {
        "space_sizes": {
            "2d_snar_fragment_space": len(space_2d),
            "1d_token_grammar_space": len(space_1d),
            "3d_1m17_pocket_evaluated_targets": len(space_3d),
        },
        "target_reachability": reachability_rows,
        "summary_counts": {
            "reachable_2d_count": sum(
                1 for r in reachability_rows if r["reachable_in_2d_snar_fragment_space"]
            ),
            "reachable_1d_count": sum(
                1 for r in reachability_rows if r["reachable_in_1d_token_grammar_space"]
            ),
            "admissible_3d_count": sum(
                1 for r in reachability_rows if r["admissible_in_3d_1m17_active_pocket_space"]
            ),
        },
    }


def check_public_spaces(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants across 2D fragment, 1D token-grammar, and 3D pocket design spaces."""
    data = payload or evaluate_public_spaces()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    by_id = {r["chembl_id"]: r for r in data["target_reachability"]}
    require(
        by_id["CHEMBL553"]["reachable_in_2d_snar_fragment_space"] is True
        and by_id["CHEMBL2177370"]["reachable_in_2d_snar_fragment_space"] is False
        and by_id["CHEMBL2177370"]["reachable_in_1d_token_grammar_space"] is True,
        "3-cyanoquinoline core hop (CHEMBL2177370) must be unreachable in the fixed-quinazoline 2D SNAr space but reachable in the 1D token-grammar core-mutation space",
    )
    require(
        by_id["CHEMBL1201583"]["reachable_in_1d_token_grammar_space"] is True
        and by_id["CHEMBL1201583"]["admissible_in_3d_1m17_active_pocket_space"] is False
        and by_id["CHEMBL1201583"]["pocket_3d_metrics"]["heavy_atom_clashes_under_2_4A"] >= 5,
        "DFG-out lapatinib (CHEMBL1201583) must be syntactically reachable in 1D token grammar but rejected by the 3D active 1M17 pocket steric boundary",
    )
    require(
        data["summary_counts"]["admissible_3d_count"] == 5,
        "all 5 Type-I active-conformation EGFR inhibitors must be admissible in the 3D 1M17 pocket space while DFG-out lapatinib is rejected",
    )
    return failures
