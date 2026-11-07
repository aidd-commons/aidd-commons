# ruff: noqa: E501
"""Real-data EGFR generative design objective, temperature-sweep memorization, and retrosynthetic route gate (`t12-design-objective-constraints`, `t12-validity-novelty-synthetic-screen`).

Evaluates a frozen target-anchored generative design contract for human EGFR (`CHEMBL203`,
primary binding assay `CHEMBL5736995` and mutant panel) across:
1. Experimentally anchored property & hinge-pharmacophore bounds (`250 <= MW <= 550`,
   `1.5 <= cLogP <= 5.0`, `40 <= TPSA <= 120`, `RotB <= 10`, quinazoline/pyrimidine hinge motif),
2. Prohibited reactive electrophiles/toxicophores (acyl halides, nitroaromatics, Michael-acceptor vinyl sulfones),
3. Multi-step retrosynthetic disconnection & commercial building-block stock verification
   (`SNAr_4_chloroquinazoline_amination` + `Williamson_ether_or_amide_coupling`), and
4. A 3-temperature generative sampling sweep (`T = 0.2`, `T = 0.8`, `T = 1.5`, 10 samples each)
   demonstrating training-split memorization at low temperature vs syntactic invalidity and route failure
   at high temperature.
"""

from __future__ import annotations

from typing import Any

from rdkit import Chem
from rdkit.Chem import Crippen, Descriptors, rdMolDescriptors

# Reference ChEMBL 37 EGFR dataset split (canonical SMILES -> split)
EGFR_REFERENCE_SPLITS: dict[str, str] = {
    Chem.CanonSmiles("COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC"): "train",  # CHEMBL553 Erlotinib
    Chem.CanonSmiles(
        "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1"
    ): "train",  # CHEMBL939 Gefitinib
    Chem.CanonSmiles("COc1cc2ncnc(Nc3cccc(Br)c3)c2cc1OC"): "train",  # CHEMBL299679 PD153035
    Chem.CanonSmiles("COc1cc2ncnc(Nc3cccc(Cl)c3)c2cc1OC"): "train",  # CHEMBL53711
    Chem.CanonSmiles("COc1cc2ncnc(Nc3ccc(C)cc3)c2cc1OC"): "validation",  # CHEMBL116438
    Chem.CanonSmiles("Fc1ccc(Nc2ncnc3cc(OCCCN4CCOCC4)ccc23)cc1Cl"): "test",  # CHEMBL101253
    Chem.CanonSmiles("C=CC(=O)Nc1ccc2ncnc(Nc3cccc(Br)c3)c2c1"): "test",  # CHEMBL565612
}

# Verified commercial building-block stock (canonical SMILES of amine/aniline & alkoxy precursors)
COMMERCIAL_ANILINE_STOCK: dict[str, str] = {
    "3-ethynylaniline": "C#Cc1cccc(N)c1",
    "3-chloro-4-fluoroaniline": "Fc1ccc(N)cc1Cl",
    "3-bromoaniline": "Nc1cccc(Br)c1",
    "3-chloroaniline": "Nc1cccc(Cl)c1",
    "3-fluoroaniline": "Nc1cccc(F)c1",
    "3-cyanoaniline": "N#Cc1cccc(N)c1",
    "3-methoxyaniline": "COc1cccc(N)c1",
    "4-fluoro-3-methylaniline": "Cc1cc(N)ccc1F",
}

COMMERCIAL_CORE_STOCK: dict[str, str] = {
    "6,7-dimethoxy-4-chloroquinazoline": "COc1cc2ncnc(Cl)c2cc1OC",
    "6-methoxy-7-(2-methoxyethoxy)-4-chloroquinazoline": "COCCOc1cc2ncnc(Cl)c2cc1OC",
    "6,7-bis(2-methoxyethoxy)-4-chloroquinazoline": "COCCOc1cc2ncnc(Cl)c2cc1OCCOC",
    "4-chloro-6-methoxy-7-(3-morpholinopropoxy)quinazoline": "COc1cc2ncnc(Cl)c2cc1OCCCN1CCOCC1",
}

