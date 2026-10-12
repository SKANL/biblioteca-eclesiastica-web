/**
 * Pure helpers for the editor upload flow (browser + server safe, no deps).
 * Contract: pipeline-OCR docs/API.md "Subidas firmadas y trabajos".
 */

export type JobState =
  | "esperando_subida"
  | "pendiente"
  | "procesando"
  | "completado"
  | "fallido";

export interface Job {
  id: string;
  estado: JobState;
  progreso: { paginas_hechas: number; paginas_total: number | null } | null;
  error: string | null;
  libro_id: string | null;
}

export interface PresignedFile {
  nombre: string;
  url: string;
  metodo: "PUT";
  encabezados: Record<string, string>;
}

export interface UploadCreated {
  id: string;
  libro_id: string;
  existente: boolean;
  archivos: PresignedFile[];
}

/** Hex sha256 of a file. ponytail: crypto.subtle has no streaming digest, so the
 * whole file is read into memory; fine for books up to the API's MAX_FILE_BYTES. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const copy = [...items];
  if (to < 0 || to >= copy.length || from < 0 || from >= copy.length) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export interface MetadataInput {
  titulo?: string;
  autor?: string;
  genero?: string;
  anio?: string;
}

export function validateMetadata(input: MetadataInput): {
  errors: Partial<Record<keyof MetadataInput, string>>;
  metadatos: Record<string, string | number>;
} {
  const errors: Partial<Record<keyof MetadataInput, string>> = {};
  const metadatos: Record<string, string | number> = {};
  const titulo = input.titulo?.trim() ?? "";
  if (!titulo) errors.titulo = "El título es obligatorio.";
  else metadatos.titulo = titulo;
  const autor = input.autor?.trim();
  if (autor) metadatos.autor = autor;
  const genero = input.genero?.trim();
  if (genero) metadatos.genero = genero;
  const anio = input.anio?.trim();
  if (anio) {
    const n = Number(anio);
    if (!/^\d{1,4}$/.test(anio) || n > new Date().getFullYear()) {
      errors.anio = "El año debe ser un número de hasta 4 cifras, no futuro.";
    } else metadatos.anio_publicacion = n;
  }
  return { errors, metadatos };
}

/** Network failure (status 0) or server error: worth retrying. */
export function shouldRetry(status: number): boolean {
  return status === 0 || status >= 500;
}

/** Exponential backoff (500 ms base, 8 s cap) plus up to 100% random jitter. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(8000, 500 * 2 ** attempt);
  return Math.floor(base * (1 + random()));
}

export function nextPollDelay(previous: number | undefined): number {
  return previous ? Math.min(10_000, previous * 2) : 1000;
}

export function isTerminal(estado: string): boolean {
  return estado === "completado" || estado === "fallido";
}

/** Spanish message for an API error status; `detail` is the API's public text. */
export function apiErrorMessage(
  status: number,
  detail?: string | null,
  retryAfter?: string | null,
): string {
  switch (status) {
    case 0:
      return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
    case 401:
      return "Tu sesión venció o no es válida. Vuelve a iniciar sesión.";
    case 403:
      return "Tu cuenta no tiene permisos de editor.";
    case 404:
      return detail || "No se encontró el recurso.";
    case 409:
    case 413:
    case 422:
      return detail || "Los archivos o datos enviados no son válidos.";
    case 429:
      return `Demasiadas solicitudes. Espera ${retryAfter || "unos"} s e inténtalo de nuevo.`;
    case 501:
      return "El almacenamiento para subidas no está configurado en el servidor.";
    default:
      return `El servidor respondió con un error (${status}).`;
  }
}
