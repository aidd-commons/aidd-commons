# ruff: noqa: E501
"""Show each compound verdict or audit the committed summary against the cache."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from aidd_commons.l1000_perturbation_context.data import load_cached_cell_lines  # noqa: E402
from aidd_commons.mechanism_consistency.analysis import (  # noqa: E402
    analyse,
    counterevidence_counts,
    counts,
)
from aidd_commons.mechanism_consistency.protocol import load_protocol  # noqa: E402
from aidd_commons.mechanism_consistency.summary import check_summary  # noqa: E402
from aidd_commons.mechanism_consistency.target_evidence import (  # noqa: E402
    audit_causal_target_evidence,
    audit_disease_state_definition,
    audit_tractability_and_risk,
    check_target_evidence,
    load_target_evidence_snapshot,
)

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]
DEFAULT_CACHE = ROOT / ".cache/l1000_perturbation_context"


def show_target_evidence() -> None:
    snap = load_target_evidence_snapshot()
    ds = audit_disease_state_definition(snap)
    causal = audit_causal_target_evidence(snap)
    tract = audit_tractability_and_risk(snap)

    print("1. DISEASE-STATE DEFINITION & SUBGROUP REVERSAL (t06-disease-state-definition)")
    print(
        f"  six_fields_complete={ds['six_fields_complete']} subgroups={ds['subgroup_count']}"
        f" mutant_1L_HR={ds['mutant_1l_hr']} wild_type_1L_HR={ds['wild_type_1l_hr']}"
        f" reversal_ratio={ds['hr_reversal_ratio_wt_over_mut']}x"
    )
    for row in ds["egfr_open_targets_diseases"]:
        print(
            f"  EGFR {row['disease_id']} ({row['disease_name']}): overall={row['overall_score']:.4f}"
            f" somatic={row['somatic_mutation']:.4f} genetic={row['genetic_association']:.4f}"
        )
    print()

    print(
        "2. CAUSAL TARGET EVIDENCE: WALD MR, COLOCALIZATION & GERMLINE vs SOMATIC (t06-causal-target-evidence)"
    )
    for inst in causal["mr_instruments"]:
        print(
            f"  {inst['instrument_id']:<26} target={inst['target_symbol']:<16}"
            f" Wald_ratio={inst['wald_ratio']:.4f} (SE={inst['wald_se']:.4f}, F={inst['instrument_f_statistic']:.2f})"
            f" PP.H4={inst['coloc_pp_h4']:.2f} PP.H3={inst['coloc_pp_h3']:.2f}"
            f" -> {inst['causal_verdict']}"
        )
    print(
        f"  BRAF germline CFC syndrome genetic={causal['braf_cfc_germline_genetic_score']:.4f},"
        f" somatic={causal['braf_cfc_somatic_score']:.4f} vs adult melanoma"
        f" somatic={causal['braf_melanoma_somatic_score']:.4f}"
    )
    print()

    print(
        "3. TRACTABILITY, DEPMAP ESSENTIALITY, PARALOG SELECTIVITY & SAFETY RISK (t06-tractability-target-risk)"
    )
    print(
        "  symbol\tensg\tsm_pocket\tsm_approved\tab_approved\toc_clinical\tsafety_events\tdepmap_essential_lt_-1\tmin_gene_effect\tmedian_gene_effect"
    )
    for row in tract["target_profiles"]:
        print(
            f"  {row['symbol']}\t{row['ensembl_id']}\t{row['sm_pocket_or_ligand']}\t"
            f"{row['sm_approved_drug']}\t{row['ab_approved_drug']}\t{row['oc_clinical_or_approved']}\t"
            f"{row['safety_liability_count']}\t{row['depmap_essential_line_count_lt_minus_1']}/{row['depmap_screen_count']}\t"
            f"{row['depmap_min_gene_effect']:.4f}\t{row['depmap_median_gene_effect']:.4f}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("show", "check", "target-evidence", "check-target-evidence"),
    )
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    args = parser.parse_args()
    try:
        if args.action == "target-evidence":
            show_target_evidence()
            return 0
        if args.action == "check-target-evidence":
            failures = check_target_evidence()
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print(
                "PASS: Open Targets v4 profiles, IPASS subgroups, Mendelian randomization/colocalization and DepMap essentiality checks agree"
            )
            return 0
        protocol = load_protocol(LAB / "protocol.json")
        if args.action == "check":
            failures = check_summary(LAB, args.cache_dir, LAB / "summary.json")
            for failure in failures:
                print(f"FAIL: {failure}")
            if failures:
                return 1
            print("PASS: protocol, per-compound rules, counts and cached snapshot agree")
            return 0
        verdicts, cohort = analyse(load_cached_cell_lines(args.cache_dir))
        print(f"explanations={protocol['explanations']}")
        print(f"informative_rho_minimum={protocol['comparison']['informative_rho_minimum']}")
        print(f"cohort={cohort}")
        print(f"side_counts={counts(verdicts)}")
        print(f"counterevidence_counts={counterevidence_counts(verdicts)}")
        print("pert_id\tpert_iname\tmatched_rho\tmismatched_rho\tverdict\treason")
        for row in verdicts:
            print(
                f"{row.pert_id}\t{row.pert_iname}\t{row.matched_rho:.6f}\t"
                f"{row.mismatched_rho:.6f}\t{row.verdict}\t{row.reason}"
            )
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
