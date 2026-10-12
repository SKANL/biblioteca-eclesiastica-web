import type { Metadata } from "next";
import MessagePage from "@/components/MessagePage";

export const metadata: Metadata = { title: "Sin conexión" };

/** Static fallback served by public/sw.js when a page is not cached and the network fails. */
export default function OfflinePage() {
  return (
    <MessagePage
      title="Sin conexión"
      message="No hay conexión a internet y esta página no está guardada en este dispositivo. Las páginas que ya leíste siguen disponibles; vuelve a intentarlo cuando tengas conexión."
    >
      {/* Plain <a>: a full navigation lets the service worker answer from its cache. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
      <a href="/" className="underline">
        Ir al inicio
      </a>
    </MessagePage>
  );
}
