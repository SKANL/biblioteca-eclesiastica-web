"use server";

import { apiFetchAsSignedIn } from "@/auth";
import { apiErrorMessage, type ActionResult, type Job, type UploadCreated } from "@/lib/upload";

export interface ArchivoDeclarado {
  nombre: string;
  tipo_contenido: string;
  tamano: number;
  sha256: string;
}

/** Calls the API server-side (token never reaches the browser) and maps errors to Spanish. */
async function call<T>(path: string, init?: RequestInit): Promise<ActionResult<T>> {
  let res: Response | null;
  try {
    res = await apiFetchAsSignedIn(path, { signal: AbortSignal.timeout(15_000), ...init });
  } catch (err) {
    console.error(`API ${path} failed:`, err);
    return { ok: false, status: 0, error: apiErrorMessage(0) };
  }
  if (!res) return { ok: false, status: 401, error: apiErrorMessage(401) };
  if (res.ok) return { ok: true, data: (await res.json()) as T };
  const body = await res.json().catch(() => null);
  const detail = typeof body?.detail === "string" ? body.detail : null;
  return {
    ok: false,
    status: res.status,
    error: apiErrorMessage(res.status, detail, res.headers.get("Retry-After")),
  };
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function crearSubida(
  archivos: ArchivoDeclarado[],
  metadatos: Record<string, string | number>,
): Promise<ActionResult<UploadCreated>> {
  return call<UploadCreated>("/api/v1/uploads", json({ archivos, metadatos }));
}

export async function completarSubida(
  id: string,
): Promise<ActionResult<{ trabajo_id: string; estado: string }>> {
  return call(`/api/v1/uploads/${encodeURIComponent(id)}/completar`, { method: "POST" });
}

export async function estadoTrabajo(id: string): Promise<ActionResult<Job>> {
  return call<Job>(`/api/v1/trabajos/${encodeURIComponent(id)}`);
}
