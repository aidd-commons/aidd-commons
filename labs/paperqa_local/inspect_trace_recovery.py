# ruff: noqa: E501
#!/usr/bin/env python3
"""Inspect or verify the checkpointed agent trace recovery workflow over real PaperQA and ChEMBL 37 data."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from aidd_commons.paperqa_local.trace_recovery import (  # noqa: E402
    check_resume_workflow,
    evaluate_resume_workflow,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        choices=("resume-workflow", "check-resume-workflow"),
        help="Run or verify the checkpointed agent trace recovery workflow.",
    )
    args = parser.parse_args(argv)
    payload = evaluate_resume_workflow()
    if args.action == "resume-workflow":
        print(json.dumps(payload, indent=2))
        return 0
    failures = check_resume_workflow(payload)
    print(json.dumps({"ok": not failures, "failures": failures}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
