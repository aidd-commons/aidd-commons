# ruff: noqa: E501
"""Compare disconnection families, and keep route recovery apart from feasibility.

Rule, retrieval, template and learned disconnections are usually compared with a
single recovery percentage. That number hides two things. It hides that the
families fail for different reasons, because each inherits its coverage from
somewhere different. And it hides that recovering a recorded route says nothing
about whether the route can be run.

    python labs/retro_disconnection/inspect_disconnection.py compare
    python labs/retro_disconnection/inspect_disconnection.py check

Reads two committed JSON files and applies reaction SMARTS with RDKit. No model
is trained or executed, no reaction is run, and nothing here is a synthesis
proposal.
"""

import argparse
import json
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem

RDLogger.DisableLog("rdApp.*")

LAB = Path(__file__).resolve().parent
ROOT = LAB.parents[1]
ROUTES = LAB / "routes.json"
METHODS = LAB / "methods.json"


def load() -> tuple[dict, dict]:
    return (
        json.loads(ROUTES.read_text(encoding="utf-8")),
        json.loads(METHODS.read_text(encoding="utf-8")),
    )


def canonical_set(smiles_list: list[str]) -> str:
    return ".".join(sorted(Chem.CanonSmiles(s) for s in smiles_list))


def apply_transforms(transforms: dict, route: dict) -> set[str]:
    """Every disconnection the family proposes for this product."""
    transform = transforms.get(route["transformation_class"])
    if transform is None:
        return set()
    reaction = AllChem.ReactionFromSmarts(transform)
    product = Chem.MolFromSmiles(route["product"])
    proposals = set()
    for outcome in reaction.RunReactants((product,)):
        try:
            proposals.add(".".join(sorted(Chem.MolToSmiles(mol) for mol in outcome)))
        except Exception:  # noqa: BLE001 - an unparsable outcome is simply not a proposal
            continue
    return proposals


def run_family(routes: dict, methods: dict, family: str) -> dict[str, dict]:
    """What one family proposes for every route, and whether the record is among it."""
    spec = methods["families"][family]
    members = set(routes["precedent_set"]["members"])
    by_id = {row["id"]: row for row in routes["routes"]}
    results = {}
    for route in routes["routes"]:
        recorded = canonical_set(route["recorded_reactants"])
        if family == "retrieval":
            hit = route["id"] in members
            proposals = {canonical_set(by_id[route["id"]]["recorded_reactants"])} if hit else set()
        else:
            proposals = apply_transforms(spec.get("transforms", {}), route)
        results[route["id"]] = {
            "recovered": recorded in proposals,
            "proposals": len(proposals),
            "in_precedent": route["id"] in members,
            "transformation_class": route["transformation_class"],
        }
    return results


def score(results: dict[str, dict], subset: set[str] | None = None) -> tuple[int, int]:
    rows = [row for key, row in results.items() if subset is None or key in subset]
    return sum(1 for row in rows if row["recovered"]), len(rows)


def runnable_families(methods: dict) -> list[str]:
    return [name for name, spec in methods["families"].items() if spec["runs_here"]]


