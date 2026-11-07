# ruff: noqa: E501
"""Real-data 3D conformer ensemble and graph message-passing assessment (`t05-small-molecule-representation`).

Evaluates RDKit ETKDGv3 + MMFF94 3D conformer ensembles, Boltzmann-weighted
3D descriptors, 3D distance-matrix mirror-image collapse vs signed chiral
tetrahedral volume, and 2-layer 2D topological vs 3D chiral graph encodings
across real clinical drugs from ChEMBL 37.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors3D, rdMolDescriptors

RT_KCAL_MOL_298K = 0.592484  # R * 298.15 K in kcal/mol

REAL_DRUG_PANEL: tuple[dict[str, str], ...] = (
    {
        "chembl_id": "CHEMBL553",
        "name": "Erlotinib",
        "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
        "role": "Flexible 1st-gen EGFR inhibitor (10 rotatable bonds)",
    },
    {
        "chembl_id": "CHEMBL939",
        "name": "Gefitinib",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "role": "1st-gen EGFR inhibitor with morpholinopropyl chain (8 rotatable bonds)",
    },
    {
        "chembl_id": "CHEMBL3353410",
        "name": "Osimertinib",
        "smiles": "COc1cc(N(C)CCN(C)C)c(NC(=O)C=C)cc1Nc1nccc(-c2cn(C)c3ccccc23)n1",
        "role": "3rd-gen covalent EGFR inhibitor (10 rotatable bonds)",
    },
    {
        "chembl_id": "CHEMBL1431_R",
        "name": "(R)-Thalidomide",
        "smiles": "O=C1CC[C@H](N2C(=O)c3ccccc3C2=O)C(=O)N1",
        "role": "Rigid chiral drug enantiomer (R stereocenter, 1 rotatable bond)",
    },
    {
        "chembl_id": "CHEMBL1431_S",
        "name": "(S)-Thalidomide",
        "smiles": "O=C1CC[C@@H](N2C(=O)c3ccccc3C2=O)C(=O)N1",
        "role": "Rigid chiral drug enantiomer (S stereocenter, 1 rotatable bond)",
    },
)


def _signed_chiral_volume(mol_h: Chem.Mol, conf_id: int) -> float:
    """Compute signed tetrahedral volume around the first specified stereocenter."""
    Chem.AssignStereochemistryFrom3D(mol_h, confId=conf_id, replaceExistingTags=False)
    Chem.AssignStereochemistry(mol_h, force=True, cleanIt=True)
    centers = Chem.FindMolChiralCenters(mol_h, includeUnassigned=False)
    if not centers:
        return 0.0
    center_idx = centers[0][0]
    conf = mol_h.GetConformer(conf_id)
    center_atom = mol_h.GetAtomWithIdx(center_idx)
    nbrs = [a.GetIdx() for a in center_atom.GetNeighbors()]
    if len(nbrs) < 3:
        return 0.0
    # Sort neighbors deterministically by CIP rank (ascending)
    nbrs_sorted = sorted(
        nbrs,
        key=lambda idx: (
            int(mol_h.GetAtomWithIdx(idx).GetProp("_CIPRank"))
            if mol_h.GetAtomWithIdx(idx).HasProp("_CIPRank")
            else -1,
            mol_h.GetAtomWithIdx(idx).GetAtomicNum(),
            idx,
        ),
        reverse=True,
    )
    p0 = np.array(conf.GetAtomPosition(center_idx), dtype=float)
    v1 = np.array(conf.GetAtomPosition(nbrs_sorted[0]), dtype=float) - p0
    v2 = np.array(conf.GetAtomPosition(nbrs_sorted[1]), dtype=float) - p0
    v3 = np.array(conf.GetAtomPosition(nbrs_sorted[2]), dtype=float) - p0
    return float(np.linalg.det(np.stack([v1, v2, v3], axis=0)))


def _conformer_ensemble_metrics(
    smiles: str, num_confs: int = 8, seed: int = 20261107
) -> dict[str, Any]:
    mol_2d = Chem.MolFromSmiles(smiles)
    mol_h = Chem.AddHs(mol_2d)
    params = AllChem.ETKDGv3()
    params.randomSeed = seed
    params.useSmallRingTorsions = True
    conf_ids = list(AllChem.EmbedMultipleConfs(mol_h, numConfs=num_confs, params=params))
    opt_results = AllChem.MMFFOptimizeMoleculeConfs(mol_h, maxIters=200)

    energies = [float(res[1]) for res in opt_results]
    e_min = min(energies)
    rel_energies = [e - e_min for e in energies]
    boltz_unnorm = [math.exp(-de / RT_KCAL_MOL_298K) for de in rel_energies]
    z_part = sum(boltz_unnorm)
    boltz_weights = [w / z_part for w in boltz_unnorm]

    mol_heavy = Chem.RemoveHs(mol_h)
    rmsds: list[float] = []
    for i in range(len(conf_ids)):
        for j in range(i + 1, len(conf_ids)):
            rms = AllChem.GetConformerRMS(mol_heavy, conf_ids[i], conf_ids[j])
            rmsds.append(float(rms))

    rgs = [float(Descriptors3D.RadiusOfGyration(mol_h, confId=cid)) for cid in conf_ids]
    asphericities = [float(Descriptors3D.Asphericity(mol_h, confId=cid)) for cid in conf_ids]

    min_idx = int(np.argmin(energies))
    max_idx = int(np.argmax(energies))
    boltz_rg = float(sum(w * rg for w, rg in zip(boltz_weights, rgs, strict=True)))
    boltz_asph = float(sum(w * a for w, a in zip(boltz_weights, asphericities, strict=True)))

    # Heavy-atom sorted pairwise distance summary on lowest-energy conformer
    dmat = Chem.Get3DDistanceMatrix(mol_heavy, confId=conf_ids[min_idx])
    upper_dists = dmat[np.triu_indices(dmat.shape[0], k=1)]

    signed_vol = _signed_chiral_volume(mol_h, conf_ids[min_idx])

    return {
        "conformer_count": len(conf_ids),
        "rotatable_bonds": int(rdMolDescriptors.CalcNumRotatableBonds(mol_2d)),
        "mmff94_energy_span_kcal_mol": round(max(rel_energies), 4),
        "lowest_energy_conformer_weight": round(boltz_weights[min_idx], 4),
        "pairwise_heavy_atom_rmsd_mean_angstrom": round(float(np.mean(rmsds)), 4) if rmsds else 0.0,
        "pairwise_heavy_atom_rmsd_max_angstrom": round(float(np.max(rmsds)), 4) if rmsds else 0.0,
        "radius_of_gyration_lowest_energy_angstrom": round(rgs[min_idx], 4),
        "radius_of_gyration_highest_energy_angstrom": round(rgs[max_idx], 4),
        "radius_of_gyration_boltzmann_angstrom": round(boltz_rg, 4),
        "asphericity_boltzmann": round(boltz_asph, 4),
        "mean_3d_interatomic_distance_angstrom": round(float(np.mean(upper_dists)), 4),
        "signed_chiral_tetrahedral_volume_angstrom3": round(signed_vol, 4),
    }


def _graph_message_passing_embedding(
    mol: Chem.Mol, include_signed_chiral_volume: float = 0.0
) -> np.ndarray:
    """Deterministic 2-layer graph message-passing readout (mean + max pooling)."""
    n = mol.GetNumAtoms()
    node_feats = np.zeros((n, 6), dtype=float)
    for idx, atom in enumerate(mol.GetAtoms()):
        node_feats[idx, 0] = atom.GetAtomicNum() / 20.0
        node_feats[idx, 1] = atom.GetTotalDegree() / 4.0
        node_feats[idx, 2] = atom.GetTotalNumHs() / 4.0
        node_feats[idx, 3] = 1.0 if atom.GetIsAromatic() else 0.0
        node_feats[idx, 4] = 1.0 if atom.IsInRing() else 0.0
        node_feats[idx, 5] = float(atom.GetFormalCharge())

    adj = np.eye(n, dtype=float)
    for bond in mol.GetBonds():
        i, j = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        w = float(bond.GetBondTypeAsDouble())
        adj[i, j] = w
        adj[j, i] = w
    deg = adj.sum(axis=1, keepdims=True)
    norm_adj = adj / np.maximum(deg, 1.0)

    # Fixed deterministic projection matrices for reproducible 2-layer MPNN
    W1 = np.array(
        [
            [0.60, -0.20, 0.15, 0.30, -0.10, 0.25],
            [-0.15, 0.55, 0.20, -0.25, 0.35, 0.10],
            [0.25, 0.10, 0.65, -0.10, 0.20, -0.30],
            [-0.20, 0.30, -0.15, 0.70, 0.25, 0.15],
            [0.10, -0.25, 0.30, 0.20, 0.60, -0.20],
            [0.35, 0.15, -0.20, 0.10, -0.15, 0.65],
        ],
        dtype=float,
    )
    W2 = np.array(
        [
            [0.50, -0.10, 0.20, 0.15, -0.25, 0.30],
            [0.10, 0.60, -0.15, 0.25, 0.20, -0.10],
            [-0.20, 0.20, 0.55, -0.10, 0.30, 0.15],
            [0.25, -0.15, 0.10, 0.65, -0.20, 0.20],
            [-0.10, 0.30, 0.25, -0.15, 0.50, -0.25],
            [0.15, -0.20, -0.10, 0.30, 0.15, 0.60],
        ],
        dtype=float,
    )
    h1 = np.tanh(norm_adj @ node_feats @ W1)
    h2 = np.tanh(norm_adj @ h1 @ W2)
    readout = np.concatenate([h2.mean(axis=0), h2.max(axis=0)])
    if include_signed_chiral_volume != 0.0:
        readout = np.concatenate([readout, [math.tanh(include_signed_chiral_volume / 2.0)]])
    else:
        readout = np.concatenate([readout, [0.0]])
    return readout


def evaluate_conformers_and_graphs() -> dict[str, Any]:
    """Run the 3D conformer ensemble and 2D/3D graph encoding assessment."""
    molecules_out: list[dict[str, Any]] = []
    embeddings_2d: dict[str, np.ndarray] = {}
    embeddings_3d_chiral: dict[str, np.ndarray] = {}
    invariance_diffs: dict[str, float] = {}

    for item in REAL_DRUG_PANEL:
        cid = item["chembl_id"]
        smi = item["smiles"]
        mol = Chem.MolFromSmiles(smi)
        conf_metrics = _conformer_ensemble_metrics(smi)

        emb_2d = _graph_message_passing_embedding(mol, include_signed_chiral_volume=0.0)
        emb_3d = _graph_message_passing_embedding(
            mol,
            include_signed_chiral_volume=conf_metrics["signed_chiral_tetrahedral_volume_angstrom3"],
        )
        embeddings_2d[cid] = emb_2d
        embeddings_3d_chiral[cid] = emb_3d

        # Atom-renumbering permutation invariance check
        perm_order = list(reversed(range(mol.GetNumAtoms())))
        mol_perm = Chem.RenumberAtoms(mol, perm_order)
        emb_perm = _graph_message_passing_embedding(mol_perm, include_signed_chiral_volume=0.0)
        perm_diff = float(np.max(np.abs(emb_2d - emb_perm)))
        invariance_diffs[cid] = perm_diff

        molecules_out.append(
            {
                "chembl_id": cid,
                "name": item["name"],
                "role": item["role"],
                "conformer_ensemble": conf_metrics,
                "graph_encoding": {
                    "embedding_dim": int(emb_2d.shape[0]),
                    "embedding_l2_norm_2d": round(float(np.linalg.norm(emb_2d)), 4),
                    "atom_permutation_max_abs_diff": round(perm_diff, 12),
                },
            }
        )

    by_id = {m["chembl_id"]: m for m in molecules_out}
    r_thal = by_id["CHEMBL1431_R"]["conformer_ensemble"]
    s_thal = by_id["CHEMBL1431_S"]["conformer_ensemble"]

    dist_2d_enantiomers = float(
        np.linalg.norm(embeddings_2d["CHEMBL1431_R"] - embeddings_2d["CHEMBL1431_S"])
    )
    dist_3d_enantiomers = float(
        np.linalg.norm(embeddings_3d_chiral["CHEMBL1431_R"] - embeddings_3d_chiral["CHEMBL1431_S"])
    )
    dist_erlotinib_gefitinib_2d = float(
        np.linalg.norm(embeddings_2d["CHEMBL553"] - embeddings_2d["CHEMBL939"])
    )

    return {
        "panel_count": len(molecules_out),
        "molecules": molecules_out,
        "comparative_diagnostics": {
            "flexible_erlotinib_max_rmsd_angstrom": by_id["CHEMBL553"]["conformer_ensemble"][
                "pairwise_heavy_atom_rmsd_max_angstrom"
            ],
            "rigid_r_thalidomide_max_rmsd_angstrom": r_thal[
                "pairwise_heavy_atom_rmsd_max_angstrom"
            ],
            "enantiomer_unsigned_3d_mean_distance_diff_angstrom": round(
                abs(
                    r_thal["mean_3d_interatomic_distance_angstrom"]
                    - s_thal["mean_3d_interatomic_distance_angstrom"]
                ),
                4,
            ),
            "r_thalidomide_signed_volume_angstrom3": r_thal[
                "signed_chiral_tetrahedral_volume_angstrom3"
            ],
            "s_thalidomide_signed_volume_angstrom3": s_thal[
                "signed_chiral_tetrahedral_volume_angstrom3"
            ],
            "enantiomer_2d_topological_graph_l2_distance": round(dist_2d_enantiomers, 6),
            "enantiomer_3d_chiral_graph_l2_distance": round(dist_3d_enantiomers, 4),
            "erlotinib_vs_gefitinib_2d_graph_l2_distance": round(dist_erlotinib_gefitinib_2d, 4),
            "max_atom_permutation_invariance_diff": round(max(invariance_diffs.values()), 12),
        },
    }


def check_conformers_and_graphs(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the 3D conformer and graph encoding assessment."""
    data = payload or evaluate_conformers_and_graphs()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    diag = data["comparative_diagnostics"]
    require(
        diag["max_atom_permutation_invariance_diff"] < 1e-10,
        "2-layer graph message-passing embeddings must be strictly invariant to atom renumbering",
    )
    require(
        diag["flexible_erlotinib_max_rmsd_angstrom"]
        > diag["rigid_r_thalidomide_max_rmsd_angstrom"],
        "flexible erlotinib (10 rotatable bonds) must have wider 3D conformer RMSD spread than rigid thalidomide",
    )
    require(
        diag["enantiomer_2d_topological_graph_l2_distance"] == 0.0,
        "2D topological graph message passing without chiral sign must collapse (R)- and (S)-thalidomide",
    )
    require(
        diag["r_thalidomide_signed_volume_angstrom3"]
        * diag["s_thalidomide_signed_volume_angstrom3"]
        < 0.0
        and diag["enantiomer_3d_chiral_graph_l2_distance"] > 0.5,
        "signed 3D chiral volume must have opposite signs for (R)- and (S)-thalidomide and separate their 3D chiral graph encodings",
    )
    return failures
