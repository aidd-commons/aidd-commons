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
const python = process.env.RUNTIME_PYTHON || path.join(root, '.venv/bin/python');
const skill = process.env.PRESENTATIONS_SKILL_DIR;
const runtimeBin = process.env.RUNTIME_BIN_DIR || (runtime ? path.resolve(runtime, '../../bin/override') : null);
const office = process.env.LIBREOFFICE_BIN || (runtimeBin ? path.join(runtimeBin, 'soffice') : '/Applications/LibreOffice.app/Contents/MacOS/soffice');
const out = path.join(here, 'out');
const receiptRoot = path.resolve(process.env.SCHEMATIC_RECEIPT_DIR ||
  path.join(root, 'tmp/nature-visual-upgrade-20261026/schematic_masters'));
const assetRoot = path.join(root, 'site/src/assets/editorial');
const layoutOnly = process.argv.includes('--layout-only');
// Increment for a reviewed layout change. This ordinary native-document revision
// is checked without hashes, timestamps, private manifests or authoring packages.
const sceneRevision = '2026-10-26.1';
const compactRevisions = { S3: '2026-11-06.1', S4: '2026-11-06.1' };
const mm = n => n * 96 / 25.4;
const pt = n => n * 96 / 72;
const read = p => fs.readFile(path.join(root, p), 'utf8');
const curriculum = YAML.parse(await read('catalog/curriculum/tracks.yaml'));
const report = await read('report/aidd-commons-living-report-v0.1.md');
const resources = await Promise.all(['model-img2mol', 'dataset-polaris-adme'].map(async id =>
  ({ source: `catalog/resources/${id}.yaml`, ...YAML.parse(await read(`catalog/resources/${id}.yaml`)) })));
const palette = JSON.parse(execFileSync(python, ['-c',
  'import json,sys;sys.dont_write_bytecode=True;sys.path.insert(0,sys.argv[1]);from atlas_palette import palette;print(json.dumps(palette("light")))', here],
{ encoding: 'utf8' }));
const C = { ...palette.categorical, ...palette.tokens, white: '#ffffff',
  wash: palette.fills, ink: '#13283d' };
const tableRows = report.split('\n').filter(line => /^\| (Disease and mechanism|Target identification|Target validation|Assay and data strategy|Hit discovery|Hit confirmation|Hit-to-lead|Lead optimisation|Candidate nomination) \|/.test(line));
if (tableRows.length !== 9) throw new Error(`Expected the canonical nine-stage table, found ${tableRows.length}`);
const stages = tableRows.map(line => {
  const [name, decision, contract, baseline, failure] = line.split('|').slice(1, -1).map(x => x.trim());
  return { name, decision, fields: contract.split(', ').map(x => x.trim()), baseline, failure };
});
const shortDecisions = ['Causal relevance', 'Actionable entity', 'Phenotype change',
  'Optimisation quantity', 'Worth confirming?', 'Attributable activity',
  'Series headroom', 'Acceptable trade-off', 'Package coherence'];
const shortFailures = ['Correlation as mechanism', 'Identity collapse', 'Evidence reuse',
  'Pooled endpoints', 'Retrospective as prospective', 'Artefact as binding',
  'Endpoint loss', 'Scalar hides liability', 'Confidence as experiment'];
const stageIcons = ['cell', 'data', 'assay', 'assay', 'molecule', 'assay', 'molecule', 'model', 'data'];
const dimensionKeys = ['inference_code', 'training_code', 'weights', 'architecture', 'data_recipe', 'training_data', 'evaluation_code'];
const dimensionNames = ['Inference code', 'Training code', 'Weights', 'Architecture', 'Data recipe', 'Training data', 'Evaluation code'];
const paths = curriculum.learning_paths;
const routeOrder = ['core', 'small-molecules', 'targets-cells', 'biologics', 'structure-physics', 'agents-feedback'];
const routeNames = ['Core route', 'Small\nmolecules', 'Targets\nand cells', 'Biologics', 'Structure\nand\nphysics', 'Agents\nand\nfeedback'];
const routeIcons = ['data', 'molecule', 'cell', 'protein', 'simulation', 'robot'];
const routeRecords = routeOrder.map((id, i) => {
  const row = paths.find(p => p.id === id);
  if (!row) throw new Error(`Missing learning path: ${id}`);
  return { ...row, shortName: routeNames[i], icon: routeIcons[i] };
});
const lessonRecords = new Map(curriculum.tracks.flatMap(track =>
  track.lessons.map(lesson => [`${track.id}/${lesson.id}`, lesson])));
const prerequisiteIds = [...new Set(paths.flatMap(p => p.prerequisites))];
const preferredLessons = ['foundations/getting-started', 'drug-discovery-foundations/discovery-context',
  'representations/biological-representations', 'data-governance/identity-lineage-and-reuse',
  'physics-based-modeling/docking-to-fep', 'data-governance/records-to-model-table',
  'machine-learning/baseline-training-validation', 'evaluation-and-reproducibility/metrics-and-uncertainty',
  'qsar-properties/regression-classification-errors', 'qsar-properties/uncertainty-to-decisions'];
if (prerequisiteIds.some(id => !preferredLessons.includes(id)))
  throw new Error('New prerequisite identities require a reviewed layout update');
const lessonAliases = ['Evidence claim boundaries', 'Therapeutic decision framing', 'Biological representations',
  'Identity lineage and reuse', 'Docking and free energy', 'Model table construction', 'Baseline fitting and validation',
  'Metrics and uncertainty', 'Regression and classification errors', 'Uncertainty to decisions'];
