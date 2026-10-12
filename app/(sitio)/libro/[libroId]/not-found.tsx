import Link from "next/link";
import MessagePage from "@/components/MessagePage";
import { btnPrimary } from "@/lib/ui";

export default function BookNotFound() {
  return (
    <MessagePage
      title="Libro no encontrado"
      message="El libro que buscas no existe en el catálogo o el enlace no es válido."
    >
      <Link href="/biblioteca" className={btnPrimary}>Volver a la biblioteca</Link>
    </MessagePage>
  );
}
