# ruff: noqa: E501
from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from aidd_commons.chembl_egfr.data import (
    DataContractError,
    DataDownloadError,
    download_frozen_snapshot,
    load_cached_frozen_datasets,
)
from aidd_commons.chembl_egfr.evaluation import EvaluationContractError
from aidd_commons.chembl_egfr.features import FeatureContractError
from aidd_commons.chembl_egfr.models import ModelContractError
from aidd_commons.chembl_egfr.pipeline import (
    LockedEvaluationError,
    PretestValidationError,
    evaluate_locked,
    portable_locked_evaluation_command,
    run_pretest,
    validate_frozen_scaffold_counts,
    write_development_summary,
)
from aidd_commons.chembl_egfr.protocol import ProtocolContractError
from aidd_commons.chembl_egfr.splits import SplitContractError

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CACHE_DIR = Path(".cache/chembl_egfr")
DEFAULT_OUTPUT_DIR = Path("labs/chembl_egfr/results")
DEFAULT_SUMMARY_PATH = Path("labs/chembl_egfr/development-summary.json")


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the frozen ChEMBL 37 EGFR representation-baseline lab."
    )
    subparsers = parser.add_subparsers(dest="action", required=True)

    download = subparsers.add_parser(
        "download",
        help="download and validate the official ChEMBL 37 assay snapshot",
    )
    download.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)

    pretest = subparsers.add_parser(
        "pretest",
        help="fit on train, select on validation, and keep locked labels unevaluated",
    )
    _add_data_and_output_arguments(pretest)
    pretest.add_argument("--summary-path", type=Path, default=DEFAULT_SUMMARY_PATH)

    locked = subparsers.add_parser(
        "evaluate-locked",
        help="evaluate the primary test and assay replication together, once",
    )
    _add_cache_argument(locked)
    locked.add_argument(
        "--confirm-locked-evaluation",
        action="store_true",
        help="confirm the one-time paired evaluation after external approval",
    )

    trace_lin = subparsers.add_parser(
        "trace-lineage",
        help="trace all 1,072 real output parent rows through the 5 versioned transformation stages",
    )
    _add_cache_argument(trace_lin)

    check_lin = subparsers.add_parser(
        "check-lineage",
        help="verify row-level provenance and versioned transformation invariants across all 1,072 output rows",
    )
    _add_cache_argument(check_lin)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        if args.action == "evaluate-locked" and not args.confirm_locked_evaluation:
            raise LockedEvaluationError(
                "paired primary-test and replication evaluation requires explicit confirmation"
            )
        cache_dir = _resolve_repository_path(args.cache_dir)
        if args.action in ("trace-lineage", "check-lineage"):
            from aidd_commons.chembl_egfr.lineage import (
                check_complete_lineage,
                trace_complete_lineage,
            )

            payload = trace_complete_lineage(cache_dir)
            failures = check_complete_lineage(payload, cache_dir)
            if args.action == "trace-lineage":
                print(json.dumps(payload, indent=2))
                return 1 if failures else 0
            if failures:
                for item in failures:
                    print(f"FAIL: {item}", file=sys.stderr)
                return 1
            totals = payload["traced_output_row_totals"]
            print(
                f"PASS: traced {totals['total_output_parent_rows']} real ChEMBL 37 output rows "
                f"({totals['primary_output_parent_rows']} primary + {totals['replication_output_parent_rows']} replication) "
                f"across {totals['total_traced_source_activity_ids']} retained activity_ids "
                f"(prefix={totals['lineage_chain_content_prefix']})"
            )
            return 0

        if args.action == "download":
            datasets = download_frozen_snapshot(cache_dir)
            print(
                "ChEMBL 37 snapshot ready: "
                f"{datasets.primary.audit.parent_count} primary parents; "
                f"{datasets.external.audit.parent_count} replication parents"
            )
            return 0

        datasets = load_cached_frozen_datasets(cache_dir)
        validate_frozen_scaffold_counts(datasets.primary, datasets.external)
        command = portable_locked_evaluation_command(
            cache_dir,
            REPOSITORY_ROOT,
        )
        if args.action == "pretest":
            output_dir = _resolve_repository_path(args.output_dir)
            artifact = run_pretest(
                datasets.primary,
                datasets.external,
                output_dir,
                planned_evaluation_command=command,
            )
            summary_path = write_development_summary(
                artifact.pretest_path,
                _resolve_repository_path(args.summary_path),
            )
            print(f"Development pretest passed: {artifact.pretest_path}")
            print(f"Reviewed development summary written: {summary_path}")
            print("Locked primary-test and assay-replication evaluations: not run")
            return 0

        output_dir = _resolve_repository_path(DEFAULT_OUTPUT_DIR)
        metrics_path = evaluate_locked(
            datasets.primary,
            datasets.external,
            output_dir,
            command=command,
            confirmed=args.confirm_locked_evaluation,
            repository_root=REPOSITORY_ROOT,
        )
        print(f"Paired locked evaluation completed once: {metrics_path}")
        return 0
    except (
        DataContractError,
        DataDownloadError,
        EvaluationContractError,
        FeatureContractError,
        LockedEvaluationError,
        ModelContractError,
        PretestValidationError,
        ProtocolContractError,
        SplitContractError,
    ) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2


def _add_data_and_output_arguments(parser: argparse.ArgumentParser) -> None:
    _add_cache_argument(parser)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)


def _add_cache_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)


def _resolve_repository_path(path: Path) -> Path:
    return path if path.is_absolute() else REPOSITORY_ROOT / path


if __name__ == "__main__":
    raise SystemExit(main())
