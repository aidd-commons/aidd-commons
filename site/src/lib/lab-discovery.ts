import type { SiteOverview } from "../../../scripts/catalog/overview.js";

export type LabGuide = SiteOverview["labs"]["guides"][number];
export type LabMode = "exercise" | "inspect" | "reproduce" | "read";
export type LabInput =
  | "authored"
  | "molecular"
  | "public-data"
  | "project-records";
export type LabQuery = { q: string; mode: string; input: string };
export type DiscoverableLab = LabGuide & {
  mode: LabMode;
  input: LabInput;
  qualifier?: { en: string; zh: string };
};

export const labModeLabels = {
  exercise: { en: "Editable exercise", zh: "可修改练习" },
  inspect: { en: "Inspection or demonstration", zh: "检查或演示" },
  reproduce: { en: "Fresh local reproduction", zh: "本地重新计算" },
  read: { en: "Read saved results", zh: "阅读已有结果" },
} as const;

export const labInputLabels = {
  authored: { en: "Authored teaching examples", zh: "编写的教学例子" },
  molecular: { en: "Structure or trajectory files", zh: "结构或轨迹文件" },
  "public-data": {
    en: "Data from public sources",
    zh: "公开来源数据",
  },
  "project-records": {
    en: "Project records and saved outputs",
    zh: "项目记录与已保存输出",
  },
} as const;

export const emptyLabQuery: LabQuery = { q: "", mode: "", input: "" };

export function parseLabQuery(params: URLSearchParams): LabQuery {
  return {
    q: params.get("q")?.trim() ?? "",
    mode: params.get("mode")?.trim() ?? "",
    input: params.get("input")?.trim() ?? "",
  };
}

export function serializeLabQuery(query: LabQuery): string {
  const params = new URLSearchParams();
  for (const key of ["q", "mode", "input"] as const)
    if (query[key]) params.set(key, query[key]);
  return params.size ? `?${params}` : "";
}

export function filterLabs(labs: DiscoverableLab[], query: LabQuery) {
  const term = query.q.toLocaleLowerCase();
  return labs.filter(
    (lab) =>
      (!query.mode || lab.mode === query.mode) &&
      (!query.input || lab.input === query.input) &&
      (!term ||
        `${lab.slug} ${lab.title} ${lab.titleZh} ${lab.description} ${lab.descriptionZh} ${lab.qualifier?.en ?? ""} ${lab.qualifier?.zh ?? ""}`
          .toLocaleLowerCase()
          .includes(term)),
  );
}

export function buildLabDiscovery(guides: LabGuide[]): DiscoverableLab[] {
  const seen = new Set<string>();
  return guides.map((guide) => {
    if (seen.has(guide.slug))
      throw new Error(`Duplicate lab discovery route: ${guide.slug}`);
    seen.add(guide.slug);
    const labels = labDiscovery[guide.slug as keyof typeof labDiscovery];
    if (!labels)
      throw new Error(`Missing reviewed mode/input labels: ${guide.slug}`);
    return { ...guide, ...labels };
  });
}

