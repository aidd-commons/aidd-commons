import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import {
  isCalendarDate,
  type Resource,
} from "../../catalog/schema/resource.js";
import { loadCatalog } from "../catalog/catalog.js";
import { parseLabPage } from "../catalog/overview.js";
import {
  capabilitiesForLesson,
  loadCurriculum,
  type Curriculum,
} from "../curriculum/curriculum.js";
import { retainedViewRows } from "./adapters.js";
import {
  atPointer,
  parseWorkbenchRegistry,
  type WorkbenchRegistry,
} from "./registry.js";
import type {
  Locale,
  SearchEntry,
  SearchIndex,
  SourceAnchor,
  WorkbenchCase,
  WorkbenchData,
  WorkbenchObject,
  WorkbenchRelation,
  WorkbenchRoute,
  WorkbenchTrack,
  WorkbenchView,
} from "./types.js";

export type { WorkbenchData } from "./types.js";
type Page = {
  id: string;
  type: "lesson" | "lab" | "document";
  locale: Locale;
  path: string;
  source: string;
  title: string;
  summary: string;
  sourceDate: string | null;
};
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const curriculumPath = "catalog/curriculum/tracks.yaml";
const registryPath = "catalog/workbench/registry.yaml";
const curriculumSource: SourceAnchor = {
  path: curriculumPath,
  label: "Canonical curriculum and declared routes",
};
const registrySource: SourceAnchor = {
  path: registryPath,
  label: "Curated case and visual mappings",
};
const prefix = (kind: string, id: string) => `${kind}:${id}`;

async function sourceFiles(
  root: string,
  relative: string,
  extension: string,
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, relative), {
    withFileTypes: true,
  })) {
    const path = `${relative}/${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await sourceFiles(root, path, extension)));
    else if (entry.isFile() && path.endsWith(extension)) files.push(path);
  }
  return files.sort(compare);
}

/** Only an explicitly labelled review date becomes a source date; other dates stay unclaimed. */
export function reviewedSourceDate(source: string): string | null {
  const match =
    /(?:last\s+reviewed|sources?[^\n.]{0,80}reviewed|reviewed\s+(?:on|locally\s+on))\s*:?\s*(\d{4}-\d{2}-\d{2})/iu.exec(
      source,
    );
  return match && isCalendarDate(match[1]) ? match[1] : null;
}

function pageKeywords(source: string): string[] {
  const prose = source.replace(/```[\s\S]*?```/gu, "");
  return [
    ...[...prose.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) => match[1]),
    ...[...prose.matchAll(/(?<!`)`([^`\n]{1,80})`(?!`)/gu)].map(
      (match) => match[1],
    ),
  ];
}

async function loadPages(root: string): Promise<Page[]> {
  const pages: Page[] = [];
  for (const locale of ["en", "zh-cn"] as const) {
    const directory = `site/src/content/docs${locale === "zh-cn" ? "/zh-cn" : ""}`;
    for (const path of await sourceFiles(root, directory, ".mdx")) {
      const relative = path.slice(directory.length + 1, -4);
      if (relative.startsWith("zh-cn/")) continue;
      const type = relative.startsWith("learn/")
        ? "lesson"
        : relative.startsWith("labs/")
          ? "lab"
          : "document";
      const id =
        type === "document"
          ? relative
          : relative.slice(relative.indexOf("/") + 1);
      const source = await readFile(join(root, path), "utf8");
      const meta = parseLabPage(source, id, locale);
      pages.push({
        id,
        type,
        locale,
        path,
        source,
        title: meta.title,
        summary: meta.description,
        sourceDate: reviewedSourceDate(source),
      });
    }
  }
  return pages;
}

