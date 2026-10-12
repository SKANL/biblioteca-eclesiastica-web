/** Pure, user-facing view of an upload job (no deps; tested in tests/tools/test-upload-steps.mjs). */

export type Etapa =
  | "subiendo"
  | "en_espera"
  | "leyendo_paginas"
  | "preparando_busqueda"
  | "disponible"
  | "fallido";

export interface StepJob {
  etapa: Etapa;
  progreso: { paginas_hechas: number; paginas_total: number | null } | null;
  libro_id: string | null;
  error: string | null;
  creado_en?: string;
}

export type StepState = "done" | "current" | "pending" | "failed";

export interface Step {
  label: string;
  state: StepState;
  detail?: string;
}

const ORDER = ["subiendo", "en_espera", "leyendo_paginas", "preparando_busqueda", "disponible"] as const;
const LABELS = ["Subiendo archivo", "En espera", "Leyendo páginas", "Preparando la búsqueda", "Disponible para leer"];

/** "Suma_teologica-1.pdf" -> "Suma teologica 1". */
export function defaultTitle(fileName: string): string {
  return fileName.trim().replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

/** PDF/TXT selections become one book per file; photos become one book. */
export function splitsIntoBooks(types: readonly string[]): boolean {
  return types.length > 0 && types.every((t) => !t.startsWith("image/"));
}

/**
 * Steps for a job. `job === null` means the files are still going up from the
 * browser (`upload` = 0..1). ponytail: the API reports only `fallido`, so the
 * failed step is inferred from progress (all pages read -> search step).
 */
export function stepsFor(job: StepJob | null, upload?: number, stalled = false): Step[] {
  const p = job?.progreso;
  let at: number = job ? ORDER.indexOf(job.etapa as (typeof ORDER)[number]) : 0;
  const failed = job?.etapa === "fallido" || stalled;
  if (job?.etapa === "fallido") at = p?.paginas_total && p.paginas_hechas >= p.paginas_total ? 3 : 2;
  const allDone = job?.etapa === "disponible";
  return LABELS.map((label, i) => {
    const state: StepState =
      allDone || i < at ? "done" : i === at ? (failed ? "failed" : "current") : "pending";
    const step: Step = { label, state };
    if (i === 0 && state === "current" && upload !== undefined) step.detail = `${Math.round(upload * 100)} %`;
    if (i === 2 && p?.paginas_total && state !== "pending") step.detail = `${p.paginas_hechas} de ${p.paginas_total}`;
    return step;
  });
}

/**
 * Minutes left while reading pages, from the rate observed between two samples
 * (ms timestamps). Null until >=3 pages are done and some progress was seen.
 */
export function minutesLeft(
  first: { at: number; done: number },
  now: { at: number; done: number; total: number },
): number | null {
  const pages = now.done - first.done;
  const ms = now.at - first.at;
  if (now.done < 3 || pages <= 0 || ms <= 0 || now.done >= now.total) return null;
  return Math.max(1, Math.ceil(((now.total - now.done) * ms) / pages / 60_000));
}

/** Minutes without the files arriving before an upload counts as interrupted. */
export const STALLED_UPLOAD_MINUTES = 15;

/**
 * True when the browser upload never finished (tab closed, network lost): the
 * job is still waiting for its files long after it was created.
 */
export function uploadStalled(job: StepJob | null, now: number): boolean {
  if (job?.etapa !== "subiendo" || !job.creado_en) return false;
  const created = Date.parse(job.creado_en);
  return Number.isFinite(created) && now - created > STALLED_UPLOAD_MINUTES * 60_000;
}
