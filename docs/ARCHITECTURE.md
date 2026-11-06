# Architecture

## Repository layout

```text
site/       Astro and Starlight application
catalog/    Human-maintained YAML source registry
labs/       Reproducible Python labs and tests
report/     Living technical report sources
scripts/    Validation, export, and release tooling
tests/      Cross-cutting fixtures and checks
docs/       Project charter, architecture, and contributor documentation
```

`site/public/data/` and `public-release/` are generated. Editors change canonical source files, then validators generate deterministic web-facing artifacts.

## Data flow

```text
catalog/resources/*.yaml
          │
          ├── schema and evidence validation
          │
          └── generated resources.v1.json / resources.v1.csv / openness.v1.json
                                      │
                                      └── static Astro pages and client-side filters

catalog/curriculum/tracks.yaml ──> curriculum.v1.json ──> learning-path UI
labs results ──────────────────> reviewed summaries ──> lessons and report
```

A typed build-time overview reads validated catalogue/curriculum sources and every bilingual lab guide. The same overview supplies homepage counts and the 56-guide lab discovery index. Atlas filters search names, descriptions and identifiers; lab filters preserve execution mode, inputs and mixed-mode scope notes. Both encode shared state in URLs and keep ordinary static links/exports available.

`npm --prefix site run build` and `check` first verify maintained JSON/CSV projections and active PNG/PDF placements without rewriting them. Intentional data generation is `npm run data:build`; `npm run workbench:build` regenerates only the workbench/search projection. Intentional figure generation is separate: `npm --prefix site run figures:build`. Preview runs the checked build before serving it. Static HTML links honor the configured deployment base path; downloadable data remain unchanged.

The content/data backend is static: validated canonical sources produce typed object,
search, route, case and view projections. `scripts/workbench/` validates declared
relationships, source anchors, units and populations before generating
`workbench.v1.json` and `search.v1.json`. The three retained case adapters copy
quantities from reviewed summaries; they do not refit models or create predictions.
Reverse links nominate direct consumers for review and do not establish semantic
or causal dependencies.

Cross-content search fetches its compact index on the search page. Atlas renders a
small initial result set and fetches a compact index, then individual full records
when a comparison needs their evidence. List/table/landscape views, sorting and
2–4 selected IDs share URL state. `/atlas/browse/` retains a complete ordinary HTML
list. Scientific coordinate inspectors render selected retained inputs locally
with Canvas, PNG and tabular fallbacks; they do not make remote structure calls.

The site has no account or cross-user response service. Filter state is encoded
in query parameters. Optional self-reported learning progress remains in the
browser under `aidd-commons:v1:progress`. A contribution composer prepares native
GitHub form fields locally; opening and submitting that draft remain reader actions.

## Resource record

Each resource is stored in one YAML file and contains stable identity, type, summary, canonical URL, identifiers, pipeline stages, modalities, tasks, relations, lifecycle status, access level, multidimensional openness, licences, evidence, caveats, acknowledgements, and a last-verified date.

Lifecycle status and access level are separate. A discontinued open repository and an active closed service are therefore representable without collapsing distinct facts.

## Quality gates

The smallest useful checks run first:

1. schema and source-evidence validation;
2. unit tests for generators and labs;
3. TypeScript and Astro builds;
4. internal links and citations;
5. one CPU notebook execution;
6. browser and accessibility smoke tests;
7. a release-tree scan for private workflow material and unsupported licence claims.

Known-bad fixtures ensure the load-bearing validators actually reject malformed records, leakage-prone splits, broken links, and release contamination.

