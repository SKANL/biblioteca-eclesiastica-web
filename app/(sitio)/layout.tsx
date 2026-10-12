import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/**
 * Layout del sitio: monta el header y el footer UNA sola vez para todas las
 * páginas (buscador, resultados, biblioteca y lector). Antes cada página los
 * repetía; ahora vive acá.
 */
export default function SitioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
