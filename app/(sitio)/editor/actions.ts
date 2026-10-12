"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetchAsSignedIn } from "@/auth";
import { parseBookPatch } from "@/lib/editor";
import { apiErrorMessage, type ActionResult, type Job, type UploadCreated } from "@/lib/upload";

export interface ArchivoDeclarado {
  nombre: string;
  tipo_contenido: string;
  tamano: number;
  sha256: string;
  titulo?: string;
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
  if (res.ok) return { ok: true, data: (res.status === 204 ? null : await res.json()) as T };
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

export async function misTrabajos(): Promise<ActionResult<Job[]>> {
  return call<Job[]>("/api/v1/trabajos?limit=20");
}

export async function estadoTrabajo(id: string): Promise<ActionResult<Job>> {
  return call<Job>(`/api/v1/trabajos/${encodeURIComponent(id)}`);
}

/** Result shown by `ActionForm` (useActionState). */
export type FormState = { ok?: string; error?: string } | null;

/** Public pages that show a book's metadata or pages. */
function revalidateBook(libroId: string) {
  revalidatePath(`/libro/${encodeURIComponent(libroId)}`, "layout");
  revalidatePath("/biblioteca");
  revalidatePath("/buscar");
  revalidatePath("/editor/libros");
}

const bookPath = (libroId: string) => `/api/v1/books/${encodeURIComponent(libroId)}`;

export async function editarLibro(libroId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { errors, patch } = parseBookPatch(form);
  const invalid = Object.values(errors)[0];
  if (invalid) return { error: invalid };
  const res = await call(bookPath(libroId), { ...json(patch), method: "PATCH" });
  if (!res.ok) return { error: res.error };
  revalidateBook(libroId);
  return { ok: "Cambios guardados." };
}

export async function eliminarLibro(libroId: string): Promise<FormState> {
  const res = await call(bookPath(libroId), { method: "DELETE" });
  if (!res.ok) return { error: res.error };
  revalidateBook(libroId);
  redirect("/editor/libros");
}

export async function reprocesarLibro(libroId: string): Promise<FormState> {
  const res = await call<{ trabajo_id: string }>(`${bookPath(libroId)}/reprocesar`, { method: "POST" });
  if (!res.ok) return { error: res.error };
  revalidateBook(libroId);
  redirect(`/editor/trabajos/${encodeURIComponent(res.data.trabajo_id)}`);
}

export async function guardarEditor(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const rol = form.get("rol") === "admin" ? "admin" : "editor";
  if (!email) return { error: "Escribe un email." };
  const res = await call("/api/v1/editores", json({ email, rol }));
  if (!res.ok) return { error: res.error };
  revalidatePath("/editor/editores");
  return { ok: `${email} guardado como ${rol}.` };
}

export async function quitarEditor(email: string): Promise<FormState> {
  const res = await call(`/api/v1/editores/${encodeURIComponent(email)}`, { method: "DELETE" });
  if (!res.ok) return { error: res.error };
  revalidatePath("/editor/editores");
  return { ok: `${email} quitado.` };
}
