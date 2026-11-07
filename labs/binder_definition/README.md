# Binder definition teaching lab

This lab turns one set of molecules into several datasets by changing only the
definitions. It reads one committed JSON file and uses RDKit for scaffolds. No
model is fitted, no compound was assayed, and nothing here is a screening
proposal.

```bash
python labs/binder_definition/inspect_definition.py show
python labs/binder_definition/inspect_definition.py check
```

## The dataset stores no classes

Twelve constructed compounds carry a hypothetical value, twelve decoys carry none, and **nothing
carries a class label**. A class is produced by a choice, and storing one would
hide the choice. A test asserts the file contains no label field.

## What each choice does

**The cutoff.** Across the declared grid the same unchanged constructed values yield
9, 8, 6, 4 and 4 positives. No measurement was performed.

**The assay uncertainty.** At the primary cutoff of 6.0 with a declared
uncertainty of 0.3, four of the twelve compounds sit within that distance of the
cutoff, on both sides. This flags sensitivity to the supplied value and cutoff. It does not specify
a probability of crossing the cutoff or demonstrate measurement noise.

**The negative class.** Measured inactives and decoys are different things.
Reported together, prevalence falls from 0.500 to 0.250 and **67% of the negative
class carries no measurement at all.** Expected precision of a random selector equals
prevalence, so the number any reported precision must beat was moved by a
decision about untested molecules.

**The generalization unit.** Twelve molecules collapse to four Bemis-Murcko
scaffolds, with three scaffolds carrying more than one molecule. One compound is
acyclic and has **no scaffold at all**, so the unit is undefined rather than
coarse, and the lab reports that instead of assigning one. At the primary cutoff
the six positives sit on three scaffold groups. These counts describe
grouping, not an established number of statistically independent replicates.

## What it does not do

It fits no model and reports no performance. Every number moved because a
definition moved, which is the point: a benchmark can be made easier or harder
without touching a molecule.

It also does not rank the choices. A decoy set is a legitimate tool when its
assumption is stated. The failure is reporting decoys and measured inactives under
one word and quoting a metric over the union.

## What the checks lock

Sixteen checks. Tests are in `labs/tests/test_binder_definition.py`; six are
known-bad edits. Two of those found weak checks rather than broken ones: an assay
with zero declared uncertainty made every class look determined, and a scaffold
collapse test was satisfied merely by an acyclic molecule dropping out rather
than by any real sharing. Both checks were strengthened.

The bilingual lesson is at
`site/src/content/docs/labs/binder-definition.mdx` with its Chinese edition under
`zh-cn/`.

## Real-data ChEMBL 37 EGFR binder classifier and negative-class audit (`public-binders`)

To fit and evaluate a Morgan-fingerprint (`128` bits, `radius = 2`) + physicochemical logistic binder classifier (`alpha = 0.2`, `400` gradient steps) across `24` real ChEMBL 37 human EGFR (`CHEMBL203`) compounds (`16` train, `8` test across `15` Bemis-Murcko scaffolds, primary cutoff $pIC_{50} \ge 7.0$, assay uncertainty $\pm 0.30$ log units) and `8` property-matched untested decoys (`DECOY_CHEMBL192` through `DECOY_CHEMBL1790`):

```bash
.venv/bin/python labs/binder_definition/inspect_definition.py public-binders
.venv/bin/python labs/binder_definition/inspect_definition.py check-public-binders
```

Observed real-data summary (verified 2026-11-07):
- Cutoff grid sensitivity across `24` real measured EGFR compounds: `18` (`6.0`), `14` (`6.5`), `12` (`7.0`), `9` (`7.5`), and `4` (`8.0`) positives; `4` real compounds (`CHEMBL1173655`, `CHEMBL24828`, `CHEMBL101253`, `CHEMBL365756`) sit within $\pm 0.30$ log units of the `7.0` primary cutoff.
- Held-out test evaluation across three negative-class definitions:
  - `measured_inactives_only` (`4` actives vs `4` measured inactives, `prevalence = 0.5`, `never_measured_negative_share = 0.0`): `roc_auc = 0.75`, `precision_at_0_5 = 0.6667`, `recall_at_0_5 = 1.0`, `false_positive_rate_at_0_5 = 0.5`.
  - `untested_decoys_only` (`4` actives vs `8` untested decoys, `prevalence = 0.3333`, `never_measured_negative_share = 1.0`): `roc_auc = 0.875`, `precision_at_0_5 = 0.8`, `recall_at_0_5 = 1.0`, `false_positive_rate_at_0_5 = 0.125`.
  - `pooled_measured_and_decoys` (`4` actives vs `4` measured inactives + `8` untested decoys, `prevalence = 0.25`, `never_measured_negative_share = 0.6667`): `roc_auc = 0.8333`, `precision_at_0_5 = 0.5714`, `recall_at_0_5 = 1.0`, `false_positive_rate_at_0_5 = 0.25`.