const prerequisiteLessons = preferredLessons.filter(id => prerequisiteIds.includes(id)).map(id => {
  const i = preferredLessons.indexOf(id);
  const lesson = lessonRecords.get(id);
  if (!lesson) throw new Error(`Missing lesson ${id}`);
  return { id, title: lesson.title, alias: lessonAliases[i],
    requiredBy: routeRecords.filter(r => r.prerequisites.includes(id)).map(r => r.id),
    inCore: routeRecords[0].lesson_ids.includes(id) };
});
const relations = prerequisiteLessons.reduce((sum, l) => sum + l.requiredBy.length, 0);
const coreShared = prerequisiteLessons.filter(l => l.inCore).length;
const captions = {
  S1: 'Four artifacts, one system. (a) The curriculum is an ordered lesson sequence, the Atlas is a registry of source records, Labs implement executable procedures, and Report combines reviewed prose and figures. Native document motifs and separate conceptual computation and data illustrations distinguish their roles. (b) A shared-identifier rail links the four artifacts. Dashed correction routes denote the editorial rule that a source-backed correction should reach each affected surface. The figure reports no coverage count, measured propagation result or reader outcome. AI-generated conceptual illustrations are not scientific image data.',
  S2: 'Four classes of statement. (a) An observed source fact connects an opened source to the claim it directly supports. (b) A project decision combines inputs into a recorded choice with rationale and version. (c) An open question retains missing, conflicting or inaccessible evidence as unverified. (d) Future work retains a planned contribution before implementation, review or measurement. Solid graphic boundaries distinguish the two asserting classes from the two unresolved or intended classes, whose boundaries are dashed. These are kinds of authority, not an evidence ranking. The source-record illustration is AI-generated and conceptual.',
  S3: 'Target to candidate. Nine numbered stages follow the canonical decision table, in a serpentine reading order. Each stage pairs a conceptual object with its decision and an explicitly labelled frequent failure. Native arrows indicate stage order only. AI-generated illustrations, repeated assay objects and their internal marks are conceptual and do not report candidate counts, binding, causal effects or success probabilities. The strong cheap baselines and complete evidence contracts remain in the adjacent source table.',
  S4: 'Stage evidence contracts. Nine numbered stages retain the minimum required records from the canonical stage table. Each compact group pairs its stage identity and conceptual object with a native checklist. Filled squares denote required fields, not completed measurements. The rows follow the source-table order. The contracts describe what must be argued at each stage and do not establish that a candidate satisfies them. Baselines and frequent failures remain separate in the adjacent table. The illustrations are AI-generated and conceptual.',
  S5: `Prerequisites across six learning paths. The current curriculum YAML names ${prerequisiteLessons.length} shared prerequisite lessons and ${relations} prerequisite relations across five specialist routes. A filled circle in the incidence matrix denotes a stated prerequisite. A dashed square denotes one of the ${coreShared} shared lessons also listed in the core route, a different relation. Row badges count the routes that require the lesson. Header badges count each route's listed lessons and are derived directly from the current YAML. The core route states no prerequisites. Counts describe the map, not difficulty, coverage or observed learning. Route illustrations are AI-generated and conceptual.`,
  S6: `Seven-dimensional openness. Two source records illustrate why asset availability is recorded separately for inference code, training code, weights, architecture, data recipe, training data and evaluation code. The states are available, not available, not applicable and unverified, each with a redundant native symbol. The Img2Mol model and ADME-Fang-v1 dataset states are taken directly from their canonical records, both last verified ${resources[0].last_verified}. Lifecycle and access remain separate axes. Available does not establish unrestricted use. AI-generated model and data illustrations are conceptual rather than evidence of an implementation or dataset.`,
  S7: 'Frozen evaluation lifecycle. The written protocol is frozen before structural and finite-output pretests on training and validation data. A successful pretest sequence precedes the one-time test opening and reviewed summary. The native dashed return to development applies only before test opening. After test opening, a bug is recorded as a protocol-invalidating error and result-driven retuning is prohibited. The summary retains observed values and limitations. No measured value or universal successful pretest is asserted. The computational illustration is AI-generated and conceptual.',
};
const configs = [
  ['schematic-01-artifacts', 94, 'Four artifacts, one system', 'S1'],
  ['schematic-02-statement-classes', 105, 'Authority is visible in the statement', 'S2'],
  ['schematic-03-decision-pipeline', 166, 'From a disease question to a candidate decision', 'S3'],
  ['schematic-04-stage-contracts', 160, 'Evidence changes with the stage', 'S4'],
  ['schematic-05-prerequisite-graph', 146, 'Shared prerequisites connect the learning paths', 'S5'],
  ['schematic-06-openness-dimensions', 151, 'Openness is a seven-part record', 'S6'],
  ['schematic-07-frozen-lifecycle', 110, 'Freeze the procedure before opening the test', 'S7'],
].map(([stem, height, title, key]) => ({ stem, width: 180, height, title, key, caption: captions[key] }));

function sourceContract(config) {
  const texts = { 'master-title': config.title };
  const marks = [];
  const images = {};
  const connectors = [];
  const dashedConnectors = [];
  if (config.key === 'S1') ['Learn', 'Atlas', 'Labs', 'Report'].forEach((v, i) => { texts[`artifact-name-${i}`] = v; });
  if (config.key === 'S1') Object.assign(images, { 'atlas-data-illustration': 'data', 'labs-computation-illustration': 'model' });
  if (config.key === 'S1') {
    for (let i = 0; i < 4; i++) { connectors.push(`correction-to-artifact-${i}`); dashedConnectors.push(`correction-to-artifact-${i}`); }
    connectors.push('shared-identifier-rail');
  }
  if (config.key === 'S2') ['Observed source fact', 'Project decision', 'Open question', 'Future work'].forEach((v, i) => {
    texts[`class-title-${i}`] = `(${String.fromCharCode(97 + i)})  ${v}`;
  });
  if (config.key === 'S2') images['observed-source-image'] = 'data';
  if (config.key === 'S2') {
    connectors.push('source-supports-claim', 'decision-input-route-0', 'decision-input-route-1', 'decision-input-route-2', 'unresolved-source-route');
    dashedConnectors.push('unresolved-source-route');
  }
  if (config.key === 'S3') stages.forEach((v, i) => {
    texts[`stage-title-${i}`] = wrapWords(v.name, 20);
    texts[`stage-decision-${i}`] = wrapWords(shortDecisions[i], 14);
    texts[`stage-failure-${i}`] = wrapWords(shortFailures[i], 26);
    images[`stage-object-${i}`] = stageIcons[i];
    if (i > 0) connectors.push(`stage-order-${i}`);
  });
  if (config.key === 'S4') stages.forEach((v, i) => {
    texts[`contract-title-${i}`] = wrapWords(v.name, 20);
    v.fields.forEach((field, j) => { texts[`contract-${i}-field-${j}-label`] = wrapWords(field, 22); });
    images[`contract-object-${i}`] = stageIcons[i];
  });
  if (config.key === 'S5') {
    routeRecords.forEach((v, i) => { texts[`route-name-${i}`] = v.shortName; texts[`route-count-${i}`] = String(v.lesson_ids.length); images[`route-image-${i}`] = v.icon; });
    prerequisiteLessons.forEach((v, i) => {
      texts[`lesson-name-${i}`] = wrapWords(v.alias, 34);
      texts[`lesson-required-count-${i}`] = String(v.requiredBy.length);
      if (v.inCore) marks.push(`core-includes-${i}`);
      routeRecords.forEach((r, j) => { if (v.requiredBy.includes(r.id)) marks.push(`prerequisite-${i}-${j}`); });
    });
  }
  if (config.key === 'S6') resources.forEach((v, i) => {
    texts[`openness-record-name-${i}`] = v.name;
    texts[`openness-record-kind-${i}`] = v.kind;
    images[`openness-record-image-${i}`] = i === 0 ? 'model' : 'data';
    dimensionKeys.forEach((key, j) => {
      const state = v.openness[key].value;
      texts[`openness-state-${i}-${j}`] = state.replaceAll('_', ' ');
      texts[`openness-${i}-${j}-glyph`] = { available: '+', not_available: '×', not_applicable: '–', unverified: '?' }[state];
    });
  });
  if (config.key === 'S6') texts['openness-review-date'] = `Record review: ${resources[0].last_verified}. Availability does not establish unrestricted use.`;
  if (config.key === 'S7') ['Protocol freeze', 'Structural\npretest', 'Finite-output\npretest', 'One-time\nopening', 'Reviewed\nsummary'].forEach((v, i) => { texts[`lifecycle-name-${i}`] = v; });
  if (config.key === 'S7') images['finite-output-computation'] = 'model';
  if (config.key === 'S7') {
    for (let i = 1; i < 5; i++) connectors.push(`lifecycle-order-${i}`);
    connectors.push('pretest-development-return'); dashedConnectors.push('pretest-development-return');
  }
  const nativeRevision = compactRevisions[config.key] ||
    sceneRevision + (['S5', 'S7'].includes(config.key) ? '.2' : '');
  return { scene_revision: nativeRevision, native_texts: texts, relation_marks: marks, images,
    native_connectors: connectors, dashed_connectors: dashedConnectors };
}

