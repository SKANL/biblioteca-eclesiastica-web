"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { estadoTrabajo } from "@/app/(sitio)/editor/actions";
import { btnPrimarySm } from "@/lib/ui";
import { isTerminal, nextPollDelay, type Job } from "@/lib/upload";

const LABELS: Record<string, string> = {
  esperando_subida: "Esperando la subida de los archivos",
  pendiente: "En cola",
  procesando: "Procesando",
  completado: "Completado",
  fallido: "Falló",
};

/** Polls the job with backoff (1 s → 10 s); pauses while the tab is hidden; stops on a terminal state. */
export default function JobStatus({ id }: { id: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay: number | undefined;
    let stopped = false;

    async function tick() {
      timer = undefined;
      if (document.hidden) return; // resumed by visibilitychange
      const res = await estadoTrabajo(id);
      if (stopped) return;
      if (res.ok) {
        setJob(res.data);
        setError(null);
        if (isTerminal(res.data.estado)) return;
      } else {
        setError(res.error);
        if (res.status === 401 || res.status === 403 || res.status === 404) return;
      }
      delay = nextPollDelay(delay);
      timer = setTimeout(tick, delay);
    }
    function onVisible() {
      if (!document.hidden && !timer && !stopped) {
        delay = undefined; // fresh data right away when the editor comes back
        tick();
      }
    }
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
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
