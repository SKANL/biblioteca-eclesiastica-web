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
 * Render an API snippet (already HTML-escaped by the API, with `<mark>` around
 * terms) without trusting it: keep only exact `<mark>`/`</mark>` and the
 * entities the API emits; escape every other `<`, `>` and `&`.
 */
export function snippetToSafeHtml(snippet: string): string {
  return snippet.replace(/<\/?mark>|&(?:amp|lt|gt|quot|#x27|#39);|[<>&]/g, (m) =>
    m.length > 1 ? m : m === "<" ? "&lt;" : m === ">" ? "&gt;" : "&amp;",
  );
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

const MOTORS: Record<string, string> = {
  mistral: "Texto por OCR (Mistral)",
  pypdfium2: "Texto nativo del PDF",
  opendataloader: "Texto del PDF (OpenDataLoader)",
  texto: "Texto original",
};

/** Honest label for the page's text source (`motor` from `/ref`). */
export function motorLabel(motor: string | null | undefined): string | null {
  if (!motor) return null;
  return MOTORS[motor] ?? `Motor: ${motor}`;
}
