#!/usr/bin/env python3
"""Validate the PNG/PDF products the site actually publishes and their source captions.

Legacy SVG inputs are outside this delivery contract and are never changed by this
check. A nonempty manifest must cover every page placement, each image must decode at
its declared intrinsic dimensions, and each vector download must be a regular PDF file.
"""

from __future__ import annotations

import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
FIGURE_DIR = REPO_ROOT / "site/public/figures"
REPORT_OUT = REPO_ROOT / "report/figures/out"
MANIFEST_PATH = REPO_ROOT / "site/src/data/atlas-figures.json"
PAGES = {
    "/zh-cn/": REPO_ROOT / "site/src/pages/zh-cn/index.astro",
    "/": REPO_ROOT / "site/src/pages/index.astro",
    "/audit/": REPO_ROOT / "site/src/pages/audit/index.astro",
    "/zh-cn/audit/": REPO_ROOT / "site/src/pages/zh-cn/audit/index.astro",
    "/labs/": REPO_ROOT / "site/src/pages/labs/index.astro",
    "/zh-cn/labs/": REPO_ROOT / "site/src/pages/zh-cn/labs/index.astro",
    "/report/": REPO_ROOT / "site/src/pages/report/index.astro",
    "/zh-cn/report/": REPO_ROOT / "site/src/pages/zh-cn/report/index.astro",
}


