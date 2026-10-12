import { literalRanges, markRanges } from "./reader-matches";

/** First value of a possibly-array search param. */
export function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Extract the page number from a page ref like `slug/pagina/12`. */
export function numeroFromRef(ref: string | null | undefined): number | null {
  if (!ref) return null;
  const match = ref.match(/\/pagina\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

/**
 * Render an API snippet that contains `<mark>` tags without trusting any other
 * markup: escape everything, then re-enable only `<mark>` / `</mark>`.
 */
export function snippetToSafeHtml(snippet: string): string {
  return escapeHtml(snippet)
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Resalta en el texto de la página las apariciones de los términos buscados
 * (insensible a mayúsculas y diacríticos), devolviendo HTML seguro con `<mark>`.
 * Es la garantía de que SIEMPRE se ve el pasaje, aunque no haya imagen ni bbox.
 */
export function highlightText(texto: string, query: string): string {
  return markRanges(texto, literalRanges(texto, query));
}

/** Split page text into paragraphs for comfortable reading. */
export function toParagraphs(texto: string): string[] {
  return texto
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+\n/g, "\n").trim())
    .filter((block) => block.length > 0);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("es").format(n);
}

/** Etiqueta de conteo con plural en español: "1 libro" / "3 libros". */
export function countLabel(n: number, singular: string, plural: string): string {
  return `${formatCount(n)} ${n === 1 ? singular : plural}`;
}

/** Constrain a page param to an integer >= 1. */
export function toPage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
