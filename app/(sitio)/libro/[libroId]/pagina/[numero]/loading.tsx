
export default function ReaderLoading() {
  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando la página…
        </span>
        <div className="h-8 w-2/3 animate-pulse rounded bg-paper-sunken" />
        <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-paper-sunken" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-paper-sunken" />
        <div className="mt-6 h-12 animate-pulse rounded-md bg-paper-sunken" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-4 w-full animate-pulse rounded bg-paper-sunken"
            />
          ))}
        </div>
      </main>
  );
}
