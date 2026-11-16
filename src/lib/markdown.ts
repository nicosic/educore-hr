/**
 * Minimalni Markdown za opise događaja: odlomci, liste („- ”), **podebljano**, *kurziv*, ## podnaslovi.
 * Sav ulaz se najprije escapea, pa admin ne može ubaciti HTML.
 */
export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
}

export function renderMarkdown(src: string | null | undefined): string {
  if (!src) return "";
  const blocks = src.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      const h = /^(#{2,3})\s+(.+)$/.exec(block);
      if (h && lines.length === 1) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("\n");
}
