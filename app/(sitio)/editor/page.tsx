import type { Metadata } from "next";
import Link from "next/link";
import { sessionEmail } from "@/auth";
import MessagePage from "@/components/MessagePage";
import { getMe } from "@/lib/server/api";
import { btnOutline, btnPrimarySm } from "@/lib/ui";

export const metadata: Metadata = { title: "Editor" };

// Access is checked in ./layout.tsx; getMe is deduped per request.
export default async function EditorPage() {
  const email = await sessionEmail();
  const me = email ? await getMe(email) : null;
  return (
    <MessagePage
      title="Área de editores"
      message={`Sesión iniciada como ${email} (${me?.rol}).`}
    >
      <Link href="/editor/subir" className={btnPrimarySm}>
        Escanear o subir un libro
      </Link>
      <Link href="/biblioteca" className={btnOutline}>
        Ver biblioteca
      </Link>
    </MessagePage>
  );
}