if (process.argv.includes('--source-record')) {
  console.log(JSON.stringify({ configs: configs.map(c => ({ ...c, native_contract: sourceContract(c) })), stages, prerequisiteLessons,
    routes: routeRecords.map(r => ({ id: r.id, count: r.lesson_ids.length, prerequisites: r.prerequisites })),
    resources: resources.map(r => ({ id: r.id, source: r.source, last_verified: r.last_verified,
      states: dimensionKeys.map(k => r.openness[k].value) })) }, null, 2));
  process.exit(0);
}
if (!runtime) throw new Error('Set RUNTIME_NODE_MODULES to the managed artifact runtime');
if (!skill) throw new Error('Set PRESENTATIONS_SKILL_DIR to the installed native presentation authoring helpers');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(
  path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(
  path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);

const usedAssets = new Map();
function makeScene(config) {
  const presentation = Presentation.create({ slideSize: { width: mm(config.width), height: mm(config.height) } });
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  const ledger = { figure: config.stem, delivery_mode: 'composite', style: 'nature-pastel',
    visual_lock: { inherits_from: 'report/figures/atlas_palette.py', locked: ['identity_tokens', 'categorical_roles'] },
    width_mm: config.width, height_mm: config.height, annotation_profile: 'method-readable',
    source_anchors: [], nodes: [], arrows: [], assets: [], formula_registry: {},
    caption: config.caption, evidence_boundary: 'Educational conceptual diagram, not measured evidence or reader outcomes' };
  const textNames = []; const arrowNames = []; const graphicNames = []; const imageNames = [];
  const graphic = (name, x, y, w, h, fill = 'none', stroke = 'none', geometry = 'rect', dashed = false, lw = 0.65) => {
    const s = slide.shapes.add({ name, geometry,
      position: { left: mm(x), top: mm(y), width: mm(w), height: mm(h) }, fill,
      line: { fill: stroke, width: stroke === 'none' ? 0 : pt(lw), style: dashed ? 'dashed' : 'solid' } });
    graphicNames.push(name); return s;
  };
  const text = (name, value, x, y, w, h, size = 8.5, options = {}) => {
    const s = graphic(name, x, y, w, h, 'none', 'none', 'textbox');
    s.text = value;
    s.text.style = { typeface: 'Arial', fontSize: pt(size), color: options.color || C.ink,
      bold: options.bold || false, alignment: options.align || 'left', verticalAlignment: 'middle',
      wrap: 'none', autoFit: 'none', insets: { left: 0, right: 0, top: 0, bottom: 0 } };
    textNames.push(name); return s;
  };
  const rule = (name, x, y, w, color = C.rule) => graphic(name, x, y, w, .13, color);
  const anchor = (name, x, y) => graphic(name, x - .1, y - .1, .2, .2);
  const connector = (name, from, to, opts = {}) => {
    const { dashed = false, arrow = true, color = C.ink, kind = 'straight', fromSide = 'right', toSide = 'left', source, role = 'sequence', claim, evidenceState = 'confirmed' } = opts;
    if (!source || !claim) throw new Error(`Connector ${name} lacks a source and claim`);
    const s = slide.shapes.connect(from, to, { kind, fromSide, toSide,
      line: { style: dashed ? 'dashed' : 'solid', fill: color, width: pt(.65) },
      ...(arrow ? { tail: { type: 'triangle', width: 'sm', length: 'sm' } } : {}) });
    s.name = name; arrowNames.push(name);
    ledger.arrows.push({ id: name, source_anchor: source, role, claim,
      evidence_state: evidenceState, line_style: dashed ? 'dashed' : 'solid',
      prohibited_implications: ['causal biological effect', 'measured success probability'],
      decisive_control: 'Compare labels and endpoints with the referenced source rule' });
    return s;
  };
  const line = (name, x1, y1, x2, y2, opts) => connector(name, anchor(`${name}-start`, x1, y1), anchor(`${name}-end`, x2, y2), opts);
  const image = async (name, asset, x, y, w, h, role) => {
    const source = path.join(assetRoot, `${asset}.png`);
    if (layoutOnly) {
      graphic(`${name}-layout-slot`, x, y, w, h, C.white, C.rule, 'rect', true);
      text(`${name}-layout-slot-label`, asset, x, y + h / 2 - 2, w, 4, 8, { color: C.muted, align: 'center' });
      return null;
    }
    const bytes = await fs.readFile(source);
    const s = slide.images.add({ alt: `${name}: ${role}. AI-generated conceptual illustration.`, blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      contentType: 'image/png', fit: 'contain', position: { left: mm(x), top: mm(y), width: mm(w), height: mm(h) } });
    // ImageAddOptions has no name field. The common native facade's setter is
    // required for a stable independently selectable picture name in PPTX.
    s.name = name;
    usedAssets.set(asset, source); imageNames.push(name);
    ledger.assets.push({ id: name, source: path.relative(root, source), object_class: asset,
      semantic_role: role, evidence_role: 'conceptual illustration only', color_role: 'project teal/coral identity',
      rendering_mode: 'ai_bitmap', permission: 'User-authorized website educational illustration',
      disclosure: 'AI-generated conceptual illustration, backend version unverified unless generation record exposes it',
      actually_drawn: `Generic ${asset} concept from the inspected editorial asset family`,
      must_read_as: role, must_not_read_as: 'a measured specimen, exact structure, result, or verified biological mechanism',
      prohibited_metaphor: 'Conceptual internal details interpreted as observed scientific data' });
    return s;
  };
  const node = (id, label, source, role, extra = {}) => ledger.nodes.push({ id, label, source_anchor: source,
    scientific_role: role, evidence_state: 'confirmed', prohibited_implications: ['new experimental evidence', 'human learning benefit'], ...extra });
  const title = (name, value, y = 2, size = 10.8) => text(name, value, 4, y, 172, 7, size, { bold: true });
  // The first object is deliberately non-connected; the exporter reserves its ID.
  title('master-title', config.title);
  const footer = () => {
    rule('footer-rule', 4, config.height - 7.8, 172);
    text('conceptual-disclosure', 'AI-generated conceptual illustrations. Native labels and relationships.',
      4, config.height - 6.7, 172, 4.5, 7.5, { color: C.muted });
  };
  return { presentation, slide, config, ledger, textNames, arrowNames, graphicNames, imageNames,
    graphic, text, rule, anchor, connector, line, image, node, footer };
}

function document(s, name, x, y, w, h, color = C.teal, mode = 'text', dashed = false) {
  const body = s.graphic(`${name}-sheet`, x, y, w, h, C.white, color, 'rect', dashed);
  s.graphic(`${name}-spine`, x + 1.2, y + 1.2, .65, h - 2.4, color);
  if (mode === 'grid') {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      s.graphic(`${name}-cell-${r}-${c}`, x + 4 + c * (w - 7) / 3, y + 4 + r * (h - 7) / 3,
        (w - 10) / 3, (h - 10) / 3, r === 1 && c === 1 ? color : C.wash.slate, color);
  } else {
    for (let i = 0; i < 4; i++) s.rule(`${name}-line-${i}`, x + 4, y + 4 + i * 3.2,
      (w - 7) * [1, .8, .92, .65][i], i === 0 ? color : C.rule);
  }
  return body;
}
function checked(s, name, label, x, y, width, size = 8.3) {
  s.graphic(`${name}-required`, x, y + 1.25, 1.1, 1.1, C.teal);
  s.text(`${name}-label`, label, x + 2.5, y, width - 2.5, label.includes('\n') ? 8 : 4.2, size);
}
function number(s, name, value, x, y, color = C.teal) {
  s.graphic(`${name}-circle`, x, y, 4.8, 4.8, color, color, 'ellipse');
  s.text(`${name}-text`, String(value), x, y, 4.8, 4.8, 8.3, { color: C.white, bold: true, align: 'center' });
}
function wrapWords(value, max = 21) {
  const words = value.split(/\s+/); const lines = []; let line = '';
  for (const word of words) {
    if (line && line.length + word.length + 1 > max) { lines.push(line); line = word; }
    else line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line); return lines.join('\n');
}

async function artifacts(s) {
  const source = 'docs/PROJECT_CHARTER.md#mission; docs/EDITORIAL_GUIDE.md#corrections-and-deprecation';
  s.ledger.source_anchors.push(source);
  s.text('artifacts-panel', '(a)  Four reader-facing forms', 4, 11, 172, 5, 9.2, { bold: true });
  const columns = [5, 49, 93, 137];
  const labels = ['Learn', 'Atlas', 'Labs', 'Report'];
  const subtitles = ['Ordered lessons', 'Source records', 'Executable procedure', 'Reviewed synthesis'];
  const colors = [C.teal, C.coral, C.ember, C.slate];
  for (let i = 0; i < 4; i++) {
    const x = columns[i];
    s.text(`artifact-name-${i}`, labels[i], x, 18, 37, 5, 10, { bold: true });
    if (i === 0) {
      const a = document(s, 'learn-left-page', x + 2, 26, 15, 20, colors[i]);
      document(s, 'learn-right-page', x + 18, 26, 15, 20, colors[i]);
      for (let j = 0; j < 4; j++) s.graphic(`learn-sequence-${j}`, x + 5 + j * 7.5, 48 - j * 1.5, 5.3, 2.8, j === 3 ? colors[i] : C.wash.teal, colors[i]);
      s.node('learn', labels[i], source, 'An ordered curriculum rather than a progress measurement');
    } else if (i === 1) {
      await s.image('atlas-data-illustration', 'data', x + 1, 24, 34, 28, 'A conceptual registry of source records');
      s.node('atlas', labels[i], source, 'Searchable evidence-backed resource records');
    } else if (i === 2) {
      await s.image('labs-computation-illustration', 'model', x + 1, 24, 34, 28, 'A conceptual computation implementing a teaching procedure');
      s.node('labs', labels[i], source, 'An executable procedure; illustration is not a lab result');
    } else {
      document(s, 'report-page', x + 3, 25, 28, 27, colors[i]);
      s.graphic('report-figure-field', x + 7, 39, 18, 8, C.wash.slate);
      for (let j = 0; j < 3; j++) s.graphic(`report-bars-${j}`, x + 9 + j * 5, 46 - j * 1.4, 2.5, 1 + j * 1.4, colors[i]);
      s.node('report', labels[i], source, 'A living report, with non-quantitative chart motif');
    }
    s.text(`artifact-description-${i}`, subtitles[i], x, 53, 39, 5, 8.1, { color: C.muted });
    const chip = s.graphic(`artifact-identifier-${i}`, x + 1, 61, 32, 6, C.white, colors[i]);
    s.text(`artifact-identifier-text-${i}`, 'resource ID', x + 2, 61.5, 30, 5, 8, { align: 'center', color: colors[i] });
    const rail = s.anchor(`artifact-rail-anchor-${i}`, x + 17, 77);
    s.connector(`correction-to-artifact-${i}`, rail, chip, { dashed: true, fromSide: 'top', toSide: 'bottom',
      source, role: 'prospective', claim: 'A source-backed correction should propagate to every affected repeated claim' });
  }
  s.text('coupling-panel', '(b)', 4, 72.2, 8, 5, 9.2, { bold: true });
  s.line('shared-identifier-rail', 21, 77, 154, 77, { arrow: false, source, role: 'association', claim: 'The artifacts share resource identifiers' });
  s.graphic('correction-token', 69, 72.5, 43, 8.5, C.wash.coral, C.coral);
  s.text('correction-label', 'Source-backed correction', 71, 73.7, 39, 5, 8.1, { bold: true });
  s.footer();
}

async function statements(s) {
  const source = 'docs/EDITORIAL_GUIDE.md#four-statement-classes';
  s.ledger.source_anchors.push(source);
  const groups = [
    { letter: 'a', name: 'Observed source fact', x: 4, y: 13, role: 'Opened source directly supports the statement', color: C.teal },
    { letter: 'b', name: 'Project decision', x: 93, y: 13, role: 'A recorded choice with rationale and version', color: C.coral },
    { letter: 'c', name: 'Open question', x: 4, y: 55, role: 'Missing or conflicting evidence remains unverified', color: C.ember },
    { letter: 'd', name: 'Future work', x: 93, y: 55, role: 'Intended work before implementation or measurement', color: C.slate },
  ];
  s.rule('statement-horizontal-divider', 4, 52, 172);
  for (const [i, g] of groups.entries()) {
    s.text(`class-title-${i}`, `(${g.letter})  ${g.name}`, g.x, g.y, 82, 5.5, 9.2, { bold: true });
    const x = g.x, y = g.y + 8;
    if (i === 0) {
      await s.image('observed-source-image', 'data', x, y - 1, 25, 25, 'Source records that can be opened and checked');
      const a = s.anchor('fact-source-anchor', x + 27, y + 10);
      const b = s.graphic('fact-supported-claim', x + 44, y + 3, 32, 15, C.white, g.color);
      s.text('fact-claim-text', 'Supported\nclaim', x + 47, y + 5, 26, 10, 8.5, { bold: true });
      s.connector('source-supports-claim', a, b, { source, role: 'association', claim: g.role });
      s.text('fact-condition', 'Opened source', x, y + 26, 37, 4, 8.1, { color: C.muted });
      s.text('fact-citation', 'Sentence-level citation', x + 40, y + 26, 42, 4, 8.1, { color: C.muted });
    } else if (i === 1) {
      const choice = s.graphic('decision-choice', x + 44, y + 3, 32, 17, C.wash.coral, g.color);
      s.text('decision-choice-text', 'Choice', x + 48, y + 8, 24, 5, 9, { bold: true });
      for (let j = 0; j < 3; j++) {
        const inp = s.graphic(`decision-input-${j}`, x + 1, y + j * 8, 21, 5, C.white, C.rule);
        s.text(`decision-input-label-${j}`, ['Evidence', 'Scope', 'Constraints'][j], x + 2, y + j * 8, 19, 5, 8);
        s.connector(`decision-input-route-${j}`, inp, choice, { source, role: 'association', claim: g.role });
      }
      s.text('decision-record', 'Rationale and version', x + 35, y + 26, 47, 4, 8.1, { color: C.muted });
    } else if (i === 2) {
      document(s, 'missing-evidence', x + 1, y, 22, 23, g.color, 'text', true);
      const q = s.graphic('question-ring', x + 40, y + 1, 24, 24, C.white, g.color, 'ellipse', true);
      s.text('question-mark', '?', x + 40, y + 1, 24, 24, 22, { color: g.color, bold: true, align: 'center' });
      s.connector('unresolved-source-route', s.anchor('unknown-evidence-anchor', x + 26, y + 12), q,
        { dashed: true, source, role: 'prospective', claim: g.role });
      s.text('question-boundary', 'unverified', x + 34, y + 26, 38, 4.5, 8.5, { color: g.color, bold: true, align: 'center' });
    } else {
      for (let j = 0; j < 3; j++) {
        s.graphic(`future-tile-${j}`, x + 2 + j * 26, y + 2, 22, 18, C.white, g.color, 'rect', true);
        s.text(`future-tile-label-${j}`, ['Build', 'Review', 'Measure'][j], x + 2 + j * 26, y + 8, 22, 5, 8.3, { align: 'center' });
      }
      s.text('future-state', 'Planned contribution', x + 1, y + 26, 80, 4.5, 8.2, { color: C.muted, align: 'center' });
    }
    s.node(`statement-${i}`, g.name, source, g.role);
  }
  s.footer();
}

async function decisionPipeline(s) {
  const source = 'report/aidd-commons-living-report-v0.1.md#the-target-to-candidate-pipeline';
  s.ledger.source_anchors.push(source);
  const positions = stages.map((_, i) => {
    const r = Math.floor(i / 3); const col = r === 1 ? 2 - i % 3 : i % 3;
    return { x: 4 + col * 59, y: 15 + r * 46 };
  });
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]; const { x, y } = positions[i];
    number(s, `stage-${i}`, i + 1, x, y);
    s.text(`stage-title-${i}`, wrapWords(stage.name, 20), x + 6.5, y - 1, 48, 10, 9, { bold: true });
    await s.image(`stage-object-${i}`, stageIcons[i], x + 1, y + 10, 24, 22, `Conceptual object for ${stage.name}`);
    s.text(`stage-decision-${i}`, wrapWords(shortDecisions[i], 14), x + 27, y + 12, 27, 14, 8.6, { bold: true });
    s.text(`stage-decision-type-${i}`, 'Decision', x + 27, y + 8.5, 27, 4, 8, { color: C.muted });
    s.rule(`stage-failure-rule-${i}`, x, y + 32.5, 54, C.rule);
    s.graphic(`stage-failure-marker-${i}`, x + .3, y + 35, 1.4, 1.4, C.coral, C.coral, 'diamond');
    s.text(`stage-failure-${i}`, wrapWords(shortFailures[i], 26), x + 3, y + 33.4, 51, 8.5, 8, { color: C.ember });
    s.node(`stage-${i}`, stage.name, source, 'Decision stage', { decision: stage.decision, visible_decision: shortDecisions[i],
      frequent_failure: stage.failure, visible_failure: shortFailures[i] });
    if (i > 0) {
      const p = positions[i - 1];
      if (Math.floor(i / 3) !== Math.floor((i - 1) / 3))
        s.line(`stage-order-${i}`, x + 27, p.y + 42.5, x + 27, y - 2,
          { fromSide: 'bottom', toSide: 'top', source, claim: 'The source table orders these consecutive stages' });
      else {
        const reverse = Math.floor(i / 3) === 1;
        s.line(`stage-order-${i}`, reverse ? p.x - 1 : p.x + 55, p.y + 22,
          reverse ? x + 55 : x - 1, y + 22,
          { fromSide: reverse ? 'left' : 'right', toSide: reverse ? 'right' : 'left', source, claim: 'The source table orders these consecutive stages' });
      }
    }
  }
  s.text('decision-key', 'Numbers and arrows give stage order. Warm diamond labels identify frequent failures.', 4, 153, 172, 4.5, 8, { color: C.muted });
  s.footer();
}

