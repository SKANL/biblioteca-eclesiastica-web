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

/** Literal terms (OR), quoted phrases, accent/ligature folding; legacy API only. */
export function literalRanges(text: string, query: string): Pick<TextMatch, "inicio" | "fin">[] {
  const normalized: string[] = [];
  const offsets: [number, number][] = [];
  Array.from(text).forEach((char, index) => {
    const value = char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "");
    if (!value && offsets.length) offsets[offsets.length - 1][1] = index + 1;
    for (let c of value) {
      if (/\s/u.test(c)) c = " ";
      if (c === " " && normalized.at(-1) === " ") offsets[offsets.length - 1][1] = index + 1;
      else { normalized.push(c); offsets.push([index, index + 1]); }
    }
  });
  const units = [...query.slice(0, 500).matchAll(/"([^"\n]+)"|([^\s"]+)/g)].map(match =>
    Array.from(match[1] || match[2]).map(char => char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")).join("").replace(/\s+/gu, " ").trim()).filter(Boolean);
  const terms = [...new Set(units)].slice(0, 32).sort((a, b) => Array.from(b).length - Array.from(a).length).map(term => Array.from(term));
  const found: Pick<TextMatch, "inicio" | "fin">[] = [];
  for (let index = 0; index < normalized.length && found.length < 100;) {
    const hit = terms.find(term => term.every((char, offset) => normalized[index + offset] === char));
    if (!hit) { index++; continue; }
    const span = { inicio: offsets[index][0], fin: offsets[index + hit.length - 1][1] };
    if (found.at(-1)?.inicio !== span.inicio || found.at(-1)?.fin !== span.fin) found.push(span);
    index += hit.length;
  }
  return found;
}
