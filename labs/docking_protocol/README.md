# Docking protocol teaching lab

This lab separates the seven components a docking score comes out of and works out
which reported numbers may be compared. **No docking program is run**, no
structure is prepared, and the reported numbers are illustrative rather than
results.

```bash
python labs/docking_protocol/inspect_protocol.py show
python labs/docking_protocol/inspect_protocol.py check
python labs/docking_protocol/inspect_protocol.py empirical-docking
python labs/docking_protocol/inspect_protocol.py check-empirical-docking
```

## Real-structure empirical docking (`empirical-docking`)

Alongside the protocol-card comparison (`show` / `check`), `empirical-docking`
and `check-empirical-docking` execute a deterministic, offline real-structure
scoring evaluation over the RCSB PDB EGFR co-crystal ensemble (`1M17`, `4HJO`,
`1XKK`) in `labs/docking_protocol/data/egfr_cocrystals.json`:

- **Redocking & rescoring shift (`1M17` / erlotinib `AQ4`, `157` pocket heavy
  atoms within `10` Å)**: across `28` candidate poses, the crystal pose
  (`pose_01_crystal`, RMSD `0.0` Å, `min_met793_n_distance_angstrom = 2.6991` Å,
  `0` heavy-atom clashes `< 2.4` Å) scores `-15.6194` under the empirical
  vdW + Met793 hydrogen-bond function and `-12.46` under vdW-only rescoring
  (a scale shift of `+3.1594` on the identical atomic coordinates). The top
  redocked non-crystal pose (`pose_00_near_native`, RMSD `0.3002` Å, Met793 N
  distance `2.6624` Å, `0` clashes) scores `-15.961` (`-12.88` vdW-only).
- **Cross-docking receptor-conformation penalty**: placing `4HJO` (`AQ4`, inactive-like
  EGFR) into rigid `1M17` flips the score to `+11.8116` (`5` clashes `< 2.4` Å,
  minimum distance `1.8836` Å), while placing DFG-out `1XKK` (`FMM` / lapatinib)
  into rigid `1M17` produces `+261.2519` (`31` steric clashes `< 2.4` Å, Met793
  distance `4.1362` Å).
- **Decoy enrichment (`16` candidates: `4` active hinge-binding poses vs `12`
  translated/rotated decoys)**: vdW + H-bond achieves `ROC-AUC = 1.0` and
  `EF_25% = 4.0` (`4 / 4` top hits).

## The rule

Five components move the number: search, pose generation, scoring, rescoring and
constraints. Two move what it means: decoys and validation.

Two protocols may have their scores compared only when they are identical on every
component that moves the number. **Shared units are not shared scale.**

## The cleanest case

`p-baseline` and `p-rescored` differ in exactly one component. Same search, same
pose generation, same scoring function, same constraints, same decoys, same
validation, same ligand, same structure. One applies a second scoring function to
the top pose.

They report **-8.2** and **-10.7** kcal per mole. The 2.5 gap is entirely the
protocol.

No pair in the set is comparable, and the checker names which components block
each pair.

## The two that move meaning

`p-constrained` declares no validation and no decoys. It still produces a full
column of numbers, which is why those two components are the easiest to leave out.
The lab records what it therefore cannot report: any claim that its scores behave
as scores, and any enrichment figure.

## What the checks lock

Eleven checks. A protocol that is not fully declared stops the run before any
comparison is attempted. Tests are in `labs/tests/test_docking_protocol.py`; six
are known-bad edits, including reclassifying rescoring as not moving the number,
which would make two scales look like one.

The bilingual lesson is at `site/src/content/docs/labs/docking-protocol.mdx` with
its Chinese edition under `zh-cn/`.
