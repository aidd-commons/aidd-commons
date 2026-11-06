"""Verify prepared teaching projections against their retained source objects.

Reads existing inputs only. No fitting, evaluation, download, protocol mutation
or checksum calculation. This check is separate from asset generation.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
from rdkit import Chem, rdBase
from rdkit.Chem import Descriptors, rdFingerprintGenerator, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).parent
sys.path.insert(0, str(ROOT / "labs/egfr_structures"))
import cif  # noqa: E402


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text())


def check_egfr(projection: dict) -> list[str]:
    problems = []
    manifest = cif.manifest()
    expected = {record["id"]: record for record in manifest["entries"]}
    observed = projection.get("entries", [])
    if projection.get("units") != "angstrom":
        problems.append("EGFR: coordinate unit must be angstrom")
    if len(observed) != len(expected) or {entry.get("id") for entry in observed} != set(expected):
        problems.append("EGFR: projection must cover every retained manifest entry exactly once")
    for item in observed:
        identifier = item.get("id")
        if identifier not in expected:
            problems.append("EGFR: unknown entry " + str(identifier))
            continue
        record = expected[identifier]
        entry = cif.load_entry(record)
        selection = [atom for atom in entry.protein() if atom.name == "CA"] + entry.ligand(
            record["ligand"]
        )
        atoms = item.get("atoms", [])
        if len(atoms) != len(selection):
            problems.append(identifier + ": projected atom count differs from the source selection")
            continue
        for index, (atom, source) in enumerate(zip(atoms, selection, strict=True)):
            if (
                atom.get("xyz") != list(source.xyz)
                or atom.get("name") != source.name
                or atom.get("element") != source.element
                or atom.get("chain") != source.chain
                or atom.get("author_seq") != source.seq
            ):
                problems.append(
                    identifier
                    + ": atom "
                    + str(index)
                    + " identity/coordinates differ from the retained CIF"
                )
            mapped = (
                entry.to_reference(source.chain, source.seq) if source.group == "ATOM" else None
            )
            if atom.get("reference_seq") != mapped:
                problems.append(identifier + ": reference-sequence mapping differs")
        for first, second in item.get("links", []):
            if not (0 <= first < len(atoms) and 0 <= second < len(atoms)):
                problems.append(identifier + ": link endpoint is outside the selected atoms")
                continue
            a, b = atoms[first], atoms[second]
            if a["kind"] == "backbone" and (
                b["kind"] != "backbone"
                or a["chain"] != b["chain"]
                or abs(a["author_seq"] - b["author_seq"]) != 1
            ):
                problems.append(identifier + ": C-alpha link crosses a missing stretch or chain")
        if (
            item.get("ligand") != record["ligand"]
            or item.get("retrieved_on") != manifest["retrieved_on"]
        ):
            problems.append(identifier + ": ligand or source-date metadata differs")
        for contact in item.get("contacts", []):
            group = [
                atom
                for atom in entry.protein()
                if atom.chain == contact["chain"] and atom.seq == contact["author_seq"]
            ]
            ligand = entry.ligand(record["ligand"])
            if not group:
                problems.append(identifier + ": contact has no source residue")
                continue
            distance = min(cif.distance(a.xyz, b.xyz) for a in group for b in ligand)
            if distance != contact.get("minimum_distance_angstrom") or distance > 5.0:
                problems.append(
                    identifier
                    + ": contact minimum distance differs from the source geometry/cutoff"
                )
    return problems


def check_geometry(projection: dict) -> list[str]:
    problems = []
    if projection.get("units") != "angstrom" or not projection.get("frames"):
        return ["rMD17: nonempty coordinate frames in angstrom are required"]
    if {frame.get("source_row") for frame in projection["frames"]} != {0, 50, 100}:
        problems.append("rMD17: unexpected geometry-only source-row selection")
    with np.load(
        ROOT / "labs/rmd17_system_state/data/rmd17_ethanol.npz", allow_pickle=False
    ) as source:
        coords = source["coords"]
        charges = source["nuclear_charges"]
        for frame in projection["frames"]:
            atoms = frame.get("atoms", [])
            row = frame.get("source_row")
            if row not in (0, 50, 100) or len(atoms) != len(charges):
                problems.append("rMD17: frame identity or atom count differs")
                continue
            for index, atom in enumerate(atoms):
                if (
                    atom.get("xyz") != coords[row, index].tolist()
                    or atom.get("element") != {1: "H", 6: "C", 8: "O"}[int(charges[index])]
                ):
                    problems.append(
                        "rMD17: atom coordinate or element differs from retained source row"
                    )
            if any(key in frame for key in ("energies", "forces", "predictions", "partition")):
                problems.append(
                    "rMD17: geometry projection must not export labels, predictions or partition "
                    "membership"
                )
    return problems


def check_molecules(projection: dict) -> list[str]:
    problems = []
    notebook = (ROOT / "labs/molecule_representations/build_notebooks.py").read_text()
    inputs = dict(re.findall(r'MoleculeInput\(\s*"([^"]+)",\s*"([^"]+)"', notebook))
    expected = {
        "pyridine": inputs["pyridine-aromatic"],
        "alanine-one": inputs["alanine-one"],
        "alanine-two": inputs["alanine-two"],
    }
    candidates = json.loads((ROOT / "labs/generation_gate/candidates.json").read_text())[
        "candidates"
    ]
    expected.update(
        {
            "generation-" + row["id"]: row["smiles"]
            for row in candidates
            if row["id"] in ("c01", "c02", "c03")
        }
    )
    route = json.loads((ROOT / "labs/retro_disconnection/routes.json").read_text())["routes"][0]
    expected.update(
        {
            "retro-product": route["product"],
            "retro-acid": route["recorded_reactants"][0],
            "retro-amine": route["recorded_reactants"][1],
        }
    )
    if projection.get("rdkit_version") != rdBase.rdkitVersion:
        problems.append(
            "Molecules: installed RDKit differs from the prepared descriptor/encoding version"
        )
    if projection.get("morgan") != {"radius": 2, "bits": 2048, "chirality": True}:
        problems.append("Molecules: Morgan settings differ from the representation exercise")
    if {row.get("id") for row in projection.get("molecules", [])} != set(expected):
        problems.append("Molecules: projection does not cover the declared authored examples")
    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=2, fpSize=2048, includeChirality=True
    )
    for row in projection.get("molecules", []):
        if row.get("input_smiles") != expected.get(row.get("id")):
            problems.append("Molecules: input differs from its authored lab source")
            continue
        mol = Chem.MolFromSmiles(row["input_smiles"])
        if mol is None:
            problems.append("Molecules: invalid structure")
            continue
        calculated = {
            "canonical_smiles": Chem.MolToSmiles(mol, isomericSmiles=True),
            "atoms": mol.GetNumAtoms(),
            "bonds": mol.GetNumBonds(),
            "formula": rdMolDescriptors.CalcMolFormula(mol),
            "molecular_weight": Descriptors.MolWt(mol),
            "tpsa": rdMolDescriptors.CalcTPSA(mol),
            "morgan_on_bits": list(generator.GetFingerprint(mol).GetOnBits()),
        }
        for key, value in calculated.items():
            if row.get(key) != value:
                problems.append(
                    str(row["id"]) + ": " + key + " differs from the declared label-free encoding"
                )
    return problems


def main() -> int:
    problems = (
        check_egfr(load("egfr-coordinates.json"))
        + check_geometry(load("rmd17-geometry.json"))
        + check_molecules(load("molecules.json"))
    )
    if problems:
        print("\n".join(problems))
        return 1
    print(
        "Checked 3 retained EGFR entries, 3 geometry-only rMD17 source rows and 9 "
        "authored molecule encodings against their source inputs; no scientific "
        "result rerun."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
