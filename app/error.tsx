"use client";

import Link from "next/link";
import { useEffect } from "react";
import MessagePage from "@/components/MessagePage";
import { btnOutline, btnPrimary } from "@/lib/ui";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MessagePage
      title="Algo salió mal"
      message="No pudimos mostrar esta página. Vuelve a intentarlo o regresa al buscador."
    >
      <button type="button" onClick={() => retry()} className={btnPrimary}>
        Reintentar
      </button>
      <Link href="/" className={btnOutline}>
        Ir al buscador
      </Link>
    </MessagePage>
  );
}
