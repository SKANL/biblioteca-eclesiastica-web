"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReaderImage from "@/components/ReaderImage";
import { mediaUrl } from "@/lib/api";
import type { Bloque, TextMatch } from "@/lib/types";
import { countLabel, numeroFromRef } from "@/lib/utils";
import { PREF, TEXT_SCALES, stepScale, throttle, writePref } from "@/lib/prefs";
import { usePref } from "@/components/usePref";
import { btnOutline, btnOutlineDisabled } from "@/lib/ui";
import { scrollToHighlight, targetIdentity, validHighlight } from "@/lib/reader-image";
import { matchIndex } from "@/lib/reader-matches";

interface ReaderToolbarProps {
  libroId: string;
  numero: number;
  refAnterior: string | null;
  refSiguiente: string | null;
  imagenUrl: string | null;
  imagenAncho: number | null;
  imagenAlto: number | null;
  /** Highest page number, enables "Ir a la página". */
  totalPaginas?: number;
  bloques: Bloque[];
  bloqueIdx: number | null;
  query?: string;
  matches?: TextMatch[];
  matchesTruncated?: boolean;
  pageWarning?: string | null;
}

const VIEWS = ["imagen", "texto"] as const;
// ≤ 1 write/s even when paging fast with the arrow keys.
const saveProgress = throttle((libroId: string, numero: number) => writePref(PREF.progress(libroId), String(numero)), 1000);

