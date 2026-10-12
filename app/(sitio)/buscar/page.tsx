import type { Metadata } from "next";
import Link from "next/link";
import FilterForm from "@/components/FilterForm";
import ResultCard from "@/components/ResultCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import ErrorNotice from "@/components/ErrorNotice";
import { ApiError, getFacets, searchPages } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";
import { countLabel, firstValue, toPage } from "@/lib/utils";
import { btnOutline } from "@/lib/ui";

const LIMIT = 10;

export async function generateMetadata(
  props: PageProps<"/buscar">,
): Promise<Metadata> {
  const sp = await props.searchParams;
  const q = (firstValue(sp.q) ?? "").trim();
  return { title: q ? `Resultados para «${q}»` : "Buscar" };
}

export default async function BuscarPage(props: PageProps<"/buscar">) {
  const sp = await props.searchParams;
  const q = (firstValue(sp.q) ?? "").trim();
  const genero = firstValue(sp.genero) ?? "";
  const autor = firstValue(sp.autor) ?? "";
  const page = toPage(firstValue(sp.pagina));

  const facets = await getFacets().catch(() => null);

  let results: SearchResponse | null = null;
  let errorMessage: string | null = null;

  if (q) {
    try {
      results = await searchPages({
        q,
        genero,
        autor,
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
      });
    } catch (error) {
      errorMessage =
        error instanceof ApiError
          ? error.message
          : "Ocurrió un error inesperado al buscar.";
    }
  }

  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;
  if (genero) paginationParams.genero = genero;
  if (autor) paginationParams.autor = autor;
  const hasFilters = Boolean(genero || autor);

  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
          {q ? `Resultados para «${q}»` : "Buscar en el catálogo"}
        </h1>

        <div className="mt-6">
          <FilterForm
            facets={facets}
            basePath="/buscar"
            initialQuery={q}
            initialGenero={genero}
            initialAutor={autor}
          />
        </div>

        <div className="mt-8">
          {!q && (
            <EmptyState
              title="Escribe un término para buscar"
              message="Introduce una palabra o frase en el buscador de arriba. Puedes filtrar además por género y autor."
            />
          )}

          {q && errorMessage && <ErrorNotice message={errorMessage} />}

          {q && results && results.total === 0 && (
            <EmptyState
              title="Sin resultados"
              message={`No se encontraron coincidencias para «${q}». Revisa la ortografía o prueba con otra palabra.`}
            >
              {hasFilters && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(q)}`}
                  className={btnOutline}
                >
                  Buscar solo por texto
                </Link>
              )}
            </EmptyState>
          )}

          {q && results && results.total > 0 && (
            <>
              <p className="text-sm text-ink-soft" aria-live="polite">
                {countLabel(results.total, "resultado", "resultados")}
                {hasFilters ? " con los filtros aplicados" : ""}.
              </p>

              {results.resultados.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="Esta página no tiene resultados"
                    message="La página solicitada quedó fuera del listado."
                  >
                    <Link
                      href={`/buscar?${new URLSearchParams(paginationParams).toString()}`}
                      className={btnOutline}
                    >
                      Volver a la primera página
                    </Link>
                  </EmptyState>
                </div>
              ) : (
                <div className="mt-2">
                  {results.resultados.map((hit) => (
                    <ResultCard key={hit.ref} hit={hit} query={q} />
                  ))}
                </div>
              )}

              <Pagination
                basePath="/buscar"
                params={paginationParams}
                page={page}
                limit={LIMIT}
                total={results.total}
              />
            </>
          )}
        </div>
      </main>
  );
}
