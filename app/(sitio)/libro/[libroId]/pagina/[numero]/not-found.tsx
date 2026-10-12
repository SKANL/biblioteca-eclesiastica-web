import Link from "next/link";
import MessagePage from "@/components/MessagePage";
import { btnPrimary } from "@/lib/ui";

export default function PageNotFound() {
  return (
    <MessagePage
      title="Página no disponible"
      message="Esta página del libro no existe en el catálogo. Puede que se haya citado una referencia incorrecta."
    >
      <Link href="/" className={btnPrimary}>
        Volver al buscador
      </Link>
    </MessagePage>
  );
}
