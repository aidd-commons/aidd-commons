#!/usr/bin/env python3
"""Build/check the v0.2 PDF from the canonical complete report.

Requires Pandoc, XeLaTeX (with Georgia and Arial fonts and xurl) and Poppler.
Run: python3 scripts/report/build-v02-pdf.py
Check the delivered copy: python3 scripts/report/build-v02-pdf.py --check
No historical PDF, figure source, or frozen scientific output is regenerated.
"""

import argparse
import re
import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "report/aidd-commons-living-report-v0.2.md"
METADATA = ROOT / "report/metadata-v0.2.yaml"
NAME = "aidd-commons-living-report-v0.2.pdf"
PUBLIC = ROOT / "site/public/reports" / NAME


def run(*args: str) -> str:
    return subprocess.check_output(args, text=True)


def normalize(text: str) -> str:
    # NFKC expands typographic ligatures. Preserve every sign, digit and word;
    # PDF line wrapping/spacing is not a semantic difference.
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text))


def resolved_document() -> dict:
    import json

    return json.loads(
        run(
            "pandoc",
            str(SOURCE),
            "--from=markdown+smart",
            "--citeproc",
            "--bibliography",
            str(ROOT / "report/references.bib"),
            "--metadata=reference-section-title:References",
            "--to=json",
        )
    )


def canonical_blocks() -> list[str]:
    import json

    document = resolved_document()
    blocks = []

    def visit(value):
        if isinstance(value, dict):
            if value.get("t") == "Figure":
                visit(value["c"][1])
                return
            if value.get("t") in {"Para", "Plain", "Header"}:
                if (
                    value.get("t") == "Para"
                    and len(value["c"]) == 1
                    and value["c"][0].get("t") == "Image"
                ):
                    blocks.append({"t": "Plain", "c": value["c"][0]["c"][1]})
                else:
                    blocks.append(value)
            else:
                visit(value.get("c"))
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(document["blocks"])
    # Convert individual semantic blocks together, separated by an unmistakable
    # marker. Table cells and captions remain independently inspectable even when
    # the PDF floats a figure or lays table columns out in a different text order.
    joined = []
    for block in blocks:
        joined.extend([block, {"t": "Para", "c": [{"t": "Str", "c": "AIDDBLOCKBOUNDARY"}]}])
    document["blocks"] = joined
    plain = subprocess.check_output(
        ["pandoc", "--from=json", "--to=plain", "--wrap=none"],
        input=json.dumps(document),
        text=True,
    )
    return [part.strip() for part in plain.split("AIDDBLOCKBOUNDARY") if part.strip()]


def verify_text(blocks: list[str], extracted: str) -> int:
    if not blocks:
        raise ValueError("Empty canonical source is not valid coverage")
    extracted = extracted.replace("\f", "\n")
    # Remove only the exact running header and page-number-only footer lines.
    extracted = re.sub(r"(?m)^\s*AIDD Commons\s+Living Report v0\.2\s*$", "", extracted)
    extracted = re.sub(r"(?m)^\s*\d+\s*$", "", extracted)
    actual = normalize(extracted.replace("•", ""))
    for index, block in enumerate(blocks, 1):
        expected = normalize(block)
        position = actual.find(expected)
        if position < 0:
            raise ValueError(
                f"Canonical block {index}/{len(blocks)} missing or changed: {block[:160]!r}"
            )
    return len(blocks)


def check(pdf: Path) -> int:
    if not pdf.is_file() or not pdf.read_bytes().startswith(b"%PDF-"):
        raise ValueError(f"Not a regular PDF: {pdf}")
    count = verify_text(canonical_blocks(), run("pdftotext", "-raw", str(pdf), "-"))
    print(
        f"PASS: {count}/{count} canonical text blocks (including table cells and captions): {pdf}"
    )
    return count


