/** Build-time projections. Browser search imports the separate pure search module. */
import data from "../../public/data/workbench.v1.json" with { type: "json" };
import index from "../../public/data/search.v1.json" with { type: "json" };
import { rankSearchEntries } from "../../../scripts/workbench/search.js";
import type {
  WorkbenchData,
  SearchIndex,
} from "../../../scripts/workbench/types.js";

export const workbenchData = data as WorkbenchData;
export const searchIndex = index as SearchIndex;
export const searchWorkbench = (
  query: string,
  options: Parameters<typeof rankSearchEntries>[2],
) => rankSearchEntries(searchIndex.entries, query, options);
export { rankSearchEntries };
export type {
  Locale,
  SearchEntry,
  SearchResult,
  SearchType,
  SourceAnchor,
  WorkbenchData,
  WorkbenchCase,
  WorkbenchObject,
  WorkbenchRelation,
  WorkbenchRoute,
  WorkbenchTrack,
  WorkbenchView,
} from "../../../scripts/workbench/types.js";
