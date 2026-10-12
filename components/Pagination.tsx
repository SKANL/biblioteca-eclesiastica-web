import Link from "next/link";
import { btnOutline } from "@/lib/ui";

interface PaginationProps {
  basePath: string;
  params: Record<string, string>;
  page: number;
  limit: number;
  total: number;
}

function buildHref(
  basePath: string,
  params: Record<string, string>,
  page: number,
): string {
  const sp = new URLSearchParams(params);
  if (page > 1) sp.set("pagina", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({
  basePath,
  params,
  page,
  limit,
  total,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación de resultados"
      className="mt-8 flex items-center justify-between gap-4"
    >
      {hasPrev ? (
        <Link href={buildHref(basePath, params, page - 1)} className={btnOutline}>
          Anterior
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${btnOutline} cursor-not-allowed opacity-50`}
        >
          Anterior
        </span>
      )}

      <span className="text-sm text-ink-soft">
        Página {page} de {totalPages}
      </span>

      {hasNext ? (
        <Link href={buildHref(basePath, params, page + 1)} className={btnOutline}>
          Siguiente
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${btnOutline} cursor-not-allowed opacity-50`}
        >
          Siguiente
        </span>
      )}
    </nav>
  );
}
