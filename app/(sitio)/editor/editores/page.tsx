import type { Metadata } from "next";
import { apiFetchAsSignedIn, sessionEmail } from "@/auth";
import { guardarEditor, quitarEditor } from "@/app/(sitio)/editor/actions";
import ActionForm from "@/components/ActionForm";
import ErrorNotice from "@/components/ErrorNotice";
import MessagePage from "@/components/MessagePage";
import { getMe } from "@/lib/server/api";
import { btnOutline, btnPrimary, card, inputBase, labelBase } from "@/lib/ui";

export const metadata: Metadata = { title: "Editores" };

interface Editor {
  email: string;
  rol: "editor" | "admin";
}

/** Admin-only (UX gate; the API enforces it with 403). */
export default async function EditoresPage() {
  const email = await sessionEmail();
  const me = email ? await getMe(email) : null;
  if (me?.rol !== "admin") {
    return <MessagePage title="Solo administradores" message="Esta sección es solo para administradores." />;
  }
  const res = await apiFetchAsSignedIn("/api/v1/editores", { signal: AbortSignal.timeout(5000) }).catch(() => null);
  const editors: Editor[] | null = res?.ok ? await res.json() : null;

  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl leading-tight text-ink">Editores</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Los administradores definidos en el servidor (ADMIN_EMAILS) no aparecen en esta lista.
      </p>

      <ActionForm
        action={guardarEditor}
        className={`${card} mt-6 grid gap-4 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end`}
      >
        <div>
          <label htmlFor="e-email" className={labelBase}>
            Email
          </label>
          <input id="e-email" name="email" type="email" required autoComplete="off" className={`${inputBase} mt-1`} />
        </div>
        <div>
          <label htmlFor="e-rol" className={labelBase}>
            Rol
          </label>
          <select id="e-rol" name="rol" className={`${inputBase} mt-1`} defaultValue="editor">
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button type="submit" className={btnPrimary}>
          Guardar
        </button>
      </ActionForm>

      <div className="mt-6">
        {!editors && <ErrorNotice message="No se pudo cargar la lista de editores." />}
        {editors?.length === 0 && <p className="text-ink-soft">No hay editores registrados.</p>}
        <ul className="space-y-2">
          {editors?.map((e) => (
            <li key={e.email} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <span className="text-ink">
                {e.email}{" "}
                <span className="text-sm text-ink-soft">({e.rol === "admin" ? "administrador" : "editor"})</span>
              </span>
              <ActionForm action={quitarEditor.bind(null, e.email)} confirmText={`¿Quitar el acceso de ${e.email}?`}>
                <button type="submit" className={btnOutline} aria-label={`Quitar a ${e.email}`}>
                  Quitar
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
