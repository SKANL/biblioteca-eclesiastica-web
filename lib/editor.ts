/** Pure helpers for the editor's book management (contract: API PATCH /books/{id}). */

const TEXT_FIELDS = ["subtitulo", "autor", "autor_normalizado", "editorial", "genero", "tradicion", "isbn", "descripcion"] as const;

export const EDITABLE_FIELDS = ["titulo", ...TEXT_FIELDS, "anio_publicacion", "idioma", "temas"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/**
 * Form values → PATCH body. Only fields present in the form are sent; an
 * empty optional field clears it (null). `titulo`/`idioma` are required,
 * `temas` is comma-separated.
 */
export function parseBookPatch(form: { get(name: string): unknown; has(name: string): boolean }): {
  errors: Partial<Record<EditableField, string>>;
  patch: Record<string, string | number | string[] | null>;
} {
  const errors: Partial<Record<EditableField, string>> = {};
  const patch: Record<string, string | number | string[] | null> = {};
  const value = (name: string) => String(form.get(name) ?? "").trim();

  if (form.has("titulo")) {
    if (value("titulo")) patch.titulo = value("titulo");
    else errors.titulo = "El título es obligatorio.";
  }
  for (const name of TEXT_FIELDS) if (form.has(name)) patch[name] = value(name) || null;
  if (form.has("anio_publicacion")) {
    const anio = value("anio_publicacion");
    if (!anio) patch.anio_publicacion = null;
    else if (/^\d{1,4}$/.test(anio) && Number(anio) <= 3000) patch.anio_publicacion = Number(anio);
    else errors.anio_publicacion = "El año debe ser un número entre 0 y 3000.";
  }
  if (form.has("idioma")) {
    if (/^.{2,10}$/.test(value("idioma"))) patch.idioma = value("idioma");
    else errors.idioma = "El idioma debe tener entre 2 y 10 caracteres (p. ej. es).";
  }
  if (form.has("temas")) patch.temas = value("temas").split(",").map((t) => t.trim()).filter(Boolean);
  return { errors, patch };
}