def show_comparison(routes: dict, methods: dict) -> None:
    """Three families run, one declared, and the reasons they fail differ."""
    members = set(routes["precedent_set"]["members"])
    unseen = {row["id"] for row in routes["routes"]} - members
    families = runnable_families(methods)
    total = len(routes["routes"])

    print(f"DISCONNECTION FAMILIES OVER {total} RECORDED ROUTES")
    for name, spec in methods["families"].items():
        mark = "runs" if spec["runs_here"] else "DECLARED, NOT RUN"
        print(f"  {name:<11} {mark:<18} coverage depends on {spec['coverage_depends_on']}")
    print()

    print(f"  {'family':<11} {'all':>8} {'in precedent':>14} {'not in precedent':>18}")
    results = {}
    for name in families:
        results[name] = run_family(routes, methods, name)
        overall = score(results[name])
        seen = score(results[name], members)
        new = score(results[name], unseen)
        print(
            f"  {name:<11} {overall[0]:>3}/{overall[1]:<4} {seen[0]:>7}/{seen[1]:<6}"
            f" {new[0]:>11}/{new[1]:<6}"
        )
    print()

    print("THE SAME METHOD, TWO SCORES, ONE SPLIT")
    retrieval = results["retrieval"]
    seen_hit, seen_n = score(retrieval, members)
    all_hit, all_n = score(retrieval, unseen | members)
    print(f"  Retrieval recovers {seen_hit} of {seen_n} routes that are in the precedent set.")
    print(f"  That is {seen_hit / seen_n:.0%}, and it is a lookup succeeding on its own table.")
    print(f"  Over every route it recovers {all_hit} of {all_n}, {all_hit / all_n:.0%}.")
    print("  Neither number is wrong. Which one gets reported is decided entirely by the")
    print("  split, and a method that memorises is the one most rewarded by choosing badly.")
    print()

    print("THE FAMILIES FAIL FOR DIFFERENT REASONS")
    absent = routes["precedent_set"]["classes_absent"]
    print(f"  The precedent set contains no {', '.join(absent)} reaction.")
    for name in families:
        missed = sorted(
            key
            for key, row in results[name].items()
            if not row["recovered"] and row["transformation_class"] in absent
        )
        print(f"    {name:<11} misses {len(missed)} route(s) of that class: {missed or 'none'}")
    print("  Retrieval misses them because those molecules are not in its table.")
    print("  Templates miss them because no template was extracted for a class the")
    print("  dataset never contained. Hand-written rules cover the class because")
    print("  someone chose to write it. Same score column, three different causes.")
    print()

    multi = sorted(key for key, row in results["rule"].items() if row["proposals"] > 1)
    print("RECOVERING A ROUTE IS NOT BEING RIGHT")
    print(f"  On {len(multi)} product(s) the rule family proposes more than one")
    print(f"  disconnection: {multi}. Recovery means the recorded route was among the")
    print("  proposals, not that the method selected it or preferred it.")
    print()


def show_feasibility(routes: dict) -> None:
    print("WHAT NO SCORE ABOVE ESTABLISHES")
    print(f"  laboratory feasibility: {routes['laboratory_feasibility']}")
    print(f"  {routes['why_feasibility_is_not_assessed']}")
    print()
    print("  This is the same boundary the generation gate records when it calls its")
    print("  structural filters a proxy. A disconnection that recovers the recorded")
    print("  route can still need a reagent nobody sells, a protecting group nobody")
    print("  added, or conditions that destroy the rest of the molecule.")
    print()


def check(routes: dict, methods: dict) -> list[str]:
    """Recompute every relationship from the committed files. Returns failures."""
    failures: list[str] = []

    def record_result(passed: bool, message: str) -> None:
        print(f"  {'PASS' if passed else 'FAIL'}  {message}")
        if not passed:
            failures.append(message)

    members = set(routes["precedent_set"]["members"])
    unseen = {row["id"] for row in routes["routes"]} - members
    families = runnable_families(methods)

    record_result(
        all(
            Chem.MolFromSmiles(row["product"]) is not None
            and all(Chem.MolFromSmiles(r) is not None for r in row["recorded_reactants"])
            for row in routes["routes"]
        ),
        f"every product and recorded reactant in the {len(routes['routes'])} routes parses",
    )
    if failures:
        print("  ....  a structure does not parse, so no family is run against the set")
        return failures

    results = {name: run_family(routes, methods, name) for name in families}

    record_result(
        len(methods["families"]) == 4,
        f"the comparison declares all four disconnection families: {sorted(methods['families'])}",
    )
    record_result(
        len(families) == 3 and methods["families"]["learned"]["runs_here"] is False,
        f"three families run and the learned family is declared without being run: {families}",
    )
    record_result(
        bool(methods["families"]["learned"].get("why_not_run")),
        "the family that does not run states why, so the boundary is not silent",
    )
    record_result(
        routes["laboratory_feasibility"] == "not_assessed",
        "the route set records laboratory feasibility as not assessed",
    )
    rule_hits, rule_total = score(results["rule"])
    record_result(
        rule_hits == rule_total,
        f"the hand-written rules recover every recorded route: {rule_hits} of {rule_total}",
    )
    retrieval_seen = score(results["retrieval"], members)
    retrieval_unseen = score(results["retrieval"], unseen)
    record_result(
        retrieval_seen[0] == retrieval_seen[1] and retrieval_unseen[0] == 0,
        f"retrieval recovers {retrieval_seen[0]}/{retrieval_seen[1]} inside the precedent set"
        f" and {retrieval_unseen[0]}/{retrieval_unseen[1]} outside it",
    )
    record_result(
        score(results["retrieval"])[0] < rule_hits,
        "retrieval scores perfectly on its own table and below the rules overall,"
        " so the split decides its headline",
    )

    absent = set(routes["precedent_set"]["classes_absent"])
    template_absent = [
        key
        for key, row in results["template"].items()
        if row["transformation_class"] in absent and row["recovered"]
    ]
    record_result(
        not template_absent,
        f"templates recover nothing in a class the precedent set never contained: {absent}",
    )
    rule_absent = [
        key
        for key, row in results["rule"].items()
        if row["transformation_class"] in absent and row["recovered"]
    ]
    record_result(
        len(rule_absent) > 0,
        f"hand-written rules do cover that class, so the two families differ in cause:"
        f" {sorted(rule_absent)}",
    )
    record_result(
        set(methods["families"]["template"]["transforms"])
        == set(routes["precedent_set"]["classes_present"]),
        "the template family carries exactly the classes present in the precedent set",
    )
    actual_classes = {
        row["transformation_class"] for row in routes["routes"] if row["id"] in members
    }
    record_result(
        actual_classes == set(routes["precedent_set"]["classes_present"])
        and not (actual_classes & set(routes["precedent_set"]["classes_absent"])),
        "the precedent set's declared classes match the classes its members actually carry:"
        f" {sorted(actual_classes)}",
    )

    multi = [key for key, row in results["rule"].items() if row["proposals"] > 1]
    record_result(
        len(multi) > 0,
        f"at least one product admits more than one rule disconnection: {sorted(multi)}",
    )
    return failures


