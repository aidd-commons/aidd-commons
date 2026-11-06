"""Exercise native figure delivery and its wrong-size/stale-caption failure modes."""

from __future__ import annotations

import importlib.util
import json
import shutil
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / "site/scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


renderer = load_script("site_figure_renderer", "make-site-figures.py")
checker = load_script("site_figure_checker", "check-site-figures.py")

import matplotlib.pyplot as plt  # noqa: E402


class AtlasFigureDeliveryTests(unittest.TestCase):
    def composed_source(self, directory):
        root = Path(directory) / "src"
        (root / "pages").mkdir(parents=True)
        (root / "components").mkdir()
        page = root / "pages/labs.astro"
        page.write_text(
            '---\nimport Group from "../components/Group.astro";\n---\n<Group />\n',
            encoding="utf-8",
        )
        (root / "components/Group.astro").write_text(
            '---\nimport Nested from "./Nested.astro";\n---\n<Nested />\n', encoding="utf-8"
        )
        nested = root / "components/Nested.astro"
        nested.write_text(
            '---\nimport Figure from "./AtlasFigure.astro";\n---\n'
            '<details><Figure id="fixture" /></details>\n',
            encoding="utf-8",
        )
        (root / "components/AtlasFigure.astro").write_text("<figure />\n", encoding="utf-8")
        return root, page, nested

    def test_active_generator_selection_matches_five_figure_bilingual_placement_manifest(self):
        manifest = checker.json.loads(checker.MANIFEST_PATH.read_text(encoding="utf-8"))
        expected = [(row["id"], row["stem"], row["pages"]) for row in renderer.placement_rows()]
        actual = [
            (row["id"], row["source_stem"].replace("_", "-"), row["pages"])
            for row in manifest["figures"]
        ]
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 5)
        self.assertEqual(sum(len(row[2]) for row in actual), 12)
        for home in ("/", "/zh-cn/"):
            self.assertEqual(
                [row[0] for row in actual if home in row[2]],
                ["representation-flips"],
            )

    def test_static_nested_component_and_renderer_alias_are_real_placements(self):
        with tempfile.TemporaryDirectory(prefix="aidd-composed-figure-") as directory:
            root, page, _ = self.composed_source(directory)
            manifest = [{"id": "fixture", "pages": ["/labs/"]}]
            self.assertEqual(checker.check_placements(manifest, {"/labs/": page}, root), [])

    def test_missing_and_unregistered_nested_placements_are_both_refused(self):
        with tempfile.TemporaryDirectory(prefix="aidd-composed-defect-") as directory:
            root, page, nested = self.composed_source(directory)
            nested.write_text(
                '---\nimport Figure from "./AtlasFigure.astro";\n---\n'
                '<Figure id="unknown-fixture" />\n',
                encoding="utf-8",
            )
            issues = checker.check_placements(
                [{"id": "fixture", "pages": ["/labs/"]}], {"/labs/": page}, root
            )
            self.assertEqual(
                issues,
                [
                    "fixture: /labs/ does not place the figure",
                    "/labs/: places unknown-fixture without a matching manifest placement",
                ],
            )

    def test_id_text_and_unused_imports_cannot_substitute_for_component_placement(self):
        with tempfile.TemporaryDirectory(prefix="aidd-unrendered-figure-") as directory:
            root, page, _ = self.composed_source(directory)
            page.write_text(
                '---\nimport Group from "../components/Group.astro";\n'
                "const example = '<Group />';\n---\n"
                '<div id="fixture"></div>\n<!-- <Group /> -->\n'
                '<script>const example = "<Group />";</script>\n'
                '{"<Group />"}\n{/* <Group /> */}\n',
                encoding="utf-8",
            )
            self.assertEqual(
                checker.check_placements(
                    [{"id": "fixture", "pages": ["/labs/"]}], {"/labs/": page}, root
                ),
                ["fixture: /labs/ does not place the figure"],
            )

    def test_dynamic_figure_id_is_refused(self):
        with tempfile.TemporaryDirectory(prefix="aidd-dynamic-figure-") as directory:
            root, page, nested = self.composed_source(directory)
            nested.write_text(
                '---\nimport Figure from "./AtlasFigure.astro";\n---\n<Figure id={value} />\n',
                encoding="utf-8",
            )
            _, issues = checker.page_figure_ids(page, root)
            self.assertIn("AtlasFigure requires one literal figure id", issues)

    def test_component_cycles_and_source_root_escapes_are_refused(self):
        with tempfile.TemporaryDirectory(prefix="aidd-unsafe-component-") as directory:
            root, page, nested = self.composed_source(directory)
            nested.write_text(
                '---\nimport Group from "./Group.astro";\n---\n<Group />\n', encoding="utf-8"
            )
            _, issues = checker.page_figure_ids(page, root)
            self.assertTrue(any("component import cycle" in issue for issue in issues))
            page.write_text(
                '---\nimport Outside from "../../outside.astro";\n---\n<Outside />\n',
                encoding="utf-8",
            )
            (Path(directory) / "outside.astro").write_text(
                '<div id="fixture" />\n', encoding="utf-8"
            )
            _, issues = checker.page_figure_ids(page, root)
            self.assertTrue(any("component path escapes" in issue for issue in issues))

    def test_missing_rendered_component_is_refused(self):
        with tempfile.TemporaryDirectory(prefix="aidd-missing-component-") as directory:
            root, page, _ = self.composed_source(directory)
            page.write_text(
                '---\nimport Missing from "../components/Missing.astro";\n---\n<Missing />\n',
                encoding="utf-8",
            )
            _, issues = checker.page_figure_ids(page, root)
            self.assertTrue(any("not a regular source file" in issue for issue in issues))

    def test_the_native_schematic_entry_point_writes_pdf_and_png_only(self):
        import schematic_style

        with tempfile.TemporaryDirectory(prefix="aidd-schematic-delivery-") as directory:
            canvas = schematic_style.Canvas(2, 1)
            paths = canvas.save(Path(directory), "schematic-test")
            self.assertEqual([path.suffix for path in paths], [".pdf", ".png"])
            self.assertTrue(all(path.is_file() for path in paths))
            self.assertFalse(list(Path(directory).glob("*.svg")))
            plt.close(canvas.fig)

    def test_native_pair_valid_and_known_delivery_defects(self):
        with tempfile.TemporaryDirectory(prefix="aidd-figure-delivery-") as directory:
            output = Path(directory)
            fig = plt.figure(figsize=(2, 1))
            fig.add_axes((0.2, 0.2, 0.7, 0.7)).bar([0], [93], hatch="//")
            products = {
                suffix: output / f"plot-5-self-record-vs-reading.{suffix}"
                for suffix in ("png", "pdf")
            }
            fig.savefig(products["png"], dpi=300)
            fig.savefig(products["pdf"])
            plt.close(fig)
            self.assertEqual(set(products), {"png", "pdf"})
            self.assertFalse(list(output.glob("*.svg")))
            self.assertFalse(plt.fignum_exists(fig.number))
            row = {
                "id": "second-reading",
                "source_stem": "plot_5_self_record_vs_reading",
                "file": products["png"].name,
                "pdf": products["pdf"].name,
                "width": 600,
                "height": 300,
                "alt": "A retained aggregate of 93 topics, not independent replication.",
                "caption": "Current aggregate caption.",
                "pages": ["/audit/"],
            }
            captions = {"5": row["caption"]}
            self.assertEqual(checker.check_delivery(row, output, captions, {}), [])

            wrong_size = {**row, "width": 601}
            self.assertEqual(
                checker.check_delivery(wrong_size, output, captions, {}),
                ["second-reading: declared dimensions differ from the PNG"],
            )
            stale = {**row, "caption": "Earlier single-pass caption."}
            self.assertEqual(
                checker.check_delivery(stale, output, captions, {}),
                ["second-reading: caption differs from its native source manifest"],
            )
            with patch.object(Path, "is_file", return_value=False):
                missing = checker.check_delivery(row, output, captions, {})
            self.assertTrue(any(".pdf is not a regular delivery file" in item for item in missing))

    def test_an_empty_production_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="aidd-figure-manifest-") as directory:
            path = Path(directory) / "manifest.json"
            path.write_text('{"figures": []}', encoding="utf-8")
            with patch.object(checker, "MANIFEST_PATH", path):
                self.assertEqual(checker.check_manifest(), ["the manifest registers no figure"])

    def test_native_library_valid_and_known_delivery_defects(self):
        manifest = json.loads(checker.MANIFEST_PATH.read_text(encoding="utf-8"))
        row = next(item for item in manifest["library"] if item["kind"] == "schematic")
        key = "S" + str(int(row["source_stem"].split("-")[1]))
        captions = {key: row["caption"]}
        with tempfile.TemporaryDirectory(prefix="aidd-native-library-") as directory:
            source = Path(directory) / "source"
            delivery = Path(directory) / "delivery"
            source.mkdir()
            delivery.mkdir()
            for field, suffix in (("file", ".png"), ("pdf", ".pdf"), ("pptx", ".pptx")):
                native = checker.REPORT_OUT / (row["source_stem"] + suffix)
                shutil.copy2(native, source / native.name)
                shutil.copy2(native, delivery / row[field])

            for filename in row["previews"].values():
                shutil.copy2(checker.FIGURE_DIR / filename, delivery / filename)

            def check(items):
                return checker.check_library(items, delivery, source, {}, captions)

            self.assertEqual(check([row]), [])
            self.assertEqual(check([]), ["the figure library is empty"])
            self.assertTrue(any("exactly once" in issue for issue in check([row, row])))
            (delivery / row["pdf"]).write_bytes(b"%PDF-1.4\nretained stale copy\n%%EOF\n")
            self.assertIn(
                f"{row['id']}: delivered .pdf differs from its native source", check([row])
            )
            shutil.copy2(source / (row["source_stem"] + ".pdf"), delivery / row["pdf"])
            for root in (source, delivery):
                (root / row["pptx"]).write_bytes(
                    b"a PNG cannot stand in for an editable presentation"
                )
            self.assertIn(
                f"{row['id']}: editable PPTX is not a readable presentation", check([row])
            )

    def test_source_contract_allows_zero_images_and_rejects_a_missing_required_image(self):
        import schematic_style

        manifest = json.loads(checker.MANIFEST_PATH.read_text(encoding="utf-8"))
        row = next(
            item for item in manifest["library"] if item["id"] == "schematic-04-stage-contracts"
        )

        def check():
            return checker.check_library(
                [row], checker.FIGURE_DIR, checker.REPORT_OUT, {}, {"S4": row["caption"]}
            )

        self.assertEqual(check(), [])
        contracts = schematic_style._native_source_contracts()
        fixture = json.loads(
            (ROOT / "tests/site/fixtures/native-image-count-mismatch.json").read_text()
        )
        changed = json.loads(json.dumps(contracts))
        changed[row["source_stem"]]["native_contract"]["images"] = fixture["required_images"]
        with patch.object(schematic_style, "_native_source_contracts", return_value=changed):
            self.assertIn(f"{row['id']}: {fixture['expected_diagnostic']}", check())

    def test_report_identity_and_responsive_preview_defects(self):
        manifest = json.loads(checker.MANIFEST_PATH.read_text(encoding="utf-8"))
        row = manifest["library"][0]
        self.assertEqual(checker.check_web_metadata(row, checker.FIGURE_DIR), [])
        fixture = json.loads(
            (ROOT / "tests/site/fixtures/figure-report-number-mismatch.json").read_text()
        )
        wrong = {**row, **fixture["replacement"]}
        self.assertIn(
            f"{row['id']}: {fixture['expected_diagnostic']}",
            checker.check_web_metadata(wrong, checker.FIGURE_DIR),
        )
        with tempfile.TemporaryDirectory(prefix="aidd-responsive-preview-") as directory:
            output = Path(directory)
            for filename in row["previews"].values():
                shutil.copy2(checker.FIGURE_DIR / filename, output / filename)
            fixture = json.loads(
                (ROOT / "tests/site/fixtures/figure-preview-wrong-size.json").read_text()
            )
            from PIL import Image

            Image.new("RGB", tuple(fixture["size"]), "white").save(
                output / row["previews"]["480"], "WEBP"
            )
            self.assertIn(
                f"{row['id']}: {fixture['expected_diagnostic']}",
                checker.check_web_metadata(row, output),
            )

    def test_site_export_copies_canonical_products_without_redrawing(self):
        from PIL import Image

        with tempfile.TemporaryDirectory(prefix="aidd-canonical-figure-") as directory:
            root = Path(directory)
            native = root / "native"
            (native / "out").mkdir(parents=True)
            output = root / "web"
            stem = "plot_5_self_record_vs_reading"
            Image.new("RGB", (1200, 600), "white").save(native / "out" / f"{stem}.png")
            pdf = b"%PDF-1.4\ncanonical source fixture\n%%EOF\n"
            (native / "out" / f"{stem}.pdf").write_bytes(pdf)
            with (
                patch.object(renderer, "FIGURE_DIR", native),
                patch.object(renderer, "FIGURE_OUT", output),
                patch.object(
                    renderer,
                    "library_rows",
                    return_value=[{"stem": stem.replace("_", "-"), "kind": "plot"}],
                ),
            ):
                written, emitted = renderer.build_previews()
            self.assertEqual(emitted, {})
            self.assertEqual((output / "plot-5-self-record-vs-reading.pdf").read_bytes(), pdf)
            self.assertEqual(
                (output / "plot-5-self-record-vs-reading.png").read_bytes(),
                (native / "out" / f"{stem}.png").read_bytes(),
            )
            self.assertEqual(set(written[0]["previews"]), {"480", "960"})
            for width in (480, 960):
                with Image.open(output / written[0]["previews"][str(width)]) as preview:
                    self.assertEqual(preview.size, (width, width // 2))

    def test_native_master_valid_and_known_source_defects(self):
        import schematic_style

        stem = "schematic-01-artifacts"
        contracts = schematic_style._native_source_contracts()
        with tempfile.TemporaryDirectory(prefix="aidd-native-source-") as directory:
            root = Path(directory)
            figures = root / "report/figures"
            output = figures / "out"
            output.mkdir(parents=True)
            assets = root / "site/src/assets/editorial"
            assets.mkdir(parents=True)
            for suffix in (".pdf", ".png", ".pptx"):
                shutil.copy2(checker.REPORT_OUT / (stem + suffix), output / (stem + suffix))
            for asset in set(contracts[stem]["native_contract"]["images"].values()):
                shutil.copy2(ROOT / "site/src/assets/editorial" / (asset + ".png"), assets)
            native = output / (stem + ".pptx")
            original = native.read_bytes()
            with zipfile.ZipFile(native) as package:
                parts = {name: package.read(name) for name in package.namelist()}

            def write_parts(changed):
                with zipfile.ZipFile(native, "w") as package:
                    for name, data in changed.items():
                        package.writestr(name, data)

            with (
                patch.object(schematic_style, "_HERE", figures),
                patch.object(schematic_style, "_native_source_contracts", return_value=contracts),
            ):
                self.assertEqual(
                    set(schematic_style.validate_native_master(stem)), {"pdf", "png", "pptx"}
                )
                fixture = json.loads(
                    (ROOT / "tests/report/fixtures/native-label-mismatch.json").read_text()
                )
                ns = {
                    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
                    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
                }
                slide = ET.fromstring(parts["ppt/slides/slide1.xml"])
                shape = next(
                    shape
                    for shape in slide.findall(".//p:sp", ns)
                    if shape.find("p:nvSpPr/p:cNvPr", ns).get("name") == fixture["shape_name"]
                )
                shape.find(".//a:t", ns).text = fixture["replacement"]
                write_parts({**parts, "ppt/slides/slide1.xml": ET.tostring(slide)})
                with self.assertRaisesRegex(RuntimeError, fixture["expected_diagnostic"]):
                    schematic_style.validate_native_master(stem)
                fixture = json.loads(
                    (ROOT / "tests/report/fixtures/native-illustration-mismatch.json").read_text()
                )
                image = next(
                    name
                    for name in parts
                    if name.startswith("ppt/media/") and name.endswith(".png")
                )
                write_parts({**parts, image: fixture["replacement"].encode()})
                with self.assertRaisesRegex(RuntimeError, fixture["expected_diagnostic"]):
                    schematic_style.validate_native_master(stem)
                native.write_bytes(original)
                schematic_style.validate_native_master(stem)


if __name__ == "__main__":
    unittest.main(verbosity=2)
