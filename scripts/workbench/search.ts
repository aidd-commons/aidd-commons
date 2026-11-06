import type { Locale, SearchEntry, SearchResult, SearchType } from "./types.js";

export type { SearchEntry, SearchResult, SearchType } from "./types.js";

const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/gu, " ").trim();
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Deterministic lexical search; no network, model, generated scores or JSON imports. */
export function rankSearchEntries(
  entries: readonly SearchEntry[],
  query: string,
  options: {
    locale: Locale;
    types?: readonly SearchType[];
    trackId?: string;
    limit?: number;
  },
): SearchResult[] {
  const text = normalize(query);
  const terms = text.split(/\s+/u).filter(Boolean);
  const found: SearchResult[] = [];
  for (const entry of entries) {
    if (
      entry.locale !== options.locale ||
      (options.types?.length && !options.types.includes(entry.type)) ||
      (options.trackId && !entry.trackIds.includes(options.trackId))
    )
      continue;
    const title = normalize(entry.title);
    const keywords = entry.keywords.map(normalize);
    const identifier = normalize(entry.objectId.split(":").slice(1).join(":"));
    const summary = normalize(entry.summary);
    const haystack = [title, identifier, ...keywords, summary].join("\n");
    if (!terms.every((term) => haystack.includes(term))) continue;
    let score = 0;
    if (text) {
      if (identifier === text) score += 120;
      if (title === text) score += 100;
      if (keywords.includes(text)) score += 80;
      if (title.startsWith(text)) score += 40;
      if (title.includes(text)) score += 20;
      score += terms.filter((term) => title.includes(term)).length * 5;
    }
    found.push({ ...entry, score });
  }
  return found
    .sort(
      (a, b) =>
        b.score - a.score ||
        compare(normalize(a.title), normalize(b.title)) ||
        compare(a.id, b.id),
    )
    .slice(
      0,
      options.limit === undefined ? found.length : Math.max(0, options.limit),
    );
}
