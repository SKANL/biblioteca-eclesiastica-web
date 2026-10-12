import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editarLibro, eliminarLibro, reprocesarLibro } from "@/app/(sitio)/editor/actions";
import ActionForm from "@/components/ActionForm";
import ErrorNotice from "@/components/ErrorNotice";
import { ApiError, getBook } from "@/lib/api";
import type { BookDetail, Metadatos } from "@/lib/types";
import { btnOutline, btnPrimary, inputBase, labelBase } from "@/lib/ui";

export const metadata: Metadata = { title: "Editar libro" };

const FIELDS: [keyof Metadatos, string, Record<string, string>?][] = [
  ["titulo", "Título (obligatorio)", { required: "" }],
  ["subtitulo", "Subtítulo"],
  ["autor", "Autor"],
  ["autor_normalizado", "Autor normalizado"],
  ["editorial", "Editorial"],
  ["anio_publicacion", "Año de publicación", { inputMode: "numeric" }],
  ["idioma", "Idioma (código, p. ej. es)", { required: "" }],
  ["genero", "Género"],
  ["tradicion", "Tradición"],
  ["isbn", "ISBN"],
  ["temas", "Temas (separados por comas)"],
];

export default async function EditarLibroPage(props: PageProps<"/editor/libros/[libroId]">) {
  const { libroId } = await props.params;
  let book: BookDetail;
  try {
    book = await getBook(libroId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <ErrorNotice message={error instanceof ApiError ? error.message : "No se pudo cargar el libro."} />
      </main>
    );
  }
  const m = book.metadatos;
  const value = (k: keyof Metadatos) => {
    const v = m[k];
    return Array.isArray(v) ? v.join(", ") : String(v ?? "");
  };

  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <p className="text-sm">
        <Link href="/editor/libros" className="underline">
          Gestionar libros
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-tight text-ink">{m.titulo}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        <Link href={`/libro/${encodeURIComponent(libroId)}`} className="underline">
          Ver en la biblioteca
        </Link>
      </p>

      <h2 className="mt-8 font-serif text-xl text-ink">Metadatos</h2>
      <ActionForm action={editarLibro.bind(null, libroId)} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([name, label, extra]) => (
            <div key={name}>
              <label htmlFor={`b-${name}`} className={labelBase}>
                {label}
              </label>
              <input id={`b-${name}`} name={name} defaultValue={value(name)} className={`${inputBase} mt-1`} {...extra} />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="b-descripcion" className={labelBase}>
            Descripción
          </label>
          <textarea
            id="b-descripcion"
            name="descripcion"
            rows={4}
            defaultValue={value("descripcion")}
            className={`${inputBase} mt-1`}
          />
        </div>
        <button type="submit" className={btnPrimary}>
          Guardar cambios
        </button>
      </ActionForm>

      <h2 className="mt-10 font-serif text-xl text-ink">Acciones</h2>
      <div className="mt-4 flex flex-wrap items-start gap-6">
        <ActionForm
          action={reprocesarLibro.bind(null, libroId)}
          className="space-y-2"
          confirmText="¿Volver a procesar el libro desde sus archivos originales?"
        >
          <button type="submit" className={btnOutline}>
            Volver a procesar
          </button>
        </ActionForm>
        <ActionForm
          action={eliminarLibro.bind(null, libroId)}
          className="space-y-2"
          confirmText={`¿Eliminar «${m.titulo}» con todas sus páginas e imágenes? No se puede deshacer.`}
        >
          <button type="submit" className={`${btnOutline} text-red-700`}>
            Eliminar libro
          </button>
        </ActionForm>
      </div>
    </main>
  );
}
