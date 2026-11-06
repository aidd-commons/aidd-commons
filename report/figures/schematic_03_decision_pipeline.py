"""Figure 3. The target-to-candidate decision pipeline.

The canonical native scene is build_schematic_masters.mjs. Its source-ledger
records the exact labels, relationships, evidence boundary and conceptual assets.
This compatibility entry point returns the actual PPTX/PDF/PNG master and never
regenerates the preserved historical author SVG.
"""

from pathlib import Path

from schematic_style import NativeSchematicMaster

OUT_DIR = Path(__file__).resolve().parent / "out"
STEM = "schematic-03-decision-pipeline"


def build() -> NativeSchematicMaster:
    return NativeSchematicMaster(STEM)


def main() -> tuple[Path, Path]:
    return build().save(OUT_DIR, STEM)


if __name__ == "__main__":
    main()
