import type { Metadata } from "next";
import Link from "next/link";
import UploadsList from "@/components/UploadsList";
import { btnOutline } from "@/lib/ui";

export const metadata: Metadata = { title: "Mis subidas" };

export default function SubidasPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl leading-tight text-ink">Mis subidas</h1>
        <Link href="/editor/subir" className={btnOutline}>Subir otro libro</Link>
      </div>
      <p className="mt-2 text-ink-soft">Puedes cerrar esta página: el procesamiento sigue en el servidor.</p>
      <UploadsList />
    </main>
  );
}
