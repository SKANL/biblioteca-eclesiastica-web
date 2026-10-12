import type { Metadata } from "next";
import BookCard from "@/components/BookCard";
import FilterForm from "@/components/FilterForm";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import ErrorNotice from "@/components/ErrorNotice";
import Link from "next/link";
import { btnOutline } from "@/lib/ui";
import { ApiError, getBooks, getFacets } from "@/lib/api";
import type { BookListResponse } from "@/lib/types";
import { countLabel, firstValue, toPage } from "@/lib/utils";

const LIMIT = 12;

export const metadata: Metadata = { title: "Biblioteca" };

export default async function BibliotecaPage(props: PageProps<"/biblioteca">) {
  const sp = await props.searchParams;
  const genero = firstValue(sp.genero) ?? "";
  const autor = firstValue(sp.autor) ?? "";
  const page = toPage(firstValue(sp.pagina));

  const facets = await getFacets().catch(() => null);

  let books: BookListResponse | null = null;
  let errorMessage: string | null = null;
  try {
    books = await getBooks({
      genero,
      autor,
      limit: LIMIT,
      offset: (page - 1) * LIMIT,
    });
  } catch (error) {
    errorMessage =
      error instanceof ApiError
        ? error.message
        : "Ocurrió un error inesperado al cargar el catálogo.";
  }

  const hasFilters = Boolean(genero || autor);
  const params: Record<string, string> = {};
  if (genero) params.genero = genero;
  if (autor) params.autor = autor;

  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
          Biblioteca
        </h1>
        <p className="mt-2 text-ink-soft">
          Recorre el catálogo por género o autor y entra a cualquier libro para
          leerlo, buscar dentro de él o citarlo.
        </p>

        <div className="mt-6">
          <FilterForm
            facets={facets}
            basePath="/biblioteca"
            withQuery={false}
            initialGenero={genero}
            initialAutor={autor}
          />
        </div>

        <div className="mt-8">
          {errorMessage && <ErrorNotice message={errorMessage} />}

          {books && books.total === 0 && (
            <EmptyState
              title="Sin libros"
              message={
                hasFilters
                  ? "Ningún libro coincide con los filtros aplicados."
                  : "Todavía no hay libros en el catálogo."
              }
            />
          )}

          {books && books.total > 0 && (
            <>
              <p className="text-sm text-ink-soft" aria-live="polite">
                {countLabel(books.total, "libro", "libros")}
                {hasFilters ? " con los filtros aplicados" : ""}.
              </p>

              {books.resultados.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="Esta página no tiene libros"
                    message="La página solicitada quedó fuera del catálogo."
                  >
                    <Link
                      href={`/biblioteca${hasFilters ? `?${new URLSearchParams(params)}` : ""}`}
                      className={btnOutline}
                    >
                      Volver a la primera página
                    </Link>
                  </EmptyState>
                </div>
              ) : (
                <div className="mt-2">
                  {books.resultados.map((book) => (
                    <BookCard key={book.libro_id} book={book} />
                  ))}
                </div>
              )}

              <Pagination
                basePath="/biblioteca"
                params={params}
                page={page}
                limit={LIMIT}
                total={books.total}
              />
            </>
          )}
        </div>
      </main>
  );
}
