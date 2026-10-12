
export default function BookLoading() {
  return (
      <main
        id="contenido"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando libro…
        </span>
        <div className="h-8 w-2/3 max-w-full animate-pulse rounded bg-paper-sunken" />
        <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-paper-sunken" />
        <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-paper-sunken" />
        <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 15 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-md bg-paper-sunken"
            />
          ))}
        </div>
      </main>
  );
}
