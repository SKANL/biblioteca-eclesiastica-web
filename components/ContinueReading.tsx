"use client";

import Link from "next/link";
import { PREF } from "@/lib/prefs";
import { usePref } from "@/components/usePref";
import { btnOutline } from "@/lib/ui";

/** "Continuar leyendo" from the last page saved by the reader on this device. */
export default function ContinueReading({ libroId }: { libroId: string }) {
  const [numero] = usePref(PREF.progress(libroId), /^\d{1,6}$/, "");
  if (!numero) return null;
  return (
    <Link href={`/libro/${encodeURIComponent(libroId)}/pagina/${numero}`} className={btnOutline}>
      Continuar leyendo (pág. {numero})
    </Link>
  );
}
