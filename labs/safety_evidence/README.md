# Safety evidence teaching lab

This lab separates the five kinds of safety evidence that a tox profile prints in
one column. It reads one committed JSON file and uses RDKit for substructure
matching.

**No outcome here is a real result**, no compound was tested, and nothing in this
lab is a safety assessment of any substance.

```bash
python labs/safety_evidence/inspect_safety.py show
python labs/safety_evidence/inspect_safety.py check
```

## The design decision

The record stores **findings that required an experiment**, and never stores an
alert. Alerts are computed from the structure every time. Storing an alert beside
a measured outcome is precisely the collapse the lab is about, so a check refuses
a record that does it and a known-bad test performs it.

## Observed on the committed record

**7 of 12** compounds match at least one alert. **5 of those carry no measured
finding at all** — their entire safety record is a pattern match. One compound
matches two alerts while carrying no finding: the alert count rose, the evidence
did not.

The levels disagree in both directions, and two of those directions are not the
same thing:

| situation                                | compounds               |
| ---------------------------------------- | ----------------------- |
| alert fired, a measurement said negative | c01                     |
| alert fired, nobody measured anything    | c03, c04, c05, c06, c07 |
| no alert, something measured positive    | c08, c09                |

An alert a measurement contradicted has been tested and lost. An alert nobody
checked has not been tested at all. Printing them the same way is how an alert
keeps authority it never earned.

**Dose context.** 2 of 7 assay outcomes carry no concentration, so they cannot be
compared with the ones that do, and recorded concentrations span a factor of four.
No exposure is declared anywhere, and the record says why that matters rather than
leaving the gap silent.

**The top of the pyramid.** 1 of 12 compounds carries any organism-level evidence.
That is the ordinary shape of a safety record and not a defect in this one. Alerts
are free, assays are cheap, organisms are expensive, and a profile page gives all
three the same amount of space.

## What it does not do

It assesses nothing. It also does not say alerts are useless: an alert is a cheap
prompt to look, and looking is what the other four levels are. The failure is
printing a prompt to look in the same column as the result of having looked.

## What the checks lock

Fourteen checks. Tests are in `labs/tests/test_safety_evidence.py`; seven are
known-bad edits, including writing an alert into a compound record and recording a
finding against an alert name rather than an assay system.

The bilingual lesson is at `site/src/content/docs/labs/safety-evidence.mdx` with
its Chinese edition under `zh-cn/`.

## Real-data clinical safety and unbound hERG exposure-margin audit (`public-safety`)

To evaluate real ChEMBL 37 human hERG (`CHEMBL240`) and EGFR (`CHEMBL203`) $IC_{50}$ measurements, RDKit structural alerts, clinical unbound steady-state peak plasma concentrations ($C_{\max,u}$), Redfern $30\times$ / $10\times$ safety margins ($IC_{50,\text{hERG}} / C_{\max,u}$), and FDA Boxed Warning / market withdrawal outcomes across `6` clinical drugs (`CHEMBL553` erlotinib, `CHEMBL939` gefitinib, `CHEMBL1201583` lapatinib, `CHEMBL24828` vandetanib, `CHEMBL3353410` osimertinib, and `CHEMBL17157` terfenadine):

```bash
.venv/bin/python labs/safety_evidence/inspect_safety.py public-safety
.venv/bin/python labs/safety_evidence/inspect_safety.py check-public-safety
```

Observed real-data summary (verified 2026-11-07):
- `CHEMBL553` (`Erlotinib`, `150` mg QD, $C_{\max,u} = 0.19\ \mu\text{M}$): fires `1` alert (`terminal_alkyne_cyp_inactivator`), EGFR $IC_{50} = 0.002\ \mu\text{M}$, hERG $IC_{50} = 28.5\ \mu\text{M}$, unbound hERG margin `150.0`x (`log10_herg_margin = 2.1761`), hERG/EGFR selectivity `14250.0`x; clinical DILI monitoring without Torsades boxed warning.
- `CHEMBL939` (`Gefitinib`, `250` mg QD, $C_{\max,u} = 0.035\ \mu\text{M}$): fires `1` alert (`halogenated_aniline`), EGFR $IC_{50} = 0.033\ \mu\text{M}$, hERG $IC_{50} = 1.0\ \mu\text{M}$, unbound hERG margin `28.57`x (`log10_herg_margin = 1.4559`), hERG/EGFR selectivity `30.3`x.
- `CHEMBL1201583` (`Lapatinib`, `1250` mg QD, $C_{\max,u} = 0.042\ \mu\text{M}$): fires `1` alert (`para_alkoxy_or_hydroxy_aniline_quinone_imine_precursor`), EGFR $IC_{50} = 0.011\ \mu\text{M}$, hERG $IC_{50} = 1.1\ \mu\text{M}$, unbound hERG margin `26.19`x (`log10_herg_margin = 1.4181`), hERG/EGFR selectivity `100.0`x; FDA Boxed Warning for hepatotoxicity (`HLA-DQA1*02:01` + quinone-imine metabolite).
- `CHEMBL24828` (`Vandetanib`, `300` mg QD, $C_{\max,u} = 0.18\ \mu\text{M}$): fires `0` alerts, EGFR $IC_{50} = 0.5\ \mu\text{M}$, hERG $IC_{50} = 0.4\ \mu\text{M}$, unbound hERG margin `2.22`x (`log10_herg_margin = 0.3468`, `< 10`x high-risk threshold), hERG/EGFR selectivity `0.8`x; FDA Boxed Warning & REMS for Torsades de Pointes.
- `CHEMBL3353410` (`Osimertinib`, `80` mg QD, $C_{\max,u} = 0.025\ \mu\text{M}$): fires `2` alerts (`michael_acceptor_acrylamide`, `para_alkoxy_or_hydroxy_aniline_quinone_imine_precursor`), EGFR $IC_{50} = 0.001\ \mu\text{M}$, hERG $IC_{50} = 1.58\ \mu\text{M}$, unbound hERG margin `63.2`x (`log10_herg_margin = 1.8007`, `>= 30`x Redfern threshold), hERG/EGFR selectivity `1580.0`x; no Torsades boxed warning.
- `CHEMBL17157` (`Terfenadine`, `60` mg QD, $C_{\max,u} = 0.03\ \mu\text{M}$ under CYP3A4 inhibition): fires `0` alerts, hERG $IC_{50} = 0.056\ \mu\text{M}$, unbound hERG margin `1.87`x (`log10_herg_margin = 0.2711`, `< 10`x); withdrawn for fatal Torsades de Pointes.
- Rule comparison for Torsades liability: `structural_alert_only` yields `tp = 0`, `fp = 4`, `fn = 2`, whereas `exposure_linked_herg_margin_under_10x` yields `tp = 2`, `fp = 0`, `fn = 0`.
