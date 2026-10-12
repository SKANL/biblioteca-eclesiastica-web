import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-ink-soft sm:px-6">
        <Link href="/" className="w-fit font-semibold text-ink hover:underline">
          Biblioteca Virtual Eclesiástica
        </Link>
        <p>Buscador, lector y citador del catálogo de la biblioteca.</p>
      </div>
    </footer>
  );
}
