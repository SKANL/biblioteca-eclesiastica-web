import Link from "next/link";

const navLink =
  "rounded-md px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-accent";

export default function SiteHeader() {
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
        </nav>
      </div>
    </header>
  );
}
