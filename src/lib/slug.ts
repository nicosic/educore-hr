const MAP: Record<string, string> = { č: "c", ć: "c", đ: "d", š: "s", ž: "z", dž: "dz" };

/** „Kako ostati stabilan?” → „kako-ostati-stabilan” */
export function slugify(input: string, max = 80): string {
  return input
    .toLowerCase()
    .replace(/dž|[čćđšž]/g, (c) => MAP[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export function isSlug(s: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 80;
}
