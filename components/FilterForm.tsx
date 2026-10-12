"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FacetsResponse } from "@/lib/types";
import { btnPrimary, inputBase, labelBase, spinnerOnAccent } from "@/lib/ui";

interface FilterFormProps {
  facets: FacetsResponse | null;
  /** Ruta a la que se navega al enviar (`/buscar` o `/biblioteca`). */
  basePath: string;
  /** Si es `true`, incluye el campo de texto y exige un término. */
  withQuery?: boolean;
  initialQuery?: string;
  initialGenero?: string;
  initialAutor?: string;
  autoFocus?: boolean;
  variant?: "hero" | "inline";
}

/**
 * Formulario de filtros compartido por la búsqueda y el catálogo. Es el ÚNICO
 * lugar donde viven el selector de género, el campo de autor y el submit; el
 * comportamiento cambia por props (`withQuery`, `basePath`, `variant`).
 */
export default function FilterForm(props: FilterFormProps) {
  // A new URL snapshot resets drafts, including Back/Forward soft navigation.
  const identity = JSON.stringify([
    props.basePath, props.initialQuery ?? "", props.initialGenero ?? "", props.initialAutor ?? "",
  ]);
  return <FilterFields key={identity} {...props} />;
}

function FilterFields({
  facets,
  basePath,
  withQuery = true,
  initialQuery = "",
  initialGenero = "",
  initialAutor = "",
  autoFocus = false,
  variant = "inline",
}: FilterFormProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [genero, setGenero] = useState(initialGenero);
  const [autor, setAutor] = useState(initialAutor);
  const [isPending, startTransition] = useTransition();

  const qId = useId();
  const generoId = useId();
  const autorId = useId();
  const helpId = useId();
  const autorListId = useId();

  const trimmed = q.trim();
  const canSubmit = !withQuery || trimmed.length > 0;
  const hero = variant === "hero";
  const hasFilters = Boolean(initialGenero || initialAutor);
  const submitLabel = withQuery ? "Buscar" : "Filtrar";

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  function buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (withQuery) params.set("q", trimmed);
    if (genero) params.set("genero", genero);
    const autorTrim = autor.trim();
    if (autorTrim) params.set("autor", autorTrim);
    return params;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    navigate(buildParams());
  }

  /** Clears genre/author only; the search term stays. */
  function handleClear() {
    setGenero("");
    setAutor("");
    const params = new URLSearchParams();
    if (withQuery && initialQuery) params.set("q", initialQuery);
    navigate(params);
  }

  return (
    <form
      role={withQuery ? "search" : undefined}
      onSubmit={handleSubmit}
      className={
        hero
          ? "rounded-xl border border-line bg-paper-raised p-4 shadow-[0_1px_2px_rgba(20,30,28,0.06)] sm:p-6"
          : "rounded-lg border border-line bg-paper-raised p-4"
      }
    >
      {withQuery && (
        <div className="flex flex-col gap-2">
          <label htmlFor={qId} className={labelBase}>
            Buscar en el catálogo
          </label>
          <input
            id={qId}
            name="q"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            autoFocus={autoFocus}
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby={helpId}
            placeholder="Escribe una palabra o frase…"
            className={`${inputBase} ${hero ? "text-lg" : ""}`}
          />
          <p id={helpId} className="text-sm text-ink-soft">
            {hero
              ? "Por ejemplo: «gracia», «buen pastor» o «vida eterna»."
              : "Edita el término o los filtros y vuelve a buscar."}
          </p>
        </div>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${withQuery ? "mt-4" : ""}`}>
        <div className="flex flex-col gap-2">
          <label htmlFor={generoId} className={labelBase}>
            Género
          </label>
          <select
            id={generoId}
            name="genero"
            value={genero}
            onChange={(event) => setGenero(event.target.value)}
            disabled={!facets}
            className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">Todos los géneros</option>
            {facets?.generos.map((facet) => (
              <option key={facet.valor} value={facet.valor}>
                {facet.valor} ({facet.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={autorId} className={labelBase}>
            Autor
          </label>
          <input
            id={autorId}
            name="autor"
            type="text"
            list={autorListId}
            value={autor}
            onChange={(event) => setAutor(event.target.value)}
            autoComplete="off"
            placeholder="Cualquier autor…"
            className={inputBase}
          />
          <datalist id={autorListId}>
            {facets?.autores.map((facet) => (
              <option key={facet.valor} value={facet.valor} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-faint" aria-live="polite">
          {withQuery
            ? !canSubmit
              ? "Escribe un término para buscar."
              : isPending
                ? "Buscando…"
                : "\u00A0"
            : "\u00A0"}
        </p>
        <div className="flex items-center justify-end gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-accent"
            >
              Limpiar
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit || isPending}
            aria-busy={isPending}
            className={btnPrimary}
          >
            {isPending && <span aria-hidden="true" className={spinnerOnAccent} />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
