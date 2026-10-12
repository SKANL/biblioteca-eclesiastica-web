import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import ContinueReading from "@/components/ContinueReading";
import { ApiError, getBook, getBookPages } from "@/lib/api";
import type { BookDetail, PageListResponse } from "@/lib/types";
import { firstValue, formatCount, toPage } from "@/lib/utils";
import { btnOutline, btnPrimarySm } from "@/lib/ui";

const PAGE_LIMIT = 60;

type BookProps = PageProps<"/libro/[libroId]">;

export async function generateMetadata(props: BookProps): Promise<Metadata> {
  const { libroId } = await props.params;
  try {
    const book = await getBook(libroId);
    return { title: book.metadatos.titulo };
  } catch {
    return { title: "Libro" };
  }
}

export default async function BookPage(props: BookProps) {
  const { libroId } = await props.params;
  const sp = await props.searchParams;
  const page = toPage(firstValue(sp.pagina));

  let book: BookDetail;
  let pages: PageListResponse;
  let firstPageNumber: number | undefined;
  try {
    const [loadedBook, loadedPages] = await Promise.all([
      getBook(libroId),
      getBookPages(libroId, {
        limit: PAGE_LIMIT,
        offset: (page - 1) * PAGE_LIMIT,
      }),
    ]);
    book = loadedBook;
    pages = loadedPages;
    const firstPages = page === 1
      ? loadedPages
      : await getBookPages(libroId, { limit: 1, offset: 0 });
    firstPageNumber = firstPages.resultados[0]?.numero;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const meta = book.metadatos;
  const info = [meta.editorial, meta.anio_publicacion, meta.genero].filter(
    (value): value is string | number => value != null && value !== "",
  );

  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="mb-8">
          <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
            {meta.titulo}
          </h1>
          {meta.autor && <p className="mt-1 text-ink-soft">{meta.autor}</p>}
          <p className="mt-3 text-sm text-ink-faint">
            {info.length > 0 && (
              <>
                {info.join(" · ")}
                <span aria-hidden="true" className="mx-2 text-line-strong">
                  |
                </span>
              </>
            )}
            {formatCount(book.conteo_paginas)} páginas ·{" "}
            {formatCount(book.conteo_palabras_total)} palabras
          </p>
          {meta.descripcion && (
            <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">
              {meta.descripcion}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {firstPageNumber != null && <Link
              href={`/libro/${encodeURIComponent(libroId)}/pagina/${firstPageNumber}`}
              className={btnPrimarySm}
            >
              Empezar a leer
            </Link>}
            <ContinueReading libroId={libroId} />
            {/* ponytail: the API has no title filter; this is a full-text search for the title words. */}
            <Link
              href={`/buscar?q=${encodeURIComponent(meta.titulo)}`}
              className={btnOutline}
            >
              Buscar el título en los textos
            </Link>
          </div>
        </header>

        {book.capitulos.length > 0 && (
          <section className="mb-10" aria-labelledby="capitulos-title">
            <h2 id="capitulos-title" className="font-serif text-xl text-ink">
              Capítulos
            </h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {book.capitulos.map((cap) => (
                <li
                  key={cap.numero}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-ink">
                    <span className="text-ink-faint">{cap.numero}.</span>{" "}
                    {cap.titulo ?? "Capítulo"}
                  </span>
                  {cap.pagina_inicio != null && (
                    <Link
                      href={`/libro/${encodeURIComponent(libroId)}/pagina/${cap.pagina_inicio}`}
                      className="shrink-0 text-sm font-semibold text-accent hover:underline"
                    >
                      Ir a pág. {cap.pagina_inicio}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="paginas-title">
          <h2 id="paginas-title" className="font-serif text-xl text-ink">
            Páginas
          </h2>
          {pages.resultados.length === 0 ? (
            <EmptyState
              title={pages.total > 0 ? "Índice fuera de rango" : "Sin páginas indexadas"}
              message={pages.total > 0
                ? "No hay páginas en esta parte del índice. Vuelve al inicio para elegir una página."
                : "Este libro todavía no tiene páginas indexadas."}
            >
              <Link
                href={pages.total > 0 ? `/libro/${encodeURIComponent(libroId)}` : "/biblioteca"}
                className={btnOutline}
              >
                {pages.total > 0 ? "Volver a la primera página del índice" : "Volver a la biblioteca"}
              </Link>
            </EmptyState>
          ) : <>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {pages.resultados.map((p) => (
              <li key={p.ref}>
                <Link
                  href={`/libro/${encodeURIComponent(libroId)}/pagina/${p.numero}`}
                  className="flex flex-col items-center rounded-md border border-line py-3 text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="font-semibold">{p.numero}</span>
                  <span className="text-xs text-ink-faint">
                    {formatCount(p.conteo_palabras)} pal.
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            basePath={`/libro/${encodeURIComponent(libroId)}`}
            params={{}}
            page={page}
            limit={PAGE_LIMIT}
            total={pages.total}
          />
          </>}
        </section>
      </main>
  );
}
