import Link from "next/link";
import FilterForm from "@/components/FilterForm";
import { getFacets } from "@/lib/api";

const SUGGESTIONS = ["gracia", "fe", "oración", "esperanza", "amor"];

export default async function HomePage() {
  const facets = await getFacets().catch(() => null);

  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16"
      >
        <div className="max-w-3xl">
          <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Biblioteca Virtual Eclesiástica
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Busca palabras o frases en el catálogo, lee la página completa y
            genera la cita bibliográfica con su referencia.
          </p>
        </div>

        <div className="mt-8 max-w-3xl">
          <FilterForm facets={facets} basePath="/buscar" autoFocus variant="hero" />
          {facets === null && (
            <p className="mt-3 text-sm text-ink-soft" role="status">
              No se pudieron cargar los filtros de género y autor. La búsqueda
              por texto sigue disponible.
            </p>
          )}
        </div>

        <div className="mt-8 max-w-3xl">
          <p className="text-sm text-ink-soft">
            Prueba con:{" "}
            {SUGGESTIONS.map((term, index) => (
              <span key={term}>
                <Link
                  href={`/buscar?q=${encodeURIComponent(term)}`}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {term}
                </Link>
                {index < SUGGESTIONS.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>
      </main>
  );
}