async function stageContracts(s) {
  const source = 'report/aidd-commons-living-report-v0.1.md#the-target-to-candidate-pipeline';
  s.ledger.source_anchors.push(source);
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i], x = 4 + i % 3 * 59, y = 15 + Math.floor(i / 3) * 44;
    number(s, `contract-${i}`, i + 1, x, y);
    s.text(`contract-title-${i}`, wrapWords(stage.name, 20), x + 6.5, y - 1, 48, 10, 9, { bold: true });
    await s.image(`contract-object-${i}`, stageIcons[i], x, y + 11, 17, 23, `Conceptual object for ${stage.name}`);
    let yy = y + 11;
    for (let j = 0; j < stage.fields.length; j++) {
      const label = wrapWords(stage.fields[j], 22);
      const height = label.includes('\n') ? 8 : 4.3;
      checked(s, `contract-${i}-field-${j}`, label, x + 19, yy, 36, 8.1);
      yy += height;
    }
    s.rule(`contract-base-${i}`, x, y + 42, 54);
    s.node(`contract-${i}`, stage.name, source, 'Minimum evidence contract', { fields: stage.fields,
      prohibited_implications: ['all fields have been measured', 'a candidate is ready to advance'] });
  }
  s.text('contract-key', 'Filled squares mark required records. They do not indicate completed measurements.', 4, 147.5, 172, 4.5, 8, { color: C.muted });
  s.footer();
}