def show_public_records() -> None:
    """Display the five real-data Track 14 synthesis audits from the committed public snapshot."""
    sys.path.insert(0, str(ROOT / "labs/src"))
    from aidd_commons.retro_disconnection.public_synthesis_audit import (
        audit_atom_mapping_and_templates,
        audit_forward_feedback_loop,
        audit_reaction_records,
        audit_routes_and_feasibility,
        load_public_snapshot,
    )

    snapshot = load_public_snapshot()
    rec = audit_reaction_records(snapshot)
    mapping = audit_atom_mapping_and_templates(snapshot)
    routes = audit_routes_and_feasibility(snapshot)
    feedback = audit_forward_feedback_loop(snapshot)

    print(
        "1. REACTION RECORDS & MODELLING UNIT (Perera 2018 Suzuki-Miyaura + Ahneman 2018 Buchwald-Hartwig)"
    )
    print(
        f"  Perera 2018 Suzuki-Miyaura HTE: {rec['suzuki_record_count']} records for"
        f" {rec['suzuki_unique_products']} shared biaryl product"
    )
    print(
        f"  Yield range across conditions on the same product:"
        f" {rec['suzuki_min_yield_fraction']:.4f} to {rec['suzuki_max_yield_fraction']:.4f}"
        f" (span {rec['suzuki_yield_span_fraction']:.4f}; zero-yield rows: {rec['suzuki_zero_yield_rows']})"
    )
    calibrated = sum(1 for r in rec["suzuki_parsed_records"] if r["has_internal_standard"])
    print(
        f"  Role completeness: {calibrated}/12 records carry internal standard 1,3-diethylbenzene;"
        " 3/12 reversed-polarity plate records omit it"
    )
    print(
        "  Ahneman 2018 Buchwald-Hartwig HTE yield spans per aryl halide across (ligand, base, additive):"
    )
    for halide, span in rec["ahneman_halide_condition_spans"].items():
        if span["count"] >= 3:
            print(
                f"    {halide:<22} n={span['count']}  min={span['min_yield_pct']:>6.2f}%"
                f"  max={span['max_yield_pct']:>6.2f}%  span={span['span_pct']:>6.2f}%"
            )
    print()

    print("2. ATOM MAPPING, BOND EDITS & TEMPLATE EXTRACTION (USPTO + AiZynthFinder)")
    for row in mapping["uspto_template_records"]:
        print(
            f"  USPTO[{row['index']}] hash={row['template_hash'][:12]}... conf={row['confidence']:.4f}"
            f" recovers_recorded={row['template_recovers_recorded']}"
        )
        print(
            f"    bonds_formed={row['bonds_formed']} bonds_broken={row['bonds_broken']}"
            f" unmapped_leaving={row['unmapped_leaving_atoms']} lost_mapped={row['lost_mapped_atoms']}"
        )
    diag = mapping["mapping_error_diagnosis"]
    print(
        f"  Mapping error propagation ({diag['corrupted_swap']}):"
        f" clean bonds_formed={diag['clean_bonds_formed']} -> corrupted={diag['corrupted_bonds_formed']}"
    )
    print()

    print("3. MULTI-STEP ROUTE TREES & ROUTE FEASIBILITY / SAFETY (AiZynthFinder + USPTO)")
    for tree in routes["acridine_clustering_routes"]:
        print(
            f"  {tree['route_id']:<18} steps={tree['step_count']} depth={tree['max_depth']}"
            f" all_leaves_in_stock={tree['all_leaves_in_stock']}"
            f" unprotected_diamine={tree['has_unprotected_symmetric_diamine']}"
            f" self_reactive_haloaniline={tree['has_self_reactive_haloaniline']}"
            f" -> {tree['feasibility_verdict']}"
        )
    for kind, summary in routes["linear_vs_branched_routes"].items():
        print(
            f"  peroxide_{kind:<9} steps={summary['step_count']} depth={summary['max_depth']}"
            f" branched={summary['is_branched']} all_leaves_in_stock={summary['all_leaves_in_stock']}"
            f" hydroperoxide_hazard={summary['has_hydroperoxide_motif']}"
        )
    for alt in routes["uspto_alternative_disconnections"]:
        print(
            f"  USPTO alt {alt['disconnection_class']}: competing_halide_sites="
            f"{alt['competing_aryl_halide_sites_on_electrophile']}"
            f" preferred_regioselectivity={alt['preferred_for_regioselectivity']}"
        )
    print()

    print("4. FORWARD CONDITION MODELLING & CLOSED-LOOP HTE FEEDBACK (Ahneman 2018)")
    print(
        f"  LOOCV MAE: substrate-only={feedback['loocv_mae_substrate_only_pct']:.2f}%"
        f" vs condition-aware={feedback['loocv_mae_condition_aware_pct']:.2f}%"
    )
    print(
        f"  Survivorship-bias check on {feedback['zero_yield_well_count']} zero-yield wells:"
        f" retaining 0% runs predicts {feedback['mean_pred_on_zero_wells_with_failures_retained_pct']:.2f}%,"
        f" dropping 0% runs inflates prediction to {feedback['mean_pred_on_zero_wells_when_zeros_dropped_pct']:.2f}%"
        f" (+{feedback['survivorship_bias_inflation_pct']:.2f} percentage points)"
    )
    for well in feedback["feedback_ledger"]:
        print(
            f"  Well {well['well_id']} (entry={well['entry']}): IS_ok={well['internal_standard_area_ok']}"
            f" yield={well['measured_yield_pct']} -> {well['feedback_action']}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action",
        nargs="?",
        default="compare",
        choices=["compare", "check", "public-records", "check-public"],
    )
    action = parser.parse_args().action
    if action == "public-records":
        show_public_records()
        return
    if action == "check-public":
        sys.path.insert(0, str(ROOT / "labs/src"))
        from aidd_commons.retro_disconnection.public_synthesis_audit import check_public_synthesis

        failures = check_public_synthesis()
        for failure in failures:
            print(f"  FAIL  {failure}")
        if failures:
            sys.exit(1)
        print(
            "PASS: all public reaction records, atom maps, route trees, feasibility gates and HTE feedback checks agree"
        )
        return

    routes, methods = load()

    print(f"Routes {ROUTES.relative_to(ROOT)} ({len(routes['routes'])} constructed)")
    print(f"Methods {METHODS.relative_to(ROOT)}")
    print()
    if action == "compare":
        show_comparison(routes, methods)
        show_feasibility(routes)
        print("Run 'check' to recompute these counts from the committed files.")
        return

    print("DISCONNECTION CHECKS")
    failures = check(routes, methods)
    print()
    if failures:
        print(f"{len(failures)} check(s) failed.")
        sys.exit(1)
    print("All checks passed. This verifies how the families differ and where the")
    print("comparison stops. It establishes nothing about any route being makeable.")


if __name__ == "__main__":
    main()
