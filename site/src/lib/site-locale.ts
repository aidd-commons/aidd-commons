import { withoutSiteBase } from "./site-paths.js";

/** Localized interface routes. Downloads and unrevised report editions keep their source URLs. */
export function localizedPath(path: string, chinese: boolean): string {
  const match = path.match(/^([^?#]*)(.*)$/u)!;
  const pathname = match[1].replace(/^\/zh-cn(?=\/|$)/u, "") || "/";
  const suffix = match[2];
  const translated = pathname === "/" || /^\/(learn|labs|search|atlas)(\/|$)/u.test(pathname) ||
    /^\/(audit|contribute)\/?$/u.test(pathname) || /^\/report\/(figures\/)?$/u.test(pathname);
  // These authored Atlas essays retain their canonical English source.
  const sourceEssay = /^\/atlas\/(target-to-candidate-map|open-cofolding-frontier)\/?$/u.test(pathname);
  return `${chinese && translated && !sourceEssay ? "/zh-cn" : ""}${pathname}${suffix}`;
}

export function languageAlternate(path: string, base: string, chinese: boolean): string {
  const clean = withoutSiteBase(path, base);
  const target = localizedPath(clean, !chinese);
  if (!chinese && target === clean && clean.startsWith("/report/")) return "/zh-cn/report/";
  if (!chinese && target === clean && clean.startsWith("/atlas/")) return "/zh-cn/atlas/";
  return target;
}