async function prerequisites(s) {
  const source = 'catalog/curriculum/tracks.yaml#learning_paths';
  s.ledger.source_anchors.push(source);
  s.text('prerequisite-row-heading', 'Shared lesson', 4, 41.5, 65, 5, 8.7, { bold: true });
  const matrixX = 78, step = 16.2;
  for (const [i, r] of routeRecords.entries()) {
    const x = matrixX + i * step;
    await s.image(`route-image-${i}`, r.icon, x - 1, 12, 17, 17, `Conceptual subject of the ${r.title}`);
    s.text(`route-name-${i}`, r.shortName, x - 2, 29, 20, 13, 8, { align: 'center', bold: true });
    s.text(`route-count-${i}`, String(r.lesson_ids.length), x, 43.5, 16, 6, 9.1, { align: 'center', bold: true,
      color: i === 0 ? C.slate : C.teal });
    s.node(`route-${r.id}`, r.title, source, 'Declared learning path', { listed_lesson_count: r.lesson_ids.length });
  }
  s.text('route-count-unit', 'listed lessons', 4, 46.5, 65, 4.5, 8, { color: C.muted });
  s.rule('matrix-header-rule', 4, 52.5, 172);
  for (const [i, lesson] of prerequisiteLessons.entries()) {
    const y = 54.5 + i * 7;
    s.graphic(`lesson-required-count-circle-${i}`, 4, y + 1.5, 4.4, 4.4, C.white, C.teal, 'ellipse');
    s.text(`lesson-required-count-${i}`, String(lesson.requiredBy.length), 4, y + 1.5, 4.4, 4.4, 8, { align: 'center', bold: true });
    s.text(`lesson-name-${i}`, wrapWords(lesson.alias, 34), 11, y, 64, 7, 8.2);
    for (const [j, route] of routeRecords.entries()) {
      const x = matrixX + j * step + 6;
      if (j === 0 && lesson.inCore) s.graphic(`core-includes-${i}`, x - 1.8, y + 2, 3.6, 3.6, C.white, C.slate, 'rect', true);
      if (lesson.requiredBy.includes(route.id)) {
        s.graphic(`prerequisite-${i}-${j}`, x - 1.8, y + 2, 3.6, 3.6, C.teal, C.teal, 'ellipse');
        s.ledger.arrows.push({ id: `prerequisite-${i}-${j}`, source_anchor: source, role: 'prerequisite',
          claim: `${route.id} lists ${lesson.id} as a prerequisite`, evidence_state: 'confirmed',
          rendering: 'incidence mark, not a causal arrow', prohibited_implications: ['difficulty', 'measured learning outcome'],
          decisive_control: 'Exact membership in learning_paths[].prerequisites' });
      }
    }
    s.rule(`matrix-row-rule-${i}`, 4, y + 6.7, 172);
    s.node(`lesson-${i}`, lesson.alias, source, 'A shared prerequisite lesson',
      { lesson_id: lesson.id, canonical_title: lesson.title, required_by: lesson.requiredBy, listed_in_core: lesson.inCore });
  }
  s.graphic('matrix-legend-required', 5, 129, 3.5, 3.5, C.teal, C.teal, 'ellipse');
  s.text('matrix-legend-required-text', 'Stated prerequisite', 11, 128, 45, 5, 8.2);
  s.graphic('matrix-legend-core', 61, 129, 3.5, 3.5, C.white, C.slate, 'rect', true);
  s.text('matrix-legend-core-text', 'Also listed in core', 67, 128, 46, 5, 8.2);
  s.text('matrix-summary', `${prerequisiteLessons.length} lessons    ${relations} prerequisite relations`, 119, 128, 57, 5, 8.2, { bold: true });
  s.footer();
}

