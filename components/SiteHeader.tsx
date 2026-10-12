import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { authEnabled, sessionEmail, signIn, signOut } from "@/auth";
import { canEdit, getMe } from "@/lib/server/api";

const navLink =
  "rounded-md px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-accent";

export default async function SiteHeader() {
  let email: string | null = null;
  let me: Awaited<ReturnType<typeof getMe>> = null;
  try {
    email = await sessionEmail();
    me = email ? await getMe(email) : null;
  } catch (err) {
    unstable_rethrow(err); // keep Next internal signals (dynamic usage, redirects)
    // A broken session/auth config must not take the page down: show logged-out UI.
    console.error("SiteHeader: session lookup failed:", err);
    email = null;
    me = null;
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center rounded-md py-2 text-ink">
          <span className="font-serif text-lg font-semibold leading-none sm:text-xl">
            <span className="hidden sm:inline">
              Biblioteca Virtual Eclesiástica
            </span>
            <span className="sm:hidden">Biblioteca Eclesiástica</span>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          <Link href="/buscar" className={navLink}>
            Buscar
          </Link>
          <Link href="/biblioteca" className={navLink}>
            Biblioteca
          </Link>
          {canEdit(me?.rol) && (
            <Link href="/editor" className={navLink}>
              Editor
            </Link>
          )}
          {authEnabled &&
            (email ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className={navLink} title={email}>
                  Salir
                </button>
              </form>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
              >
                <button type="submit" className={navLink}>
                  Ingresar
                </button>
              </form>
            ))}
        </nav>
      </div>
    </header>
  );
}
