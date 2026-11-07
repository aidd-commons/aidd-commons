# Design space teaching lab

This lab enumerates three declared candidate spaces exactly and tests four target
molecules against each. It reads one committed JSON file and uses RDKit to build
and canonicalise. **No molecule here is a design proposal** and no space is a real
screening library.

```bash
python labs/design_space/inspect_space.py show
python labs/design_space/inspect_space.py check
python labs/design_space/inspect_space.py public-spaces
python labs/design_space/inspect_space.py check-public-spaces
```

## Real-data multi-representation design spaces (`public-spaces`)

Alongside the three-core enumeration comparison (`show` / `check`),
`public-spaces` and `check-public-spaces` compare three real-data design space
formulations over `6` ChEMBL 37 EGFR inhibitors (`CHEMBL53711`, `CHEMBL299679`,
`CHEMBL553`, `CHEMBL939`, `CHEMBL2177370`, `CHEMBL1201583`) and the `1M17`
crystal pocket:

- **`2d_snar_fragment_space` (`16` enumerated molecules, `2` 4-chloroquinazoline
  cores × `8` commercial anilines)**: reaches `4` real quinazoline EGFR
  inhibitors (`CHEMBL53711`, `CHEMBL299679`, `CHEMBL553` / erlotinib,
  `CHEMBL939` / gefitinib) but misses `CHEMBL2177370` (`3-cyanoquinoline` core
  hop) and `CHEMBL1201583` (`lapatinib`).
- **`1d_token_grammar_space` (`16` enumerated SMILES strings, `2` alkoxy heads ×
  `2` hinge ring grammars × `4` tail tokens)**: reaches `3` targets (`CHEMBL939`,
  `CHEMBL2177370`, `CHEMBL1201583`), capturing the `N3 -> C-C#N` core hop
  (`CHEMBL2177370`) that the fixed-core 2D fragment space cannot express.
- **`3d_1m17_active_pocket_space` (`6` targets evaluated in the `1M17` active
  conformation)**: admits all `5` Type-I active-state inhibitors (`CHEMBL53711`
  Met793 N distance `2.9842` Å, `CHEMBL299679` `2.9843` Å, `CHEMBL553` `2.9862` Å,
  `CHEMBL939` `2.9831` Å, `CHEMBL2177370` `2.9904` Å; `0` heavy-atom clashes
  `< 2.4` Å) while rejecting the DFG-out inhibitor `CHEMBL1201583` (`lapatinib`,
  Met793 distance `3.3522` Å, `31` heavy-atom clashes `< 2.4` Å).

## Size and reach are different properties

A space is a construction plus its inputs. **The inputs decide how much of it
there is. The construction decides what is reachable.** Only the first is usually
reported.

| space               | nominal size | construction                          |
| ------------------- | ------------ | ------------------------------------- |
| `enumeration`       | 25           | one fixed core, two attachment points |
| `enumeration_grown` | 100          | the same core, longer lists           |
| `scaffold_hop`      | 25           | a different core, the original lists  |

## What growing bought

Going from 25 to 100 reached `t2` and left `t3` and `t4` exactly as unreachable as
before. **The core never changed, and no amount of substituent buys a new core.**

`t3` differs from a reachable molecule by **one atom in the ring**. It is
unreachable in both enumeration spaces at any list size, and reachable in the
third space, which is the same nominal size as the first.

The third space and the grown space **share no member at all**. Two spaces can be
disjoint without either being larger.

`t4` changes the linker and is reachable in none of the three. That is a statement
about these three constructions and nothing else.

## What reachability is not

Reachable means the construction can write the molecule down. It says nothing
about whether the molecule can be made, whether it would be stable, or whether it
is worth making. **A space is a generator, not a plan.**

## What the checks lock

Thirteen checks, including that every nominal size is recomputed as the product of
its input lists rather than read from a stated number, and that every declared
product actually builds so no space is quietly smaller than its inputs.

Tests are in `labs/tests/test_design_space.py`; seven are known-bad edits. The
bilingual lesson is at `site/src/content/docs/labs/design-space.mdx` with its
Chinese edition under `zh-cn/`.
