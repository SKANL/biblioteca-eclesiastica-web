"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { estadoTrabajo } from "@/app/(sitio)/editor/actions";
import { btnPrimarySm } from "@/lib/ui";
import { pollJob, type Job } from "@/lib/upload";

const LABELS: Record<string, string> = {
  esperando_subida: "Esperando la subida de los archivos",
  pendiente: "En cola",
  procesando: "Procesando",
  completado: "Completado",
  fallido: "Falló",
};

/** Job status via `pollJob` (single chain, backoff, pauses while the tab is hidden). */
export default function JobStatus({ id }: { id: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const poller = pollJob(
      () => estadoTrabajo(id),
      (res) => {
        if (res.ok) {
          setJob(res.data);
          setError(null);
        } else setError(res.error);
      },
      () => document.hidden,
    );
    const onVisible = () => poller.wake();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      poller.stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  const p = job?.progreso;
  return (
    <div className="mt-6 space-y-4">
      <p role="status" aria-live="polite" className="text-ink">
        {job ? LABELS[job.estado] ?? job.estado : "Consultando…"}
        {p?.paginas_total ? ` — ${p.paginas_hechas} de ${p.paginas_total} páginas` : null}
      </p>
      {p?.paginas_total ? (
        <progress className="w-full" max={p.paginas_total} value={p.paginas_hechas} aria-label="Páginas procesadas" />
      ) : null}
      {job?.estado === "fallido" && job.error && <p role="alert" className="text-red-700">{job.error}</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {job?.estado === "completado" && job.libro_id && (
        <Link href={`/libro/${encodeURIComponent(job.libro_id)}`} className={btnPrimarySm}>
          Ver el libro
        </Link>
      )}
    </div>
  );
}
