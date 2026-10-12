"use client";

import Link from "next/link";
import { reprocesarLibro } from "@/app/(sitio)/editor/actions";
import ActionForm from "@/components/ActionForm";
import { btnOutline, btnPrimarySm, spinnerNeutral } from "@/lib/ui";
import { stepsFor, type StepJob, type StepState } from "@/lib/upload-steps";

const MARK: Record<StepState, { icon: string; sr: string; cls: string }> = {
  done: { icon: "✓", sr: "hecho", cls: "text-accent" },
  current: { icon: "", sr: "en curso", cls: "" },
  failed: { icon: "✕", sr: "falló", cls: "text-red-700" },
  pending: { icon: "○", sr: "pendiente", cls: "text-ink-faint" },
};

/**
 * Presentational step tracker for one upload job. `job === null` while the files
 * still go up from the browser (`upload` 0..1). `compact` hides the live region
 * (a list would announce every row) and the step details.
 */
export default function JobView({
  job,
  titulo,
  upload,
  eta,
  compact = false,
}: {
  job: StepJob | null;
  titulo?: string | null;
  upload?: number;
  eta?: number | null;
  compact?: boolean;
}) {
  const steps = stepsFor(job, upload);
  const active = steps.find((s) => s.state === "current" || s.state === "failed");
  const failed = job?.etapa === "fallido";
  const done = job?.etapa === "disponible";
  const now = done
    ? "Disponible para leer"
    : active
      ? `${active.label}${active.state === "failed" ? ": falló" : ""}`
      : "";

  return (
    <div className="space-y-3">
      {titulo && <p className="font-semibold text-ink">{titulo}</p>}
      {!compact && (
        <p role="status" aria-live="polite" className="sr-only">
          {titulo ? `${titulo}: ` : ""}
          {now}
        </p>
      )}
      <ol className={compact ? "flex flex-wrap gap-x-4 gap-y-1 text-sm" : "space-y-2"} aria-label="Pasos">
        {steps.map((s) => {
          const m = MARK[s.state];
          const isActive = s.state === "current" || s.state === "failed";
          return (
            <li
              key={s.label}
              aria-current={isActive ? "step" : undefined}
              className={`flex items-center gap-2 ${isActive ? "font-semibold text-ink" : "text-ink-soft"}`}
            >
              {s.state === "current" ? (
                <span aria-hidden="true" className={`${spinnerNeutral} motion-reduce:animate-none`} />
              ) : (
                <span aria-hidden="true" className={`inline-block w-4 text-center ${m.cls}`}>
                  {m.icon}
                </span>
              )}
              <span>
                {s.label}
                {s.detail && !compact ? ` (${s.detail})` : null}
                <span className="sr-only"> ({m.sr})</span>
              </span>
            </li>
          );
        })}
      </ol>
      {!compact && eta ? <p className="text-sm text-ink-soft">aprox. {eta} min restantes</p> : null}
      {failed && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-700">
            {job?.error || "No se pudo procesar este libro."}
          </p>
          <div className="flex flex-wrap gap-2">
            {job?.libro_id ? (
              <ActionForm action={reprocesarLibro.bind(null, job.libro_id)}>
                <button type="submit" className={btnPrimarySm}>
                  Reintentar
                </button>
              </ActionForm>
            ) : (
              <Link href="/editor/subir" className={btnPrimarySm}>
                Reintentar
              </Link>
            )}
            <Link href="/editor/subidas" className={btnOutline}>
              Volver a Mis subidas
            </Link>
          </div>
        </div>
      )}
      {done && job?.libro_id && (
        <Link href={`/libro/${encodeURIComponent(job.libro_id)}`} className={btnPrimarySm}>
          Abrir libro
        </Link>
      )}
    </div>
  );
}