class ComponentTags(HTMLParser):
    """Read actual template tags rather than matching arbitrary id text."""

    def __init__(self) -> None:
        super().__init__()
        self.tags: list[tuple[str, list[tuple[str, str | None]]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        raw = self.get_starttag_text() or ""
        name = re.match(r"<([\w$]+)", raw)
        if name:
            self.tags.append((name.group(1), attrs))


def mask_expression_literals(template: str) -> str:
    """Ignore JS strings/comments in Astro expressions, keeping literal tag attributes."""
    result = list(template)
    depth = 0
    tag = False
    tag_depth = 0
    html_quote = ""
    index = 0
    while index < len(template):
        if template.startswith("<!--", index):
            end = template.find("-->", index + 4)
            index = len(template) if end < 0 else end + 3
            continue
        char = template[index]
        expression = tag_depth if tag else depth
        end = index
        if expression and not html_quote:
            if template.startswith("/*", index):
                close = template.find("*/", index + 2)
                end = len(template) if close < 0 else close + 2
            elif template.startswith("//", index):
                close = template.find("\n", index + 2)
                end = len(template) if close < 0 else close
            elif char in "\"'`":
                end = index + 1
                while end < len(template):
                    if template[end] == "\\":
                        end += 2
                    elif template[end] == char:
                        end += 1
                        break
                    else:
                        end += 1
        if end > index:
            for position in range(index, min(end, len(template))):
                if result[position] != "\n":
                    result[position] = " "
            index = end
            continue
        if tag:
            if html_quote:
                if char == html_quote:
                    html_quote = ""
            elif not tag_depth and char in "\"'":
                html_quote = char
            elif char == "{":
                tag_depth += 1
            elif char == "}":
                tag_depth = max(0, tag_depth - 1)
            elif char == ">" and not tag_depth:
                tag = False
        elif char == "{":
            depth += 1
        elif char == "}":
            depth = max(0, depth - 1)
        elif char == "<" and re.match(r"</?[A-Za-z][\w:-]*(?=[\s/>])", template[index:]):
            tag = True
        index += 1
    return "".join(result)


def page_figure_ids(source: Path, source_root: Path) -> tuple[set[str], list[str]]:
    """Follow rendered static relative .astro imports, with bounded safe traversal."""
    root = source_root.resolve()
    renderer = root / "components/AtlasFigure.astro"
    problems: list[str] = []
    active: set[Path] = set()
    visited: dict[Path, set[str]] = {}

    def source_path(path: Path) -> Path | None:
        try:
            if path.is_symlink():
                problems.append(f"component is not a regular source file: {path.name}")
                return None
            resolved = path.resolve()
        except (OSError, RuntimeError):
            problems.append(f"component path cannot be resolved: {path.name}")
            return None
        if not resolved.is_relative_to(root):
            problems.append(f"component path escapes site/src: {path.name}")
            return None
        if not resolved.is_file():
            problems.append(f"component is not a regular source file: {path.name}")
            return None
        return resolved

    def visit(path: Path) -> set[str]:
        resolved = source_path(path)
        if resolved is None:
            return set()
        if resolved in active:
            problems.append(f"component import cycle: {resolved.relative_to(root)}")
            return set()
        if resolved in visited:
            return visited[resolved]
        if len(active) >= 32 or len(visited) + len(active) >= 256:
            problems.append("component traversal exceeds its depth/file bound")
            return set()
        active.add(resolved)
        source_text = resolved.read_text(encoding="utf-8")
        frontmatter = re.match(r"\A---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)", source_text)
        imports: dict[str, Path] = {}
        template = source_text
        if frontmatter:
            header = frontmatter.group(1)
            code = re.sub(
                r"""//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`""",
                lambda match: re.sub(r"[^\n]", " ", match.group()),
                header,
            )
            for match in re.finditer(
                r"""(?m)^[ \t]*import\s+([\w$]+)\s+from\s*(["'])(\.{1,2}/[^"'\r\n]+\.astro)\2""",
                header,
            ):
                if code[match.start() : match.end()].lstrip().startswith("import"):
                    imports[match.group(1)] = resolved.parent / match.group(3)
            template = source_text[frontmatter.end() :]
        parser = ComponentTags()
        parser.feed(mask_expression_literals(template))
        found: set[str] = set()
        for name, attributes in parser.tags:
            target = imports.get(name)
            if target is None:
                if name == "AtlasFigure":
                    problems.append("AtlasFigure requires a static relative component import")
                continue
            target_path = source_path(target)
            if target_path is None:
                continue
            if target_path == renderer:
                ids = [value for key, value in attributes if key == "id"]
                if len(ids) != 1 or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ids[0] or ""):
                    problems.append("AtlasFigure requires one literal figure id")
                else:
                    found.add(ids[0])
            else:
                found.update(visit(target_path))
        active.remove(resolved)
        visited[resolved] = found
        return found

    return visit(source), problems


def check_placements(
    figures: list[dict[str, Any]], pages: dict[str, Path], source_root: Path
) -> list[str]:
    """Check declared and actual placements through the same composed-source graph."""
    problems: list[str] = []
    observed: dict[str, set[str]] = {}
    for page, source in pages.items():
        observed[page], issues = page_figure_ids(source, source_root)
        problems.extend(f"{page}: {issue}" for issue in issues)
    for figure in figures:
        name = figure.get("id", "?")
        for page in figure.get("pages", []):
            if page not in observed:
                problems.append(f"{name}: {page} is not a registered figure page")
            elif name not in observed[page]:
                problems.append(f"{name}: {page} does not place the figure")
    for page, used_ids in observed.items():
        for used in sorted(used_ids):
            if not any(
                figure.get("id") == used and page in figure.get("pages", []) for figure in figures
            ):
                problems.append(f"{page}: places {used} without a matching manifest placement")
    return problems


def check_delivery(
    figure: dict[str, Any],
    directory: Path,
    captions: dict[str, str],
    schematics: dict[str, str],
    *,
    require_pages: bool = True,
) -> list[str]:
    """Check one declared pair, including the known wrong-size and stale-caption defects."""
    problems: list[str] = []
    name = figure.get("id", "?")
    required = ("id", "file", "pdf", "source_stem", "width", "height", "alt", "caption")
    if require_pages:
        required += ("pages",)
    for field in required:
        if not figure.get(field):
            problems.append(f"{name}: the manifest has no {field}")
    stem = figure.get("source_stem", "")
    if not re.fullmatch(r"(?:plot_\d+_[a-z_]+|schematic-\d+-[a-z-]+)", stem):
        problems.append(f"{name}: invalid source generator stem {stem!r}")
        return problems
    plot = re.match(r"plot_(\d+)_", stem)
    if plot:
        expected_caption = captions.get(plot.group(1))
    else:
        schematic = re.match(r"schematic-(\d+)-", stem)
        expected_caption = schematics.get(f"S{int(schematic.group(1))}")
    if expected_caption is None or figure.get("caption") != expected_caption:
        problems.append(f"{name}: caption differs from its native source manifest")
    for field, suffix in (("file", ".png"), ("pdf", ".pdf")):
        filename = figure.get(field)
        expected = stem.replace("_", "-") + suffix
        if filename != expected:
            problems.append(f"{name}: {field} must be the source-derived {expected}")
            continue
        path = directory / filename
        if not path.is_file() or path.is_symlink():
            problems.append(f"{name}: {filename} is not a regular delivery file")
            continue
        if suffix == ".png":
            try:
                with Image.open(path) as image:
                    if image.format != "PNG":
                        problems.append(f"{name}: preview is not PNG")
                    if image.size != (figure.get("width"), figure.get("height")):
                        problems.append(f"{name}: declared dimensions differ from the PNG")
                    image.verify()
            except (OSError, ValueError, SyntaxError) as error:
                problems.append(f"{name}: PNG cannot be decoded: {error}")
        else:
            content = path.read_bytes()
            if not content.startswith(b"%PDF-") or not content.rstrip().endswith(b"%%EOF"):
                problems.append(f"{name}: vector download is not a complete PDF")
    return problems


def check_web_metadata(item: dict[str, Any], directory: Path) -> list[str]:
    """Check responsive products and identities against the actual report sequence."""
    name = item.get("id", "?")
    problems = []
    source = (REPO_ROOT / "report/aidd-commons-living-report-v0.2.md").read_text(encoding="utf-8")
    order = {}
    chapter = ""
    for line in source.splitlines():
        if line.startswith("# "):
            chapter = re.sub(r"\s+", "-", re.sub(r"[^\w\s-]", "", line[2:].lower()).strip())
        match = re.search(r"\(figures/out/([a-z0-9_-]+)\.pdf\)", line)
        if match:
            order[match.group(1).replace("_", "-")] = (len(order) + 1, chapter)
    stem = item.get("source_stem", "").replace("_", "-")
    expected = order.get(stem)
    if expected != (item.get("reportNumber"), item.get("chapterAnchor")):
        problems.append(f"{name}: report number/chapter differs from canonical report order")
    if item.get("detailHref") != f"/report/figures/{stem}/":
        problems.append(f"{name}: detail route differs from its stable library id")
    for width in (480, 960):
        filename = item.get("previews", {}).get(str(width))
        if filename != f"{stem}-{width}.webp":
            problems.append(f"{name}: missing source-bound {width}px WebP preview")
            continue
        path = directory / filename
        if not path.is_file() or path.is_symlink():
            problems.append(f"{name}: {filename} is not a regular preview file")
            continue
        try:
            with Image.open(path) as preview:
                height = round(item["height"] * width / item["width"])
                if preview.format != "WEBP" or preview.size != (width, height):
                    problems.append(f"{name}: {width}px preview format/dimensions are invalid")
                preview.verify()
        except (OSError, ValueError, SyntaxError) as error:
            problems.append(f"{name}: WebP preview cannot be decoded: {error}")
    return problems


def check_library(
    library: list[dict[str, Any]],
    directory: Path,
    source_directory: Path,
    captions: dict[str, str],
    schematics: dict[str, str],
) -> list[str]:
    """Validate every maintained figure and exact native-master delivery."""
    if not library:
        return ["the figure library is empty"]
    problems: list[str] = []
    seen: set[str] = set()
    expected = {f"plot:{key}" for key in captions} | {f"schematic:{key}" for key in schematics}
    observed: set[str] = set()
    for item in library:
        name = item.get("id", "?")
        problems.extend(check_web_metadata(item, directory))
        problems.extend(check_delivery(item, directory, captions, schematics, require_pages=False))
        if name in seen:
            problems.append(f"{name}: duplicate library id")
        seen.add(name)
        stem = item.get("source_stem", "")
        plot = re.fullmatch(r"plot_(\d+)_[a-z_]+", stem)
        schematic = re.fullmatch(r"schematic-(\d+)-[a-z-]+", stem)
        kind = "plot" if plot else "schematic" if schematic else "invalid"
        if item.get("kind") != kind:
            problems.append(f"{name}: library kind differs from its source")
        if plot:
            observed.add(f"plot:{plot.group(1)}")
        elif schematic:
            observed.add(f"schematic:S{int(schematic.group(1))}")
        if not item.get("title") or not item.get("source_note"):
            problems.append(f"{name}: library title/source note is missing")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item.get("visual_revision_date", "")):
            problems.append(f"{name}: visual revision date is invalid")
        if item.get("visualRevision") != item.get("visual_revision_date"):
            problems.append(f"{name}: visual revision aliases disagree")
        if item.get("sourceDate") != max(item.get("source_dates", []), default=None):
            problems.append(f"{name}: source date differs from retained source dates")
        for field, suffix in (("file", ".png"), ("pdf", ".pdf")):
            delivered = directory / str(item.get(field, ""))
            source = source_directory / f"{stem}{suffix}"
            if not source.is_file() or source.is_symlink():
                problems.append(f"{name}: native {suffix} source is missing")
            elif delivered.is_file() and delivered.read_bytes() != source.read_bytes():
                problems.append(f"{name}: delivered {suffix} differs from its native source")
        pptx = item.get("pptx")
        if schematic:
            if pptx != f"{stem}.pptx":
                problems.append(f"{name}: editable master filename is invalid")
                continue
            delivered = directory / pptx
            source = source_directory / pptx
            if not delivered.is_file() or delivered.is_symlink():
                problems.append(f"{name}: editable PPTX is not a regular delivery file")
                continue
            if (
                not source.is_file()
                or source.is_symlink()
                or delivered.read_bytes() != source.read_bytes()
            ):
                problems.append(f"{name}: editable PPTX differs from its native source")
            try:
                with zipfile.ZipFile(delivered) as package:
                    slide = ET.fromstring(package.read("ppt/slides/slide1.xml"))
                    ns = {
                        "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
                        "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
                    }
                    if not all(slide.find(f".//{tag}", ns) is not None for tag in ("p:sp", "a:t")):
                        problems.append(f"{name}: PPTX lacks native text/shapes")
                    native_sources = str(REPO_ROOT / "report/figures")
                    if native_sources not in sys.path:
                        sys.path.insert(0, native_sources)
                    from schematic_style import _native_source_contracts

                    required_images = _native_source_contracts()[stem]["native_contract"]["images"]
                    if len(slide.findall(".//p:pic", ns)) != len(required_images):
                        problems.append(
                            f"{name}: native illustration count differs from source contract"
                        )
                    package.read("ppt/presentation.xml")
            except (OSError, KeyError, zipfile.BadZipFile, ET.ParseError):
                problems.append(f"{name}: editable PPTX is not a readable presentation")
        elif pptx:
            problems.append(
                f"{name}: quantitative plot must not claim an editable schematic master"
            )
    if observed != expected or len(library) != len(expected):
        problems.append("figure library does not cover all captioned source figures exactly once")
    return problems