export async function validateSourceAnchor(
  root: string,
  source: SourceAnchor,
): Promise<unknown> {
  if (
    !/^(?:labs|catalog|site\/src\/content\/docs)\//u.test(source.path) ||
    source.path
      .split("/")
      .some((part) => part === ".." || part === "." || part === "")
  )
    throw new Error(`Invalid canonical source path: ${source.path}`);
  const path = join(root, source.path);
  if (!(await lstat(path)).isFile())
    throw new Error(`Source must be a regular file: ${source.path}`);
  const text = await readFile(path, "utf8");
  if (source.anchor) {
    const anchors = [...text.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) =>
      match[1]
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/gu, "-"),
    );
    if (!anchors.includes(source.anchor))
      throw new Error(
        `Unresolved source anchor ${source.path}#${source.anchor}`,
      );
  }
  if (source.pointer !== undefined)
    return atPointer(JSON.parse(text), source.pointer);
  return source.path.endsWith(".json") ? JSON.parse(text) : text;
}

function buildTracks(curriculum: Curriculum, pages: Page[]): WorkbenchTrack[] {
  const lessonIds = new Map(
    curriculum.tracks.flatMap((track) =>
      track.lessons.map(
        (lesson) => [lesson.id, `${track.id}/${lesson.id}`] as const,
      ),
    ),
  );
  return [...curriculum.tracks]
    .sort((a, b) => a.order - b.order)
    .map((track) => {
      const lessons = [...track.lessons]
        .filter(({ type }) => type !== "core-source-path")
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const id = `${track.id}/${lesson.id}`;
          const en = pages.find(
            (page) =>
              page.type === "lesson" && page.id === id && page.locale === "en",
          );
          const zh = pages.find(
            (page) =>
              page.type === "lesson" &&
              page.id === id &&
              page.locale === "zh-cn",
          );
          if (!en || !zh)
            throw new Error(
              `Lesson ${id}: both bilingual destinations must exist`,
            );
          return {
            id,
            order: lesson.order,
            title: lesson.title,
            titleZh: lesson.title_zh ?? zh.title,
            href: `/learn/${id}/`,
            hrefZh: `/zh-cn/learn/${id}/`,
            prerequisiteIds: lesson.prerequisites.map((id) => {
              const resolved = lessonIds.get(id);
              if (!resolved) throw new Error(`Unresolved prerequisite: ${id}`);
              return resolved;
            }),
            capabilities: capabilitiesForLesson(lesson),
            sourceIds: lesson.source_ids,
          };
        });
      if (!lessons.length)
        throw new Error(`Track ${track.id}: no published lessons`);
      return {
        id: track.id,
        order: track.order,
        title: track.title,
        titleZh: track.title_zh,
        summary: track.summary,
        summaryZh: track.summary_zh,
        href: `/learn/tracks/${track.id}/`,
        hrefZh: `/zh-cn/learn/tracks/${track.id}/`,
        entryHref: lessons[0].href,
        entryHrefZh: lessons[0].hrefZh,
        prerequisiteIds: track.cross_track_prerequisites,
        prerequisites: track.prerequisites,
        audience: track.audience,
        learningOutcomes: track.learning_outcomes,
        pipelineStages: track.pipeline_stages,
        lessons,
        unitIds: curriculum.units
          .filter((unit) => unit.track_id === track.id)
          .map(({ id }) => id),
      };
    });
}

