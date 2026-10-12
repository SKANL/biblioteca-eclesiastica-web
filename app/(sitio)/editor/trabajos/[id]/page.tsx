import type { Metadata } from "next";
import Link from "next/link";
import JobStatus from "@/components/JobStatus";

export const metadata: Metadata = { title: "Estado del trabajo" };

export default async function TrabajoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl leading-tight text-ink">Estado del procesamiento</h1>
      <div className="mt-6">
        <JobStatus id={id} />
      </div>
      <Link href="/editor/subidas" className="mt-6 inline-block text-sm underline">
        Ver todas mis subidas
      </Link>
    </main>
  );
}