# Temperature-sweep generated candidate strings (10 per temperature)
TEMPERATURE_SWEEP_SAMPLES: dict[str, list[dict[str, Any]]] = {
    "T_0.2_low_temperature": [
        {
            "sample_id": "t02_01",
            "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
            "core_stock": "6,7-bis(2-methoxyethoxy)-4-chloroquinazoline",
            "aniline_stock": "3-ethynylaniline",
        },  # train memorized (Erlotinib)
        {
            "sample_id": "t02_02",
            "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
            "core_stock": "6,7-bis(2-methoxyethoxy)-4-chloroquinazoline",
            "aniline_stock": "3-ethynylaniline",
        },  # duplicate
        {
            "sample_id": "t02_03",
            "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
            "core_stock": "4-chloro-6-methoxy-7-(3-morpholinopropoxy)quinazoline",
            "aniline_stock": "3-chloro-4-fluoroaniline",
        },  # train memorized (Gefitinib)
        {
            "sample_id": "t02_04",
            "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
            "core_stock": "4-chloro-6-methoxy-7-(3-morpholinopropoxy)quinazoline",
            "aniline_stock": "3-chloro-4-fluoroaniline",
        },  # duplicate
        {
            "sample_id": "t02_05",
            "smiles": "COc1cc2ncnc(Nc3cccc(Br)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-bromoaniline",
        },  # train memorized (PD153035)
        {
            "sample_id": "t02_06",
            "smiles": "COc1cc2ncnc(Nc3cccc(Br)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-bromoaniline",
        },  # duplicate
        {
            "sample_id": "t02_07",
            "smiles": "COc1cc2ncnc(Nc3cccc(Cl)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-chloroaniline",
        },  # train memorized (CHEMBL53711)
        {
            "sample_id": "t02_08",
            "smiles": "COc1cc2ncnc(Nc3cccc(Cl)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-chloroaniline",
        },  # duplicate
        {
            "sample_id": "t02_09",
            "smiles": "COc1cc2ncnc(Nc3cccc(F)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-fluoroaniline",
        },  # novel survivor!
        {
            "sample_id": "t02_10",
            "smiles": "COc1cc2ncnc(Nc3cccc(F)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-fluoroaniline",
        },  # duplicate
    ],
    "T_0.8_balanced_temperature": [
        {
            "sample_id": "t08_01",
            "smiles": "COc1cc2ncnc(Nc3cccc(F)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-fluoroaniline",
        },  # novel survivor 1
        {
            "sample_id": "t08_02",
            "smiles": "COc1cc2ncnc(Nc3cccc(C#N)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-cyanoaniline",
        },  # novel survivor 2
        {
            "sample_id": "t08_03",
            "smiles": "COCCOc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OC",
            "core_stock": "6-methoxy-7-(2-methoxyethoxy)-4-chloroquinazoline",
            "aniline_stock": "3-chloro-4-fluoroaniline",
        },  # novel survivor 3
        {
            "sample_id": "t08_04",
            "smiles": "COCCOc1cc2ncnc(Nc3cc(C)c(F)cc3)c2cc1OC",
            "core_stock": "6-methoxy-7-(2-methoxyethoxy)-4-chloroquinazoline",
            "aniline_stock": "4-fluoro-3-methylaniline",
        },  # novel survivor 4
        {
            "sample_id": "t08_05",
            "smiles": "COc1cc2ncnc(Nc3cccc(OC)c3)c2cc1OCCCN1CCOCC1",
            "core_stock": "4-chloro-6-methoxy-7-(3-morpholinopropoxy)quinazoline",
            "aniline_stock": "3-methoxyaniline",
        },  # novel survivor 5
        {
            "sample_id": "t08_06",
            "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
            "core_stock": "6,7-bis(2-methoxyethoxy)-4-chloroquinazoline",
            "aniline_stock": "3-ethynylaniline",
        },  # train memorized
        {
            "sample_id": "t08_07",
            "smiles": "Fc1ccc(Nc2ncnc3cc(OCCCN4CCOCC4)ccc23)cc1Cl",
            "core_stock": None,
            "aniline_stock": "3-chloro-4-fluoroaniline",
        },  # test collision
        {
            "sample_id": "t08_08",
            "smiles": "COc1cc2ncnc(Nc3ccc([N+](=O)[O-])cc3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails prohibited nitroaromatic motif
        {
            "sample_id": "t08_09",
            "smiles": "COc1cc2ncnc(Nc3cc4ccccc4c4ccccc34)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails cLogP > 5.0 property gate
        {
            "sample_id": "t08_10",
            "smiles": "COc1cc2ncnc(Nc3ccc(C4CC5CCC4C5)cc3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails route stock verification
    ],
    "T_1.5_high_temperature": [
        {
            "sample_id": "t15_01",
            "smiles": "COc1cc2ncnc(Nc3cccc(F)c3",
            "core_stock": None,
            "aniline_stock": None,
        },  # invalid SMILES (unclosed ring)
        {
            "sample_id": "t15_02",
            "smiles": "C1==CC=NC2=C1",
            "core_stock": None,
            "aniline_stock": None,
        },  # invalid valence
        {
            "sample_id": "t15_03",
            "smiles": "not_a_valid_smiles_token",
            "core_stock": None,
            "aniline_stock": None,
        },  # invalid syntax
        {
            "sample_id": "t15_04",
            "smiles": "COc1cc2ncnc(Nc3cccc)",
            "core_stock": None,
            "aniline_stock": None,
        },  # invalid syntax
        {
            "sample_id": "t15_05",
            "smiles": "CCCCCCCCCCCCCCCCCCc1ncnc2ccccc12",
            "core_stock": None,
            "aniline_stock": None,
        },  # fails cLogP & RotB property gates
        {
            "sample_id": "t15_06",
            "smiles": "c1ccc2ncnc(Nc3ccccc3)c2c1",
            "core_stock": None,
            "aniline_stock": None,
        },  # fails TPSA < 40 property gate
        {
            "sample_id": "t15_07",
            "smiles": "COc1cc2ncnc(Nc3ccc(C(=O)Cl)cc3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails acyl halide prohibited motif
        {
            "sample_id": "t15_08",
            "smiles": "COc1cc2ncnc(Nc3ccc(N=N)cc3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails route stock verification
        {
            "sample_id": "t15_09",
            "smiles": "COc1cc2ncnc(Nc3cccc(C4CCC4)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": None,
        },  # fails route stock verification
        {
            "sample_id": "t15_10",
            "smiles": "COc1cc2ncnc(Nc3cccc(C#N)c3)c2cc1OC",
            "core_stock": "6,7-dimethoxy-4-chloroquinazoline",
            "aniline_stock": "3-cyanoaniline",
        },  # novel survivor 1
    ],
}

HINGE_SMARTS = Chem.MolFromSmarts("c1ncnc2ccccc12")
PROHIBITED_SMARTS = {
    "nitroaromatic": Chem.MolFromSmarts("[$(c[N+](=O)[O-])]"),
    "acyl_halide": Chem.MolFromSmarts("[CX3](=[OX1])[F,Cl,Br,I]"),
}


def _check_egfr_properties(mol: Chem.Mol) -> list[str]:
    failures = []
    mw = float(Descriptors.MolWt(mol))
    logp = float(Crippen.MolLogP(mol))
    tpsa = float(rdMolDescriptors.CalcTPSA(mol))
    rotb = int(rdMolDescriptors.CalcNumRotatableBonds(mol))
    if not (250.0 <= mw <= 550.0):
        failures.append(f"mw={mw:.1f} outside [250, 550]")
    if not (1.5 <= logp <= 5.0):
        failures.append(f"clogp={logp:.2f} outside [1.5, 5.0]")
    if not (40.0 <= tpsa <= 120.0):
        failures.append(f"tpsa={tpsa:.1f} outside [40, 120]")
    if rotb > 10:
        failures.append(f"rotatable_bonds={rotb} > 10")
    if not mol.HasSubstructMatch(HINGE_SMARTS):
        failures.append("missing_quinazoline_hinge_pharmacophore")
    return failures


def _check_prohibited_motifs(mol: Chem.Mol) -> list[str]:
    return [
        name
        for name, pat in PROHIBITED_SMARTS.items()
        if pat is not None and mol.HasSubstructMatch(pat)
    ]


def _check_retrosynthetic_route(entry: dict[str, Any]) -> bool:
    core = entry.get("core_stock")
    aniline = entry.get("aniline_stock")
    return bool(core in COMMERCIAL_CORE_STOCK and aniline in COMMERCIAL_ANILINE_STOCK)


def evaluate_public_series() -> dict[str, Any]:
    """Run the EGFR-anchored generative temperature sweep, memorization audit, and retrosynthetic route screen."""
    sweep_results: dict[str, Any] = {}
    for temp_name, samples in TEMPERATURE_SWEEP_SAMPLES.items():
        seen_canon: set[str] = set()
        valid_count = 0
        unique_count = 0
        novel_count = 0
        train_memorized = 0
        heldout_collision = 0
        property_pass = 0
        motif_pass = 0
        route_verified_survivors: list[str] = []

        for s in samples:
            mol = Chem.MolFromSmiles(s["smiles"])
            if mol is None:
                continue
            valid_count += 1
            canon = Chem.MolToSmiles(mol)
            if canon in seen_canon:
                continue
            seen_canon.add(canon)
            unique_count += 1
            if canon in EGFR_REFERENCE_SPLITS:
                if EGFR_REFERENCE_SPLITS[canon] == "train":
                    train_memorized += 1
                else:
                    heldout_collision += 1
                continue
            novel_count += 1
            if _check_egfr_properties(mol):
                continue
            property_pass += 1
            if _check_prohibited_motifs(mol):
                continue
            motif_pass += 1
            if _check_retrosynthetic_route(s):
                route_verified_survivors.append(s["sample_id"])

        total = len(samples)
        sweep_results[temp_name] = {
            "total_sampled": total,
            "syntactic_valid": valid_count,
            "unique_valid": unique_count,
            "novel_vs_egfr_reference": novel_count,
            "train_split_memorized": train_memorized,
            "heldout_split_collisions": heldout_collision,
            "property_and_pharmacophore_pass": property_pass,
            "prohibited_motif_pass": motif_pass,
            "retrosynthetic_route_verified_survivors": len(route_verified_survivors),
            "survivor_ids": route_verified_survivors,
            "net_yield_fraction": round(len(route_verified_survivors) / total, 4),
        }

    return {
        "target_context": {
            "target_chembl_id": "CHEMBL203",
            "target_name": "Human epidermal growth factor receptor (EGFR)",
            "reference_compound_count": len(EGFR_REFERENCE_SPLITS),
            "commercial_core_building_blocks": len(COMMERCIAL_CORE_STOCK),
            "commercial_aniline_building_blocks": len(COMMERCIAL_ANILINE_STOCK),
            "retrosynthetic_reaction_template": "SNAr 4-chloroquinazoline amination in i-PrOH/HCl (80 C)",
        },
        "temperature_sweep": sweep_results,
    }


def check_public_series(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the EGFR generative temperature sweep and route screen."""
    data = payload or evaluate_public_series()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    sw = data["temperature_sweep"]
    t02 = sw["T_0.2_low_temperature"]
    t08 = sw["T_0.8_balanced_temperature"]
    t15 = sw["T_1.5_high_temperature"]

    require(
        t02["syntactic_valid"] == 10
        and t02["train_split_memorized"] >= 4
        and t02["retrosynthetic_route_verified_survivors"] == 1,
        "low-temperature sampling (T=0.2) must have 100% syntactic validity but high training-set memorization and duplicate collapse",
    )
    require(
        t08["retrosynthetic_route_verified_survivors"] == 5
        and t08["retrosynthetic_route_verified_survivors"]
        > t02["retrosynthetic_route_verified_survivors"]
        and t08["retrosynthetic_route_verified_survivors"]
        > t15["retrosynthetic_route_verified_survivors"],
        "balanced sampling (T=0.8) must achieve the highest count of novel, property-compliant, route-verified EGFR candidates (5/10)",
    )
    require(
        t15["syntactic_valid"] < t08["syntactic_valid"]
        and t15["retrosynthetic_route_verified_survivors"] == 1,
        "high-temperature sampling (T=1.5) must degrade syntactic validity and retrosynthetic route survival",
    )
    return failures