function opennessMark(s, name, state, x, y, size = 5.5) {
  const dark = C.teal;
  if (state === 'available') {
    s.graphic(`${name}-mark`, x, y, size, size, dark, dark, 'ellipse');
    s.text(`${name}-glyph`, '+', x, y - .15, size, size, 10.5, { bold: true, color: C.white, align: 'center' });
  } else if (state === 'not_available') {
    s.graphic(`${name}-mark`, x, y, size, size, C.white, C.ember);
    s.text(`${name}-glyph`, '×', x, y - .15, size, size, 10.8, { bold: true, color: C.ember, align: 'center' });
  } else if (state === 'not_applicable') {
    s.graphic(`${name}-mark`, x, y, size, size, C.wash.slate, C.slate, 'diamond');
    s.text(`${name}-glyph`, '–', x, y - .15, size, size, 10, { bold: true, color: C.slate, align: 'center' });
  } else if (state === 'unverified') {
    s.graphic(`${name}-mark`, x, y, size, size, C.white, C.slate, 'ellipse', true);
    s.text(`${name}-glyph`, '?', x, y - .15, size, size, 9, { color: C.slate, bold: true, align: 'center' });
  } else throw new Error(`Unsupported openness state ${state}`);
}

async function openness(s) {
  const schema = 'docs/RESOURCE_SCHEMA.md#claim-evidence';
  s.ledger.source_anchors.push(schema, ...resources.map(r => r.source));
  s.text('dimension-heading', '(a)  Asset-level availability', 4, 13, 60, 5, 9.2, { bold: true });
  for (const [i, r] of resources.entries()) {
    const x = 70 + i * 56;
    await s.image(`openness-record-image-${i}`, i === 0 ? 'model' : 'data', x - 4, 12, 25, 23,
      i === 0 ? 'A generic model record, not a depiction of Img2Mol internals' : 'A generic dataset record, not measured ADME data');
    s.text(`openness-record-name-${i}`, r.name, x + 22, 16, 28, 5, 8.6, { bold: true });
    s.text(`openness-record-kind-${i}`, r.kind, x + 22, 22, 28, 5, 8.3, { color: C.muted });
    s.node(`record-${r.id}`, r.name, r.source, 'Example canonical resource record',
      { states: Object.fromEntries(dimensionKeys.map(k => [k, r.openness[k].value])), last_verified: r.last_verified });
  }
  s.rule('openness-header-rule', 4, 36, 172);
  for (let j = 0; j < dimensionKeys.length; j++) {
    const y = 38 + j * 8;
    s.text(`openness-dimension-${j}`, dimensionNames[j], 4, y, 65, 6, 8.7);
    for (const [i, r] of resources.entries()) {
      const x = 70 + i * 56, state = r.openness[dimensionKeys[j]].value;
      opennessMark(s, `openness-${i}-${j}`, state, x + 4, y + .3);
      s.text(`openness-state-${i}-${j}`, state.replaceAll('_', ' '), x + 12, y, 38, 6, 8.1);
    }
    s.rule(`openness-row-rule-${j}`, 4, y + 7.5, 172);
  }
  s.text('openness-review-date', `Record review: ${resources[0].last_verified}. Availability does not establish unrestricted use.`, 4, 95, 172, 5, 8.1, { color: C.muted });
  s.text('openness-axes-title', '(b)  Separate record axes', 4, 104, 172, 5, 9.2, { bold: true });
  s.text('lifecycle-axis-name', 'Lifecycle', 4, 113, 22, 5, 8.5, { bold: true });
  s.text('lifecycle-axis-values', 'active · legacy · superseded · unmaintained · withdrawn · unverified', 29, 113, 147, 5, 8.1, { color: C.muted });
  s.text('access-axis-name', 'Access', 4, 122, 22, 5, 8.5, { bold: true });
  s.text('access-axis-values', 'open source · open weights · source available · research only\ngated · API only · closed · unverified', 29, 120.5, 147, 10, 8.1, { color: C.muted });
  s.text('openness-unknown-boundary', 'Unverified preserves an unresolved claim. It does not mean unavailable.', 4, 133, 172, 5, 8.2);
  s.footer();
}

