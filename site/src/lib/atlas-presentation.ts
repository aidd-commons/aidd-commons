import type { AtlasQuery, AtlasState } from "./atlas-state.js";
import type { Resource, OpennessDimension } from "../data/resource.js";
import { opennessDimensions } from "../data/resource.js";

export const emptyAtlasQuery: AtlasQuery = {
  access: "",
  kind: "",
  lifecycle: "",
  q: "",
  stage: "",
};

export const emptyAtlasState: AtlasState = {
  ...emptyAtlasQuery,
  view: "list",
  sort: "relevance",
  compare: [],
  page: 1,
};

/** Search needs values and short context, not duplicated claim evidence. */
export type AtlasSearchEntry = Pick<
  Resource,
  | "id"
  | "name"
  | "kind"
  | "summary"
  | "stages"
  | "tasks"
  | "modalities"
  | "last_verified"
  | "canonical_url"
> & {
  access_level: { value: string };
  status: { value: string };
  identifiers: Array<{ value: string }>;
  licenses: Array<{ name: string; scope: string }>;
  sourceCount: number;
  caveat: string;
};

export function buildAtlasIndex(resources: Resource[]): AtlasSearchEntry[] {
  return resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    kind: resource.kind,
    summary: resource.summary,
    stages: resource.stages,
    tasks: resource.tasks,
    modalities: resource.modalities,
    last_verified: resource.last_verified,
    canonical_url: resource.canonical_url,
    access_level: { value: resource.access_level.value },
    status: { value: resource.status.value },
    identifiers: resource.identifiers.map(({ value }) => ({ value })),
    licenses: resource.licenses.map(({ name, scope }) => ({ name, scope })),
    sourceCount: resource.evidence.length,
    caveat: resource.caveats[0] ?? "",
  }));
}

export const assetLabels: Record<OpennessDimension, string> = {
  inference_code: "Inference code",
  training_code: "Training code",
  weights: "Weights",
  architecture: "Architecture",
  data_recipe: "Data recipe",
  training_data: "Training data",
  evaluation_code: "Evaluation code",
};

export const assetStateLabels: Record<string, string> = {
  available: "Available",
  not_available: "Not available",
  not_applicable: "Not applicable",
  unverified: "Unverified",
};

/** Every cell retains the original state and its direct evidence IDs. */
export function comparisonAssetRows(resources: Resource[]) {
  return opennessDimensions.map((dimension) => ({
    dimension,
    label: assetLabels[dimension],
    cells: resources.map((resource) => ({
      resourceId: resource.id,
      value: resource.openness[dimension].value,
      evidence: resource.openness[dimension].evidence ?? [],
    })),
  }));
}

export function atlasLandscape(resources: AtlasSearchEntry[]) {
  const kinds = [...new Set(resources.map(({ kind }) => kind))].sort();
  const stages = [
    ...new Set(resources.flatMap((resource) => resource.stages)),
  ].sort();
  if (resources.some((resource) => !resource.stages.length)) stages.push("");
  return {
    total: resources.length,
    kinds,
    rows: stages.map((stage) => ({
      stage,
      cells: kinds.map((kind) => ({
        kind,
        ids: resources
          .filter(
            (resource) =>
              resource.kind === kind &&
              (stage
                ? resource.stages.includes(stage)
                : !resource.stages.length),
          )
          .map(({ id }) => id),
      })),
    })),
  };
}

export function atlasLabel(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

const filterLabels: Record<keyof AtlasQuery, string> = {
  q: "Search",
  stage: "Stage",
  kind: "Kind",
  access: "Access",
  lifecycle: "Lifecycle",
};

export function activeAtlasFilters(query: AtlasQuery) {
  return (["q", "stage", "kind", "access", "lifecycle"] as const)
    .filter((key) => query[key])
    .map((key) => ({
      key,
      label: filterLabels[key],
      value: key === "q" ? query[key] : atlasLabel(query[key]),
    }));
}


const chineseLabels: Record<string, string> = {
  stage: "阶段", kind: "类型", access: "访问", lifecycle: "生命周期", list: "列表", table: "表格", landscape: "分布",
  model: "模型", dataset: "数据集", benchmark: "基准", software: "软件", tool: "工具", course: "课程", tutorial: "教程", paper: "论文", standard: "标准", database: "数据库", review: "综述", portal: "门户",
  active: "活跃", archived: "已归档", deprecated: "已弃用", legacy: "历史版本", unverified: "未核实",
  open: "开放", gated: "需申请", restricted: "受限", commercial: "商业", mixed: "混合", research_only: "仅限研究", registration: "需要注册", public: "公开", unavailable: "不可用",
  available: "可用", not_available: "不可用", not_applicable: "不适用",
  inference_code: "推理代码", training_code: "训练代码", weights: "权重", architecture: "架构", data_recipe: "数据配方", training_data: "训练数据", evaluation_code: "评估代码",
};
export function localizedAtlasLabel(value: string, chinese = false): string {
  return chinese ? chineseLabels[value] ?? atlasLabel(value) : atlasLabel(value);
}
