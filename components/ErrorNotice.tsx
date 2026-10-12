"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnOutline, spinnerNeutral } from "@/lib/ui";

export default function ErrorNotice({ message }: { message: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="rounded-lg border border-line-strong bg-paper-raised p-6"
    >
      <h2 className="font-serif text-xl text-ink">
        No se pudo cargar la información
      </h2>
      <p className="mt-2 text-ink-soft">{message}</p>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        aria-busy={isPending}
        className={`mt-4 gap-2 ${btnOutline} disabled:opacity-60`}
      >
        {isPending && (
          <span aria-hidden="true" className={spinnerNeutral} />
        )}
        Reintentar
      </button>
    </div>
  );
}