async function buildCases(
  root: string,
  registry: WorkbenchRegistry,
  pages: Page[],
) {
  const cases: WorkbenchCase[] = [];
  const views: WorkbenchView[] = [];
  for (const entry of registry.cases) {
    const protocol = (await validateSourceAnchor(
      root,
      entry.protocol,
    )) as Record<string, unknown>;
    const summary = (await validateSourceAnchor(root, entry.result)) as Record<
      string,
      unknown
    >;
    if (
      (protocol.protocol_id ?? protocol.protocol_version) !==
        entry.protocol.id ||
      summary.protocol_id !== entry.protocol.id
    )
      throw new Error(
        `${entry.id}: retained result/protocol identity mismatch`,
      );
    const sourceDate = atPointer(summary, entry.result.datePointer);
    if (typeof sourceDate !== "string" || !isCalendarDate(sourceDate))
      throw new Error(
        `${entry.id}: result source date must be a real calendar date`,
      );
    atPointer(summary, entry.result.dataPointer);
    if (
      !Array.isArray(summary.interpretation) ||
      !summary.interpretation.length ||
      summary.interpretation.some((item) => typeof item !== "string")
    )
      throw new Error(
        `${entry.id}: retain nonempty source interpretation and limitations`,
      );
    const guide = pages.find(
      (page) =>
        page.type === "lab" &&
        page.id === entry.labSlug &&
        page.locale === "en",
    );
    const guideZh = pages.find(
      (page) =>
        page.type === "lab" &&
        page.id === entry.labSlug &&
        page.locale === "zh-cn",
    );
    if (!guide || !guideZh)
      throw new Error(
        `${entry.id}: both bilingual lab destinations must exist`,
      );
    const sources = [
      { path: entry.protocol.path, label: entry.protocol.label },
      {
        path: entry.result.path,
        label: entry.result.label,
        pointer: entry.result.dataPointer,
      },
      { path: guide.path, label: guide.title },
    ];
    const item: WorkbenchCase = {
      id: entry.id,
      title: entry.title,
      titleZh: entry.titleZh,
      summary: entry.summary,
      summaryZh: entry.summaryZh,
      href: `/labs/${entry.labSlug}/`,
      hrefZh: `/zh-cn/labs/${entry.labSlug}/`,
      trackIds: entry.trackIds,
      entity: entry.entity,
      entityZh: entry.entityZh,
      population: entry.population,
      populationZh: entry.populationZh,
      unit: entry.unit,
      comparison: entry.comparison,
      comparisonZh: entry.comparisonZh,
      interpretation: entry.interpretation,
      interpretationZh: entry.interpretationZh,
      limitations: summary.interpretation as string[],
      sourceDate,
      sources,
      protocolId: entry.protocol.id,
      resultId: entry.result.id,
      viewIds: entry.viewIds,
      status: "retained-result",
    };
    cases.push(item);
    for (const view of registry.views.filter(
      ({ caseId }) => caseId === entry.id,
    )) {
      await validateSourceAnchor(root, {
        path: guide.path,
        label: guide.title,
        anchor: view.tableAnchor,
      });
      const rows = retainedViewRows(view.adapter, summary);
      if (
        rows.some(
          (row) => row.unit !== view.unit || row.quantity !== view.quantity,
        )
      )
        throw new Error(
          `${view.id}: row quantity/unit disagrees with declared view`,
        );
      views.push({
        id: view.id,
        caseId: view.caseId,
        question: view.question,
        questionZh: view.questionZh,
        quantity: view.quantity,
        unit: view.unit,
        encoding: view.encoding,
        interaction: view.interaction,
        caption: view.caption,
        captionZh: view.captionZh,
        tableHref: `${item.href}#${view.tableAnchor}`,
        tableHrefZh: item.hrefZh,
        exportPaths: [],
        sources: [
          {
            path: entry.result.path,
            label: entry.result.label,
            pointer: entry.result.dataPointer,
          },
        ],
        inputStatus: "available",
        status: "retained-result",
        rows,
      });
    }
  }
  return { cases, views };
}

