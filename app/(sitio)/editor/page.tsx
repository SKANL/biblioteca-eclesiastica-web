import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authEnabled, sessionEmail } from "@/auth";
import MessagePage from "@/components/MessagePage";
import { canEdit, getMe } from "@/lib/server/api";
import { btnOutline, btnPrimarySm } from "@/lib/ui";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage() {
  await connection(); // always per-request: auth env and session are runtime-only
  if (!authEnabled) {
    return (
      <MessagePage
        title="Acceso de editores no disponible"
        message="El inicio de sesión no está configurado en este entorno."
      />
    );
  }
  const email = await sessionEmail();
  if (!email) {
    // signIn() cannot set cookies from a Server Component; use the Auth.js page.
    redirect("/api/auth/signin?callbackUrl=%2Feditor");
  }
  const me = await getMe(email!);
  if (!canEdit(me?.rol)) {
    return (
      <MessagePage
        title="Sin permisos de editor"
        message={`La cuenta ${email} no tiene permisos de editor. Pide acceso a un administrador.`}
      >
        <Link href="/" className={btnOutline}>
          Volver al inicio
        </Link>
      </MessagePage>
    );
  }
  return (
    <MessagePage
      title="Área de editores"
      message={`Sesión iniciada como ${email} (${me!.rol}).`}
    >
      <ul className="list-disc pl-5 text-ink-soft">
        <li>Escanear o subir un libro (próximamente).</li>
        <li>Editar, eliminar o reprocesar libros (próximamente).</li>
      </ul>
      <Link href="/biblioteca" className={btnPrimarySm}>
        Ver biblioteca
      </Link>
    </MessagePage>
  );
}
