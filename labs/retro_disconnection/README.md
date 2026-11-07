# Retrosynthetic disconnection teaching lab

This lab compares disconnection families and keeps route recovery apart from
laboratory feasibility. It reads two committed JSON files and applies reaction
SMARTS with RDKit. No model is trained or executed, no reaction is run, and
nothing here is a synthesis proposal.

```bash
python labs/retro_disconnection/inspect_disconnection.py compare
python labs/retro_disconnection/inspect_disconnection.py check
python labs/retro_disconnection/inspect_disconnection.py public-records
python labs/retro_disconnection/inspect_disconnection.py check-public
```

## Public reaction records, atom maps, route trees and HTE feedback

Alongside the ten constructed routes (`routes.json` and `methods.json`), the
committed snapshot in `labs/src/aidd_commons/retro_disconnection/__init__.py`
and `labs/src/aidd_commons/retro_disconnection/public_synthesis_audit.py`
evaluates real public synthesis records across all five Track 14 tasks:

1. **Reaction records and modelling unit (`t14-reaction-record-condition-unit`)**:
   12 Suzuki-Miyaura HTE records from Perera et al. (*Science* 2018,
   `doi:10.1126/science.aap9112`) for the shared biaryl product
   `Cc1ccc2c(cnn2C2CCCCO2)c1-c1ccc2ncccc2c1` (yields `0.0000` to `0.9029`,
   span `0.9029`, with `9/12` carrying internal standard `CCc1cccc(CC)c1` and
   `3/12` reversed-polarity well-plate records omitting it) plus 24
   Buchwald-Hartwig HTE records from Ahneman et al. (*Science* 2018,
   `doi:10.1126/science.aar5169`, `1536-well` plate at `60.0` °C for `16.0` h
   in DMSO, where `Brc1cccnc1` spans `0.00%` to `98.73%` across ligands, bases
   and isoxazole additives).
2. **Atom mapping, bond edits and template extraction (`t14-atom-mapping-transformation-class`)**:
   3 USPTO atom-mapped reactions and extracted `RetroTemplate` SMARTS from
   `MolecularAI/aizynthfinder` (`test_reactions_template.csv`), verifying bond
   edits (`(8, 9)` for amide coupling vs `(7, 8)` for aryl-Cl amidation),
   unmapped leaving groups (`Cl`, `N`), RDKit reactant recovery, and mapping
   error propagation when swapping product aromatic carbons `:7` and `:18`.
3. **Single-step and multi-step retrosynthetic disconnection (`t14-retrosynthetic-disconnection`)**:
   3 real AiZynthFinder route trees (`routes_for_clustering.json`) for the
   acridine-thiourea target `Cc1ccc2nc3ccccc3c(Nc3ccc(NC(=S)Nc4ccccc4)cc3)c2c1`
   plus `linear_route.json` (`2` steps, depth `2`, `3` in-stock leaves) versus
   `branched_route.json` (`4` steps, depth `3`, `5` leaves with `O` out of stock).
4. **Route feasibility and material safety (`t14-route-feasibility-material-safety`)**:
   Separates `acridine_route_0` (`1` step convergent SNAr, all leaves in stock,
   no unprotected diamine or self-reactive haloaniline) from `acridine_route_1`
   (unprotected `Nc1ccc(N)cc1` symmetric diamine bis-arylation risk) and
   `acridine_route_2` (`Nc1ccc(Br)cc1` 4-bromoaniline self-condensation risk),
   and contrasts USPTO acyl-chloride acylation (`0` competing aryl-halide sites)
   with Buchwald-Hartwig amidation on `Fc1c(Cl)cccc1C#N` (`2` competing sites).
5. **Forward condition modelling and HTE laboratory feedback (`t14-forward-reaction-lab-feedback`)**:
   Compares leave-one-out Ridge MAE on the 24 Ahneman HTE records between a
   substrate-only baseline (`27.19%`) and a condition-aware model (`16.51%`),
   quantifies survivorship-bias inflation when `6` zero-yield wells are dropped
   (`7.47%` vs `36.37%`, `+28.90` percentage points), and audits an HTE feedback
   ledger separating `update_model_productive` (`well A01`),
   `update_model_negative_chemical_failure` (`well H12`, `0.0%` yield with
   intact internal standard), and `quarantine_qc_fault_repeat_dispense` (`well P24`,
   missing internal standard).

## Three families run, one is declared

| Family      | Coverage depends on                                          | Runs here |
| ----------- | ------------------------------------------------------------ | --------- |
| `rule`      | which transforms someone chose to write                      | yes       |
| `template`  | which classes the precedent set happens to contain           | yes       |
| `retrieval` | whether this exact molecule was already in the precedent set | yes       |
| `learned`   | the training distribution, which an output does not expose   | **no**    |

The learned family is declared without being run, and says why, so the
comparison states its own boundary instead of implying four families were
compared when three were.

## What the constructed set is for

Ten routes across four transformation classes. Five are in the precedent set,
which is both what retrieval may look up and what the templates were extracted
from. **The precedent set deliberately contains no suzuki-biaryl reaction.**

That single choice separates the families by cause rather than by score. All
three recover 5 of 5 inside the precedent set. Outside it, hand-written rules
recover 5 of 5, templates 3 of 5, and retrieval 0 of 5. Retrieval fails because
the molecules are not in its table; templates fail because no template exists for
a class the dataset never held; rules cover the class because someone wrote it.

Retrieval also shows what a split decides: 100% on the precedent subset, 50% over
everything. Neither number is wrong, and the memorising method is the one most
rewarded by choosing the subset.

The templates were extracted by hand rather than by an extraction algorithm, and
`methods.json` says so. The mechanical difference is not the lesson; the
consequence of provenance is.

## What it never establishes

`routes.json` records `laboratory_feasibility: not_assessed`. Nothing here
examines reagent availability, protecting groups, condition compatibility,
selectivity, scale or cost. A disconnection that recovers the recorded route can
still need a reagent nobody sells. This is the same boundary the generation gate
records when it calls its structural filters a proxy.

Recovery is also not selection. On three products the rules propose more than one
disconnection, and recovery means the recorded route was among the proposals.

## What the checks lock

Thirteen checks. A structure that does not parse stops the run before any family
is applied, because a family cannot be compared on a set that does not read.
Tests are in `labs/tests/test_retro_disconnection.py`; seven are known-bad edits.
The bilingual lesson is at
`site/src/content/docs/labs/retro-disconnection.mdx` with its Chinese edition
under `zh-cn/`.
