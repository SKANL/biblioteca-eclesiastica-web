import type { ReactNode } from "react";

interface MessagePageProps {
  title: string;
  message: string;
  children?: ReactNode;
}

/**
 * Página de mensaje compartida por "no encontrado" y "error". Evita repetir
 * el encabezado, el párrafo y el bloque de acciones en cada caso.
 */
export default function MessagePage({
  title,
  message,
  children,
}: MessagePageProps) {
  return (
    <main
      id="contenido"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6"
    >
      <h1 className="font-serif text-3xl leading-tight text-ink">{title}</h1>
      <p className="mt-3 text-ink-soft">{message}</p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </main>
  );
}
