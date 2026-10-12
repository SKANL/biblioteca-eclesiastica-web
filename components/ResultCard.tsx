import Link from "next/link";
import type { SearchHit } from "@/lib/types";
import { snippetToSafeHtml } from "@/lib/utils";
import { btnOutline, btnPrimarySm } from "@/lib/ui";

export default function ResultCard({
  hit,
  query,
}: {
  hit: SearchHit;
  query: string;
}) {
  const href = `/libro/${encodeURIComponent(hit.libro_id)}/pagina/${hit.numero}`;
  const trimmedQuery = query.trim();

  // "Leer" lleva la búsqueda para resaltar el término en el texto.
  const readParams = new URLSearchParams();
  if (trimmedQuery) readParams.set("q", trimmedQuery);
  const readHref = readParams.toString() ? `${href}?${readParams}` : href;

  // "Ver página original" agrega la imagen y, si existe, el bloque a resaltar.
  const imageParams = new URLSearchParams(readParams);
  imageParams.set("ver", "imagen");
  if (hit.bloque_idx != null) imageParams.set("bloque", String(hit.bloque_idx));
  const imageHref = `${href}?${imageParams}`;

  const safeSnippet = snippetToSafeHtml(hit.snippet);

  return (
    <article className="border-b border-line py-6">
      <h3 className="font-serif text-xl leading-snug text-ink">
        <Link
          href={href}
          className="rounded-md hover:text-accent hover:underline"
        >
          {hit.titulo ?? "Título no disponible"}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        {hit.autor ?? "Autor no disponible"}
      </p>

      <p
        className="mt-3 leading-relaxed text-ink"
        // The API returns snippets containing <mark>; snippetToSafeHtml escapes
        // everything else before re-enabling only those tags.
        dangerouslySetInnerHTML={{ __html: safeSnippet }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={readHref} className={btnPrimarySm}>
          Leer
        </Link>
        {hit.imagen_url && (
          <Link href={imageHref} className={btnOutline}>
            Ver página original
          </Link>
        )}
        <span className="text-xs text-ink-faint">
          <span translate="no" className="font-mono">
            {hit.ref}
          </span>
          {hit.capitulo_numero != null && (
            <> · Capítulo {hit.capitulo_numero}</>
          )}
        </span>
      </div>
    </article>
  );
}
