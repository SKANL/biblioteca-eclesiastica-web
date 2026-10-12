import type { TextMatch } from "./types";

/** API offsets count Unicode code points, not JavaScript UTF-16 code units. */
export function markRanges(text: string, matches: Pick<TextMatch, "inicio" | "fin">[], active = 0): string {
  const chars = Array.from(text);
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const out: string[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (!Number.isInteger(match.inicio) || !Number.isInteger(match.fin) || match.inicio < cursor || match.fin <= match.inicio || match.fin > chars.length) return;
    out.push(escape(chars.slice(cursor, match.inicio).join("")));
    out.push(`<mark id="coincidencia-${index}"${index === active ? ' aria-current="true"' : ""}>${escape(chars.slice(match.inicio, match.fin).join(""))}</mark>`);
    cursor = match.fin;
  });
  out.push(escape(chars.slice(cursor).join("")));
  return out.join("");
}

export function matchIndex(value: string | null | undefined, count: number) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < count ? index : 0;
}
