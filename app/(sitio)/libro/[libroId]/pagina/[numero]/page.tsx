import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import ReaderToolbar from "@/components/ReaderToolbar";
import CitePanel from "@/components/CitePanel";
import ReaderImage from "@/components/ReaderImage";
import { ApiError, getBook, getPage, mediaUrl } from "@/lib/api";
import type { BookDetail, PageResponse } from "@/lib/types";
import { firstValue, motorLabel } from "@/lib/utils";
import { markRanges, matchIndex } from "@/lib/reader-matches";

const loadBook = cache((libroId: string) => getBook(libroId));

type ReaderProps = PageProps<"/libro/[libroId]/pagina/[numero]">;

export async function generateMetadata(
  props: ReaderProps,
): Promise<Metadata> {
  const { libroId, numero } = await props.params;
  try {
    const book = await loadBook(libroId);
    return { title: `${book.metadatos.titulo} · Página ${numero}` };
  } catch {
    return { title: `Página ${numero}` };
  }
}

export default async function ReaderPage(props: ReaderProps) {
  const { libroId, numero } = await props.params;
  const searchParams = await props.searchParams;
  const q = (firstValue(searchParams.q) ?? "").slice(0, 500);
  const pageNumber = Number(numero);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  let book: BookDetail;
  let page: PageResponse;
  try {
    const [loadedBook, loadedPage] = await Promise.all([
      loadBook(libroId),
      getPage(libroId, pageNumber, q),
    ]);
    book = loadedBook;
    page = loadedPage;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const bloqueRaw = Number(firstValue(searchParams.bloque));
  const bloqueIdx =
    Number.isInteger(bloqueRaw) && bloqueRaw >= 0 ? bloqueRaw : null;
  const matches = page.coincidencias ?? [];
  const activeIndex = matchIndex(firstValue(searchParams.coincidencia), matches.length);
  const supports = page.figuras.filter(figure => figure.tipo === "soporte_nativo");
  const canShowCrops = supports.length > 0 || page.figuras.every((figure) => figure.estado === "no_verificado" && figure.orden != null);
  const figures = supports.length ? supports : page.figuras;
  const chars = Array.from(page.texto);
  const flow = page.lectura?.filter(segment => Number.isInteger(segment.inicio) && Number.isInteger(segment.fin) && segment.inicio >= 0 && segment.fin > segment.inicio && segment.fin <= chars.length) ?? [];
  const renderText = (start: number, end: number) => <div className="mb-5 max-w-[65ch] whitespace-pre-wrap break-words [&_mark[aria-current]]:outline [&_mark[aria-current]]:outline-2 [&_mark[aria-current]]:outline-accent"
    dangerouslySetInnerHTML={{ __html: markRanges(chars.slice(start, end).join(""), matches.map(match => ({ inicio: match.inicio - start, fin: match.fin - start })), activeIndex) }} />;
  const originalParams = new URLSearchParams({ ver: "imagen" });
  if (q) originalParams.set("q", q);
  if (!q && bloqueIdx != null) originalParams.set("bloque", String(bloqueIdx));
  if (matches.length) originalParams.set("coincidencia", String(activeIndex));
  const originalHref = `/libro/${encodeURIComponent(libroId)}/pagina/${page.numero}?${originalParams}`;
  const renderFigures = () => canShowCrops && figures.map((figure, index) => (
    <figure key={`figure-${index}`} className="my-6 font-sans text-sm leading-relaxed">
      {mediaUrl(figure.imagen_url) ? <ReaderImage src={mediaUrl(figure.imagen_url)!}
        alt={figure.texto_alternativo || `Soporte visual de la página ${page.numero}.`}
        width={figure.imagen_ancho} height={figure.imagen_alto} /> : <p role="status">El soporte no está disponible; consulte la página original.</p>}
      <figcaption className="mt-2 text-ink-soft">
        {figure.pie && <p>{figure.pie}</p>}
        {figure.detectada === false && <p>Página completa de respaldo; no es una figura detectada.</p>}
        <p>{figure.advertencia || "Recorte no verificado: puede omitir partes del diagrama."}</p>
        {mediaUrl(page.imagen_url) && <Link href={originalHref} className="underline hover:text-accent">Ver página original</Link>}
      </figcaption>
    </figure>
  ));

  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="mb-6">
          <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
            <Link
              href={`/libro/${encodeURIComponent(libroId)}`}
              className="rounded-md hover:text-accent hover:underline"
            >
              {book.metadatos.titulo}
            </Link>
          </h1>
          {book.metadatos.autor && (
            <p className="mt-1 text-ink-soft">{book.metadatos.autor}</p>
          )}
          <p className="mt-3 text-sm text-ink-faint">
            Página {page.numero}
            {page.capitulo_numero != null && (
              <>
                <span aria-hidden="true" className="mx-2 text-line-strong">
                  |
                </span>
                Capítulo {page.capitulo_numero}
              </>
            )}
            <span aria-hidden="true" className="mx-2 text-line-strong">
              |
            </span>
            {page.conteo_palabras} palabras
            {motorLabel(page.motor) && (
              <>
                <span aria-hidden="true" className="mx-2 text-line-strong">
                  |
                </span>
                <span title="Procedencia del texto de esta página">{motorLabel(page.motor)}</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            <span translate="no" className="font-mono">
              {page.ref}
            </span>
          </p>
        </header>

        <ReaderToolbar
          libroId={libroId}
          numero={page.numero}
          refAnterior={page.ref_anterior}
          refSiguiente={page.ref_siguiente}
          imagenUrl={page.imagen_url}
          imagenAncho={page.imagen_ancho}
          imagenAlto={page.imagen_alto}
          totalPaginas={book.conteo_paginas}
          bloques={page.bloques}
          bloqueIdx={bloqueIdx}
          query={q}
          matches={matches}
          matchesTruncated={page.coincidencias_truncadas}
          pageWarning={page.advertencia_localizacion}
        />

        <article className="mt-8 font-serif text-[length:calc(1.25rem*var(--reader-scale,1))] leading-[1.75] text-ink">
          {flow.length ? flow.map((segment, index) => <section key={`reading-${index}`} aria-label={segment.tipo === "nota" ? "Notas al pie" : segment.tipo === "visual" ? "Soportes visuales" : "Texto principal"}>
            {segment.tipo === "visual" && supports.length ? <>
              {renderFigures()}
              <details open={matches.some((match, i) => i === activeIndex && match.inicio >= segment.inicio && match.fin <= segment.fin)} className="my-4 font-sans text-sm">
                <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-accent">Texto nativo del soporte (disponible para búsqueda)</summary>
                {renderText(segment.inicio, segment.fin)}
              </details>
            </> : <>{segment.tipo === "nota" && <h2 className="mb-3 font-sans text-base font-semibold">Notas al pie</h2>}{renderText(segment.inicio, segment.fin)}</>}
          </section>) : page.texto ? renderText(0, chars.length) : <p className="text-ink-soft">Esta página no tiene texto reconocido.</p>}
          {(!flow.some(segment => segment.tipo === "visual") || !supports.length) && renderFigures()}
        </article>

        <CitePanel key={`${libroId}/${page.numero}`} libroId={libroId} numero={page.numero} />

        <p className="mt-6 text-sm text-ink-soft">
          Usa las flechas izquierda y derecha del teclado para cambiar de
          página.
        </p>
      </main>
  );
}
