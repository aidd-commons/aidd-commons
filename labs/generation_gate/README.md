# Generation gate teaching lab

This lab covers the two decisions that surround a generative run: what the
objective was, frozen before any candidate existed, and which of six gates each
candidate survived. It runs no generative model, makes no network request, and
proposes nothing for synthesis or measurement.

Run from the repository root:

```bash
python labs/generation_gate/inspect_gate.py objective
python labs/generation_gate/inspect_gate.py screen
python labs/generation_gate/inspect_gate.py check
python labs/generation_gate/inspect_gate.py public-series
python labs/generation_gate/inspect_gate.py check-public-series
```

## Real-data ChEMBL 37 EGFR & USPTO SNAr series audit (`public-series`)

Alongside the authored 20-candidate teaching funnel (`objective` / `screen` /
`check`), `public-series` and `check-public-series` evaluate `30` generated
candidates (`10` each at sampling temperatures `T = 0.2`, `T = 0.8`, and
`T = 1.5`) against `7` real ChEMBL 37 human EGFR (`CHEMBL203`) inhibitors and a
commercial 4-chloroquinazoline + aniline nucleophilic aromatic substitution
(SNAr, `80` °C) building-block deck (`4` cores × `8` anilines):

- **`T_0.2_low_temperature` (`10` sampled)**: `10` syntactic valid (`1.0`), `5`
  unique (`0.5`), `1` novel (`4` `train` split memorized, `0` held-out test
  collisions), `1` property pass, `1` motif pass, and `1` retrosynthetic
  route-verified survivor (`t02_09`, net yield `0.1`).
- **`T_0.8_balanced_temperature` (`10` sampled)**: `10` syntactic valid (`1.0`),
  `10` unique (`1.0`), `8` novel (`1` `train` split memorized, `1` `test` split
  collision), `6` property pass, `5` motif pass, and `5` retrosynthetic
  route-verified survivors (`t08_01` to `t08_05`, net yield `0.5`).
- **`T_1.5_high_temperature` (`10` sampled)**: `6` syntactic valid (`0.6`), `6`
  unique (`1.0` of valid), `6` novel (`0` memorized), `4` property pass, `3`
  motif pass, and `1` retrosynthetic route-verified survivor (`t15_10`, net
  yield `0.1`).

Unlike the other offline inspectors in this repository, this one requires RDKit,
because the gates are computed from structures rather than read from a record.
Nothing else outside the standard library is used.

## Files

| File              | What it is                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `objective.json`  | The frozen design objective: target context, desired properties, prohibited motifs, synthesis limits and the experimental decision |
| `candidates.json` | Twenty candidates authored by hand, each labelled with the single gate it was written to exercise                                  |
| reference set     | `labs/freesolv/results/splits/scaffold.csv`, the committed 642-molecule split table from the completed FreeSolv lab                |

No generative model produced the candidates. The `constructed_for` label is a
teaching annotation: gates are computed from structure, and a test asserts that
relabelling every candidate changes no gate outcome.

## What the two halves teach

The objective is checked for the fields that make each part applicable. A
property without a two-sided bound is a wish, a prohibited motif whose SMARTS
does not compile silently stops excluding anything, and an objective with no
experimental decision cannot say what a passing candidate is for. When the
objective fails these checks the screen is not run against it, because an
uncheckable objective cannot be applied.

The screen applies six gates in order, and every gate's denominator is the
previous gate's survivors. That is why the single headline figure and the
survivor count differ so widely on the committed set. Two further points are
printed rather than left to be inferred: memorization is the novelty gate applied
to a narrower reference set rather than a seventh gate, and route feasibility is
recorded as `not_assessed` because structural proxies cannot establish it.

## What the checks lock

Seventeen checks. Tests are in `labs/tests/test_generation_gate.py`; eleven of
them are known-bad edits covering an objective that drops its decision, a bound
retrofitted so a stopped candidate would pass, a misdeclared reference set size,
and a claim of route feasibility from proxies alone.

The bilingual lesson is at
`site/src/content/docs/labs/generation-gate.mdx` with its Chinese edition under
`zh-cn/`.
