# Label-free small-molecule representation inspector

This is an editable student exercise, not a model-training or benchmark protocol.
It uses seven authored teaching examples and does not download molecular data,
load activity labels, fit a model, define a split, or report predictive
performance. It is separate from the completed FreeSolv, ChEMBL, rMD17, and
pool-budget results.

It shows that a molecular string, a standardized entity, a fingerprint, a
descriptor vector, a graph, and a conformer are different computational objects.
A descriptor or fingerprint is not an experimental property.

## Notebook first

Use the English [representation inspector](representation_inspector.ipynb) or
the Chinese [representation inspector](representation_inspector.zh-CN.ipynb).
The two files have identical executable cells and clean saved outputs.

For hosted use, download one notebook and choose **File > Upload notebook** in
Google Colab. Do not clone a repository or run a helper CLI. Local Jupyter is
also suitable. The first cell requires Python 3.11 or newer and checks for
RDKit 2025.9.6. It installs that exact version only when it is absent or differs.
If an installation changes RDKit, restart the runtime and rerun from the first
cell. The notebook has not been verified in Colab.

The repository test executes both notebook editions in isolated local `nbclient`
kernels. It compares the retained seven-record JSON report with the canonical
`build_report` output, asserts actual SVG and HTML-table output, checks that one
valid added example yields eight records, and verifies malformed SMILES fails
closed. This is local verification only; Colab remains unverified.

No GPU is needed. With the pinned dependency already present, the seven-molecule
exercise is normally a short CPU task. The examples are inline, so no dataset
download or account is needed.

## What to verify

- The Kekule and aromatic pyridine strings resolve to the same RDKit canonical
  isomeric SMILES and InChIKey. This is toolkit-scoped canonicalization, not a
  promise that every toolkit emits the same canonical string.
- The two defined alanine enantiomers have different isomeric SMILES and
  InChIKeys. Non-isomeric SMILES collapses that distinction.
- The unspecified alanine record is not silently assigned to either
  enantiomer.
- Sodium acetate remains a two-component record. The lab does not silently
  choose a fragment parent, neutralize it, or merge it with acetic acid.
- A Morgan bit vector reports occupied hashed positions, while the count form
  records nonzero hashed features. Neither value is an experimental property.

The notebook embeds the tested canonical inspection dataclasses and functions,
with Morgan radius 2, 2,048 bits, and chirality enabled. It shows comparison
tables, molecule SVGs, the mechanism behind these observations, and independent
questions with answers. Invalid input such as `not-a-smiles` raises a visible
`RepresentationInputError`; it is not silently removed.

## Interpretation boundary

Canonicalization does not standardize protonation, salt form, tautomer state,
or stereochemical uncertainty. Descriptor definitions and canonical SMILES can
also change between toolkit releases, so the version in the output is part of
the result. A 2D inspection cannot establish a bioactive conformation, binding
pose, affinity, efficacy, safety, or synthesizability.

For the underlying syntax and implementations, see the
[OpenSMILES specification source](https://github.com/opensmiles/OpenSMILES/blob/master/opensmiles.asciidoc), the
[IUPAC InChI project](https://iupac.org/who-we-are/divisions/division-details/inchi/),
the [RDKit Book](https://www.rdkit.org/docs/RDKit_Book.html), and the
[RDKit Python guide](https://www.rdkit.org/docs/GettingStartedInPython.html).

## Output and reset boundary

The final notebook cell creates a fresh directory beneath the notebook's current
working directory and exclusively creates `representation-report.json` inside
it. It prints the exact path and displays a notebook-relative download link. The
same directory is visible in the notebook file browser. Download the report before
ending a temporary runtime; delete the generated directory yourself when it is no
longer needed. It never reads or changes author
caches, result directories, or frozen protocol artifacts. Restarting a notebook
runtime removes in-memory state; run the cells again in order after a reset.

## Real-data 3D conformer ensemble and 2D/3D graph message-passing assessment (`conformers-and-graphs`)

To evaluate RDKit ETKDGv3 + MMFF94 3D conformer ensembles (`8` conformers per drug at `298.15 K`, `RT = 0.5925 kcal/mol`), Boltzmann-weighted 3D descriptors (`RadiusOfGyration`, `Asphericity`), unsigned 3D distance-matrix reflection collapse versus signed chiral tetrahedral volume, and 2-layer 2D topological versus 3D chiral graph message-passing encodings across `5` real clinical drug records from ChEMBL 37 (`CHEMBL553` erlotinib, `CHEMBL939` gefitinib, `CHEMBL3353410` osimertinib, `CHEMBL1431_R` `(R)-thalidomide`, `CHEMBL1431_S` `(S)-thalidomide`):

```sh
.venv/bin/python labs/molecule_representations/run_lab.py conformers-and-graphs
.venv/bin/python labs/molecule_representations/run_lab.py check-conformers-and-graphs
```

Observed real-data summary (verified 2026-11-07):
- **3D conformer ensemble flexibility**: Flexible EGFR inhibitors `erlotinib` (`10` rotatable bonds, `2.304` Å max heavy-atom RMSD, `4.2871` kcal/mol MMFF94 energy span, Boltzmann $R_g = 4.8658$ Å vs lowest-energy $4.9111$ Å) and `osimertinib` (`10` rotatable bonds, `3.4400` Å max RMSD, `18.3368` kcal/mol span, Boltzmann $R_g = 5.5744$ Å) exhibit substantially broader 3D conformational diversity than rigid chiral `(R)-thalidomide` (`1` rotatable bond, `1.8385` Å max RMSD, `3.7284` kcal/mol span, Boltzmann $R_g = 3.1949$ Å).
- **3D distance-matrix reflection collapse vs signed chiral volume**: `(R)-thalidomide` and `(S)-thalidomide` have identical unsigned mean 3D interatomic distances (`4.1006` Å, difference `0.0` Å) and identical 2D topological graph embeddings (`enantiomer_2d_topological_graph_l2_distance = 0.0`), whereas their CIP-ordered signed tetrahedral volumes have opposite signs (`+2.4273` Å³ vs `-2.4273` Å³), separating their 3D chiral graph encodings (`enantiomer_3d_chiral_graph_l2_distance = 1.6755`).
- **Graph permutation invariance**: Reversing atom numbering across all `5` drugs yields `max_atom_permutation_invariance_diff = 0.0`.