function lock(s, name, x, y, open = false) {
  s.graphic(`${name}-shackle`, x + (open ? 10 : 3), y, open ? 9 : 8, 10, C.white, C.slate, 'ellipse');
  if (open) s.graphic(`${name}-open-shackle-cutout`, x + 9, y + 5, 12, 6, C.white);
  s.graphic(`${name}-body`, x, y + 5, 14, 11, C.wash.slate, C.slate);
  s.graphic(`${name}-keyhole`, x + 6, y + 9, 2, 3, C.slate, C.slate, 'ellipse');
}
async function lifecycle(s) {
  const source = 'docs/EDITORIAL_GUIDE.md#lab-protocol-freeze; report/aidd-commons-living-report-v0.1.md#frozen-evaluation';
  s.ledger.source_anchors.push(source);
  const names = ['Protocol freeze', 'Structural\npretest', 'Finite-output\npretest', 'One-time\nopening', 'Reviewed\nsummary'];
  const xs = [5, 40, 75, 110, 145];
  for (let i = 0; i < 5; i++) {
    const x = xs[i];
    number(s, `lifecycle-number-${i}`, i + 1, x, 15, i >= 3 ? C.coral : C.teal);
    s.text(`lifecycle-name-${i}`, names[i], x, 22, 31, 10, 8.8, { bold: true });
    if (i === 0) { document(s, 'frozen-protocol', x + 1, 36, 23, 25, C.slate); lock(s, 'protocol-lock', x + 16, 47); }
    if (i === 1) {
      document(s, 'structural-check', x + 1, 36, 27, 25, C.teal, 'grid');
      s.text('structural-checkmark', '✓', x + 17, 52, 11, 9, 17, { color: C.teal, bold: true, align: 'center' });
    }
    if (i === 2) await s.image('finite-output-computation', 'model', x, 35, 30, 28, 'A conceptual computation tested for finite output, not a measured result');
    if (i === 3) lock(s, 'one-time-test-lock', x + 6, 41, true);
    if (i === 4) {
      document(s, 'reviewed-summary', x + 1, 36, 27, 25, C.slate);
      s.text('summary-checkmark', '✓', x + 16, 50, 12, 11, 17, { color: C.teal, bold: true, align: 'center' });
    }
    s.node(`lifecycle-${i}`, names[i].replace('\n', ' '), source, 'Frozen evaluation stage');
    if (i > 0) s.line(`lifecycle-order-${i}`, x - 5, 45, x - 1, 45,
      { source, claim: 'The source protocol orders this gate before the next gate' });
  }
  s.text('freeze-records', 'Task · data · labels · split\nfit · selection · metrics\ncalibration · seeds · stop', 5, 65, 42, 16, 8, { color: C.muted });
  s.text('pretest-scope', 'Training and validation only', 50, 65, 57, 5, 8.3, { color: C.teal, bold: true, align: 'center' });
  s.text('test-scope', 'Held-out test', 112, 65, 31, 5, 8.2, { color: C.coral, bold: true });
  s.text('summary-scope', 'Values and limits', 145, 65, 31, 5, 8.2, { color: C.muted });
  s.graphic('test-boundary', 108, 12, .15, 76, C.rule);
  // A pre-test engineering return is explicitly distinct from post-test retuning.
  const retryStart = s.anchor('pretest-return-start', 91, 79);
  const retryEnd = s.anchor('pretest-return-end', 48, 79);
  s.connector('pretest-development-return', retryStart, retryEnd, { dashed: true, fromSide: 'left', toSide: 'right',
    source, role: 'optional', evidenceState: 'inferred', claim: 'Pre-test engineering defects may be resolved on training and validation before test opening' });
  s.text('pretest-return-label', 'Pre-test repairs', 51, 81, 55, 5, 8.1, { color: C.muted, align: 'center' });
  s.rule('posttest-error-divider', 5, 90, 171);
  s.graphic('posttest-error-symbol', 112, 93, 3, 3, C.coral, C.coral, 'diamond');
  s.text('posttest-error-label', 'Post-test bug: record\nprotocol-invalidating error', 118, 91.7, 59, 9, 8.1, { color: C.ember });
  s.text('retuning-prohibition', 'No result-driven retuning', 5, 92, 101, 8, 8.5, { bold: true });
  s.footer();
}

const builders = [artifacts, statements, decisionPipeline, stageContracts, prerequisites, openness, lifecycle];

async function sanitizePptx(sourcePath, destination, title, nativeRevision = sceneRevision) {
  execFileSync(python, ['-c', String.raw`
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
`, sourcePath, destination, title, nativeRevision]);
}

async function exportOffice(sourcePptx, directory, profile) {
  await fs.mkdir(directory, { recursive: true });
  const conversion = 'pdf:impress_pdf_Export:' + JSON.stringify({
    UseLosslessCompression: { type: 'boolean', value: 'true' },
    ReduceImageResolution: { type: 'boolean', value: 'false' },
  });
  const log = execFileSync(office, [`-env:UserInstallation=file://${profile}`,
    '--headless', '--convert-to', conversion, '--outdir', directory, sourcePptx],
  { encoding: 'utf8', timeout: 120000 });
  await fs.writeFile(path.join(directory, 'office-export.log'), log);
  const stem = path.basename(sourcePptx, '.pptx');
  const pdf = path.join(directory, `${stem}.pdf`);
  const pdfStat = await fs.stat(pdf);
  if (pdfStat.size < 1000) throw new Error('Office did not produce a real PDF');
  execFileSync('pdftoppm', ['-png', '-singlefile', '-r', '300', pdf, path.join(directory, stem)], { timeout: 120000 });
  return { pdf, png: path.join(directory, `${stem}.png`) };
}

