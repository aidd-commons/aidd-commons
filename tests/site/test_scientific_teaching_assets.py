"""Source correctness and known-defect rejection for educational objects."""

from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "teaching_asset_check", ROOT / "site/src/data/teaching/check_assets.py"
)
assert SPEC is not None and SPEC.loader is not None
CHECK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECK)


def objects():
    return {
        "egfr": CHECK.load("egfr-coordinates.json"),
        "geometry": CHECK.load("rmd17-geometry.json"),
        "molecules": CHECK.load("molecules.json"),
    }


def test_actual_retained_objects_match_their_sources():
    data = objects()
    assert CHECK.check_egfr(data["egfr"]) == []
    assert CHECK.check_geometry(data["geometry"]) == []
    assert CHECK.check_molecules(data["molecules"]) == []


def test_known_defects_report_the_intended_source_error():
    data = objects()
    checkers = {
        "egfr": CHECK.check_egfr,
        "geometry": CHECK.check_geometry,
        "molecules": CHECK.check_molecules,
    }
    defects = json.loads(
        (ROOT / "tests/site/fixtures/teaching-projections/known-defects.json").read_text()
    )
    assert len(defects) == 4
    for defect in defects:
        changed = copy.deepcopy(data[defect["object"]])
        target = changed
        for key in defect["path"][:-1]:
            target = target[key]
        target[defect["path"][-1]] = defect["value"]
        errors = checkers[defect["object"]](changed)
        assert any(defect["diagnostic"] in error for error in errors), errors


def test_empty_scans_cannot_pass():
    assert CHECK.check_egfr({"units": "angstrom", "entries": []})
    assert CHECK.check_geometry({"units": "angstrom", "frames": []})
    assert CHECK.check_molecules({"molecules": []})
