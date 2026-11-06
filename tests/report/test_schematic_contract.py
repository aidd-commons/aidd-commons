"""Current source and native-object acceptance for the seven report schematics."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "report/figures"))
import schematic_style as native  # noqa: E402

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}


class SchematicContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        node = "/opt/homebrew/opt/node@24/bin/node"
        if not Path(node).is_file():
            node = shutil.which("node") or "node"
        cls.source = json.loads(
            subprocess.check_output(
                [node, "report/figures/build_schematic_masters.mjs", "--source-record"],
                cwd=ROOT,
                text=True,
            )
        )
        cls.contracts = {c["stem"]: c for c in cls.source["configs"]}

    def test_all_seven_native_masters_match_their_current_sources(self):
        self.assertEqual(len(self.contracts), 7)
        for stem in self.contracts:
            with self.subTest(stem=stem):
                self.assertEqual(set(native.validate_native_master(stem)), {"pdf", "png", "pptx"})

    def test_stage_and_route_source_coverage_is_exact(self):
        self.assertEqual(self.source["source_report"], "report/aidd-commons-living-report-v0.2.md")
        stages = self.source["stages"]
        self.assertEqual(len(stages), 9)
        contract = self.contracts["schematic-04-stage-contracts"]["native_contract"]
        self.assertEqual(len(contract["required_markers"]), sum(len(s["fields"]) for s in stages))
        self.assertEqual(len(self.source["routes"]), 6)
        self.assertEqual(len(self.source["prerequisiteLessons"]), 10)
        self.assertEqual(sum(len(s["requiredBy"]) for s in self.source["prerequisiteLessons"]), 21)
        self.assertEqual(len(self.source["resources"]), 2)
        for record in self.source["resources"]:
            self.assertEqual(len(record["dimensions"]), 7)
            self.assertEqual([d["value"] for d in record["dimensions"]], record["states"])
            self.assertTrue(record["access"])
            self.assertTrue(record["lifecycle"])

    def test_source_bound_stage_reading_order_and_frozen_boundary(self):
        bounds = [s["bounds_mm"] for s in self.source["motion"]["S3"]["stages"]]
        for row in range(3):
            group = bounds[row * 3 : row * 3 + 3]
            self.assertEqual(len({b["y"] for b in group}), 1)
            self.assertEqual([b["x"] for b in group], sorted(b["x"] for b in group))
        lifecycle = self.contracts["schematic-07-frozen-lifecycle"]["native_contract"]
        self.assertIn("posttest-invalidating-error", lifecycle["native_connectors"])
        self.assertIn("pretest-development-return", lifecycle["dashed_connectors"])
        for config in self.contracts.values():
            self.assertEqual(config["width"], 180)
            self.assertEqual(config["native_contract"]["report_insertion_width_mm"], 162)
            self.assertGreaterEqual(config["native_contract"]["minimum_font_pt"] * 0.9, 8)
            self.assertGreaterEqual(config["native_contract"]["major_minimum_font_pt"] * 0.9, 9)

    def test_hollow_requirement_and_type_floors_accept_valid_then_reject_known_defects(self):
        stem = "schematic-04-stage-contracts"
        defects = json.loads(
            (ROOT / "tests/report/fixtures/schematic-required-marker-and-font.json").read_text()
        )
        with tempfile.TemporaryDirectory(prefix="aidd-schematic-contract-") as temp:
            figures = Path(temp) / "report/figures"
            output = figures / "out"
            output.mkdir(parents=True)
            for ext in ("pdf", "png", "pptx"):
                shutil.copy2(
                    ROOT / "report/figures/out" / f"{stem}.{ext}", output / f"{stem}.{ext}"
                )
            pptx = output / f"{stem}.pptx"
            with zipfile.ZipFile(pptx) as reader:
                original = {name: reader.read(name) for name in reader.namelist()}
            with (
                patch.object(native, "_HERE", figures),
                patch.object(native, "_native_source_contracts", return_value=self.contracts),
            ):
                native.validate_native_master(stem)
                for defect in defects:
                    slide = ET.fromstring(original["ppt/slides/slide1.xml"])
                    shape = next(
                        s
                        for s in slide.findall(".//p:sp", NS)
                        if s.find("p:nvSpPr/p:cNvPr", NS).get("name") == defect["shape_name"]
                    )
                    if defect["kind"] == "filled_required_marker":
                        shape.find("p:spPr/a:solidFill/a:srgbClr", NS).set("val", defect["value"])
                    else:
                        for font in shape.findall(".//a:defRPr", NS) + shape.findall(
                            ".//a:rPr", NS
                        ):
                            font.set("sz", str(defect["value"]))
                    with zipfile.ZipFile(pptx, "w") as writer:
                        for name, contents in original.items():
                            writer.writestr(
                                name,
                                ET.tostring(slide) if name == "ppt/slides/slide1.xml" else contents,
                            )
                    with self.assertRaisesRegex(RuntimeError, defect["expected_diagnostic"]):
                        native.validate_native_master(stem)


if __name__ == "__main__":
    unittest.main(verbosity=2)
