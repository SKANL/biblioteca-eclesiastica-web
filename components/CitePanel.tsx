"use client";

import { useId, useState } from "react";
import { ApiError, getCitation } from "@/lib/api";
import { CITATION_STYLES, type CitationStyle } from "@/lib/types";
import { btnPrimary, card, spinnerOnAccent } from "@/lib/ui";

const STYLE_LABELS: Record<CitationStyle, string> = {
  apa: "APA",
  chicago: "Chicago",
  mla: "MLA",
};

type Status = "idle" | "loading" | "copied" | "error";

interface CitePanelProps {
  libroId: string;
  numero: number;
}

export default function CitePanel({ libroId, numero }: CitePanelProps) {
  const styleId = useId();
  const [estilo, setEstilo] = useState<CitationStyle>("apa");
  const [cita, setCita] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleCite() {
    setStatus("loading");
    setCita(null);
    setMessage("");
    try {
      const result = await getCitation(libroId, numero, estilo);
      setCita(result.cita);

      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(result.cita);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (copied) {
        setStatus("copied");
        setMessage("Cita copiada al portapapeles.");
      } else {
        setStatus("error");
        setMessage(
          "No se pudo copiar automáticamente. Selecciona el texto de la cita y cópialo manualmente.",
        );
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof ApiError
          ? error.message
          : "No se pudo generar la cita.",
      );
    }
  }

  return (
    <section
      aria-labelledby={`${styleId}-title`}
      className={`mt-10 ${card} p-5 sm:p-6`}
    >
      <h2
        id={`${styleId}-title`}
        className="font-serif text-xl leading-tight text-ink"
      >
        Citar esta página
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Genera la referencia bibliográfica y cópiala al portapapeles.
      </p>

      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor={styleId} className="text-sm font-semibold text-ink">
            Estilo
          </label>
          <select
            id={styleId}
            value={estilo}
            disabled={status === "loading"}
            onChange={(event) => {
              setEstilo(event.target.value as CitationStyle);
              setCita(null);
              setStatus("idle");
              setMessage("");
            }}
            className="w-full rounded-md border border-line-strong bg-paper-raised px-4 py-3 text-ink focus-visible:border-accent sm:w-44"
          >
            {CITATION_STYLES.map((style) => (
              <option key={style} value={style}>
                {STYLE_LABELS[style]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCite}
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className={btnPrimary}
        >
          {status === "loading" && (
            <span aria-hidden="true" className={spinnerOnAccent} />
          )}
          Copiar cita
        </button>
      </div>

      {cita && (
        <p className="mt-4 select-all rounded-md border border-line bg-paper px-4 py-3 font-serif text-lg leading-relaxed text-ink">
          {cita}
        </p>
      )}

      <p
        aria-live="polite"
        className={`mt-3 text-sm ${
          status === "error" ? "text-ink" : "text-ink-soft"
        }`}
      >
        {message}
      </p>
    </section>
  );
}