def build(html_only: bool = False) -> None:
    with tempfile.TemporaryDirectory(prefix="aidd-report-v02-") as folder:
        work = Path(folder)
        import json

        document = work / "resolved.json"
        document.write_text(json.dumps(resolved_document()))
        lua = work / "delivery.lua"
        library = json.loads((ROOT / "site/src/data/atlas-figures.json").read_text())["library"]
        mapping = {item["source_stem"]: item["file"] for item in library}
        image_map = (
            "images = {"
            + ",".join('["' + key + '"]="' + value + '"' for key, value in mapping.items())
            + "}\n"
        )
        template = (ROOT / "scripts/report/full-report.lua").read_text()
        lua.write_text(image_map + template.replace("__REPORT_ROOT__", str(ROOT / "report")))
        tex = work / "report.tex"
        common = [
            "pandoc",
            str(document),
            "--from=json",
            "--standalone",
            "--metadata-file",
            str(METADATA),
            "--lua-filter",
            str(lua),
        ]
        subprocess.run(common + ["--top-level-division=chapter", "--output", str(tex)], check=True)
        html = work / NAME.replace(".pdf", ".html")
        css = work / "reading.css"
        css.write_text("""<style>
        html{background:#f7f6f2;color:#182b35;font-family:Georgia,serif;line-height:1.65}
        body{max-width:68rem;margin:auto;padding:2rem clamp(1rem,4vw,4rem)}
        header{text-align:center;border-bottom:3px solid #087e8b;padding:2rem 0}
        h1,h2,h3,nav{font-family:Arial,sans-serif;line-height:1.3}h1{margin-top:3rem}
        a{color:#086873}img{display:block;max-width:100%;height:auto;margin:auto}
        figure{margin:2rem 0}figcaption{font-size:.9rem}table{display:block;overflow-x:auto;
        border-collapse:collapse;width:100%;font-size:.85rem}
        th,td{padding:.6rem;border:1px solid #ccd5d7}
        a,code,.csl-entry{overflow-wrap:anywhere}nav{padding:1rem;background:#edf3f1}
        nav#TOC{max-height:28rem;overflow:auto;font-size:.9rem}
        @media print{body{max-width:none}nav{display:none}}
        </style>""")
        subprocess.run(
            common
            + [
                "--to=html5",
                "--toc",
                "--number-sections",
                "--include-in-header",
                str(css),
                "--output",
                str(html),
            ],
            check=True,
        )
        html_text = html.read_text()
        intro_match = re.search(r"<body>(.*?)<header", html_text, re.S)
        intro = intro_match.group(1) if intro_match else ""
        if intro_match:
            html_text = html_text[: intro_match.start(1)] + html_text[intro_match.end(1) :]

        figure_number = 0
        table_number = 0

        def number_figure(match):
            nonlocal figure_number
            figure_number += 1
            return match.group(0) + f"Figure {figure_number}. "

        def number_table(match):
            nonlocal table_number
            table_number += 1
            return match.group(0) + f"Table {table_number}. "

        html_text = re.sub(r"<figcaption[^>]*>", number_figure, html_text)
        html_text = re.sub(r"<caption[^>]*>", number_table, html_text)
        html_text = html_text.replace(
            "</header>",
            '</header><main id="report-body"><nav aria-label="Report editions">'
            '<a href="../report/">Report editions</a> · '
            f'<a href="{NAME}" download>Download complete v0.2 PDF</a></nav>' + intro,
            1,
        )
        html_text = re.sub(r"<table(?=[ >])", '<table tabindex="0"', html_text)
        html_text = html_text.replace("</body>", "</main></body>")
        if figure_number != 20:
            raise ValueError(f"Expected 20 complete-report figures, found {figure_number}")
        html.write_text(html_text)
        if html_only:
            check(PUBLIC)
            shutil.copyfile(html, PUBLIC.with_suffix(".html"))
            print("Updated full HTML edition; verified current PDF unchanged")
            return
        # Three passes settle the multi-page table of contents and PDF bookmarks.
        for _ in range(3):
            result = subprocess.run(
                [
                    "xelatex",
                    "-interaction=nonstopmode",
                    "-halt-on-error",
                    "-output-directory",
                    str(work),
                    str(tex),
                ],
                cwd=work,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if result.returncode:
                raise RuntimeError(result.stdout[-8000:])
        log = (work / "report.log").read_text()
        defects = [
            line for line in log.splitlines() if "Overfull" in line or "Missing character" in line
        ]
        if defects:
            debug = ROOT / "tmp/report-full-v02-20261106"
            debug.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(tex, debug / "failed-report.tex")
            shutil.copyfile(work / "report.pdf", debug / "failed-report.pdf")
            raise RuntimeError("PDF layout/font defects:\n" + "\n".join(defects))
        built = work / "report.pdf"
        try:
            check(built)
        except ValueError:
            shutil.copyfile(built, ROOT / "tmp/report-full-v02-20261106/failed-report.pdf")
            raise
        output = ROOT / "output/pdf" / NAME
        output.parent.mkdir(parents=True, exist_ok=True)
        PUBLIC.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(built, output)
        shutil.copyfile(built, PUBLIC)
        shutil.copyfile(html, PUBLIC.with_suffix(".html"))
        print(f"Built {PUBLIC} ({PUBLIC.stat().st_size / 1_000_000:.2f} MB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Check the existing site PDF without rebuilding"
    )
    parser.add_argument("--pdf", type=Path, default=PUBLIC, help="PDF to inspect with --check")
    parser.add_argument(
        "--html-only", action="store_true", help="Refresh HTML and verify existing PDF"
    )
    args = parser.parse_args()
    if args.check:
        check(args.pdf)
    else:
        build(html_only=args.html_only)