// These labels identify the default entry mode and primary input described by
// each guide. Qualifiers preserve additional modes and mixed inputs. A local
// reproduction is a new computation, not independent scientific validation.
// The linked guide remains authoritative for commands, source versions,
// dependencies, network requests, saved results and frozen boundaries.
export const labDiscovery = {
  "agent-evaluation-taskset": { mode: "reproduce", input: "project-records" },
  "applicability-domain-audit": { mode: "reproduce", input: "public-data" },
  "assay-endpoint-controls": { mode: "reproduce", input: "public-data" },
  "asset-openness-audit": { mode: "reproduce", input: "project-records" },
  "az-clearance-system": { mode: "reproduce", input: "public-data" },
  "binder-definition": { mode: "inspect", input: "authored" },
  "biologic-construct-audit": { mode: "reproduce", input: "public-data" },
  "candidate-evidence-chain": { mode: "reproduce", input: "public-data" },
  "chembl-contract-inspection": { mode: "inspect", input: "project-records" },
  "chembl-egfr-representation-baselines": {
    mode: "read",
    input: "project-records",
    qualifier: {
      en: "Default: saved result panels. Separate reproduction commands have their own data and output contracts.",
      zh: "默认阅读已有结果面板；另列的复现命令有各自的数据和输出契约。",
    },
  },
  "claim-chain-audit": { mode: "reproduce", input: "project-records" },
  "claims-evidence-audit": { mode: "reproduce", input: "project-records" },
  "cofolding-claim-separation": { mode: "inspect", input: "project-records" },
  "counterevidence-dossier": { mode: "inspect", input: "project-records" },
  "crossdomain-tradeoff": {
    mode: "reproduce",
    input: "public-data",
    qualifier: {
      en: "Applies the same illustrative rule separately to the workbook's fictional teaching table and a measured ChEMBL cohort.",
      zh: "将同一条教学规则分别应用于工作簿的虚构教学表和 ChEMBL 实测队列。",
    },
  },
  "cyp-assay-system": { mode: "reproduce", input: "public-data" },
  "decision-unit-scope": { mode: "reproduce", input: "public-data" },
  "design-space": { mode: "inspect", input: "authored" },
  "docking-protocol": { mode: "inspect", input: "authored" },
  "egfr-structure-evidence": {
    mode: "inspect",
    input: "molecular",
    qualifier: {
      en: "Reads deposited PDB structures and declared constructed poses. A separate student exercise uses a fresh folder.",
      zh: "读取已存档的 PDB 结构并检查声明的构造位姿；另有在新目录开展的学生练习。",
    },
  },
  "entity-glossary-audit": { mode: "reproduce", input: "public-data" },
  "free-energy-network-audit": { mode: "reproduce", input: "public-data" },
  "freesolv-honest-baselines": {
    mode: "read",
    input: "project-records",
    qualifier: {
      en: "Default: saved aggregate results. Fresh reproduction uses a separate reader checkout under the declared protocol.",
      zh: "默认读取已保存的聚合结果；本地复现另用读者副本，并遵循原协议。",
    },
  },
  "functional-validation-audit": { mode: "reproduce", input: "public-data" },
  "generalization-unit-audit": { mode: "reproduce", input: "public-data" },
  "generation-gate": {
    mode: "inspect",
    input: "authored",
    qualifier: {
      en: "Reads authored candidates and a frozen objective together with the saved FreeSolv split table; no generator is run.",
      zh: "同时读取手工编写的候选、冻结目标和已保存的 FreeSolv 划分表；不运行生成模型。",
    },
  },
  "l1000-perturbation-context": { mode: "reproduce", input: "public-data" },
  "lipophilicity-notebook": {
    mode: "exercise",
    input: "public-data",
    qualifier: {
      en: "The default notebook downloads public measured logD data. Constructed-fixture execution was a separate engineering check.",
      zh: "默认 notebook 下载公开实测 logD 数据；构造 fixture 的执行是另列的工程检查。",
    },
  },
  "mechanism-consistency": { mode: "reproduce", input: "public-data" },
  "molecule-representation-inspector": {
    mode: "exercise",
    input: "authored",
    qualifier: {
      en: "The embedded SMILES examples are authored teaching inputs; the exercise is label-free and fits no predictor.",
      zh: "内嵌的 SMILES 例子是编写的教学输入；练习不加载标签，也不拟合预测模型。",
    },
  },
  "multi-endpoint-integration": { mode: "reproduce", input: "public-data" },
  "multi-endpoint-tradeoff": { mode: "reproduce", input: "public-data" },
  "nomination-readiness-audit": { mode: "reproduce", input: "public-data" },
  "objective-ladder": { mode: "reproduce", input: "public-data" },
  "open-question-audit": { mode: "reproduce", input: "project-records" },
  "oracle-exploitation-audit": { mode: "reproduce", input: "public-data" },
  "pkpd-translation-audit": {
    mode: "reproduce",
    input: "public-data",
    qualifier: {
      en: "Combines measured clearance with declared model assumptions; exposure, engagement and effect are modeled outputs.",
      zh: "把实测清除率与声明的模型假设组合；暴露、占有率和效应是模型输出。",
    },
  },
  "pool-budget-campaign": {
    mode: "exercise",
    input: "authored",
    qualifier: {
      en: "The editable simulator uses authored graphs and artificial scores. The separate measured ChEMBL replay is reading only.",
      zh: "可修改模拟器使用编写的分子图和人工分数；另列的实测 ChEMBL 回放仅供阅读。",
    },
  },
  "pool-budget-contract-inspection": {
    mode: "inspect",
    input: "project-records",
  },
  "pool-budget-uncertainty-acquisition": {
    mode: "read",
    input: "project-records",
    qualifier: {
      en: "Reads saved campaign and acquisition-policy results; the guide's command does not repeat the completed run.",
      zh: "读取已保存的采集策略与回放结果；指南中的命令不会重复已完成的运行。",
    },
  },
  "property-decision-threshold": { mode: "inspect", input: "project-records" },
  "relational-graph-audit": { mode: "reproduce", input: "project-records" },
  "retro-disconnection": { mode: "inspect", input: "authored" },
  "rmd17-contract-inspection": { mode: "inspect", input: "project-records" },
  "rmd17-dynamics-observable": { mode: "reproduce", input: "molecular" },
  "rmd17-system-state-energy-baselines": {
    mode: "read",
    input: "project-records",
    qualifier: {
      en: "Default: saved energy comparisons. Separate-checkout reproduction is not a new locked evaluation.",
      zh: "默认读取已有能量比较；读者副本中的复现不构成新的锁定评估。",
    },
  },
  "rosetta-cross-modality": { mode: "reproduce", input: "public-data" },
  "safety-evidence": { mode: "inspect", input: "authored" },
  "sar-attribution": {
    mode: "inspect",
    input: "authored",
    qualifier: {
      en: "Generates constructed labels from a declared rule and fits a Ridge model as a teaching demonstration.",
      zh: "按声明规则生成构造数据标签，并以拟合 Ridge 模型开展教学演示。",
    },
  },
  "screening-transport": { mode: "inspect", input: "project-records" },
  "skempi-affinity": { mode: "reproduce", input: "public-data" },
  "source-review-scope-audit": { mode: "reproduce", input: "project-records" },
  "specificity-margin-audit": { mode: "reproduce", input: "public-data" },
  "split-leakage-audit": { mode: "reproduce", input: "public-data" },
  "target-product-profile": { mode: "reproduce", input: "public-data" },
  "tool-contract-audit": { mode: "reproduce", input: "project-records" },
} as const;
