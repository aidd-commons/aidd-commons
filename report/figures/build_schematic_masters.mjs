/**
 * Seven source-bound, hybrid-editable educational schematic masters.
 * This native presentation scene is the sole geometry authority. Dimensions are
 * millimetres at 180 mm width. Labels, symbols, layouts and directional connectors
 * are native; the separately embedded PNGs are conceptual, replaceable artwork.
 * No SVG or scientific experiment is generated.
 *
 * Usage: RUNTIME_NODE_MODULES=... PRESENTATIONS_SKILL_DIR=... RUNTIME_PYTHON=...
 *        node this-file.mjs [stem|all]
 * Run the installed Presentations operation marker once before an authoring task.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(path.join(root, 'package.json'));
const YAML = require('yaml');
const runtime = process.env.RUNTIME_NODE_MODULES;
const python =
  process.env.RUNTIME_PYTHON || path.join(root, '.venv/bin/python');
const skill = process.env.PRESENTATIONS_SKILL_DIR;
const runtimeBin =
  process.env.RUNTIME_BIN_DIR ||
  (runtime ? path.resolve(runtime, '../../bin/override') : null);
const office =
  process.env.LIBREOFFICE_BIN ||
  (runtimeBin
    ? path.join(runtimeBin, 'soffice')
    : '/Applications/LibreOffice.app/Contents/MacOS/soffice');
const out = path.join(here, 'out');
const receiptRoot = path.resolve(
  process.env.SCHEMATIC_RECEIPT_DIR ||
    path.join(root, 'tmp/figure-refinement-20261107/schematics'),
);
const assetRoot = path.join(root, 'site/src/assets/editorial');
const layoutOnly = process.argv.includes('--layout-only');
// Increment for a reviewed layout change. This ordinary native-document revision
// is checked without hashes, timestamps, private manifests or authoring packages.
const sceneRevision = '2026-11-07.2';
const compactRevisions = {};
const mm = (n) => (n * 96) / 25.4;
const pt = (n) => (n * 96) / 72;
const read = (p) => fs.readFile(path.join(root, p), 'utf8');
const curriculum = YAML.parse(await read('catalog/curriculum/tracks.yaml'));
const report = await read('report/aidd-commons-living-report-v0.2.md');
const resources = await Promise.all(
  ['model-img2mol', 'dataset-polaris-adme'].map(async (id) => ({
    source: `catalog/resources/${id}.yaml`,
    ...YAML.parse(await read(`catalog/resources/${id}.yaml`)),
  })),
);
const palette = JSON.parse(
  execFileSync(
    python,
    [
      '-c',
      'import json,sys;sys.dont_write_bytecode=True;sys.path.insert(0,sys.argv[1]);from atlas_palette import palette;print(json.dumps(palette("light")))',
      here,
    ],
    { encoding: 'utf8' },
  ),
);
const C = {
  ...palette.categorical,
  ...palette.tokens,
  white: '#ffffff',
  wash: palette.fills,
  ink: '#13283d',
};
const tableRows = report
  .split('\n')
  .filter((line) =>
    /^\| (Disease and mechanism|Target identification|Target validation|Assay and data strategy|Hit discovery|Hit confirmation|Hit-to-lead|Lead optimisation|Candidate nomination) \|/.test(
      line,
    ),
  );
if (tableRows.length !== 9)
  throw new Error(
    `Expected the canonical nine-stage table, found ${tableRows.length}`,
  );
const stages = tableRows.map((line) => {
  const [name, decision, contract, baseline, failure] = line
    .split('|')
    .slice(1, -1)
    .map((x) => x.trim());
  return {
    name,
    decision,
    fields: contract.split(', ').map((x) => x.trim()),
    baseline,
    failure,
  };
});
const shortDecisions = [
  'Causal relevance',
  'Actionable entity',
  'Phenotype change',
  'Optimisation quantity',
  'Worth confirming?',
  'Attributable activity',
  'Series headroom',
  'Acceptable trade-off',
  'Package coherence',
];
const shortFailures = [
  'Correlation as mechanism',
  'Identity collapse',
  'Evidence reuse',
  'Pooled endpoints',
  'Retrospective as prospective',
  'Artefact as binding',
  'Endpoint loss',
  'Scalar hides liability',
  'Confidence as experiment',
];
const stageIcons = [
  'cell',
  'target-identity-record-v3',
  'orthogonal-validation-v3',
  'assay',
  'molecule',
  'assay',
  'molecule',
  'model',
  'candidate-evidence-v3',
];
const lifecycleNames = [
  'Protocol freeze',
  'Structural\npretest',
  'Finite-output\npretest',
  'One-time\nopening',
  'Reviewed\nsummary',
];
const lifecycleX = [4, 37, 70, 112, 145];
const artifactRecords = [
  { name: 'Learn', role: 'Ordered lessons' },
  { name: 'Atlas', role: 'Source records' },
  { name: 'Labs', role: 'Executable procedure' },
  { name: 'Report', role: 'Reviewed synthesis' },
];
const statementRecords = [
  {
    name: 'Observed source fact',
    status: 'Source-backed',
    source: 'Opened source and sentence-level citation',
  },
  {
    name: 'Project decision',
    status: 'Decided',
    source: 'Recorded rationale, scope, constraints and version',
  },
  {
    name: 'Open question',
    status: 'Unresolved',
    source: 'Missing, conflicting or inaccessible evidence',
  },
  {
    name: 'Future work',
    status: 'Planned',
    source: 'Intended contribution before implementation or measurement',
  },
];
const motion = {
  S3: {
    stem: 'schematic-03-decision-pipeline',
    duration_seconds: 27,
    reading_direction: 'row-major, each row left to right',
    stages: stages.map((stage, i) => ({
      name: stage.name,
      bounds_mm: {
        x: 7 + (i % 3) * 59,
        y: 18 + Math.floor(i / 3) * 54,
        w: 48,
        h: 50,
      },
    })),
  },
  S7: {
    stem: 'schematic-07-frozen-lifecycle',
    duration_seconds: 15,
    reading_direction: 'left to right',
    stages: lifecycleNames.map((name, i) => ({
      name: name.replaceAll('\n', ' '),
      bounds_mm: { x: lifecycleX[i], y: 24, w: 31, h: 54 },
      detail_bounds_mm: { x: lifecycleX[i], y: 24, w: 30.6, h: 54 },
    })),
  },
};
const dimensionKeys = [
  'inference_code',
  'training_code',
  'weights',
  'architecture',
  'data_recipe',
  'training_data',
  'evaluation_code',
];
const dimensionNames = [
  'Inference code',
  'Training code',
  'Weights',
  'Architecture',
  'Data recipe',
  'Training data',
  'Evaluation code',
];
const paths = curriculum.learning_paths;
const routeOrder = [
  'core',
  'small-molecules',
  'targets-cells',
  'biologics',
  'structure-physics',
  'agents-feedback',
];
const routeNames = [
  'Core',
  'Small\nmolecules',
  'Targets\nand cells',
  'Biologics',
  'Structure\nand\nphysics',
  'Agents\nand\nfeedback',
];
const routeIcons = [
  'data',
  'molecule',
  'cell',
  'protein',
  'simulation',
  'robot',
];
const routeRecords = routeOrder.map((id, i) => {
  const row = paths.find((p) => p.id === id);
  if (!row) throw new Error(`Missing learning path: ${id}`);
  return { ...row, shortName: routeNames[i], icon: routeIcons[i] };
});
const lessonRecords = new Map(
  curriculum.tracks.flatMap((track) =>
    track.lessons.map((lesson) => [`${track.id}/${lesson.id}`, lesson]),
  ),
);
const prerequisiteIds = [...new Set(paths.flatMap((p) => p.prerequisites))];
const preferredLessons = [
  'foundations/getting-started',
  'drug-discovery-foundations/discovery-context',
  'representations/biological-representations',
  'data-governance/identity-lineage-and-reuse',
  'physics-based-modeling/docking-to-fep',
  'data-governance/records-to-model-table',
  'machine-learning/baseline-training-validation',
  'evaluation-and-reproducibility/metrics-and-uncertainty',
  'qsar-properties/regression-classification-errors',
  'qsar-properties/uncertainty-to-decisions',
];
if (prerequisiteIds.some((id) => !preferredLessons.includes(id)))
  throw new Error(
    'New prerequisite identities require a reviewed layout update',
  );
const lessonAliases = [
  'Evidence claim boundaries',
  'Therapeutic decision framing',
  'Biological representations',
  'Identity lineage and reuse',
  'Docking and free energy',
  'Model table construction',
  'Baseline fitting and validation',
  'Metrics and uncertainty',
  'Regression and classification errors',
  'Uncertainty to decisions',
];
const prerequisiteLessons = preferredLessons
  .filter((id) => prerequisiteIds.includes(id))
  .map((id) => {
    const i = preferredLessons.indexOf(id);
    const lesson = lessonRecords.get(id);
    if (!lesson) throw new Error(`Missing lesson ${id}`);
    return {
      id,
      title: lesson.title,
      alias: lessonAliases[i],
      requiredBy: routeRecords
        .filter((r) => r.prerequisites.includes(id))
        .map((r) => r.id),
      inCore: routeRecords[0].lesson_ids.includes(id),
    };
  });
const relations = prerequisiteLessons.reduce(
  (sum, l) => sum + l.requiredBy.length,
  0,
);
const coreShared = prerequisiteLessons.filter((l) => l.inCore).length;
const captions = {
  S1: 'Four artifacts, one system. (a) Learn provides ordered lessons, the Atlas stores source records, Labs implement executable procedures, and Report combines reviewed prose and figures. (b) Shared resource identifiers connect the four forms. Dashed correction routes denote the editorial rule that a source-backed correction should reach every affected surface. The figure reports no measured propagation result or reader outcome. The separate data and computation illustrations are AI-generated concepts rather than scientific image data.',
  S2: 'Four classes of statement. The four quadrants make statement authority and status explicit. (a) An observed source fact requires an opened source and a sentence-level citation. (b) A project decision records a choice with its rationale and version. (c) An open question preserves missing, conflicting or inaccessible evidence as unverified. (d) Future work is planned before implementation, review or measurement. Solid and dashed boundaries distinguish asserting and unresolved or intended classes. These classes are not an evidence ranking. The source-record illustration is AI-generated and conceptual.',
  S3: 'Target to candidate. Nine numbered stages follow the active v0.2 decision table in three horizontal rows, each read from left to right. Edge-wrapped connectors carry stage order from the last stage of one row to the first stage of the next. Every stage pairs a conceptual object with a decision and an explicitly labelled frequent failure. Arrows denote order, not causality or advancement success. Illustrations are AI-generated concepts rather than candidate counts, measured binding or biological effects. Complete evidence contracts and strong cheap baselines remain in the adjacent source table.',
  S4: 'Stage evidence contracts. Nine rows retain every minimum required field from the active v0.2 stage table, grouped into mechanism and target, assay and hit, and lead and candidate bands. Hollow squares mark required records. They do not indicate completed measurements or that a candidate is ready to advance. Stage identity and field labels are native editable objects. Baselines and frequent failures remain separate in the adjacent table.',
  S5: `Prerequisites across six learning paths. The current curriculum YAML names ${prerequisiteLessons.length} shared prerequisite lessons and ${relations} prerequisite relations across five specialist routes. Filled circles denote stated prerequisites. The separate core column uses dashed hollow squares for the ${coreShared} shared lessons also listed in the core route. Row badges count routes requiring each lesson; header counts give the listed lessons in each route. The core route states no prerequisites. These counts describe the map, not difficulty, coverage or observed learning. Route illustrations are AI-generated concepts.`,
  S6: `Seven-dimensional openness. Two canonical source records give separate availability states for inference code, training code, weights, architecture, data recipe, training data and evaluation code. Redundant symbols and labels distinguish available, not available, not applicable and unverified. Actual access and lifecycle values are shown separately for each record, rather than inferred from these seven states. Both records were last verified ${resources[0].last_verified}. Available does not establish unrestricted use, and unverified does not mean unavailable. The model and dataset illustrations are AI-generated concepts.`,
  S7: 'Frozen evaluation lifecycle. The written protocol is frozen before structural and finite-output pretests on training and validation data. A prominent boundary separates these pretests from the one-time held-out test opening and reviewed summary. The dashed development return applies only before test opening. A separate post-test error branch records a protocol-invalidating bug and prohibits result-driven retuning. The summary retains observed values and limitations. The figure asserts no measured output or universally successful pretest. The computation illustration is AI-generated and conceptual.',
};
const configs = [
  ['schematic-01-artifacts', 100, 'Four artifacts, one system', 'S1'],
  [
    'schematic-02-statement-classes',
    126,
    'Authority is visible in the statement',
    'S2',
  ],
  [
    'schematic-03-decision-pipeline',
    198,
    'From a disease question to a candidate decision',
    'S3',
  ],
  [
    'schematic-04-stage-contracts',
    234,
    'Evidence changes with the stage',
    'S4',
  ],
  [
    'schematic-05-prerequisite-graph',
    179,
    'Shared prerequisites connect the learning paths',
    'S5',
  ],
  [
    'schematic-06-openness-dimensions',
    184,
    'Openness is a seven-part record',
    'S6',
  ],
  [
    'schematic-07-frozen-lifecycle',
    147,
    'Freeze the procedure before opening the test',
    'S7',
  ],
].map(([stem, height, title, key]) => ({
  stem,
  width: 180,
  height,
  title,
  key,
  caption: captions[key],
}));

function sourceContract(config) {
  const texts = { 'master-title': config.title };
  const marks = [],
    requiredMarkers = [],
    images = {},
    connectors = [],
    dashedConnectors = [],
    nonDirectional = [];
  const majorTexts = ['master-title'];
  if (config.key === 'S1') {
    artifactRecords.forEach((v, i) => {
      texts[`artifact-name-${i}`] = v.name;
      majorTexts.push(`artifact-name-${i}`);
    });
    Object.assign(images, {
      'atlas-data-illustration': 'data',
      'labs-computation-illustration': 'model',
    });
    for (let i = 0; i < 4; i++) {
      connectors.push(`correction-to-artifact-${i}`);
      dashedConnectors.push(`correction-to-artifact-${i}`);
    }
    connectors.push('shared-identifier-rail');
    nonDirectional.push('shared-identifier-rail');
  }
  if (config.key === 'S2') {
    statementRecords.forEach((v, i) => {
      texts[`class-title-${i}`] = `(${String.fromCharCode(97 + i)})  ${v.name}`;
      texts[`class-status-${i}`] = v.status;
      majorTexts.push(`class-title-${i}`);
    });
    images['observed-source-image'] = 'data';
    connectors.push(
      'source-supports-claim',
      'decision-input-route-0',
      'decision-input-route-1',
      'decision-input-route-2',
      'unresolved-source-route',
    );
    dashedConnectors.push('unresolved-source-route');
  }
  if (config.key === 'S3')
    stages.forEach((v, i) => {
      texts[`stage-title-${i}`] = wrapWords(v.name, 20);
      texts[`stage-decision-${i}`] = wrapWords(shortDecisions[i], 14);
      texts[`stage-failure-${i}`] = wrapWords(shortFailures[i], 25);
      majorTexts.push(`stage-title-${i}`, `stage-decision-${i}`);
      images[`stage-object-${i}`] = stageIcons[i];
      if (i > 0) connectors.push(`stage-order-${i}`);
      if (i === 3 || i === 6)
        for (let j = 0; j < 4; j++) {
          const n = `stage-order-${i}-wrap-${j}`;
          connectors.push(n);
          nonDirectional.push(n);
        }
    });
  if (config.key === 'S4')
    stages.forEach((v, i) => {
      texts[`contract-title-${i}`] = wrapWords(v.name, 20);
      majorTexts.push(`contract-title-${i}`);
      v.fields.forEach((field, j) => {
        texts[`contract-${i}-field-${j}-label`] = wrapWords(field, 22);
        requiredMarkers.push(`contract-${i}-field-${j}-required`);
      });
    });
  if (config.key === 'S5') {
    routeRecords.forEach((v, i) => {
      texts[`route-name-${i}`] = v.shortName;
      texts[`route-count-${i}`] = String(v.lesson_ids.length);
      images[`route-image-${i}`] = v.icon;
      majorTexts.push(`route-name-${i}`);
    });
    prerequisiteLessons.forEach((v, i) => {
      texts[`lesson-name-${i}`] = wrapWords(v.alias, 28);
      texts[`lesson-required-count-${i}`] = String(v.requiredBy.length);
      majorTexts.push(`lesson-name-${i}`);
      if (v.inCore) marks.push(`core-includes-${i}`);
      routeRecords.forEach((r, j) => {
        if (v.requiredBy.includes(r.id)) marks.push(`prerequisite-${i}-${j}`);
      });
    });
  }
  if (config.key === 'S6')
    resources.forEach((v, i) => {
      texts[`openness-record-name-${i}`] = v.name;
      texts[`openness-record-kind-${i}`] = v.kind;
      majorTexts.push(`openness-record-name-${i}`);
      texts[`openness-access-${i}`] = v.access_level.value.replaceAll('_', ' ');
      texts[`openness-lifecycle-${i}`] = v.status.value;
      images[`openness-record-image-${i}`] = i === 0 ? 'model' : 'data';
      dimensionKeys.forEach((key, j) => {
        const state = v.openness[key].value;
        texts[`openness-state-${i}-${j}`] = state.replaceAll('_', ' ');
        texts[`openness-${i}-${j}-glyph`] = {
          available: '+',
          not_available: '×',
          not_applicable: '–',
          unverified: '?',
        }[state];
      });
    });
  if (config.key === 'S6')
    texts['openness-review-date'] =
      `Record review: ${resources[0].last_verified}. Availability does not establish unrestricted use.`;
  if (config.key === 'S7') {
    lifecycleNames.forEach((v, i) => {
      texts[`lifecycle-name-${i}`] = v;
      majorTexts.push(`lifecycle-name-${i}`);
    });
    images['finite-output-computation'] = 'model';
    for (let i = 1; i < 5; i++) connectors.push(`lifecycle-order-${i}`);
    connectors.push(
      'pretest-development-return',
      'pretest-return-drop',
      'posttest-invalidating-error',
    );
    dashedConnectors.push(
      'pretest-development-return',
      'pretest-return-drop',
      'posttest-invalidating-error',
    );
    nonDirectional.push('pretest-return-drop');
  }
  return {
    scene_revision: sceneRevision,
    native_texts: texts,
    relation_marks: marks,
    required_markers: requiredMarkers,
    images,
    native_connectors: connectors,
    dashed_connectors: dashedConnectors,
    non_directional_connectors: nonDirectional,
    minimum_font_pt: 8.9,
    major_minimum_font_pt: 10,
    major_native_texts: majorTexts,
    report_insertion_width_mm: 162,
    report_scale: 0.9,
  };
}

if (process.argv.includes('--source-record')) {
  console.log(
    JSON.stringify(
      {
        source_report: 'report/aidd-commons-living-report-v0.2.md',
        artifacts: artifactRecords,
        statementClasses: statementRecords,
        lifecycle: lifecycleNames.map((name, i) => ({
          order: i + 1,
          name: name.replaceAll('\n', ' '),
        })),
        dimensionKeys,
        dimensionNames,
        motion,
        configs: configs.map((c) => ({
          ...c,
          native_contract: sourceContract(c),
        })),
        stages: stages.map((v, i) => ({
          ...v,
          shortDecision: shortDecisions[i],
          shortFailure: shortFailures[i],
          asset: stageIcons[i],
        })),
        prerequisiteLessons,
        routes: routeRecords.map((r) => ({
          id: r.id,
          count: r.lesson_ids.length,
          prerequisites: r.prerequisites,
        })),
        resources: resources.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          access: r.access_level.value,
          lifecycle: r.status.value,
          source: r.source,
          last_verified: r.last_verified,
          canonical_url: r.canonical_url,
          dimensions: dimensionKeys.map((key, j) => ({
            key,
            name: dimensionNames[j],
            value: r.openness[key].value,
            evidence_ids: r.openness[key].evidence || [],
            evidence: (r.evidence || []).filter((e) =>
              (r.openness[key].evidence || []).includes(e.id),
            ),
          })),
          states: dimensionKeys.map((k) => r.openness[k].value),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!runtime)
  throw new Error('Set RUNTIME_NODE_MODULES to the managed artifact runtime');
if (!skill)
  throw new Error(
    'Set PRESENTATIONS_SKILL_DIR to the installed native presentation authoring helpers',
  );
const { Presentation, PresentationFile, FileBlob } = await import(
  pathToFileURL(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs'))
    .href
);
const { finalizePresentation } = await import(
  pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs'))
    .href
);

const usedAssets = new Map();
function makeScene(config) {
  const presentation = Presentation.create({
    slideSize: { width: mm(config.width), height: mm(config.height) },
  });
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  const ledger = {
    figure: config.stem,
    delivery_mode: 'composite',
    style: 'nature-pastel',
    visual_lock: {
      inherits_from: 'report/figures/atlas_palette.py',
      locked: ['identity_tokens', 'categorical_roles'],
    },
    width_mm: config.width,
    height_mm: config.height,
    annotation_profile: 'method-readable',
    source_anchors: [],
    nodes: [],
    arrows: [],
    assets: [],
    formula_registry: {},
    caption: config.caption,
    evidence_boundary:
      'Educational conceptual diagram, not measured evidence or reader outcomes',
  };
  const textNames = [];
  const arrowNames = [];
  const graphicNames = [];
  const imageNames = [];
  const graphic = (
    name,
    x,
    y,
    w,
    h,
    fill = 'none',
    stroke = 'none',
    geometry = 'rect',
    dashed = false,
    lw = 0.65,
  ) => {
    const s = slide.shapes.add({
      name,
      geometry,
      position: { left: mm(x), top: mm(y), width: mm(w), height: mm(h) },
      fill,
      line: {
        fill: stroke,
        width: stroke === 'none' ? 0 : pt(lw),
        style: dashed ? 'dashed' : 'solid',
      },
    });
    graphicNames.push(name);
    return s;
  };
  const text = (name, value, x, y, w, h, size = 8.5, options = {}) => {
    const s = graphic(name, x, y, w, h, 'none', 'none', 'textbox');
    s.text = value;
    s.text.style = {
      typeface: 'Arial',
      fontSize: pt(Math.max(8.9, size)),
      color: options.color || C.ink,
      bold: options.bold || false,
      alignment: options.align || 'left',
      verticalAlignment: 'middle',
      wrap: 'none',
      autoFit: 'none',
      insets: { left: 0, right: 0, top: 0, bottom: 0 },
    };
    textNames.push(name);
    return s;
  };
  const rule = (name, x, y, w, color = C.rule) =>
    graphic(name, x, y, w, 0.13, color);
  const anchor = (name, x, y) => graphic(name, x - 0.1, y - 0.1, 0.2, 0.2);
  const connector = (name, from, to, opts = {}) => {
    const {
      dashed = false,
      arrow = true,
      color = C.ink,
      kind = 'straight',
      fromSide = 'right',
      toSide = 'left',
      source,
      role = 'sequence',
      claim,
      evidenceState = 'confirmed',
    } = opts;
    if (!source || !claim)
      throw new Error(`Connector ${name} lacks a source and claim`);
    const s = slide.shapes.connect(from, to, {
      kind,
      fromSide,
      toSide,
      line: {
        style: dashed ? 'dashed' : 'solid',
        fill: color,
        width: pt(0.65),
      },
      ...(arrow
        ? { tail: { type: 'triangle', width: 'sm', length: 'sm' } }
        : {}),
    });
    s.name = name;
    arrowNames.push(name);
    ledger.arrows.push({
      id: name,
      source_anchor: source,
      role,
      claim,
      evidence_state: evidenceState,
      line_style: dashed ? 'dashed' : 'solid',
      prohibited_implications: [
        'causal biological effect',
        'measured success probability',
      ],
      decisive_control:
        'Compare labels and endpoints with the referenced source rule',
    });
    return s;
  };
  const line = (name, x1, y1, x2, y2, opts) =>
    connector(
      name,
      anchor(`${name}-start`, x1, y1),
      anchor(`${name}-end`, x2, y2),
      opts,
    );
  const image = async (name, asset, x, y, w, h, role) => {
    const source = path.join(assetRoot, `${asset}.png`);
    if (layoutOnly) {
      graphic(`${name}-layout-slot`, x, y, w, h, C.white, C.rule, 'rect', true);
      text(`${name}-layout-slot-label`, asset, x, y + h / 2 - 2, w, 4, 8, {
        color: C.muted,
        align: 'center',
      });
      return null;
    }
    const bytes = await fs.readFile(source);
    const s = slide.images.add({
      alt: `${name}: ${role}. AI-generated conceptual illustration.`,
      blob: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
      contentType: 'image/png',
      fit: 'contain',
      position: { left: mm(x), top: mm(y), width: mm(w), height: mm(h) },
    });
    // ImageAddOptions has no name field. The common native facade's setter is
    // required for a stable independently selectable picture name in PPTX.
    s.name = name;
    usedAssets.set(asset, source);
    imageNames.push(name);
    ledger.assets.push({
      id: name,
      source: path.relative(root, source),
      object_class: asset,
      semantic_role: role,
      evidence_role: 'conceptual illustration only',
      color_role: 'project teal/coral identity',
      rendering_mode: 'ai_bitmap',
      permission: 'User-authorized website educational illustration',
      disclosure:
        'AI-generated conceptual illustration, backend version unverified unless generation record exposes it',
      actually_drawn: `Generic ${asset} concept from the inspected editorial asset family`,
      must_read_as: role,
      must_not_read_as:
        'a measured specimen, exact structure, result, or verified biological mechanism',
      prohibited_metaphor:
        'Conceptual internal details interpreted as observed scientific data',
    });
    return s;
  };
  const node = (id, label, source, role, extra = {}) =>
    ledger.nodes.push({
      id,
      label,
      source_anchor: source,
      scientific_role: role,
      evidence_state: 'confirmed',
      prohibited_implications: [
        'new experimental evidence',
        'human learning benefit',
      ],
      ...extra,
    });
  const title = (name, value, y = 2, size = 12) =>
    text(name, value, 4, y, 172, 7, size, { bold: true });
  // The first object is deliberately non-connected; the exporter reserves its ID.
  title('master-title', config.title);
  const footer = () => {
    rule('footer-rule', 4, config.height - 7.8, 172);
    text(
      'conceptual-disclosure',
      imageNames.length
        ? 'Conceptual illustrations; native labels and relationships.'
        : 'Native text and required-field markers.',
      4,
      config.height - 6.7,
      172,
      4.5,
      7.5,
      { color: C.muted },
    );
  };
  return {
    presentation,
    slide,
    config,
    ledger,
    textNames,
    arrowNames,
    graphicNames,
    imageNames,
    graphic,
    text,
    rule,
    anchor,
    connector,
    line,
    image,
    node,
    footer,
  };
}

function document(
  s,
  name,
  x,
  y,
  w,
  h,
  color = C.teal,
  mode = 'text',
  dashed = false,
) {
  const body = s.graphic(
    `${name}-sheet`,
    x,
    y,
    w,
    h,
    C.white,
    color,
    'rect',
    dashed,
  );
  s.graphic(`${name}-spine`, x + 1.2, y + 1.2, 0.65, h - 2.4, color);
  if (mode === 'grid') {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        s.graphic(
          `${name}-cell-${r}-${c}`,
          x + 4 + (c * (w - 7)) / 3,
          y + 4 + (r * (h - 7)) / 3,
          (w - 10) / 3,
          (h - 10) / 3,
          r === 1 && c === 1 ? color : C.wash.slate,
          color,
        );
  } else {
    for (let i = 0; i < 4; i++)
      s.rule(
        `${name}-line-${i}`,
        x + 4,
        y + 4 + i * 3.2,
        (w - 7) * [1, 0.8, 0.92, 0.65][i],
        i === 0 ? color : C.rule,
      );
  }
  return body;
}
function checked(s, name, label, x, y, width, size = 8.3) {
  s.graphic(`${name}-required`, x, y + 1.25, 1.6, 1.6, C.white, C.teal);
  s.text(
    `${name}-label`,
    label,
    x + 2.5,
    y,
    width - 2.5,
    label.includes('\n') ? 8 : 4.2,
    size,
  );
}
function number(s, name, value, x, y, color = C.teal) {
  s.graphic(`${name}-circle`, x, y, 4.8, 4.8, color, color, 'ellipse');
  s.text(`${name}-text`, String(value), x, y, 4.8, 4.8, 9.2, {
    color: C.white,
    bold: true,
    align: 'center',
  });
}
function wrapWords(value, max = 21) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && line.length + word.length + 1 > max) {
      lines.push(line);
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

async function artifacts(s) {
  const source =
    'docs/PROJECT_CHARTER.md#mission; docs/EDITORIAL_GUIDE.md#corrections-and-deprecation';
  s.ledger.source_anchors.push(source);
  s.text(
    'artifacts-panel',
    '(a)  Four reader-facing forms',
    4,
    10.5,
    172,
    5,
    10.2,
    { bold: true },
  );
  const columns = [5, 49, 93, 137];
  const labels = ['Learn', 'Atlas', 'Labs', 'Report'];
  const subtitles = [
    'Ordered lessons',
    'Source records',
    'Executable procedure',
    'Reviewed synthesis',
  ];
  const colors = [C.teal, C.coral, C.ember, C.slate];
  for (let i = 0; i < 4; i++) {
    const x = columns[i];
    s.text(`artifact-name-${i}`, labels[i], x, 16.5, 37, 5, 10, { bold: true });
    if (i === 0) {
      s.graphic('learn-backdrop', x + 1, 22.5, 33, 25.5, C.wash.teal, C.rule);
      document(s, 'learn-left-page', x + 2.5, 24, 14, 19, colors[i]);
      document(s, 'learn-right-page', x + 18, 24, 14, 19, colors[i]);
      for (let j = 0; j < 4; j++)
        s.graphic(
          `learn-sequence-${j}`,
          x + 4 + j * 7.2,
          44.2,
          5.4,
          2.6,
          j === 3 ? colors[i] : C.white,
          colors[i],
        );
      s.node(
        'learn',
        labels[i],
        source,
        'An ordered curriculum rather than a progress measurement',
      );
    } else if (i === 1) {
      await s.image(
        'atlas-data-illustration',
        'data',
        x + 1,
        22.5,
        34,
        26,
        'A conceptual registry of source records',
      );
      s.node(
        'atlas',
        labels[i],
        source,
        'Searchable evidence-backed resource records',
      );
    } else if (i === 2) {
      await s.image(
        'labs-computation-illustration',
        'model',
        x + 1,
        22.5,
        34,
        26,
        'A conceptual computation implementing a teaching procedure',
      );
      s.node(
        'labs',
        labels[i],
        source,
        'An executable procedure; illustration is not a lab result',
      );
    } else {
      s.graphic('report-backdrop', x + 1, 22.5, 33, 25.5, C.wash.slate, C.rule);
      document(s, 'report-page', x + 3.5, 23.8, 28, 23, colors[i]);
      s.graphic('report-figure-field', x + 7.5, 36.5, 18, 8, C.wash.slate);
      for (let j = 0; j < 3; j++)
        s.graphic(
          `report-bars-${j}`,
          x + 9.5 + j * 5,
          43.2 - j * 1.3,
          2.5,
          1 + j * 1.3,
          colors[i],
        );
      s.node(
        'report',
        labels[i],
        source,
        'A living report, with non-quantitative chart motif',
      );
    }
    s.text(
      `artifact-description-${i}`,
      wrapWords(subtitles[i], 20),
      x,
      49.5,
      39,
      9,
      9.2,
      { color: C.muted },
    );
    const chip = s.graphic(
      `artifact-identifier-${i}`,
      x + 1,
      66.5,
      32,
      6.5,
      C.white,
      colors[i],
    );
    s.text(
      `artifact-identifier-text-${i}`,
      'resource ID',
      x + 2,
      67.3,
      30,
      5,
      9.2,
      { align: 'center', color: colors[i] },
    );
    const rail = s.anchor(`artifact-rail-anchor-${i}`, x + 17, 81.5);
    s.connector(`correction-to-artifact-${i}`, rail, chip, {
      dashed: true,
      fromSide: 'top',
      toSide: 'bottom',
      source,
      role: 'prospective',
      claim:
        'A source-backed correction should propagate to every affected repeated claim',
    });
  }
  s.text(
    'coupling-panel',
    '(b)  Shared identity and correction routes',
    4,
    59.5,
    172,
    5,
    10.2,
    { bold: true },
  );
  s.line('shared-identifier-rail', 21, 75.5, 154, 75.5, {
    arrow: false,
    source,
    role: 'association',
    claim: 'The artifacts share resource identifiers',
  });
  s.graphic('correction-token', 61, 81.5, 58, 8.5, C.wash.coral, C.coral);
  s.text('correction-label', 'Source-backed correction', 63, 83.2, 54, 5, 10, {
    bold: true,
    align: 'center',
  });
  s.footer();
}

async function statements(s) {
  const source = 'docs/EDITORIAL_GUIDE.md#four-statement-classes';
  s.ledger.source_anchors.push(source);
  s.text(
    'authority-boundary',
    'Four kinds of authority; no evidence ranking',
    4,
    12,
    172,
    5,
    9.4,
    { color: C.muted },
  );
  const groups = [
    { x: 4, y: 22, color: C.teal },
    { x: 93, y: 22, color: C.coral },
    { x: 4, y: 72, color: C.ember },
    { x: 93, y: 72, color: C.slate },
  ];
  s.rule('statement-horizontal-divider', 4, 68, 172);
  s.graphic('statement-vertical-divider', 89.2, 22, 0.15, 92, C.rule);
  for (const [i, g] of groups.entries()) {
    const r = statementRecords[i],
      x = g.x,
      y = g.y;
    s.text(
      `class-title-${i}`,
      `(${String.fromCharCode(97 + i)})  ${r.name}`,
      x,
      y,
      83,
      6,
      10.2,
      { bold: true },
    );
    s.text(`class-status-${i}`, r.status, x, y + 7, 82, 5, 9.3, {
      color: g.color,
      bold: true,
    });
    if (i === 0) {
      await s.image(
        'observed-source-image',
        'data',
        x,
        y + 14,
        27,
        24,
        'An opened source record, not a measured dataset',
      );
      const claim = s.graphic(
        'fact-supported-claim',
        x + 44,
        y + 17,
        34,
        16,
        C.white,
        g.color,
      );
      s.text(
        'fact-claim-text',
        'Supported\nclaim',
        x + 47,
        y + 19,
        28,
        12,
        10,
        { bold: true },
      );
      s.connector(
        'source-supports-claim',
        s.anchor('fact-source-anchor', x + 28, y + 25),
        claim,
        { source, role: 'association', claim: r.source },
      );
      s.text(
        'fact-condition',
        'Opened source + citation',
        x,
        y + 40,
        82,
        5,
        9.2,
        { color: C.muted },
      );
    } else if (i === 1) {
      const choice = s.graphic(
        'decision-choice',
        x + 46,
        y + 18,
        32,
        18,
        C.wash.coral,
        g.color,
      );
      s.text('decision-choice-text', 'Choice', x + 48, y + 23, 28, 6, 10, {
        bold: true,
        align: 'center',
      });
      for (let j = 0; j < 3; j++) {
        const input = s.graphic(
          `decision-input-${j}`,
          x,
          y + 14 + j * 8,
          26,
          6,
          C.white,
          C.rule,
        );
        s.text(
          `decision-input-label-${j}`,
          ['Evidence', 'Scope', 'Constraints'][j],
          x + 1,
          y + 14 + j * 8,
          24,
          6,
          9.2,
        );
        s.connector(`decision-input-route-${j}`, input, choice, {
          source,
          role: 'association',
          claim: r.source,
        });
      }
      s.text(
        'decision-record',
        'Rationale and version',
        x,
        y + 40,
        82,
        5,
        9.2,
        { color: C.muted },
      );
    } else if (i === 2) {
      document(
        s,
        'missing-evidence',
        x + 2,
        y + 15,
        23,
        23,
        g.color,
        'text',
        true,
      );
      const question = s.graphic(
        'question-ring',
        x + 47,
        y + 15,
        22,
        22,
        C.wash.coral,
        g.color,
        'ellipse',
        true,
      );
      s.text('question-mark', '?', x + 47, y + 15, 22, 22, 22, {
        color: g.color,
        bold: true,
        align: 'center',
      });
      s.connector(
        'unresolved-source-route',
        s.anchor('unknown-evidence-anchor', x + 28, y + 26),
        question,
        { dashed: true, source, role: 'prospective', claim: r.source },
      );
      s.text(
        'question-boundary',
        'Evidence remains unverified',
        x,
        y + 40,
        82,
        5,
        9.2,
        { color: C.muted },
      );
    } else {
      for (let j = 0; j < 3; j++) {
        s.graphic(
          `future-tile-${j}`,
          x + j * 28,
          y + 17,
          24,
          19,
          C.wash.slate,
          g.color,
          'rect',
          true,
        );
        s.text(
          `future-tile-label-${j}`,
          ['Build', 'Review', 'Measure'][j],
          x + j * 28,
          y + 23,
          24,
          6,
          9.5,
          { align: 'center', bold: true },
        );
        if (j < 2) {
          s.graphic(
            `future-step-link-${j}`,
            x + j * 28 + 24.6,
            y + 26.2,
            2.8,
            0.4,
            g.color,
          );
        }
      }
      s.text(
        'future-state',
        'Before implementation or measurement',
        x,
        y + 40,
        83,
        5,
        9.2,
        { color: C.muted },
      );
    }
    s.node(`statement-${i}`, r.name, source, r.source, { status: r.status });
  }
  s.footer();
}

async function decisionPipeline(s) {
  const source =
    'report/aidd-commons-living-report-v0.2.md#the-target-to-candidate-pipeline';
  s.ledger.source_anchors.push(source);
  const bounds = motion.S3.stages.map((v) => v.bounds_mm);
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i],
      { x, y } = bounds[i];
    number(s, `stage-${i}`, i + 1, x, y);
    s.text(
      `stage-title-${i}`,
      wrapWords(stage.name, 20),
      x + 6.5,
      y - 1,
      42,
      12,
      10.2,
      { bold: true },
    );
    await s.image(
      `stage-object-${i}`,
      stageIcons[i],
      x,
      y + 12,
      23,
      23,
      `Conceptual object for ${stage.name}`,
    );
    s.text(`stage-decision-type-${i}`, 'Decision', x + 25, y + 12, 24, 5, 8.9, {
      color: C.muted,
    });
    s.text(
      `stage-decision-${i}`,
      wrapWords(shortDecisions[i], 14),
      x + 25,
      y + 18,
      24,
      16,
      10,
      { bold: true },
    );
    s.rule(`stage-failure-rule-${i}`, x, y + 35, 48);
    s.graphic(
      `stage-failure-marker-${i}`,
      x + 0.2,
      y + 37,
      1.6,
      1.6,
      C.coral,
      C.coral,
      'diamond',
    );
    s.text(
      `stage-failure-type-${i}`,
      'Frequent failure',
      x + 3,
      y + 35.5,
      45,
      5,
      8.9,
      { color: C.ember },
    );
    s.text(
      `stage-failure-${i}`,
      wrapWords(shortFailures[i], 25),
      x + 3,
      y + 41,
      45,
      9,
      8.9,
      { color: C.ember },
    );
    s.node(`stage-${i}`, stage.name, source, 'Decision stage', {
      decision: stage.decision,
      visible_decision: shortDecisions[i],
      frequent_failure: stage.failure,
      visible_failure: shortFailures[i],
      bounds_mm: bounds[i],
    });
    if (i > 0) {
      const prev = bounds[i - 1],
        opts = {
          source,
          claim: 'The active source table orders these consecutive stages',
        };
      if (i % 3) {
        s.line(
          `stage-order-${i}`,
          prev.x + 50,
          prev.y + 25,
          x - 2,
          y + 25,
          opts,
        );
      } else {
        const points = [
          [prev.x + 49, prev.y + 25],
          [178, prev.y + 25],
          [178, prev.y + 51],
          [2, prev.y + 51],
          [2, y + 25],
          [x - 1, y + 25],
        ];
        for (let j = 0; j < 5; j++)
          s.line(
            j === 4 ? `stage-order-${i}` : `stage-order-${i}-wrap-${j}`,
            ...points[j],
            ...points[j + 1],
            {
              ...opts,
              arrow: j === 4,
              fromSide: j === 3 ? 'bottom' : 'right',
              toSide: j === 3 ? 'top' : 'left',
            },
          );
      }
    }
  }
  s.text(
    'decision-key',
    'Read every row left to right. Wrapped arrows indicate order; diamonds identify frequent failures.',
    4,
    181,
    172,
    6,
    9.2,
    { color: C.muted },
  );
  s.footer();
}

async function stageContracts(s) {
  const source =
    'report/aidd-commons-living-report-v0.2.md#the-target-to-candidate-pipeline';
  s.ledger.source_anchors.push(source);
  const bands = [
    '(a)  Mechanism and target',
    '(b)  Assay and hits',
    '(c)  Lead and candidate',
  ];
  for (let band = 0; band < 3; band++) {
    const by = 15 + band * 66;
    s.graphic(`contract-band-accent-${band}`, 4, by, 1.2, 64, C.teal);
    s.text(`contract-band-title-${band}`, bands[band], 8, by, 168, 6, 10.2, {
      bold: true,
    });
    for (let within = 0; within < 3; within++) {
      const i = band * 3 + within,
        stage = stages[i],
        y = by + 8 + within * 19;
      number(s, `contract-${i}`, i + 1, 8, y + 2);
      s.text(
        `contract-title-${i}`,
        wrapWords(stage.name, 20),
        15,
        y,
        40,
        15,
        10,
        { bold: true },
      );
      stage.fields.forEach((field, j) => {
        const x = 59 + (j % 3) * 39.5,
          yy = y + Math.floor(j / 3) * 8.8;
        checked(
          s,
          `contract-${i}-field-${j}`,
          wrapWords(field, 22),
          x,
          yy,
          38.5,
          9.2,
        );
      });
      s.rule(`contract-base-${i}`, 8, y + 18, 168);
      s.node(`contract-${i}`, stage.name, source, 'Minimum evidence contract', {
        fields: stage.fields,
        prohibited_implications: [
          'fields have been measured',
          'candidate is ready to advance',
        ],
      });
    }
  }
  s.graphic('required-field-legend', 8, 217, 2.1, 2.1, C.white, C.teal);
  s.text(
    'contract-key',
    'Required record, not completed measurement',
    13,
    215.5,
    162,
    6,
    9.5,
    { bold: true },
  );
  s.footer();
}

async function prerequisites(s) {
  const source = 'catalog/curriculum/tracks.yaml#learning_paths';
  s.ledger.source_anchors.push(source);
  const matrixX = 63,
    step = 19;
  s.text('prerequisite-row-heading', 'Shared lesson', 4, 48, 57, 6, 10.2, {
    bold: true,
  });
  s.text('route-count-unit', 'Listed lessons in route', 4, 55, 57, 5, 9.2, {
    color: C.muted,
  });
  for (const [i, r] of routeRecords.entries()) {
    const x = matrixX + i * step;
    await s.image(
      `route-image-${i}`,
      r.icon,
      x - 1,
      13,
      18,
      18,
      `Conceptual subject of the ${r.title}`,
    );
    s.text(`route-name-${i}`, r.shortName, x - 2, 32, 21, 17, 10, {
      align: 'center',
      bold: true,
    });
    s.text(
      `route-count-${i}`,
      String(r.lesson_ids.length),
      x + 0.5,
      51,
      16,
      7,
      10.5,
      { align: 'center', bold: true, color: i === 0 ? C.slate : C.teal },
    );
    s.node(`route-${r.id}`, r.title, source, 'Declared learning path', {
      listed_lesson_count: r.lesson_ids.length,
    });
  }
  s.rule('matrix-header-rule', 4, 61, 172);
  s.graphic('core-separation', 80.5, 32, 0.2, 121, C.rule);
  for (const [i, lesson] of prerequisiteLessons.entries()) {
    const y = 63 + i * 9;
    s.graphic(
      `lesson-required-count-circle-${i}`,
      4,
      y + 2,
      4.6,
      4.6,
      C.white,
      C.teal,
      'ellipse',
    );
    s.text(
      `lesson-required-count-${i}`,
      String(lesson.requiredBy.length),
      4,
      y + 2,
      4.6,
      4.6,
      9.2,
      { align: 'center', bold: true },
    );
    s.text(`lesson-name-${i}`, wrapWords(lesson.alias, 28), 11, y, 50, 9, 10);
    routeRecords.forEach((route, j) => {
      const x = matrixX + j * step + 8.5;
      if (j === 0 && lesson.inCore)
        s.graphic(
          `core-includes-${i}`,
          x - 1.8,
          y + 2.7,
          3.6,
          3.6,
          C.white,
          C.slate,
          'rect',
          true,
        );
      if (lesson.requiredBy.includes(route.id)) {
        s.graphic(
          `prerequisite-${i}-${j}`,
          x - 1.8,
          y + 2.7,
          3.6,
          3.6,
          C.teal,
          C.teal,
          'ellipse',
        );
        s.ledger.arrows.push({
          id: `prerequisite-${i}-${j}`,
          source_anchor: source,
          role: 'prerequisite',
          claim: `${route.id} lists ${lesson.id} as a prerequisite`,
          evidence_state: 'confirmed',
          rendering: 'Incidence mark, not a causal arrow',
          prohibited_implications: ['difficulty', 'measured learning outcome'],
          decisive_control:
            'Exact membership in learning_paths[].prerequisites',
        });
      }
    });
    s.rule(`matrix-row-rule-${i}`, 4, y + 8.8, 172);
    s.node(`lesson-${i}`, lesson.alias, source, 'Shared prerequisite lesson', {
      lesson_id: lesson.id,
      canonical_title: lesson.title,
      required_by: lesson.requiredBy,
      listed_in_core: lesson.inCore,
    });
  }
  s.graphic(
    'matrix-legend-required',
    5,
    158,
    3.5,
    3.5,
    C.teal,
    C.teal,
    'ellipse',
  );
  s.text('matrix-legend-required-text', 'Prerequisite', 11, 156.7, 37, 6, 9.2);
  s.graphic(
    'matrix-legend-core',
    52,
    158,
    3.5,
    3.5,
    C.white,
    C.slate,
    'rect',
    true,
  );
  s.text('matrix-legend-core-text', 'Core inclusion', 58, 156.7, 44, 6, 9.2);
  s.text(
    'matrix-summary',
    `${prerequisiteLessons.length} lessons · ${relations} prerequisite relations`,
    107,
    156.7,
    69,
    6,
    9.2,
    { bold: true },
  );
  s.text(
    'core-prerequisite-boundary',
    'Core inclusion is a separate relation. The core route lists no prerequisites.',
    4,
    165,
    172,
    5,
    9.2,
    { color: C.muted },
  );
  s.footer();
}

function opennessMark(s, name, state, x, y, size = 5.5) {
  const dark = C.teal;
  if (state === 'available') {
    s.graphic(`${name}-mark`, x, y, size, size, dark, dark, 'ellipse');
    s.text(`${name}-glyph`, '+', x, y - 0.15, size, size, 10.5, {
      bold: true,
      color: C.white,
      align: 'center',
    });
  } else if (state === 'not_available') {
    s.graphic(`${name}-mark`, x, y, size, size, C.white, C.ember);
    s.text(`${name}-glyph`, '×', x, y - 0.15, size, size, 10.8, {
      bold: true,
      color: C.ember,
      align: 'center',
    });
  } else if (state === 'not_applicable') {
    s.graphic(
      `${name}-mark`,
      x,
      y,
      size,
      size,
      C.wash.slate,
      C.slate,
      'diamond',
    );
    s.text(`${name}-glyph`, '–', x, y - 0.15, size, size, 10, {
      bold: true,
      color: C.slate,
      align: 'center',
    });
  } else if (state === 'unverified') {
    s.graphic(
      `${name}-mark`,
      x,
      y,
      size,
      size,
      C.white,
      C.slate,
      'ellipse',
      true,
    );
    s.text(`${name}-glyph`, '?', x, y - 0.15, size, size, 9, {
      color: C.slate,
      bold: true,
      align: 'center',
    });
  } else throw new Error(`Unsupported openness state ${state}`);
}

async function openness(s) {
  const schema = 'docs/RESOURCE_SCHEMA.md#claim-evidence';
  s.ledger.source_anchors.push(schema, ...resources.map((r) => r.source));
  s.text(
    'dimension-heading',
    '(a)  Seven separate assets',
    4,
    15,
    60,
    6,
    10.2,
    { bold: true },
  );
  for (const [i, r] of resources.entries()) {
    const x = 69 + i * 55;
    await s.image(
      `openness-record-image-${i}`,
      i === 0 ? 'model' : 'data',
      x,
      13,
      22,
      22,
      i === 0
        ? 'Generic model concept, not Img2Mol architecture'
        : 'Generic dataset concept, not measured ADME data',
    );
    s.text(`openness-record-name-${i}`, r.name, x + 24, 16, 29, 10, 10, {
      bold: true,
    });
    s.text(`openness-record-kind-${i}`, r.kind, x + 24, 27, 29, 5, 9.2, {
      color: C.muted,
    });
    s.node(`record-${r.id}`, r.name, r.source, 'Canonical example record', {
      states: Object.fromEntries(
        dimensionKeys.map((k) => [k, r.openness[k].value]),
      ),
      access: r.access_level.value,
      lifecycle: r.status.value,
      last_verified: r.last_verified,
    });
  }
  s.rule('openness-header-rule', 4, 39, 172);
  for (let j = 0; j < dimensionKeys.length; j++) {
    const y = 41 + j * 10;
    s.text(`openness-dimension-${j}`, dimensionNames[j], 4, y, 62, 8, 10.2);
    for (const [i, r] of resources.entries()) {
      const x = 69 + i * 55,
        state = r.openness[dimensionKeys[j]].value;
      opennessMark(s, `openness-${i}-${j}`, state, x + 1, y + 1.3, 5.5);
      s.text(
        `openness-state-${i}-${j}`,
        state.replaceAll('_', ' '),
        x + 9,
        y,
        44,
        8,
        9.4,
      );
    }
    s.rule(`openness-row-rule-${j}`, 4, y + 9.5, 172);
  }
  const legendStates = [
    'available',
    'not_available',
    'not_applicable',
    'unverified',
  ];
  legendStates.forEach((state, i) => {
    const x = 4 + i * 44;
    opennessMark(s, `openness-legend-${i}`, state, x, 113.5, 4.6);
    s.text(
      `openness-legend-label-${i}`,
      state.replaceAll('_', ' '),
      x + 6,
      112.5,
      37,
      6,
      9.2,
    );
  });
  s.text(
    'openness-unknown-boundary',
    'Unverified preserves an unresolved claim; it does not mean unavailable.',
    4,
    120.5,
    172,
    5.5,
    9.2,
    { color: C.muted },
  );
  s.rule('openness-section-divider', 4, 128, 172);
  s.text(
    'openness-axes-title',
    '(b)  Independent record axes',
    4,
    131,
    62,
    6,
    10.2,
    { bold: true },
  );
  resources.forEach((r, i) => {
    const x = 69 + i * 55;
    s.text(`openness-axes-record-${i}`, r.name, x, 131, 52, 6, 9.2, {
      color: C.muted,
      bold: true,
    });
  });
  s.rule('openness-axes-header-rule', 4, 138.5, 172);
  s.text('access-axis-name', 'Access', 4, 141, 60, 6, 10.2, { bold: true });
  s.rule('openness-axes-mid-rule', 4, 148.5, 172);
  s.text('lifecycle-axis-name', 'Lifecycle', 4, 151, 60, 6, 10.2, {
    bold: true,
  });
  s.rule('openness-axes-bottom-rule', 4, 158.5, 172);
  resources.forEach((r, i) => {
    const x = 69 + i * 55;
    s.text(
      `openness-access-${i}`,
      r.access_level.value.replaceAll('_', ' '),
      x,
      141,
      53,
      6,
      9.4,
    );
    s.text(`openness-lifecycle-${i}`, r.status.value, x, 151, 53, 6, 9.4);
  });
  s.text(
    'openness-review-date',
    `Record review: ${resources[0].last_verified}. Availability does not establish unrestricted use.`,
    4,
    162,
    172,
    6,
    9.2,
    { color: C.muted },
  );
  s.footer();
}

function lock(s, name, x, y, open = false) {
  s.graphic(
    `${name}-shackle`,
    x + (open ? 10 : 3),
    y,
    open ? 9 : 8,
    10,
    C.white,
    C.slate,
    'ellipse',
  );
  if (open)
    s.graphic(`${name}-open-shackle-cutout`, x + 9, y + 5, 12, 6, C.white);
  s.graphic(`${name}-body`, x, y + 5, 14, 11, C.wash.slate, C.slate);
  s.graphic(`${name}-keyhole`, x + 6, y + 9, 2, 3, C.slate, C.slate, 'ellipse');
}
async function lifecycle(s) {
  const source =
    'docs/EDITORIAL_GUIDE.md#lab-protocol-freeze; report/aidd-commons-living-report-v0.2.md#frozen-evaluation';
  s.ledger.source_anchors.push(source);
  s.graphic('test-boundary', 105.5, 15, 0.65, 107, C.coral);
  s.text('test-boundary-label', 'TEST BOUNDARY', 108, 14, 65, 6, 9.8, {
    color: C.ember,
    bold: true,
  });
  for (let i = 0; i < 5; i++) {
    const x = lifecycleX[i];
    number(s, `lifecycle-number-${i}`, i + 1, x, 24, i >= 3 ? C.coral : C.teal);
    s.text(`lifecycle-name-${i}`, lifecycleNames[i], x, 32, 31, 12, 10.2, {
      bold: true,
    });
    if (i === 0) {
      document(s, 'frozen-protocol', x + 1, 47, 23, 25, C.slate);
      lock(s, 'protocol-lock', x + 16, 58);
    }
    if (i === 1) {
      document(s, 'structural-check', x + 1, 47, 27, 25, C.teal, 'grid');
    }
    if (i === 2)
      await s.image(
        'finite-output-computation',
        'model',
        x,
        46,
        30,
        28,
        'Computation checked for finite output, not a measured result',
      );
    if (i === 3) lock(s, 'one-time-test-lock', x + 6, 52, true);
    if (i === 4) document(s, 'reviewed-summary', x + 1, 47, 27, 25, C.slate);
    s.node(
      `lifecycle-${i}`,
      lifecycleNames[i].replaceAll('\n', ' '),
      source,
      'Frozen evaluation stage',
      { bounds_mm: motion.S7.stages[i].bounds_mm },
    );
    if (i > 0) {
      const prevRight = lifecycleX[i - 1] + 29.5;
      const nextLeft = x - 1.2;
      s.line(`lifecycle-order-${i}`, prevRight, 59, nextLeft, 59, {
        source,
        claim: 'The frozen procedure orders this gate before the next',
      });
    }
  }
  s.text(
    'freeze-records',
    'Task · data · labels\nsplit · fit · selection\nmetrics · calibration\nseeds · stop',
    4,
    82,
    34,
    24,
    9.2,
    { color: C.muted },
  );
  s.text('pretest-scope', 'Training and\nvalidation only', 41, 83, 57, 12, 10, {
    color: C.teal,
    bold: true,
    align: 'center',
  });
  s.text('test-scope', 'Held-out test', 112, 83, 31, 7, 9.5, {
    color: C.ember,
    bold: true,
  });
  s.text('summary-scope', 'Values and\nlimitations', 145, 83, 31, 12, 9.3, {
    color: C.muted,
  });
  const retry = {
    dashed: true,
    source,
    role: 'optional',
    evidenceState: 'inferred',
    claim:
      'Engineering repairs on training and validation are allowed only before opening the held-out test',
  };
  s.line('pretest-return-drop', 85, 76, 85, 102, {
    ...retry,
    arrow: false,
    fromSide: 'bottom',
    toSide: 'top',
  });
  s.line('pretest-development-return', 85, 102, 51, 102, {
    ...retry,
    fromSide: 'left',
    toSide: 'right',
  });
  s.text('pretest-return-label', 'Pre-test repairs only', 40, 105, 58, 6, 9.3, {
    color: C.muted,
    align: 'center',
  });
  const error = s.graphic(
    'posttest-error-body',
    115,
    112,
    61,
    15,
    C.wash.coral,
    C.coral,
  );
  s.text(
    'posttest-error-label',
    'Post-test bug\nProtocol-invalidating error',
    118,
    113,
    55,
    12,
    9.3,
    { color: C.ember, bold: true },
  );
  s.connector(
    'posttest-invalidating-error',
    s.anchor('posttest-error-branch', 127, 94),
    error,
    {
      dashed: true,
      color: C.coral,
      kind: 'elbow',
      fromSide: 'bottom',
      toSide: 'top',
      source,
      role: 'control',
      claim:
        'A bug after test opening is recorded as a protocol-invalidating error rather than used for result-driven retuning',
    },
  );
  s.text(
    'retuning-prohibition',
    'No result-driven retuning after test opening',
    4,
    129,
    172,
    6,
    10,
    { bold: true },
  );
  s.footer();
}

const builders = [
  artifacts,
  statements,
  decisionPipeline,
  stageContracts,
  prerequisites,
  openness,
  lifecycle,
];

async function sanitizePptx(
  sourcePath,
  destination,
  title,
  nativeRevision = sceneRevision,
) {
  execFileSync(python, [
    '-c',
    String.raw`
import sys,zipfile,xml.etree.ElementTree as E
source,destination,title=sys.argv[1:4]
ns={'dc':'http://purl.org/dc/elements/1.1/','cp':'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'}
with zipfile.ZipFile(source) as reader,zipfile.ZipFile(destination,'w') as writer:
 for info in reader.infolist():
  content=reader.read(info.filename)
  if info.filename=='docProps/core.xml':
   node=E.fromstring(content)
   for key,value in {'dc:title':title,'dc:creator':'AIDD Commons','cp:lastModifiedBy':'AIDD Commons','cp:revision':sys.argv[4],'dc:description':'Editable educational schematic. Native text and relationships; separately replaceable conceptual illustrations.'}.items():
    prefix,local=key.split(':');tag='{'+ns[prefix]+'}'+local
    item=node.find(tag)
    if item is None:item=E.SubElement(node,tag)
    item.text=value
   content=E.tostring(node,encoding='utf-8',xml_declaration=True)
  elif info.filename.startswith('ppt/slides/slide') and info.filename.endswith('.xml'):
   node=E.fromstring(content)
   for image in node.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}pic/{http://schemas.openxmlformats.org/presentationml/2006/main}nvPicPr/{http://schemas.openxmlformats.org/presentationml/2006/main}cNvPr'):
    alt=image.get('descr','')
    if ':' in alt:image.set('name',alt.split(':',1)[0])
   content=E.tostring(node,encoding='utf-8',xml_declaration=True)
  writer.writestr(info,content)
`,
    sourcePath,
    destination,
    title,
    nativeRevision,
  ]);
}

async function exportOffice(sourcePptx, directory, profile) {
  await fs.mkdir(directory, { recursive: true });
  const conversion =
    'pdf:impress_pdf_Export:' +
    JSON.stringify({
      UseLosslessCompression: { type: 'boolean', value: 'true' },
      ReduceImageResolution: { type: 'boolean', value: 'false' },
    });
  const log = execFileSync(
    office,
    [
      `-env:UserInstallation=file://${profile}`,
      '--headless',
      '--convert-to',
      conversion,
      '--outdir',
      directory,
      sourcePptx,
    ],
    { encoding: 'utf8', timeout: 120000 },
  );
  await fs.writeFile(path.join(directory, 'office-export.log'), log);
  const stem = path.basename(sourcePptx, '.pptx');
  const pdf = path.join(directory, `${stem}.pdf`);
  const pdfStat = await fs.stat(pdf);
  if (pdfStat.size < 1000) throw new Error('Office did not produce a real PDF');
  execFileSync(
    'pdftoppm',
    ['-png', '-singlefile', '-r', '300', pdf, path.join(directory, stem)],
    { timeout: 120000 },
  );
  return { pdf, png: path.join(directory, `${stem}.png`) };
}

async function buildOne(config, index) {
  const revision = new Date().toISOString().replace(/[:.]/g, '-');
  const buildDir = path.join(
    receiptRoot,
    'build',
    `${config.stem}-${revision}`,
  );
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(out, { recursive: true });
  // This link is task-local and keeps the finalizer's import check on the managed runtime.
  await fs.symlink(runtime, path.join(buildDir, 'node_modules'), 'dir');
  const s = makeScene(config);
  await builders[index](s);
  if (layoutOnly) {
    const draft = path.join(buildDir, `${config.stem}-layout-only.pptx`);
    await (await PresentationFile.exportPptx(s.presentation)).save(draft);
    const preview = await s.presentation.export({
      slide: s.slide,
      format: 'png',
      scale: 2,
    });
    await fs.writeFile(
      path.join(buildDir, 'layout-only.png'),
      new Uint8Array(await preview.arrayBuffer()),
    );
    await fs.writeFile(
      path.join(buildDir, 'LAYOUT_ONLY.txt'),
      'Disposable source-copy/layout check. Illustration slots are not finished art. Nothing was promoted.\n',
    );
    console.log(
      JSON.stringify({
        stem: config.stem,
        status: 'layout_only_not_final',
        buildDir,
      }),
    );
    return;
  }
  s.slide.speakerNotes.text = [
    config.caption,
    ...s.ledger.source_anchors.map((p) => `Source: ${p}`),
    'The conceptual PNG assets are independently movable/replaceable, not vector-editable.',
    'All text, symbols, shapes and directional arrows are native PowerPoint objects.',
    'AI-generated conceptual artwork is not scientific evidence. Actual backend identity is recorded privately when exposed.',
  ].join('\n');
  const raw = path.join(buildDir, 'raw.pptx');
  const candidate = path.join(buildDir, 'candidate.pptx');
  const finalDir = path.join(buildDir, 'final');
  await fs.mkdir(finalDir, { recursive: true });
  const final = path.join(finalDir, `${config.stem}.pptx`);
  await (await PresentationFile.exportPptx(s.presentation)).save(raw);
  await sanitizePptx(
    raw,
    candidate,
    config.title,
    sourceContract(config).scene_revision,
  );
  await finalizePresentation({
    workspaceDir: root,
    candidatePath: candidate,
    finalPath: final,
    pythonExecutable: python,
    explicitTotalSlideCount: 1,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    integrityValidatorPath: path.join(
      skill,
      'container_tools/inspect_presentation_package_integrity.py',
    ),
    layoutValidatorPath: path.join(
      skill,
      'container_tools/inspect_presentation_layout_geometry.py',
    ),
    layoutArgs: [
      '--expected-slide-size-emu',
      `${Math.round(config.width * 36000)},${Math.round(config.height * 36000)}`,
      '--validate-heading-fit',
    ],
    fontPolicy: { basis: 'design', families: ['Arial'] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, 'validation.json'),
  });
  const originalBytes = await fs.readFile(final);
  const reopened = await PresentationFile.importPptx(
    await FileBlob.load(final),
  );
  const rendered = await reopened.export({
    slide: reopened.slides.items[0],
    format: 'png',
    scale: 2,
  });
  await fs.writeFile(
    path.join(buildDir, 'reopened.png'),
    new Uint8Array(await rendered.arrayBuffer()),
  );
  // Edit native text, move an independent graphic/image and change an actual
  // connector endpoint in a disposable copy. The canonical final is unchanged.
  const editSlideBefore = reopened.slides.items[0];
  const editedLabel = editSlideBefore.shapes.items.find(
    (x) => x.name === 'master-title',
  );
  const editedGraphic = s.imageNames.length
    ? editSlideBefore.images.items.find((x) => x.name === s.imageNames[0])
    : editSlideBefore.shapes.items.find((x) => x.name === 'contract-0-circle');
  if (!editedLabel || !editedGraphic)
    throw new Error(
      'Roundtrip needs independent native label and graphic objects',
    );
  const movedName = editedGraphic.name,
    before = editedGraphic.position.toJSON();
  const replacement = config.title + ' [edit check]';
  editedLabel.text = replacement;
  editedGraphic.position = {
    ...before,
    left: before.left + mm(1),
    top: before.top + mm(0.5),
  };
  const endpointName = 'roundtrip-edited-connector-endpoint';
  const connectorName = s.arrowNames.find(
    (name) => !sourceContract(config).non_directional_connectors.includes(name),
  );
  if (connectorName) {
    const endpoint = editSlideBefore.shapes.add({
      name: endpointName,
      geometry: 'rect',
      position: { left: mm(2), top: mm(12), width: mm(0.3), height: mm(0.3) },
      fill: 'none',
      line: { fill: 'none', width: 0 },
    });
    const connection = editSlideBefore.shapes.items.find(
      (x) => x.name === connectorName,
    );
    connection.setConnectorTo(
      endpoint,
      editSlideBefore.shapes.getConnectionSiteIndex(endpoint, 'left'),
    );
  }
  const editedPath = path.join(buildDir, 'edit-roundtrip.pptx');
  await (await PresentationFile.exportPptx(reopened)).save(editedPath);
  const edited = await PresentationFile.importPptx(
    await FileBlob.load(editedPath),
  );
  const editSlide = edited.slides.items[0];
  const labelValue = String(
    editSlide.shapes.items.find((x) => x.name === 'master-title').text,
  );
  const after = (
    s.imageNames.length ? editSlide.images.items : editSlide.shapes.items
  )
    .find((x) => x.name === movedName)
    .position.toJSON();
  if (
    labelValue !== replacement ||
    Math.abs(after.left - before.left - mm(1)) > 0.03 ||
    Math.abs(after.top - before.top - mm(0.5)) > 0.03
  )
    throw new Error(
      'Independent text/graphic changes did not persist across save/reopen',
    );
  let connectorEndpointPersisted = null;
  if (connectorName) {
    const state = JSON.parse(
      execFileSync(
        python,
        [
          '-c',
          String.raw`
import sys,zipfile,xml.etree.ElementTree as E,json
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
 root=E.fromstring(z.read('ppt/slides/slide1.xml'))
 ids={n.get('id'):n.get('name') for n in root.findall('.//p:cNvPr',ns)}
 connector=next(x for x in root.findall('.//p:cxnSp',ns) if x.find('p:nvCxnSpPr/p:cNvPr',ns).get('name')==sys.argv[2])
 target=connector.find('p:nvCxnSpPr/p:cNvCxnSpPr/a:endCxn',ns)
 print(json.dumps({'target':ids.get(target.get('id')) if target is not None else None,'arrowhead_native':connector.find('p:spPr/a:ln/a:tailEnd',ns) is not None}))
`,
          editedPath,
          connectorName,
        ],
        { encoding: 'utf8' },
      ),
    );
    connectorEndpointPersisted =
      state.target === endpointName && state.arrowhead_native;
    if (!connectorEndpointPersisted)
      throw new Error('Native connector endpoint edit did not persist');
  }
  if (!(await fs.readFile(final)).equals(originalBytes))
    throw new Error('Canonical source changed during disposable roundtrip');
  const editRender = await edited.export({
    slide: editSlide,
    format: 'png',
    scale: 1.5,
  });
  await fs.writeFile(
    path.join(buildDir, 'edit-roundtrip.png'),
    new Uint8Array(await editRender.arrayBuffer()),
  );
  const { pdf, png } = await exportOffice(
    final,
    path.join(buildDir, 'office'),
    path.join(buildDir, 'office-profile'),
  );
  for (const [source, extension] of [
    [final, 'pptx'],
    [pdf, 'pdf'],
    [png, 'png'],
  ])
    await fs.copyFile(source, path.join(out, `${config.stem}.${extension}`));
  const roundtrip = {
    observed: true,
    label: 'master-title',
    changed_text_persisted: labelValue === replacement,
    independently_moved_graphic: movedName,
    graphic_kind: s.imageNames.length
      ? 'separate embedded illustration'
      : 'native stage number',
    before,
    after,
    movement_mm: [1, 0.5],
    connector: connectorName || 'not_applicable_no_directional_connectors',
    connector_endpoint_changed_and_persisted: connectorEndpointPersisted,
    original_master_unchanged: true,
    renderer: 'Artifact Tool import/export; independent LibreOffice PDF export',
    powerpoint_gui: 'not_run',
  };
  const objectRecord = {
    stem: config.stem,
    width_mm: config.width,
    height_mm: config.height,
    required_native_texts: s.textNames,
    required_native_connectors: s.arrowNames,
    embedded_images: s.imageNames,
    final_pptx: path.relative(root, path.join(out, `${config.stem}.pptx`)),
    actual_pdf_export: path.relative(
      root,
      path.join(out, `${config.stem}.pdf`),
    ),
    actual_pdf_preview: path.relative(
      root,
      path.join(out, `${config.stem}.png`),
    ),
    roundtrip,
    source_graph: s.ledger,
  };
  await fs.writeFile(
    path.join(buildDir, 'source-and-edit-receipt.json'),
    JSON.stringify(objectRecord, null, 2) + '\n',
  );
  await fs.writeFile(
    path.join(receiptRoot, `${config.stem}.json`),
    JSON.stringify({ ...objectRecord, build_directory: buildDir }, null, 2) +
      '\n',
  );
  console.log(
    JSON.stringify({
      stem: config.stem,
      dimensions_mm: [config.width, config.height],
      native_labels: s.textNames.length,
      native_connectors: s.arrowNames.length,
      independent_images: s.imageNames.length,
      buildDir,
    }),
  );
}

const selection =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'all';
const selected = configs.filter(
  (c) => selection === 'all' || selection.split(',').includes(c.stem),
);
if (!selected.length) throw new Error(`Unknown schematic master: ${selection}`);
if (process.argv.includes('--refresh-pdf-only')) {
  // Refresh exports from the already verified native masters without changing
  // their native scene or repeating a valid native edit round trip.
  for (const config of selected) {
    const directory = path.join(
      receiptRoot,
      'pdf-refresh',
      `${config.stem}-${Date.now()}`,
    );
    const sourcePptx = path.join(out, `${config.stem}.pptx`);
    const products = await exportOffice(
      sourcePptx,
      directory,
      path.join(directory, 'office-profile'),
    );
    for (const extension of ['pdf', 'png'])
      await fs.copyFile(
        products[extension],
        path.join(out, `${config.stem}.${extension}`),
      );
    await fs.writeFile(
      path.join(directory, 'export-receipt.json'),
      JSON.stringify(
        {
          source_pptx: sourcePptx,
          actual_pdf: products.pdf,
          actual_png: products.png,
          original_png_resolution_preserved: true,
          compression: 'lossless',
          native_scene_unchanged: true,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        stem: config.stem,
        status: 'actual_lossless_pdf_export',
        directory,
      }),
    );
  }
} else {
  for (const config of selected)
    await buildOne(config, configs.indexOf(config));
}
if (!layoutOnly)
  await fs.writeFile(
    path.join(out, 'captions-schematics.json'),
    JSON.stringify(captions, null, 2) + '\n',
  );
await fs.writeFile(
  path.join(receiptRoot, 'source-summary.json'),
  JSON.stringify(
    {
      configs,
      stages,
      route_lesson_counts: Object.fromEntries(
        routeRecords.map((r) => [r.id, r.lesson_ids.length]),
      ),
      prerequisite_lesson_count: prerequisiteLessons.length,
      prerequisite_relation_count: relations,
      core_shared_count: coreShared,
      assets: [...usedAssets].map(([id, p]) => ({
        id,
        path: path.relative(root, p),
      })),
    },
    null,
    2,
  ) + '\n',
);