def check_manifest() -> list[str]:
    """Check all products and both directions of the page-placement registration."""
    payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    figures = payload.get("figures", [])
    if not figures:
        return ["the manifest registers no figure"]
    captions = json.loads((REPORT_OUT / "captions.json").read_text(encoding="utf-8"))
    schematics = json.loads((REPORT_OUT / "captions-schematics.json").read_text(encoding="utf-8"))
    problems: list[str] = []
    ids: set[str] = set()
    for figure in figures:
        problems.extend(check_delivery(figure, FIGURE_DIR, captions, schematics))
        problems.extend(check_web_metadata(figure, FIGURE_DIR))
        name = figure.get("id", "?")
        if name in ids:
            problems.append(f"{name}: duplicate figure id")
        ids.add(name)
        generator = (
            REPO_ROOT / "report/figures" / (figure.get("source_stem", "").replace("-", "_") + ".py")
        )
        if not generator.is_file():
            problems.append(f"{name}: source generator does not exist")
    problems.extend(check_placements(figures, PAGES, REPO_ROOT / "site/src"))
    library = payload.get("library", [])
    problems.extend(check_library(library, FIGURE_DIR, REPORT_OUT, captions, schematics))
    if [item.get("reportNumber") for item in library] != list(range(1, 21)):
        problems.append("figure library must follow canonical report order 1 through 20")
    # Ordinary builds validate current native labels, relationships and embedded
    # illustration sources without regenerating or loading the authoring runtime.
    os.environ.setdefault("MPLCONFIGDIR", str(REPO_ROOT / ".cache/matplotlib"))
    sys.path.insert(0, str(REPO_ROOT / "report/figures"))
    from schematic_style import validate_native_master

    for item in payload.get("library", []):
        if item.get("kind") == "schematic":
            try:
                validate_native_master(item["source_stem"])
            except (
                OSError,
                ValueError,
                RuntimeError,
                KeyError,
                zipfile.BadZipFile,
                ET.ParseError,
            ) as error:
                problems.append(str(error))
    return problems


def main() -> int:
    try:
        problems = check_manifest()
    except (OSError, ValueError) as error:
        print(f"site figure validation failed: {error}", file=sys.stderr)
        return 1
    if problems:
        for problem in problems:
            print(problem, file=sys.stderr)
        return 1
    payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    print(
        f"checked {len(payload['figures'])} page figures, all placements, "
        f"and {len(payload['library'])} library PNG/PDF pairs with native PPTX masters"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
