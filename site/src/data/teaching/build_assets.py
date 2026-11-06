"""Prepare small scientific teaching projections; never fit or rerun a lab.

Run explicitly from the repository root with the pinned lab environment:
    .venv/bin/python site/src/data/teaching/build_assets.py

PNG assets are depictions, not experimental images. Coordinates are copied from
existing CC0 inputs. Frozen protocols, labels and result summaries are read-only.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from rdkit import Chem, rdBase
from rdkit.Chem import Descriptors, Draw, rdFingerprintGenerator, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / "site/src/assets/teaching"
sys.path.insert(0, str(ROOT / "labs/egfr_structures"))
import cif  # noqa: E402


def write_json(name: str, value: object) -> None:
    (Path(__file__).parent / name).write_text(json.dumps(value, indent=2) + "\n")


def project(points: list[list[float]], width: int = 760, height: int = 440):
    xyz = np.asarray(points, dtype=float)
    xyz -= xyz.mean(axis=0)
    # A fixed orthographic view, used only for the static preview.
    yaw, pitch = 0.65, -0.35
    x, y, z = xyz.T
    xx = x * math.cos(yaw) + z * math.sin(yaw)
    zz = -x * math.sin(yaw) + z * math.cos(yaw)
    yy = y * math.cos(pitch) - zz * math.sin(pitch)
    scale = min((width - 100) / max(np.ptp(xx), 1), (height - 70) / max(np.ptp(yy), 1))
    return [(width / 2 + a * scale, height / 2 - b * scale) for a, b in zip(xx, yy, strict=True)]


def preview(name: str, atoms: list[dict], links: list[list[int]], protein: bool = False):
    image = Image.new("RGB", (760, 440), "#f8fafb")
    draw = ImageDraw.Draw(image)
    xy = project([a["xyz"] for a in atoms])
    for a, b in links:
        draw.line((*xy[a], *xy[b]), fill="#98abb4" if protein else "#73818a", width=3)
    for index, atom in enumerate(atoms):
        if protein and atom.get("kind") == "backbone":
            continue
        x, y = xy[index]
        radius = 5 if atom["element"] == "H" else 7
        fill = {
            "C": "#4b606c",
            "N": "#345f9e",
            "O": "#b94e54",
            "S": "#a78324",
            "F": "#358363",
            "CL": "#358363",
            "H": "#eef2f4",
        }.get(atom["element"], "#64748b")
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius), fill=fill, outline="#344653", width=1
        )
    image.save(ASSETS / name)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    # Exact structures from the existing authored representation/generation labs.
    molecule_inputs = [
        ("pyridine", "n1ccccc1"),
        ("alanine-one", "N[C@@H](C)C(=O)O"),
        ("alanine-two", "N[C@H](C)C(=O)O"),
        ("generation-c01", "CCOc1ccc(C)cc1"),
        ("generation-c02", "CCOC(=O)C(C)C"),
        ("generation-c03", "OCc1ccccc1F"),
        ("retro-product", "CC(=O)Nc1ccccc1"),
        ("retro-acid", "CC(=O)O"),
        ("retro-amine", "Nc1ccccc1"),
    ]
    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=2, fpSize=2048, includeChirality=True
    )
    molecules = []
    for identifier, smiles in molecule_inputs:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError(identifier)
        options = Draw.MolDrawOptions()
        options.bondLineWidth = 2.2
        options.clearBackground = True
        Draw.MolToFile(mol, str(ASSETS / (identifier + ".png")), size=(560, 320), options=options)
        molecules.append(
            {
                "id": identifier,
                "input_smiles": smiles,
                "canonical_smiles": Chem.MolToSmiles(mol, isomericSmiles=True),
                "atoms": mol.GetNumAtoms(),
                "bonds": mol.GetNumBonds(),
                "formula": rdMolDescriptors.CalcMolFormula(mol),
                "molecular_weight": Descriptors.MolWt(mol),
                "tpsa": rdMolDescriptors.CalcTPSA(mol),
                "morgan_on_bits": list(generator.GetFingerprint(mol).GetOnBits()),
            }
        )
    write_json(
        "molecules.json",
        {
            "prepared_on": "2026-10-26",
            "rdkit_version": rdBase.rdkitVersion,
            "scope": (
                "Label-free depictions and encodings of existing authored teaching inputs; no "
                "activity labels, model fitting or generative run."
            ),
            "morgan": {"radius": 2, "bits": 2048, "chirality": True},
            "molecules": molecules,
        },
    )

    manifest = cif.manifest()
    failures = cif.mismatched_files(manifest)
    if failures:
        raise ValueError(failures)
    entries = []
    for record in manifest["entries"]:
        entry = cif.load_entry(record)
        ligand = entry.ligand(record["ligand"])
        backbone = [a for a in entry.protein() if a.name == "CA"]
        atoms = [
            {
                "element": a.element,
                "xyz": list(a.xyz),
                "name": a.name,
                "residue": a.resname,
                "chain": a.chain,
                "author_seq": a.seq,
                "reference_seq": entry.to_reference(a.chain, a.seq),
                "kind": "backbone",
            }
            for a in backbone
        ]
        links = [
            [i - 1, i]
            for i in range(1, len(backbone))
            if backbone[i].chain == backbone[i - 1].chain
            and backbone[i].seq - backbone[i - 1].seq == 1
            and cif.distance(backbone[i].xyz, backbone[i - 1].xyz) < 4.5
        ]
        ligand_start = len(atoms)
        atoms.extend(
            {
                "element": a.element,
                "xyz": list(a.xyz),
                "name": a.name,
                "residue": a.resname,
                "chain": a.chain,
                "author_seq": a.seq,
                "reference_seq": None,
                "kind": "ligand",
            }
            for a in ligand
        )
        links.extend([[a + ligand_start, b + ligand_start] for a, b in sorted(cif.bonds(ligand))])
        contacts = []
        groups = {}
        for atom in entry.protein():
            key = (atom.chain, atom.seq, atom.resname)
            groups.setdefault(key, []).append(atom)
        for (chain, seq, residue), group in groups.items():
            gap = min(cif.distance(a.xyz, b.xyz) for a in group for b in ligand)
            if gap <= 5.0:
                contacts.append(
                    {
                        "chain": chain,
                        "author_seq": seq,
                        "reference_seq": entry.to_reference(chain, seq),
                        "residue": residue,
                        "minimum_distance_angstrom": gap,
                        "atoms": [
                            {"element": a.element, "name": a.name, "xyz": list(a.xyz)}
                            for a in group
                        ],
                    }
                )
        contacts.sort(key=lambda r: (r["reference_seq"] or 0, r["chain"]))
        item = {
            "id": record["id"],
            "ligand": record["ligand"],
            "ligand_name": record["ligand_name"],
            "resolution_angstrom": float(entry.one("_refine", "ls_d_res_high")),
            "source_url": "https://www.rcsb.org/structure/" + record["id"],
            "retrieved_on": manifest["retrieved_on"],
            "atoms": atoms,
            "links": links,
            "contacts": contacts,
            "primary_citation": entry.categories.get("_citation", [])[0],
        }
        entries.append(item)
        preview("egfr-" + record["id"].lower() + ".png", atoms, links, True)
    write_json(
        "egfr-coordinates.json",
        {
            "prepared_on": "2026-10-26",
            "units": "angstrom",
            "selection": (
                "First model; alternate location absent or A, exactly as the maintained "
                "inspector. C-alpha trace excludes breaks; ligand heavy atoms. Contacts are "
                "minimum heavy-atom distances within the declared 5 angstrom cutoff. Ligand "
                "lines use the inspector's geometric bond heuristic, without bond orders. No "
                "protonation, docking or minimisation."
            ),
            "licence": "CC0 1.0 PDB archive data",
            "entries": entries,
        },
    )

    # Geometry-only source rows. These are not the frozen protocol's selected
    # memberships and no energy, force, time or prediction is exported.
    path = ROOT / "labs/rmd17_system_state/data/rmd17_ethanol.npz"
    if not path.is_file():
        raise FileNotFoundError(
            "The existing rMD17 ethanol cache is needed to deliberately regenerate this "
            "geometry-only projection."
        )
    with np.load(path, allow_pickle=False) as data:
        charges = data["nuclear_charges"]
        coords = data["coords"]
        frames = []
        for source_row in [0, 50, 100]:
            atoms = [
                {
                    "element": {1: "H", 6: "C", 8: "O"}[int(charge)],
                    "xyz": list(map(float, xyz)),
                    "name": str(i + 1),
                    "kind": "atom",
                }
                for i, (charge, xyz) in enumerate(zip(charges, coords[source_row], strict=True))
            ]
            # Distance guides are explicitly not assigned chemical bonds.
            links = [
                [a, b]
                for a in range(len(atoms))
                for b in range(a + 1, len(atoms))
                if math.dist(atoms[a]["xyz"], atoms[b]["xyz"]) < 1.7
            ]
            frames.append({"source_row": source_row, "atoms": atoms, "links": links})
            preview("rmd17-ethanol-" + str(source_row) + ".png", atoms, links)
    write_json(
        "rmd17-geometry.json",
        {
            "prepared_on": "2026-10-26",
            "source": "rMD17 Figshare 12672038 version 4; existing rmd17_ethanol.npz",
            "licence": "CC0",
            "units": "angstrom",
            "selection": (
                "Source rows 0, 50, 100 for geometry illustration only. They are not declared "
                "train/evaluation memberships; no time scale, energy, forces or predictions "
                "are exported. Lines are distance guides below 1.7 angstrom, not assigned "
                "bond orders."
            ),
            "frames": frames,
        },
    )
    print(
        "Prepared",
        len(molecules),
        "molecule depictions,",
        len(entries),
        "EGFR coordinate views and",
        len(frames),
        "geometry-only rMD17 frames.",
    )


if __name__ == "__main__":
    main()