async function buildOne(config, index) {
  const revision = new Date().toISOString().replace(/[:.]/g, '-');
  const buildDir = path.join(receiptRoot, 'build', `${config.stem}-${revision}`);
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(out, { recursive: true });
  // This link is task-local and keeps the finalizer's import check on the managed runtime.
  await fs.symlink(runtime, path.join(buildDir, 'node_modules'), 'dir');
  const s = makeScene(config);
  await builders[index](s);
  if (layoutOnly) {
    const draft = path.join(buildDir, `${config.stem}-layout-only.pptx`);
    await (await PresentationFile.exportPptx(s.presentation)).save(draft);
    const preview = await s.presentation.export({ slide: s.slide, format: 'png', scale: 2 });
    await fs.writeFile(path.join(buildDir, 'layout-only.png'), new Uint8Array(await preview.arrayBuffer()));
    await fs.writeFile(path.join(buildDir, 'LAYOUT_ONLY.txt'), 'Disposable source-copy/layout check. Illustration slots are not finished art. Nothing was promoted.\n');
    console.log(JSON.stringify({ stem: config.stem, status: 'layout_only_not_final', buildDir }));
    return;
  }
  s.slide.speakerNotes.text = [config.caption,
    ...s.ledger.source_anchors.map(p => `Source: ${p}`),
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
  await sanitizePptx(raw, candidate, config.title, sourceContract(config).scene_revision);
  await finalizePresentation({ workspaceDir: root, candidatePath: candidate, finalPath: final,
    pythonExecutable: python, explicitTotalSlideCount: 1,
    requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
    integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
    layoutArgs: ['--expected-slide-size-emu', `${Math.round(config.width * 36000)},${Math.round(config.height * 36000)}`, '--validate-heading-fit'],
    fontPolicy: { basis: 'design', families: ['Arial'] }, verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, 'validation.json') });
  const originalBytes = await fs.readFile(final);
  const reopened = await PresentationFile.importPptx(await FileBlob.load(final));
  const rendered = await reopened.export({ slide: reopened.slides.items[0], format: 'png', scale: 2 });
  await fs.writeFile(path.join(buildDir, 'reopened.png'), new Uint8Array(await rendered.arrayBuffer()));
  // A real edit/save/reopen of one native label and one independent embedded image.
  const editedLabel = reopened.slides.items[0].shapes.items.find(x => x.name === 'master-title');
  const editedImage = reopened.slides.items[0].images.items.find(x => x.name === s.imageNames[0]);
  if (!editedLabel || !editedImage) throw new Error('The roundtrip needs independent native label and image objects');
  const before = editedImage.position.toJSON();
  const replacement = config.title + ' [edit check]';
  editedLabel.text = replacement;
  editedImage.position = { ...before, left: before.left + mm(1), top: before.top + mm(.5) };
  const editedPath = path.join(buildDir, 'edit-roundtrip.pptx');
  await (await PresentationFile.exportPptx(reopened)).save(editedPath);
  const edited = await PresentationFile.importPptx(await FileBlob.load(editedPath));
  const editSlide = edited.slides.items[0];
  const labelValue = String(editSlide.shapes.items.find(x => x.name === 'master-title').text);
  const after = editSlide.images.items.find(x => x.name === s.imageNames[0]).position.toJSON();
  if (labelValue !== replacement || Math.abs(after.left - before.left - mm(1)) > .03 || Math.abs(after.top - before.top - mm(.5)) > .03)
    throw new Error('Native text or independent image movement did not persist across save/reopen');
  if (!(await fs.readFile(final)).equals(originalBytes)) throw new Error('The canonical source changed during the disposable edit round trip');
  const editRender = await edited.export({ slide: editSlide, format: 'png', scale: 1.5 });
  await fs.writeFile(path.join(buildDir, 'edit-roundtrip.png'), new Uint8Array(await editRender.arrayBuffer()));
  const { pdf, png } = await exportOffice(final, path.join(buildDir, 'office'), path.join(buildDir, 'office-profile'));
  for (const [source, extension] of [[final, 'pptx'], [pdf, 'pdf'], [png, 'png']])
    await fs.copyFile(source, path.join(out, `${config.stem}.${extension}`));
  const roundtrip = { observed: true, label: 'master-title', changed_text_persisted: labelValue === replacement,
    independently_moved_image: s.imageNames[0], before, after, movement_mm: [1, .5],
    original_master_unchanged: true, renderer: 'Artifact Tool import/export; independent LibreOffice PDF export',
    powerpoint_gui: 'not_run' };
  const objectRecord = { stem: config.stem, width_mm: config.width, height_mm: config.height,
    required_native_texts: s.textNames, required_native_connectors: s.arrowNames,
    embedded_images: s.imageNames, final_pptx: path.relative(root, path.join(out, `${config.stem}.pptx`)),
    actual_pdf_export: path.relative(root, path.join(out, `${config.stem}.pdf`)),
    actual_pdf_preview: path.relative(root, path.join(out, `${config.stem}.png`)),
    roundtrip, source_graph: s.ledger };
  await fs.writeFile(path.join(buildDir, 'source-and-edit-receipt.json'), JSON.stringify(objectRecord, null, 2) + '\n');
  await fs.writeFile(path.join(receiptRoot, `${config.stem}.json`), JSON.stringify({ ...objectRecord, build_directory: buildDir }, null, 2) + '\n');
  console.log(JSON.stringify({ stem: config.stem, dimensions_mm: [config.width, config.height], native_labels: s.textNames.length,
    native_connectors: s.arrowNames.length, independent_images: s.imageNames.length, buildDir }));
}

const selection = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'all';
const selected = configs.filter(c => selection === 'all' || selection === c.stem);
if (!selected.length) throw new Error(`Unknown schematic master: ${selection}`);
if (process.argv.includes('--refresh-pdf-only')) {
  // Refresh exports from the already verified native masters without changing
  // their native scene or repeating a valid native edit round trip.
  for (const config of selected) {
    const directory = path.join(receiptRoot, 'pdf-refresh', `${config.stem}-${Date.now()}`);
    const sourcePptx = path.join(out, `${config.stem}.pptx`);
    const products = await exportOffice(sourcePptx, directory, path.join(directory, 'office-profile'));
    for (const extension of ['pdf', 'png']) await fs.copyFile(products[extension], path.join(out, `${config.stem}.${extension}`));
    await fs.writeFile(path.join(directory, 'export-receipt.json'), JSON.stringify({
      source_pptx: sourcePptx, actual_pdf: products.pdf, actual_png: products.png,
      original_png_resolution_preserved: true, compression: 'lossless', native_scene_unchanged: true,
    }, null, 2));
    console.log(JSON.stringify({ stem: config.stem, status: 'actual_lossless_pdf_export', directory }));
  }
} else {
  for (const config of selected) await buildOne(config, configs.indexOf(config));
}
if (!layoutOnly) await fs.writeFile(path.join(out, 'captions-schematics.json'), JSON.stringify(captions, null, 2) + '\n');
await fs.writeFile(path.join(receiptRoot, 'source-summary.json'), JSON.stringify({
  configs, stages, route_lesson_counts: Object.fromEntries(routeRecords.map(r => [r.id, r.lesson_ids.length])),
  prerequisite_lesson_count: prerequisiteLessons.length, prerequisite_relation_count: relations,
  core_shared_count: coreShared, assets: [...usedAssets].map(([id, p]) => ({ id, path: path.relative(root, p) })),
}, null, 2) + '\n');
