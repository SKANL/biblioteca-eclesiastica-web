"use client";

import { useEffect, useRef, useState } from "react";
import { estadoTrabajo } from "@/app/(sitio)/editor/actions";
import JobView from "@/components/JobView";
import { pollJob, type Job } from "@/lib/upload";
import { minutesLeft } from "@/lib/upload-steps";

/**
 * Live job tracker via `pollJob` (single chain, backoff, pauses while the tab is hidden).
 * While `upload` is set the files are still going up from the browser: nothing is polled.
 */
export default function JobStatus({ id, titulo, upload }: { id: string; titulo?: string; upload?: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<{ at: number; done: number } | null>(null);
  const uploading = upload !== undefined;

  useEffect(() => {
    if (uploading) return;
    const poller = pollJob(
      () => estadoTrabajo(id),
      (res) => {
        if (!res.ok) return setError(res.error);
        setError(null);
        setJob(res.data);
        const p = res.data.progreso;
        if (res.data.etapa !== "leyendo_paginas" || !p?.paginas_total) return setEta(null);
        const sample = { at: Date.now(), done: p.paginas_hechas };
        first.current ??= sample;
        setEta(minutesLeft(first.current, { ...sample, total: p.paginas_total }));
      },
      () => document.hidden,
    );
    const onVisible = () => poller.wake();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      poller.stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, uploading]);

  return (
    <div className="space-y-2">
      {!uploading && !job && !error ? (
        <p className="text-ink-soft">Consultando…</p>
      ) : (
        <JobView job={uploading ? null : job} titulo={titulo ?? job?.titulo} upload={upload} eta={eta} />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
