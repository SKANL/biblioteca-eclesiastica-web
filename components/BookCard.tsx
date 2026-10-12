import Link from "next/link";
import type { BookSummary } from "@/lib/types";
import { formatCount } from "@/lib/utils";

export default function BookCard({ book }: { book: BookSummary }) {
  const meta = book.metadatos;
  const href = `/libro/${encodeURIComponent(book.libro_id)}`;

  return (
    <article className="border-b border-line py-6">
      <h3 className="font-serif text-xl leading-snug text-ink">
        <Link href={href} className="rounded-md hover:text-accent hover:underline">
          {meta.titulo}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        {meta.autor ?? "Autor no disponible"}
        {meta.anio_publicacion ? ` · ${meta.anio_publicacion}` : ""}
      </p>
      {meta.descripcion && (
        <p className="mt-2 leading-relaxed text-ink-soft">{meta.descripcion}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
        {meta.genero && (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent">
            {meta.genero}
          </span>
        )}
        <span>{formatCount(book.conteo_paginas)} páginas</span>
        <span>{formatCount(book.conteo_palabras_total)} palabras</span>
      </div>
    </article>
  );
}
