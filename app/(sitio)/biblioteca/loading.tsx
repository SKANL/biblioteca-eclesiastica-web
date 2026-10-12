
export default function BibliotecaLoading() {
  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando catálogo…
        </span>
        <div className="h-8 w-56 max-w-full animate-pulse rounded bg-paper-sunken" />
        <div className="mt-6 h-44 animate-pulse rounded-lg bg-paper-sunken" />
        <div className="mt-8 space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="border-b border-line pb-6">
              <div className="h-6 w-2/3 animate-pulse rounded bg-paper-sunken" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-paper-sunken" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-paper-sunken" />
            </div>
          ))}
        </div>
      </main>
  );
}
