import type { Metadata } from "next";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import ErrorNotice from "@/components/ErrorNotice";
import Pagination from "@/components/Pagination";
import { ApiError, getBooks } from "@/lib/api";
import type { BookListResponse } from "@/lib/types";
import { btnOutline, card } from "@/lib/ui";
import { countLabel, firstValue, toPage } from "@/lib/utils";

const LIMIT = 20;

export const metadata: Metadata = { title: "Gestionar libros" };

export default async function EditorLibrosPage(props: PageProps<"/editor/libros">) {
  const page = toPage(firstValue((await props.searchParams).pagina));
  let books: BookListResponse | null = null;
  let errorMessage: string | null = null;
  try {
    books = await getBooks({ limit: LIMIT, offset: (page - 1) * LIMIT });
  } catch (error) {
    errorMessage = error instanceof ApiError ? error.message : "No se pudo cargar el catálogo.";
  }

  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl leading-tight text-ink">Gestionar libros</h1>
      <div className="mt-6">
        {errorMessage && <ErrorNotice message={errorMessage} />}
        {books && books.resultados.length === 0 && (
          <EmptyState title="Sin libros" message={books.total ? "Esta página no tiene libros." : "Todavía no hay libros."}>
            <Link href={books.total ? "/editor/libros" : "/editor/subir"} className={btnOutline}>
              {books.total ? "Ir a la primera página" : "Subir un libro"}
            </Link>
          </EmptyState>
        )}
        {books && books.resultados.length > 0 && (
          <>
            <p className="text-sm text-ink-soft">{countLabel(books.total, "libro", "libros")}.</p>
            <ul className="mt-2 space-y-2">
              {books.resultados.map((book) => (
                <li key={book.libro_id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{book.metadatos.titulo}</p>
                    <p className="text-sm text-ink-soft">
                      {book.metadatos.autor ?? "Autor no disponible"} · {countLabel(book.conteo_paginas, "página", "páginas")}
                    </p>
                  </div>
                  <Link
                    href={`/editor/libros/${encodeURIComponent(book.libro_id)}`}
                    className={btnOutline}
                    aria-label={`Gestionar ${book.metadatos.titulo}`}
                  >
                    Gestionar
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination basePath="/editor/libros" params={{}} page={page} limit={LIMIT} total={books.total} />
          </>
        )}
      </div>
    </main>
  );
}
