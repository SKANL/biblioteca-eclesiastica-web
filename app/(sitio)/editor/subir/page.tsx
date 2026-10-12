import type { Metadata } from "next";
import UploadForm from "@/components/UploadForm";

export const metadata: Metadata = { title: "Subir libro" };

export default function SubirPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl leading-tight text-ink">Escanear o subir un libro</h1>
      <UploadForm />
    </main>
  );
}
