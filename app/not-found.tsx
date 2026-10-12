import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MessagePage from "@/components/MessagePage";
import { btnPrimary } from "@/lib/ui";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <MessagePage
        title="Página no encontrada"
        message="La página que buscas no existe o el enlace no es válido."
      >
        <Link href="/" className={btnPrimary}>
          Volver al buscador
        </Link>
      </MessagePage>
      <SiteFooter />
    </>
  );
}
