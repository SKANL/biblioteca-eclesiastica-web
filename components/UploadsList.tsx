"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { misTrabajos } from "@/app/(sitio)/editor/actions";
import EmptyState from "@/components/EmptyState";
import JobView from "@/components/JobView";
import { btnPrimarySm, card } from "@/lib/ui";
import { apiErrorMessage, nextPollDelay, type Job } from "@/lib/upload";

const settled = (j: Job) => j.etapa === "disponible" || j.etapa === "fallido";

/** "Mis subidas": refreshes with backoff while any job is in progress; pauses while the tab is hidden. */
export default function UploadsList() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay: number | undefined;
    let busy = false;
    let stopped = false;
    async function tick() {
      timer = undefined;
      if (stopped || busy || document.hidden) return;
      busy = true;
      const res = await misTrabajos().catch(() => ({ ok: false, status: 0, error: apiErrorMessage(0) }) as const);
      busy = false;
      if (stopped) return;
      if (res.ok) {
        setJobs(res.data);
        setError(null);
        if (res.data.every(settled)) return;
      } else {
        setError(res.error);
        if ([401, 403].includes(res.status)) return;
      }
      delay = nextPollDelay(delay);
      timer = setTimeout(tick, delay);
    }
    const onVisible = () => {
      if (!document.hidden && timer === undefined && !busy) {
        delay = undefined;
        tick();
      }
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!jobs) {
    return error ? (
      <p role="alert" className="mt-6 text-red-700">{error}</p>
    ) : (
      <p className="mt-6 text-ink-soft">Cargando tus subidas…</p>
    );
  }
  if (!jobs.length) {
    return (
      <div className="mt-6">
        <EmptyState title="Todavía no hay subidas" message="Cuando subas un libro, aquí verás cómo avanza.">
          <Link href="/editor/subir" className={btnPrimarySm}>Subir un libro</Link>
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      {error && <p role="alert" className="mt-6 text-sm text-red-700">{error}</p>}
      <ul className="mt-6 space-y-3">
        {jobs.map((j) => (
          <li key={j.id} className={`${card} p-4`}>
            <JobView job={j} titulo={j.titulo || "Sin título"} compact />
            <Link href={`/editor/trabajos/${encodeURIComponent(j.id)}`} className="mt-2 inline-block text-sm underline">
              Ver detalle
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
