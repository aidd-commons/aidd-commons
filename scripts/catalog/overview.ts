import { parse } from "yaml";

import type { Resource } from "../../catalog/schema/resource.js";
import type { Curriculum } from "../curriculum/curriculum.js";

type Dimension = keyof Resource["openness"];
type OpennessState = Resource["openness"][Dimension]["value"];
export type Facet = { value: string; count: number };
export type CatalogOverview = {
  count: number;
  lastVerified: { from: string; through: string };
  facets: Record<"kind" | "stage" | "access" | "lifecycle", Facet[]>;
  openness: Record<Dimension, Record<OpennessState, number>>;
};
export type LabPage = {
  slug: string;
  locale: "en" | "zh-cn";
  title: string;
  description: string;
};

const compare = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

function facets(
  resources: readonly Resource[],
  values: (resource: Resource) => string[],
): Facet[] {
  const counts = new Map<string, number>();
  for (const resource of resources) {
    for (const value of new Set(values(resource))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort(([left], [right]) => compare(left, right))
    .map(([value, count]) => ({ value, count }));
}

export function buildCatalogOverview(
  resources: readonly Resource[],
): CatalogOverview {
  if (
    !resources.length ||
    new Set(resources.map(({ id }) => id)).size !== resources.length
  ) {
    throw new Error(
      "Catalog overview requires a nonempty catalogue with unique resource IDs",
    );
  }
  const dates = resources
    .map(({ last_verified }) => last_verified)
    .sort(compare);
  const dimensions = Object.keys(resources[0].openness).sort(
    compare,
  ) as Dimension[];
  const openness = Object.fromEntries(
    dimensions.map((dimension) => {
      const counts: Record<OpennessState, number> = {
        available: 0,
        not_available: 0,
        not_applicable: 0,
        unverified: 0,
      };
      for (const resource of resources)
        counts[resource.openness[dimension].value] += 1;
      return [dimension, counts];
    }),
  ) as CatalogOverview["openness"];
  return {
    count: resources.length,
    lastVerified: { from: dates[0], through: dates[dates.length - 1] },
    facets: {
      kind: facets(resources, ({ kind }) => [kind]),
      stage: facets(resources, ({ stages }) => stages),
      access: facets(resources, ({ access_level }) => [access_level.value]),
      lifecycle: facets(resources, ({ status }) => [status.value]),
    },
    openness,
  };
}

export function parseLabPage(
  source: string,
  slug: string,
  locale: LabPage["locale"],
): LabPage {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  const metadata = frontmatter ? parse(frontmatter[1]) : null;
  if (
    !metadata ||
    typeof metadata.title !== "string" ||
    !metadata.title.trim() ||
    (metadata.description !== undefined &&
      typeof metadata.description !== "string")
  ) {
    throw new Error(
      `Lab page ${locale}/${slug} requires title/description frontmatter`,
    );
  }
  return {
    slug,
    locale,
    title: metadata.title,
    description: metadata.description ?? "",
  };
}

export function buildSiteOverview(
  resources: readonly Resource[],
  curriculum: Curriculum,
  labPages: readonly LabPage[],
) {
  const pages = new Map<string, LabPage>();
  for (const page of labPages) {
    const id = `${page.locale}/${page.slug}`;
    if (pages.has(id)) throw new Error(`Duplicate lab page: ${id}`);
    pages.set(id, page);
  }
  const slugs = [...new Set(labPages.map(({ slug }) => slug))].sort(compare);
  if (!slugs.length)
    throw new Error("Lab overview requires published guide pages");
  const paired = slugs.map((slug) => {
    const en = pages.get(`en/${slug}`);
    const zh = pages.get(`zh-cn/${slug}`);
    if (!en || !zh)
      throw new Error(
        `Lab page ${slug} requires both English and Chinese sources`,
      );
    return {
      slug,
      title: en.title,
      description: en.description,
      href: `/labs/${slug}/`,
      titleZh: zh.title,
      descriptionZh: zh.description,
      hrefZh: `/zh-cn/labs/${slug}/`,
    };
  });
  const guides = paired.filter(({ slug }) => slug !== "notebook-guide");
  const tracks = [...curriculum.tracks]
    .sort(
      (left, right) => left.order - right.order || compare(left.id, right.id),
    )
    .map((track) => {
      const chapters = track.lessons
        .filter(({ type }) => type !== "core-source-path")
        .toSorted(
          (left, right) =>
            left.order - right.order || compare(left.id, right.id),
        );
      if (!chapters.length)
        throw new Error(`Track ${track.id} has no delivered teaching chapter`);
      return {
        id: track.id,
        title: track.title,
        titleZh: track.title_zh,
        summary: track.summary,
        summaryZh: track.summary_zh,
        entryHref: `/learn/${track.id}/${chapters[0].id}/`,
        chapterCount: chapters.length,
      };
    });
  return {
    catalog: buildCatalogOverview(resources),
    curriculum: {
      trackCount: curriculum.tracks.length,
      unitCount: (curriculum.units ?? []).length,
      lessonCount: curriculum.tracks.reduce(
        (total, track) => total + track.lessons.length,
        0,
      ),
      chapterCount: tracks.reduce(
        (total, track) => total + track.chapterCount,
        0,
      ),
      learningPathCount: (curriculum.learning_paths ?? []).length,
      tracks,
    },
    labs: {
      guideCount: guides.length,
      pageCount: paired.length,
      guides,
      sharedPages: paired.filter(({ slug }) => slug === "notebook-guide"),
    },
  };
}

export type SiteOverview = ReturnType<typeof buildSiteOverview>;
