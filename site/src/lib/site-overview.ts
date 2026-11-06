/// <reference types="astro/client" />
/** Build-time viewmodel from validated catalogue exports and canonical teaching sources. */
import { parse } from "yaml";
import type { Resource } from "../../../catalog/schema/resource.js";
import type { Curriculum } from "../../../scripts/curriculum/curriculum.js";
import {
  buildSiteOverview,
  parseLabPage,
} from "../../../scripts/catalog/overview.js";
import curriculumSource from "../../../catalog/curriculum/tracks.yaml?raw";
import resourceData from "../../public/data/resources.v1.json" with { type: "json" };

const sources = import.meta.glob<string>(
  ["../content/docs/labs/**/*.mdx", "../content/docs/zh-cn/labs/**/*.mdx"],
  { eager: true, query: "?raw", import: "default" },
);

const labPages = Object.entries(sources).map(([path, source]) => {
  const chinese = path.includes("/zh-cn/");
  const slug = path.split("/labs/")[1].replace(/\.mdx$/u, "");
  return parseLabPage(source, slug, chinese ? "zh-cn" : "en");
});

export const catalogResources = resourceData as Resource[];
export const siteOverview = buildSiteOverview(
  catalogResources,
  parse(curriculumSource) as Curriculum,
  labPages,
);
export type {
  CatalogOverview,
  Facet,
  SiteOverview,
} from "../../../scripts/catalog/overview.js";
