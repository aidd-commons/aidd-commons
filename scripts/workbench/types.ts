export type Locale = "en" | "zh-cn";
export type SourceAnchor = {
  path: string;
  label: string;
  /** RFC 6901 JSON pointer. A missing pointer is not a source match. */
  pointer?: string;
  anchor?: string;
};

export type SearchType =
  | "resource"
  | "track"
  | "route"
  | "lesson"
  | "lab"
  | "case"
  | "view"
  | "document";

export type SearchEntry = {
  id: string;
  objectId: string;
  type: SearchType;
  locale: Locale;
  /** Language of the indexed prose, independently of its navigation locale. */
  language: Locale;
  title: string;
  summary: string;
  keywords: string[];
  href: string;
  sourceDate: string | null;
  trackIds: string[];
};
export type SearchResult = SearchEntry & { score: number };
export type SearchIndex = { version: 1; entries: SearchEntry[] };

export type WorkbenchLesson = {
  id: string;
  order: number;
  title: string;
  titleZh: string;
  href: string;
  hrefZh: string;
  prerequisiteIds: string[];
  capabilities: string[];
  sourceIds: string[];
};
export type WorkbenchTrack = {
  id: string;
  order: number;
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  href: string;
  hrefZh: string;
  entryHref: string;
  entryHrefZh: string;
  prerequisiteIds: string[];
  prerequisites: string[];
  audience: string[];
  learningOutcomes: string[];
  pipelineStages: string[];
  lessons: WorkbenchLesson[];
  unitIds: string[];
};
export type WorkbenchRoute = {
  id: string;
  kind: "core" | "specialist";
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  href: string;
  hrefZh: string;
  lessonIds: string[];
  prerequisiteIds: string[];
};
export type WorkbenchCase = {
  id: string;
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  href: string;
  hrefZh: string;
  trackIds: string[];
  entity: string;
  entityZh: string;
  population: string;
  populationZh: string;
  unit: string;
  comparison: string;
  comparisonZh: string;
  interpretation: string;
  interpretationZh: string;
  limitations: string[];
  sourceDate: string;
  sources: SourceAnchor[];
  protocolId: string;
  resultId: string;
  viewIds: string[];
  status: "retained-result";
};
export type ViewRow = {
  population: string;
  model: string;
  quantity: string;
  unit: string;
  value: number | null;
  /** A checkpoint is a count of acquired parent molecules, not a time. */
  checkpoint?: number;
  count: number;
  sourcePointer: string;
};
export type WorkbenchView = {
  id: string;
  caseId: string;
  question: string;
  questionZh: string;
  quantity: string;
  unit: string;
  encoding: string;
  interaction: string;
  caption: string;
  captionZh: string;
  tableHref: string;
  tableHrefZh: string;
  exportPaths: string[];
  sources: SourceAnchor[];
  inputStatus: "available";
  status: "retained-result";
  rows: ViewRow[];
};

export type WorkbenchObject = {
  id: string;
  kind: SearchType | "unit" | "protocol" | "result";
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  href: string | null;
  hrefZh: string | null;
  sourceDate: string | null;
  language: "bilingual" | Locale;
  status: "published" | "mapped" | "source-only" | "retained-result";
  trackIds: string[];
  sources: SourceAnchor[];
};
export type RelationKind =
  | "uses-resource"
  | "has-prerequisite"
  | "contains"
  | "navigation"
  | "catalogue-relation"
  | "produced-under"
  | "displays-quantity";
export type WorkbenchRelation = {
  id: string;
  source: string;
  target: string;
  kind: RelationKind;
  semantics: "navigation" | "declared-support";
  label: string;
  declaredIn: SourceAnchor;
};

export type WorkbenchData = {
  version: 1;
  objects: WorkbenchObject[];
  tracks: WorkbenchTrack[];
  routes: WorkbenchRoute[];
  cases: WorkbenchCase[];
  views: WorkbenchView[];
  relations: WorkbenchRelation[];
  reverseRelations: Record<string, string[]>;
  coverage: {
    objectTypes: string[];
    relationTypes: RelationKind[];
    semantics: string;
    unknowns: string[];
    counts: Record<string, number>;
  };
};
