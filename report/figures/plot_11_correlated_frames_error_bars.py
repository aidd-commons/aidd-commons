"""Correlated frames and honest error bars.

Source of every number: `site/src/content/docs/labs/rmd17-dynamics-observable.mdx`,
the published lab page for the rMD17 trajectory observable.

There is no `labs/rmd17_system_state/observable-summary.json` in this
repository, so the reviewed artefact for this lab is the page itself. The
numbers are parsed out of that page rather than transcribed into this script,
so the figure cannot drift away from the page it cites, and the parser raises
if a number it expects is not on the page.

What the figure shows. The upper-left panel pairs the naive standard error
with the block-averaged standard error for each molecule. The upper-right
panel shows the ratio between them, which is the number the page reports and
the one a reader needs: treating the frames as independent understates the
uncertainty of the estimate by a factor of 3.30 for ethanol and 6.26 for
malonaldehyde. The lower panel shows that the corrected estimate still carries
a choice inside it, because the block count changes the answer.

What it does not show. There is exactly one ab initio trajectory per molecule
here, so nothing in this figure speaks to replicate dependence between
independent runs, and there is exactly one level of theory, so nothing speaks
to force-field sensitivity. A radius of gyration is one scalar for a
nine-atom molecule and its dynamic range is inherently small. Which side of
one the ratio lands on is a property of the trajectory and not a mathematical
guarantee. None of these numbers is a binding affinity, a free energy, or a
claim about any system this repository has not directly loaded.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import figure_style as style  # noqa: E402  (the module sits next to this script)
from matplotlib.ticker import FuncFormatter  # noqa: E402

FIGURE_NUMBER = 11
STEM = "plot_11_correlated_frames_error_bars"
PAGE = Path("site/src/content/docs/labs/rmd17-dynamics-observable.mdx")
SYSTEMS = ["Ethanol", "Malonaldehyde"]

CAPTION = (
    "The uncertainty of a trajectory observable, from the rMD17 lab page. {values}. "
    "The upper-right "
    "panel is the ratio between the two estimates, which is the number the page "
    "reports. The lower panel "
    "is ethanol's block-averaged standard error against the block count, because a corrected "
    "estimate still carries a choice inside it. There is one trajectory per molecule and one level "
    "of theory, so nothing here speaks to replicate dependence or force-field sensitivity."
)


def read_observable_page() -> dict:
    """Read the numbers of the rMD17 observable lab page.

    The page carries two markdown tables and one sentence with the block
    sweep. All three are parsed rather than transcribed, and a missing number
    raises instead of being silently dropped.
    """
    path = style.REPO_ROOT / PAGE
    text = path.read_text(encoding="utf-8").replace("−", "-")

    sem: dict[str, dict[str, float]] = {}
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells[0] in SYSTEMS and len(cells) == 5:
            sem[cells[0]] = {
                "mean_rg": float(cells[1]),
                "naive_sem": float(cells[2]),
                "block_sem": float(cells[3]),
                "ratio": float(cells[4]),
            }
    missing = [system for system in SYSTEMS if system not in sem]
    if missing:
        raise ValueError(f"the observable page has no standard error row for {missing}")

    convergence: list[dict[str, float]] = []
    for line in text.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0].replace(",", "").isdigit():
            convergence.append(
                {
                    "frames": int(cells[0].replace(",", "")),
                    "ethanol": float(cells[1]),
                    "malonaldehyde": float(cells[2]),
                }
            )
    if not convergence:
        raise ValueError("the observable page has no convergence table")

    sweep = [
        {"blocks": int(blocks.replace(",", "")), "sem": float(value)}
        for blocks, value in re.findall(
            r"(?:block SEM )?at ([\d,]+) blocks \([^)]*\)\s+(?:is|it is)\s+([0-9.]+)",
            re.sub(r"\s+", " ", text),
        )
    ]
    if len(sweep) < 2:
        raise ValueError("the observable page has no block-count sweep")

    # The page reports the hundred-block estimate in the table and the other
    # block counts in the sentence, so the sweep is completed from the table.
    if not any(entry["blocks"] == 100 for entry in sweep):
        sweep.append({"blocks": 100, "sem": sem["Ethanol"]["block_sem"]})

    return {"sem": sem, "convergence": convergence, "sweep": sweep}


def build() -> dict[str, Path]:
    """Read uncertainty magnitude, understatement and block-choice sensitivity separately."""
    style.apply_style("light")
    tokens, colours = style.tokens(), style.categorical()
    page = read_observable_page()
    fig = style.figure(height=5.5)
    style.heading(
        fig,
        "Correlated frames change the uncertainty estimate",
        "rMD17 radius of gyration · one trajectory per molecule · 100-block estimate retained",
    )
    sem_ax = fig.add_axes((0.21, 0.59, 0.37, 0.20))
    ratio_ax = fig.add_axes((0.74, 0.59, 0.21, 0.20))
    sweep_ax = fig.add_axes((0.21, 0.18, 0.74, 0.24))
    for y, system in zip([1, 0], SYSTEMS, strict=True):
        values = page["sem"][system]
        a, b = values["naive_sem"], values["block_sem"]
        sem_ax.plot([a, b], [y, y], color=tokens["rule"], lw=2)
        sem_ax.plot(a, y, "s", ms=6, mfc="none", mec=colours["slate"], mew=1)
        sem_ax.plot(b, y, "o", ms=6, mfc=colours["teal"], mec=tokens["ink"], mew=0.5)
        for value, dy in [(a, -13), (b, 11)]:
            sem_ax.annotate(
                f"{value:.6f}",
                (value, y),
                xytext=(0, dy),
                textcoords="offset points",
                ha="center",
                va="center",
                fontsize=8,
            )
        ratio = values["ratio"]
        ratio_ax.plot([1, ratio], [y, y], color=colours["teal"], lw=1.6)
        ratio_ax.plot(ratio, y, "D", ms=6, mfc=colours["teal"], mec=tokens["ink"], mew=0.5)
        ratio_ax.annotate(
            f"{ratio:.2f}×",
            (ratio, y),
            xytext=(0, 10),
            textcoords="offset points",
            ha="center",
            fontsize=8.5,
            fontweight="bold",
        )
    sem_ax.set_yticks([1, 0], SYSTEMS)
    sem_ax.set_ylim(-0.7, 1.7)
    sem_ax.set_xlim(0, max(page["sem"][s]["block_sem"] for s in SYSTEMS) * 1.18)
    sem_ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value * 1000:g}"))
    sem_ax.set_xlabel(r"Standard error ($10^{-3}$ Å)")
    style.clean_axis(sem_ax)
    style.title(sem_ax, "(a) Naive versus block SEM")
    ratio_ax.axvline(1, color=tokens["muted"], ls="--", lw=0.8)
    ratio_ax.set_yticks([])
    ratio_ax.set_ylim(-0.7, 1.7)
    ratio_ax.set_xlim(0.5, 7.6)
    ratio_ax.set_xticks([1, 3, 5, 7])
    ratio_ax.set_xlabel("Block / naive")
    style.clean_axis(ratio_ax)
    style.title(ratio_ax, "(b) Understatement")
    sweep = sorted(page["sweep"], key=lambda r: r["blocks"])
    xs = [r["blocks"] for r in sweep]
    ys = [r["sem"] for r in sweep]
    sweep_ax.plot(
        xs, ys, color=colours["teal"], marker="o", ms=6, lw=1.7, mec=tokens["ink"], mew=0.5
    )
    naive = page["sem"]["Ethanol"]["naive_sem"]
    sweep_ax.axhline(naive, color=colours["slate"], ls="--", lw=1)
    for x, y in zip(xs, ys, strict=True):
        sweep_ax.annotate(
            f"{y:.6f}",
            (x, y),
            xytext=(0, 10),
            textcoords="offset points",
            ha="center",
            fontsize=8.3,
        )
    sweep_ax.text(
        0.99,
        0.03,
        "Dashed: naive SEM",
        transform=sweep_ax.transAxes,
        ha="right",
        fontsize=8.2,
        color=tokens["muted"],
    )
    sweep_ax.set_xscale("log")
    sweep_ax.set_xticks(xs, [str(x) for x in xs])
    sweep_ax.set_ylim(0, max(ys) * 1.3)
    sweep_ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value * 10000:g}"))
    sweep_ax.set_xlabel("Blocks used · log scale")
    sweep_ax.set_ylabel(r"Block SEM ($10^{-4}$ Å)")
    style.clean_axis(sweep_ax, axis="y")
    style.title(sweep_ax, "(c) Ethanol remains sensitive to block count")
    from matplotlib.lines import Line2D

    fig.legend(
        [
            Line2D([], [], marker="s", mfc="none", mec=colours["slate"], ls="none"),
            Line2D([], [], marker="o", mfc=colours["teal"], mec=tokens["ink"], ls="none"),
        ],
        ["Naive SEM", "Block-averaged SEM"],
        ncol=2,
        loc="lower center",
        bbox_to_anchor=(0.58, 0.07),
        fontsize=8.5,
    )
    style.footnote(
        fig,
        "No independent-run or force-field sensitivity is measured. Block count is an "
        "analysis choice; no new trajectory is simulated.",
        y=0.022,
    )
    values_text = style.english_list(
        f"{s} has a naive standard error of {page['sem'][s]['naive_sem']:.6f} Å "
        f"against a block-averaged standard error of {page['sem'][s]['block_sem']:.6f} "
        f"Å at 100 blocks"
        for s in SYSTEMS
    )
    written = style.save(fig, STEM)
    style.register_caption(FIGURE_NUMBER, CAPTION.format(values=values_text))
    return written


if __name__ == "__main__":
    for artefact in build().items():
        print(f"wrote {artefact[1]}")
