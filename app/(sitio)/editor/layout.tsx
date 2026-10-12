import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authEnabled, sessionEmail } from "@/auth";
import MessagePage from "@/components/MessagePage";
import { canEdit, getMe } from "@/lib/server/api";
import { btnOutline } from "@/lib/ui";

/**
 * Gate for every /editor route. UX only: the API enforces the role on each
 * write (403), so a stale layout never grants anything.
 */
export default async function EditorLayout({ children }: { children: ReactNode }) {
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
  const me = await getMe(email);
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
  return children;
}
