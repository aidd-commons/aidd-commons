"""Full-content PDF checks; TeX is needed only to rebuild, not to inspect."""

import importlib.util
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "report_pdf", ROOT / "scripts/report/build-v02-pdf.py"
)
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class ReportPDFTests(unittest.TestCase):
    def test_running_headers_and_ligatures(self):
        self.assertEqual(
            report.verify_text(
                ["First paragraph has a finite −0.25 value.", "Next paragraph."],
                "First paragraph has a ﬁnite\n  3\n\fAIDD Commons    Living Report v0.2\n"
                "−0.25 value.\nNext paragraph.",
            ),
            2,
        )

    def test_missing_and_changed_content_is_rejected(self):
        for actual in ["Value 0.25. End.", "Value −0.25."]:
            with self.subTest(actual=actual), self.assertRaises(ValueError):
                report.verify_text(["Value −0.25.", "End."], actual)
        with self.assertRaises(ValueError):
            report.verify_text([], "")

    @unittest.skipUnless(
        shutil.which("pandoc") and shutil.which("pdftotext"), "Pandoc/Poppler needed"
    )
    def test_delivered_pdf_contains_entire_canonical_source(self):
        self.assertGreater(report.check(report.PUBLIC), 100)

    @unittest.skipUnless(
        shutil.which("pandoc") and shutil.which("pdfseparate"), "Pandoc/Poppler needed"
    )
    def test_truncated_real_pdf_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="aidd-pdf-defect-") as folder:
            page = Path(folder) / "page.pdf"
            subprocess.run(
                ["pdfseparate", "-f", "1", "-l", "1", str(report.PUBLIC), str(page)], check=True
            )
            with self.assertRaisesRegex(ValueError, "missing or changed"):
                report.check(page)


if __name__ == "__main__":
    unittest.main()