export async function loadWorkbenchData(
  root: string,
): Promise<{ data: WorkbenchData; search: SearchIndex }> {
  const resources = await loadCatalog(join(root, "catalog/resources"));
  const curriculum = await loadCurriculum(join(root, curriculumPath), {
    resources,
  });
  const registry = parseWorkbenchRegistry(
    parse(await readFile(join(root, registryPath), "utf8")),
  );
  const pages = await loadPages(root);
  const tracks = buildTracks(curriculum, pages);
  const routes: WorkbenchRoute[] = curriculum.learning_paths.map((route) => ({
    id: route.id,
    kind: route.kind,
    title: route.title,
    titleZh: route.title_zh,
    summary: route.description,
    summaryZh: route.description_zh,
    href: `/learn/#route-${route.id}`,
    hrefZh: `/zh-cn/learn/#route-${route.id}`,
    lessonIds: route.lesson_ids,
    prerequisiteIds: route.prerequisites,
  }));
  const { cases, views } = await buildCases(root, registry, pages);
  const objects: WorkbenchObject[] = [];
  const relations: WorkbenchRelation[] = [];
  const keywords = new Map<string, string[]>();
  function addObject(
    kind: WorkbenchObject["kind"],
    id: string,
    input: Omit<WorkbenchObject, "id" | "kind">,
  ) {
    objects.push({ id: prefix(kind, id), kind, ...input });
  }
  function relation(
    source: string,
    target: string,
    kind: WorkbenchRelation["kind"],
    declaredIn: SourceAnchor,
    label: string = kind,
    semantics: WorkbenchRelation["semantics"] = "navigation",
  ) {
    const id = `${source}|${kind}|${target}`;
    if (!relations.some((entry) => entry.id === id))
      relations.push({
        id,
        source,
        target,
        kind,
        declaredIn,
        label,
        semantics,
      });
  }
  const resourcePaths = new Map<string, string>();
  for (const path of await sourceFiles(root, "catalog/resources", ".yaml")) {
    const record = parse(await readFile(join(root, path), "utf8")) as Resource;
    resourcePaths.set(record.id, path);
  }
  for (const resource of resources) {
    const path = resourcePaths.get(resource.id);
    if (!path) throw new Error(`Resource source not found: ${resource.id}`);
    addObject("resource", resource.id, {
      title: resource.name,
      titleZh: resource.name,
      summary: resource.summary,
      summaryZh: resource.summary,
      href: `/atlas/${resource.id}/`,
      hrefZh: `/atlas/${resource.id}/`,
      sourceDate: resource.last_verified,
      language: "en",
      status: "published",
      trackIds: tracks
        .filter((track) =>
          track.lessons.some((lesson) =>
            lesson.sourceIds.includes(resource.id),
          ),
        )
        .map(({ id }) => id),
      sources: [{ path, label: `${resource.name}: reviewed catalogue record` }],
    });
    keywords.set(prefix("resource", resource.id), [
      resource.id,
      resource.kind,
      ...resource.identifiers.map(({ value }) => value),
      ...resource.stages,
      ...resource.modalities,
      ...resource.tasks,
    ]);
    for (const link of resource.relations)
      relation(
        prefix("resource", resource.id),
        prefix("resource", link.target),
        "catalogue-relation",
        { path, label: "Declared catalogue association" },
        link.type,
      );
  }
  for (const track of tracks) {
    addObject("track", track.id, {
      title: track.title,
      titleZh: track.titleZh,
      summary: track.summary,
      summaryZh: track.summaryZh,
      href: track.href,
      hrefZh: track.hrefZh,
      sourceDate: null,
      language: "bilingual",
      status: "published",
      trackIds: [track.id],
      sources: [curriculumSource],
    });
    for (const prerequisite of track.prerequisiteIds)
      relation(
        prefix("track", track.id),
        prefix("track", prerequisite),
        "has-prerequisite",
        curriculumSource,
      );
    for (const lesson of track.lessons) {
      relation(
        prefix("track", track.id),
        prefix("lesson", lesson.id),
        "contains",
        curriculumSource,
      );
      for (const prerequisite of lesson.prerequisiteIds)
        relation(
          prefix("lesson", lesson.id),
          prefix("lesson", prerequisite),
          "has-prerequisite",
          curriculumSource,
        );
      for (const resourceId of lesson.sourceIds)
        relation(
          prefix("lesson", lesson.id),
          prefix("resource", resourceId),
          "uses-resource",
          curriculumSource,
        );
    }
  }
  for (const route of routes) {
    addObject("route", route.id, {
      title: route.title,
      titleZh: route.titleZh,
      summary: route.summary,
      summaryZh: route.summaryZh,
      href: route.href,
      hrefZh: route.hrefZh,
      sourceDate: null,
      language: "bilingual",
      status: "published",
      trackIds: [...new Set(route.lessonIds.map((id) => id.split("/")[0]))],
      sources: [curriculumSource],
    });
    for (const id of route.lessonIds)
      relation(
        prefix("route", route.id),
        prefix("lesson", id),
        "contains",
        curriculumSource,
      );
    for (const id of route.prerequisiteIds)
      relation(
        prefix("route", route.id),
        prefix("lesson", id),
        "has-prerequisite",
        curriculumSource,
      );
  }
  for (const page of pages.filter(
    ({ locale, type }) => locale === "en" || type === "document",
  )) {
    if (objects.some(({ id }) => id === prefix(page.type, page.id))) continue;
    const zh = pages.find(
      (other) =>
        other.type === page.type &&
        other.id === page.id &&
        other.locale === "zh-cn",
    );
    if (!zh && page.type !== "document")
      throw new Error(`${page.type} ${page.id}: missing bilingual destination`);
    const section =
      page.type === "lab" ? "labs/" : page.type === "lesson" ? "learn/" : "";
    const enHref = `${page.locale === "zh-cn" ? "/zh-cn" : ""}/${section}${page.id}/`;
    addObject(page.type, page.id, {
      title: page.title,
      titleZh: zh?.title ?? page.title,
      summary: page.summary,
      summaryZh: zh?.summary ?? page.summary,
      href: enHref,
      hrefZh: zh ? `/zh-cn/${section}${page.id}/` : enHref,
      sourceDate: page.sourceDate,
      language: zh && page.locale === "en" ? "bilingual" : page.locale,
      status: "published",
      trackIds:
        page.type === "lesson"
          ? [page.id.split("/")[0]]
          : page.id.startsWith("pathways/")
            ? [page.id.slice(9)]
            : [],
      sources: [
        { path: page.path, label: page.title },
        ...(zh && zh !== page ? [{ path: zh.path, label: zh.title }] : []),
      ],
    });
    keywords.set(
      prefix(page.type, page.id),
      pageKeywords(`${page.source}\n${zh?.source ?? ""}`),
    );
  }
  for (const unit of curriculum.units) {
    addObject("unit", unit.id, {
      title: unit.title,
      titleZh: unit.title_zh,
      summary: unit.learning_objective,
      summaryZh: unit.learning_objective_zh,
      href: unit.lesson_id ? `/learn/${unit.lesson_id}/` : null,
      hrefZh: unit.lesson_id ? `/zh-cn/learn/${unit.lesson_id}/` : null,
      sourceDate: null,
      language: "bilingual",
      status: unit.lesson_id ? "mapped" : "source-only",
      trackIds: [unit.track_id],
      sources: [curriculumSource],
    });
    relation(
      prefix("track", unit.track_id),
      prefix("unit", unit.id),
      "contains",
      curriculumSource,
    );
    if (unit.lesson_id)
      relation(
        prefix("unit", unit.id),
        prefix("lesson", unit.lesson_id),
        "navigation",
        curriculumSource,
        "Mapped teaching destination",
      );
    for (const prerequisite of unit.prerequisites)
      relation(
        prefix("unit", unit.id),
        prefix("unit", prerequisite),
        "has-prerequisite",
        curriculumSource,
      );
  }
  for (const item of cases) {
    const declared = registry.cases.find(({ id }) => id === item.id)!;
    keywords.set(prefix("case", item.id), [
      item.protocolId,
      item.resultId,
      ...pages
        .filter((page) => page.type === "lab" && page.id === declared.labSlug)
        .flatMap((page) => pageKeywords(page.source)),
    ]);
    addObject("case", item.id, {
      title: item.title,
      titleZh: item.titleZh,
      summary: item.summary,
      summaryZh: item.summaryZh,
      href: item.href,
      hrefZh: item.hrefZh,
      sourceDate: item.sourceDate,
      language: "bilingual",
      status: item.status,
      trackIds: item.trackIds,
      sources: item.sources,
    });
    for (const source of [declared.protocol, declared.result]) {
      const kind = source === declared.protocol ? "protocol" : "result";
      addObject(kind, source.id, {
        title: source.label,
        titleZh: source.label,
        summary: "Retained scientific source; consult its declared scope.",
        summaryZh: "保留的科学来源；请按其声明范围解读。",
        href: item.href,
        hrefZh: item.hrefZh,
        sourceDate: kind === "result" ? item.sourceDate : null,
        language: "en",
        status: kind === "result" ? "retained-result" : "source-only",
        trackIds: item.trackIds,
        sources: [{ path: source.path, label: source.label }],
      });
    }
    relation(
      prefix("result", item.resultId),
      prefix("protocol", item.protocolId),
      "produced-under",
      {
        path: declared.result.path,
        pointer: "/protocol_id",
        label: "Retained result declares this protocol",
      },
      "Result protocol identity",
      "declared-support",
    );
    relation(
      prefix("case", item.id),
      prefix("result", item.resultId),
      "navigation",
      registrySource,
      "Inspect retained result",
    );
    relation(
      prefix("case", item.id),
      prefix("lab", declared.labSlug),
      "navigation",
      registrySource,
      "Read worked laboratory guide",
    );
    for (const trackId of item.trackIds)
      relation(
        prefix("track", trackId),
        prefix("case", item.id),
        "navigation",
        registrySource,
        "Curated worked case",
      );
    for (const lessonId of declared.lessonIds)
      relation(
        prefix("lesson", lessonId),
        prefix("case", item.id),
        "navigation",
        registrySource,
        "Curated worked case",
      );
  }
  for (const view of views) {
    const owner = cases.find(({ id }) => id === view.caseId)!;
    addObject("view", view.id, {
      title: view.question,
      titleZh: view.questionZh,
      summary: view.caption,
      summaryZh: view.captionZh,
      href: view.tableHref,
      hrefZh: view.tableHrefZh,
      sourceDate: owner.sourceDate,
      language: "bilingual",
      status: view.status,
      trackIds: owner.trackIds,
      sources: view.sources,
    });
    relation(
      prefix("view", view.id),
      prefix("result", owner.resultId),
      "displays-quantity",
      view.sources[0],
      `${view.quantity} [${view.unit}]`,
      "declared-support",
    );
    relation(
      prefix("case", owner.id),
      prefix("view", view.id),
      "navigation",
      registrySource,
      "Inspect this quantity",
    );
  }
  // Authored links are navigation associations, irrespective of the linked object's scientific role.
  const destinations = new Map(
    objects
      .filter((item) => item.href)
      .map((item) => [item.href!.split("#")[0], item.id]),
  );
  for (const page of pages.filter(({ locale }) => locale === "en")) {
    for (const match of page.source.matchAll(
      /\]\((\/(?:learn|labs|atlas)\/[^\s)#?]*)(?:[?#][^\s)]*)?\)/gu,
    )) {
      const target = destinations.get(`${match[1].replace(/\/+$/u, "")}/`);
      const source = prefix(page.type, page.id);
      if (target && source !== target)
        relation(source, target, "navigation", {
          path: page.path,
          label: "Authored navigation link",
        });
    }
  }
  // Propagate only declared curriculum/navigation membership to lab facets.
  for (const object of objects.filter(({ kind }) => kind === "lab")) {
    object.trackIds = [
      ...new Set(
        relations
          .filter(({ target }) => target === object.id)
          .flatMap(
            ({ source }) =>
              objects.find(({ id }) => id === source)?.trackIds ?? [],
          ),
      ),
    ].sort(compare);
  }
  objects.sort((a, b) => compare(a.id, b.id));
  relations.sort((a, b) => compare(a.id, b.id));
  const reverseRelations: WorkbenchData["reverseRelations"] =
    Object.fromEntries(
      objects.map((object) => [
        object.id,
        relations
          .filter(({ target }) => target === object.id)
          .map(({ id }) => id),
      ]),
    );
  const data: WorkbenchData = {
    version: 1,
    objects,
    tracks,
    routes,
    cases,
    views,
    relations,
    reverseRelations,
    coverage: {
      objectTypes: [...new Set(objects.map(({ kind }) => kind))].sort(compare),
      relationTypes: [...new Set(relations.map(({ kind }) => kind))].sort(
        compare,
      ),
      semantics:
        "Declared navigation and quantity/protocol links only; no inferred scientific dependency or automatic claim revision.",
      unknowns: [
        "No complete scientific dependency graph or causal support is inferred.",
        "Missing per-frame Ridge predictions remain unavailable.",
        "Human learning and research-utility outcomes are not observed.",
        "Visual rows are retained aggregates, not raw prediction or uncertainty data.",
        "Standalone final-size exports for these registry views are not yet declared.",
      ],
      counts: Object.fromEntries(
        [...new Set(objects.map(({ kind }) => kind))]
          .sort(compare)
          .map((kind) => [
            kind,
            objects.filter((item) => item.kind === kind).length,
          ]),
      ),
    },
  };
  validateWorkbenchGraph(data);
  const entries: SearchEntry[] = objects
    .filter((object) => !["unit", "protocol", "result"].includes(object.kind))
    .flatMap((object) =>
      (["en", "zh-cn"] as const).map((locale) => ({
        id: `${object.id}:${locale}`,
        objectId: object.id,
        type: object.kind as SearchEntry["type"],
        locale,
        language: object.language === "bilingual" ? locale : object.language,
        title: locale === "zh-cn" ? object.titleZh : object.title,
        summary: (locale === "zh-cn" ? object.summaryZh : object.summary).slice(
          0,
          260,
        ),
        keywords: [
          ...new Set([
            object.id.split(":").slice(1).join(":"),
            ...(keywords.get(object.id) ?? []),
            ...object.trackIds,
          ]),
        ],
        href: (locale === "zh-cn" ? object.hrefZh : object.href)!,
        sourceDate: object.sourceDate,
        trackIds: object.trackIds,
      })),
    );
  return { data, search: { version: 1, entries } };
}

export function validateWorkbenchGraph(data: WorkbenchData): void {
  if (!data.objects.length || !data.relations.length || !data.tracks.length)
    throw new Error(
      "Workbench requires nonempty objects, declared relations and tracks",
    );
  const ids = new Set(data.objects.map(({ id }) => id));
  if (ids.size !== data.objects.length)
    throw new Error("Workbench object IDs must be unique");
  const relationIds = new Set(data.relations.map(({ id }) => id));
  if (relationIds.size !== data.relations.length)
    throw new Error("Workbench relation IDs must be unique");
  for (const relation of data.relations) {
    if (!ids.has(relation.source) || !ids.has(relation.target))
      throw new Error(`Unresolved workbench relation: ${relation.id}`);
    if (
      (relation.kind === "produced-under" ||
        relation.kind === "displays-quantity") !==
      (relation.semantics === "declared-support")
    )
      throw new Error(
        `${relation.id}: navigation must not become verified scientific support`,
      );
    const sourceKind = data.objects.find(
      ({ id }) => id === relation.source,
    )!.kind;
    const targetKind = data.objects.find(
      ({ id }) => id === relation.target,
    )!.kind;
    const allowed =
      relation.kind === "navigation" ||
      (relation.kind === "produced-under" &&
        sourceKind === "result" &&
        targetKind === "protocol") ||
      (relation.kind === "displays-quantity" &&
        sourceKind === "view" &&
        targetKind === "result") ||
      (relation.kind === "uses-resource" &&
        sourceKind === "lesson" &&
        targetKind === "resource") ||
      (relation.kind === "catalogue-relation" &&
        sourceKind === "resource" &&
        targetKind === "resource") ||
      (relation.kind === "contains" &&
        ((sourceKind === "track" && ["lesson", "unit"].includes(targetKind)) ||
          (sourceKind === "route" && targetKind === "lesson"))) ||
      (relation.kind === "has-prerequisite" &&
        ((["track", "lesson", "unit"].includes(sourceKind) &&
          sourceKind === targetKind) ||
          (sourceKind === "route" && targetKind === "lesson")));
    if (!allowed)
      throw new Error(
        `${relation.id}: relation kind does not match its typed endpoints`,
      );
  }
  for (const object of data.objects) {
    const expected = data.relations
      .filter(({ target }) => target === object.id)
      .map(({ id }) => id);
    if (
      JSON.stringify(data.reverseRelations[object.id]) !==
      JSON.stringify(expected)
    )
      throw new Error(`Incorrect reverse relations for ${object.id}`);
    if (
      object.language === "bilingual" &&
      object.href &&
      (!object.hrefZh || !object.titleZh || !object.summaryZh)
    )
      throw new Error(`${object.id}: missing bilingual destination or labels`);
  }
  for (const view of data.views) {
    if (
      !view.rows.length ||
      view.rows.some(
        (row) =>
          row.unit !== view.unit ||
          row.quantity !== view.quantity ||
          !row.population ||
          !Number.isSafeInteger(row.count) ||
          row.count < 1,
      )
    )
      throw new Error(`${view.id}: invalid quantity/unit/population rows`);
  }
}

export function nominateSourceReviews(
  data: WorkbenchData,
  changes: readonly { path: string; fields: string[] }[],
) {
  return changes.flatMap((change) => {
    const sourceObjects = data.objects.filter((item) =>
      item.sources.some(({ path }) => path === change.path),
    );
    const directConsumers = new Set(sourceObjects.map(({ id }) => id));
    for (const relation of data.relations)
      if (
        sourceObjects.some(({ id }) => id === relation.target) ||
        relation.declaredIn.path === change.path
      )
        directConsumers.add(relation.source);
    return [...directConsumers].sort(compare).map((objectId) => ({
      objectId,
      sourcePath: change.path,
      changedFields: [...change.fields],
      status: "review-candidate" as const,
      reason:
        "direct source or declared incoming relation; no scientific conclusion inferred",
    }));
  });
}

export function renderWorkbenchArtifacts(
  data: WorkbenchData,
  search: SearchIndex,
) {
  validateWorkbenchGraph(data);
  if (
    !search.entries.length ||
    new Set(search.entries.map(({ id }) => id)).size !== search.entries.length
  )
    throw new Error("Search index requires nonempty entries with unique IDs");
  return {
    "workbench.v1.json": `${JSON.stringify(data)}\n`,
    "search.v1.json": `${JSON.stringify(search)}\n`,
  };
}

export async function checkWorkbenchArtifacts(
  root: string,
  input?: { data: WorkbenchData; search: SearchIndex },
): Promise<void> {
  const { data, search } = input ?? (await loadWorkbenchData(root));
  for (const [name, expected] of Object.entries(
    renderWorkbenchArtifacts(data, search),
  )) {
    const path = join(root, "site/public/data", name);
    try {
      if (
        !(await lstat(path)).isFile() ||
        (await readFile(path, "utf8")) !== expected
      )
        throw new Error("stale");
    } catch {
      throw new Error(
        `${name}: missing or stale generated workbench data. Regenerate explicitly with npm run workbench:build.`,
      );
    }
  }
}
