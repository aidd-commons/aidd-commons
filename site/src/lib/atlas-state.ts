export type AtlasQuery = {
  access: string;
  kind: string;
  lifecycle: string;
  q: string;
  stage: string;
};

export type AtlasResource = {
  access_level: { value: string };
  id: string;
  identifiers?: Array<{ value: string; url?: string; scheme?: string }>;
  kind: string;
  name: string;
  stages: string[];
  status: { value: string };
  summary: string;
  tasks?: string[];
  modalities?: string[];
};

export const atlasViews = ["list", "table", "landscape"] as const;
export const atlasSorts = ["relevance", "name", "checked"] as const;
export type AtlasView = (typeof atlasViews)[number];
export type AtlasSort = (typeof atlasSorts)[number];
export type AtlasState = AtlasQuery & {
  view: AtlasView;
  sort: AtlasSort;
  compare: string[];
  page: number;
};
export const atlasPageSize = 24;

export type EvidenceReference = {
  id: string;
  supports: string[];
};

export const progressStorageKey = "aidd-commons:v1:progress";

const queryFields = ["q", "stage", "kind", "access", "lifecycle"] as const;

export function parseAtlasQuery(searchParams: URLSearchParams): AtlasQuery {
  return Object.fromEntries(
    queryFields.map((field) => [field, searchParams.get(field)?.trim() ?? ""]),
  ) as AtlasQuery;
}

export function serializeAtlasQuery(query: AtlasQuery): string {
  const searchParams = new URLSearchParams();

  for (const field of queryFields) {
    if (query[field]) {
      searchParams.set(field, query[field]);
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

/** Filter-only links remain compatible; display and selection state are additive. */
export function parseAtlasState(params: URLSearchParams): AtlasState {
  const view = params.get("view");
  const sort = params.get("sort");
  const pageValue = params.get("page") ?? "";
  const page = /^[1-9]\d*$/u.test(pageValue) ? Number(pageValue) : 1;
  return {
    ...parseAtlasQuery(params),
    view: atlasViews.includes(view as AtlasView) ? (view as AtlasView) : "list",
    sort: atlasSorts.includes(sort as AtlasSort)
      ? (sort as AtlasSort)
      : "relevance",
    page: Number.isSafeInteger(page) ? page : 1,
    compare: [
      ...new Set(params.getAll("compare").flatMap((value) => value.split(","))),
    ]
      .map((value) => value.trim())
      .filter((value) => /^[a-z0-9][a-z0-9-]*$/u.test(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 4),
  };
}

export function serializeAtlasState(state: AtlasState): string {
  const params = new URLSearchParams(serializeAtlasQuery(state));
  if (state.view !== "list") params.set("view", state.view);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.compare.length) params.set("compare", state.compare.join(","));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/** Paginate the displayed records, retaining the full matched population separately. */
export function paginateAtlasResources<T>(
  resources: T[],
  requestedPage: number,
) {
  const pages = Math.max(1, Math.ceil(resources.length / atlasPageSize));
  const page = Math.min(
    pages,
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1,
  );
  const start = (page - 1) * atlasPageSize;
  return {
    page,
    pages,
    total: resources.length,
    from: resources.length ? start + 1 : 0,
    to: Math.min(start + atlasPageSize, resources.length),
    items: resources.slice(start, start + atlasPageSize),
  };
}

export function toggleAtlasComparison(ids: string[], id: string): string[] {
  return ids.includes(id)
    ? ids.filter((selected) => selected !== id)
    : ids.length < 4
      ? [...ids, id]
      : ids;
}

export function filterResources<T extends AtlasResource>(
  resources: T[],
  query: AtlasQuery,
): T[] {
  const searchTerm = query.q.toLocaleLowerCase();

  return resources.filter((resource) => {
    const searchable =
      `${resource.id} ${resource.name} ${resource.summary} ${(resource.identifiers ?? []).map(({ value }) => value).join(" ")} ${(resource.tasks ?? []).join(" ")} ${(resource.modalities ?? []).join(" ")}`.toLocaleLowerCase();

    return (
      (!searchTerm || searchable.includes(searchTerm)) &&
      (!query.stage || resource.stages.includes(query.stage)) &&
      (!query.kind || resource.kind === query.kind) &&
      (!query.access || resource.access_level.value === query.access) &&
      (!query.lifecycle || resource.status.value === query.lifecycle)
    );
  });
}

/** Text match order is a navigation aid, never a scientific performance ranking. */
export function sortAtlasResources<
  T extends AtlasResource & { last_verified?: string },
>(resources: T[], query: AtlasQuery, sort: AtlasSort): T[] {
  const term = query.q.toLocaleLowerCase();
  const rank = (resource: T) => {
    const id = resource.id.toLocaleLowerCase();
    const name = resource.name.toLocaleLowerCase();
    if (id === term || name === term) return 0;
    if (
      (resource.identifiers ?? []).some(
        ({ value }) => value.toLocaleLowerCase() === term,
      )
    )
      return 1;
    if (id.startsWith(term) || name.startsWith(term)) return 2;
    if (name.includes(term)) return 3;
    return 4;
  };
  return [...resources].sort((left, right) => {
    if (sort === "checked") {
      const dateOrder = (right.last_verified ?? "").localeCompare(
        left.last_verified ?? "",
      );
      if (dateOrder) return dateOrder;
    }
    if (sort === "relevance" && term) {
      const matchOrder = rank(left) - rank(right);
      if (matchOrder) return matchOrder;
    }
    return (
      left.name.localeCompare(right.name, "en") ||
      left.id.localeCompare(right.id, "en")
    );
  });
}

export function evidenceForIds<T extends EvidenceReference>(
  evidence: T[],
  ids: string[] | undefined,
): T[] {
  const requestedIds = new Set(ids ?? []);
  return evidence.filter((entry) => requestedIds.has(entry.id));
}

export function evidenceForSupport<T extends EvidenceReference>(
  evidence: T[],
  support: string,
): T[] {
  return evidence.filter((entry) => entry.supports.includes(support));
}

export function toggleLessonProgress(
  completed: string[],
  lessonId: string,
): string[] {
  return completed.includes(lessonId)
    ? completed.filter((id) => id !== lessonId)
    : [...completed, lessonId];
}

export function parseLessonProgress(serialized: string | null): string[] {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as { completed?: unknown };
    if (!Array.isArray(parsed.completed)) {
      return [];
    }

    return [
      ...new Set(
        parsed.completed.filter((id): id is string => typeof id === "string"),
      ),
    ];
  } catch {
    return [];
  }
}

export function readLessonProgress(
  storage: Pick<Storage, "getItem">,
): string[] {
  return parseLessonProgress(storage.getItem(progressStorageKey));
}

export function mergeLessonProgress(
  completed: string[],
  additions: string[],
): string[] {
  return [...new Set([...completed, ...additions])];
}
