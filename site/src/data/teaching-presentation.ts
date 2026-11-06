/** Display identities and population membership only; frozen science stays in lab sources. */
export const teachingDesigns: Record<string, string> = {
  foundations: "object-evidence-guide",
  "drug-discovery-foundations": "linked-assay-dose",
  "machine-learning": "parallel-fit-validation",
  "data-governance": "record-identity-lineage",
  representations: "same-molecule-encodings",
  "mechanism-targets": "variant-evidence-gap",
  "qsar-properties": "assay-small-multiples",
  "admet-pk": "total-unbound-exposure",
  "dti-screening": "nested-library-population",
  "structure-and-pockets": "structure-residue-context",
  "physics-based-modeling": "retained-frames-separate-energy",
  "molecular-generation": "pareto-and-independent-gallery",
  "biologics-design": "domain-source-field-matrix",
  "synthesis-and-automation": "native-reaction-edit",
  "active-learning": "shared-retained-budget",
  "scientific-agents": "retained-trace-failure",
  "evaluation-and-reproducibility": "simultaneous-identity-splits",
  "candidate-nomination": "and-gate-dossier",
};

/** Authored count diagram, never a retained model ranking. All shortlist marks are a subset. */
export const screeningPopulation = Array.from({ length: 1000 }, (_, index) => ({
  shortlist: index < 50,
  active: index < 8 || (index >= 50 && index < 62),
}));