export default function ReaderToolbar({
  libroId,
  numero,
  refAnterior,
  refSiguiente,
  imagenUrl,
  imagenAncho,
  imagenAlto,
  totalPaginas,
  bloques,
  bloqueIdx,
  query = "",
  matches = [],
  matchesTruncated = false,
  pageWarning,
}: ReaderToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL wins; without `ver` the device's last choice (default: original page).
  const [view, setView] = usePref(PREF.view, VIEWS, "imagen");
  const [scale, setScale] = usePref(PREF.scale, TEXT_SCALES, "1");
  const showImage = searchParams.get("ver") === "imagen" ||
    (!searchParams.has("ver") && view === "imagen");

  const targetBlock =
    bloqueIdx != null && bloqueIdx >= 0 && bloqueIdx < bloques.length
      ? bloques[bloqueIdx]
      : null;
  const activeIndex = matchIndex(searchParams.get("coincidencia"), matches.length);
  const activeMatch = matches[activeIndex];
  // With a query, recomputed matches are authoritative: never reuse a stale block.
  const rects = activeMatch ? activeMatch.rects.map(validHighlight).filter((box): box is number[] => box !== null)
    : !query && validHighlight(targetBlock?.bbox_norm) ? [validHighlight(targetBlock?.bbox_norm)!] : [];
  const bboxNorm = rects[0] ?? null;
  const exact = activeMatch?.precision === "exacta";

  const base = `/libro/${encodeURIComponent(libroId)}/pagina/`;
  const prevNumero = numeroFromRef(refAnterior);
  const nextNumero = numeroFromRef(refSiguiente);
  // Conserva la búsqueda y la vista de verificación al pasar de página, para
  // que ni el resaltado del término ni la imagen se pierdan al navegar.
  const navParams = new URLSearchParams();
  if (query) navParams.set("q", query);
  if (showImage) navParams.set("ver", "imagen");
  else if (searchParams.get("ver") === "texto") navParams.set("ver", "texto");
  if (!query && bloqueIdx != null) navParams.set("bloque", String(bloqueIdx));
  const suffix = navParams.toString() ? `?${navParams}` : "";
  const prevHref = prevNumero != null ? `${base}${prevNumero}${suffix}` : null;
  const nextHref = nextNumero != null ? `${base}${nextNumero}${suffix}` : null;
  const imageSrc = mediaUrl(imagenUrl);
  const targetRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetKey = targetIdentity(libroId, numero, imageSrc, activeMatch ? activeIndex : bloqueIdx, bboxNorm, imagenAncho, imagenAlto) + JSON.stringify(rects);
  const textTargetId = activeMatch ? `coincidencia-${activeIndex}` : null;
  const scheduleTargetScroll = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      // The highlight is mounted only after the image has loaded. Its rendered
      // rectangle, rather than the entire tall page, is the scroll target.
      if (showImage && targetRef.current?.dataset.target === targetKey) {
        scrollToHighlight(targetRef.current, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } else if (!showImage && textTargetId) {
        const mark = document.getElementById(textTargetId);
        if (mark) scrollToHighlight(mark, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }
    });
  }, [showImage, targetKey, textTargetId]);

  function matchHref(index: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("coincidencia", String(index));
    return `${base}${numero}?${params}`;
  }

  useEffect(() => {
    scheduleTargetScroll();
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [scheduleTargetScroll]);

  useEffect(() => saveProgress(libroId, numero), [libroId, numero]);
  useEffect(() => {
    document.documentElement.style.setProperty("--reader-scale", scale);
  }, [scale]);

  function goToPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const n = Number(new FormData(event.currentTarget).get("pagina"));
    if (Number.isInteger(n) && n >= 1) router.push(`${base}${n}${suffix}`);
  }

  function toggleImage() {
    const next = !showImage;
    setView(next ? "imagen" : "texto");
    // La URL es la fuente de verdad: así el estado sobrevive a recargas,
    // atrás/adelante y a copiar el enlace.
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("ver", "imagen");
    else url.searchParams.set("ver", "texto");
    window.history.replaceState(null, "", url.toString());
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && prevHref) {
        event.preventDefault();
        router.push(prevHref);
      } else if (event.key === "ArrowRight" && nextHref) {
        event.preventDefault();
        router.push(nextHref);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevHref, nextHref, router]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/95 py-3">
        {prevHref ? (
          <Link href={prevHref} className={btnOutline} rel="prev">
            Página anterior
          </Link>
        ) : (
          <span className={btnOutlineDisabled} aria-disabled="true">
            Página anterior
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={btnOutline} rel="next">
            Página siguiente
          </Link>
        ) : (
          <span className={btnOutlineDisabled} aria-disabled="true">
            Página siguiente
          </span>
        )}
        <div className="flex items-center gap-1" role="group" aria-label="Tamaño del texto">
          <button type="button" className={`${btnOutline} disabled:opacity-50`} onClick={() => setScale(stepScale(scale, -1))}
            disabled={scale === TEXT_SCALES[0]} aria-label="Reducir el tamaño del texto">A−</button>
          <button type="button" className={`${btnOutline} disabled:opacity-50`} onClick={() => setScale(stepScale(scale, 1))}
            disabled={scale === TEXT_SCALES.at(-1)} aria-label="Aumentar el tamaño del texto">A+</button>
        </div>
        {totalPaginas != null && totalPaginas > 1 && (
          <form onSubmit={goToPage} className="flex items-center gap-1">
            <label htmlFor="ir-pagina" className="text-sm text-ink-soft">Ir a la página</label>
            <input id="ir-pagina" key={numero} name="pagina" type="number" min={1} max={totalPaginas} required
              defaultValue={numero} className="w-20 rounded-md border border-line-strong bg-paper-raised px-2 py-2 text-sm text-ink" />
            <button type="submit" className={btnOutline}>Ir</button>
          </form>
        )}
        {imageSrc && (
          <button
            type="button"
            onClick={toggleImage}
            aria-pressed={showImage}
            className={`${btnOutline} ml-auto`}
          >
            {showImage ? "Ocultar imagen" : "Ver página original"}
          </button>
        )}
      </div>

      {query && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
        <span>{matches.length ? `${countLabel(matches.length, "coincidencia", "coincidencias")} en esta página${matchesTruncated ? " (límite alcanzado)" : ""} · Coincidencia ${activeIndex + 1} de ${matches.length}` : "No hay coincidencias literales en esta página."}</span>
        {matches.length > 1 && <>
          {activeIndex > 0 && <Link href={matchHref(activeIndex - 1)} scroll={false} className={btnOutline}>Coincidencia anterior</Link>}
          {activeIndex + 1 < matches.length && <Link href={matchHref(activeIndex + 1)} scroll={false} className={btnOutline}>Coincidencia siguiente</Link>}
        </>}
        {activeMatch && <span>{exact ? "Geometría de glifos nativos" : activeMatch.precision === "bloque" ? "Ubicación aproximada de bloque" : "Sin ubicación en imagen"}</span>}
        {activeMatch?.advertencia && <p className="w-full text-ink-soft">{activeMatch.advertencia}</p>}
        <p className="w-full text-ink-soft">Localización literal: términos independientes; frases entre comillas dobles. El ranking del buscador puede incluir variantes lingüísticas sin coincidencia literal.</p>
      </div>}

      {showImage && <p className="mt-3 text-sm text-ink-soft">La detección de figuras puede ser incompleta. La página original conserva los diagramas, sus etiquetas y su disposición.</p>}
      {pageWarning && <p role="status" className="mt-3 text-sm text-ink-soft">{pageWarning}</p>}
      {showImage && !imageSrc && <p role="status" className="mt-3 text-sm text-ink-soft">Esta página no tiene imagen original disponible. Puede seguir leyendo el texto o pasar a otra página.</p>}

      {showImage && imageSrc && (
        <figure
          className="mt-3"
          aria-label={
            bboxNorm
               ? `Imagen de la página ${numero}: ${exact ? "glifos de la coincidencia" : "bloque aproximado"} resaltados.`
              : undefined
          }
        >
               <ReaderImage
                 key={`${libroId}/${numero}/${imageSrc}`}
                src={imageSrc}
                alt={`Página original ${numero}`}
                width={imagenAncho}
                height={imagenAlto}
                fullPage
                onReady={scheduleTargetScroll}
              >
              {rects.map((box, index) => (
                <div
                  key={index}
                  ref={index === 0 ? targetRef : undefined}
                  data-target={targetKey}
                  aria-hidden="true"
                  className={`pointer-events-none absolute outline outline-2 outline-accent bg-accent/25 ${exact ? "" : "outline-dashed"}`}
                  style={{
                    left: `${box[0] * 100}%`,
                    top: `${box[1] * 100}%`,
                    width: `${box[2] * 100}%`,
                    height: `${box[3] * 100}%`,
                  }}
                />
              ))}
              </ReaderImage>
          <figcaption className="mt-2 text-xs text-ink-faint">
            {bboxNorm
              ? `Imagen de la página ${numero}; ${exact ? "cajas de glifos nativos" : "caja aproximada de bloque"}.`
              : `Imagen de la página ${numero} para verificación visual.`}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
