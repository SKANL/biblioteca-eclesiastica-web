import type {
  BookDetail,
  BookListResponse,
  CitationResponse,
  CitationStyle,
  FacetsResponse,
  PageListResponse,
  PageResponse,
  SearchResponse,
} from "./types";

/**
 * Base URL of the FastAPI backend. Configure with NEXT_PUBLIC_API_BASE_URL.
 * Dev: http://localhost:8000 (see .env.local). Vercel: set the same variable.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** Absolute URL for a page image. The API returns paths like `/media/...`. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor de la biblioteca.",
      0,
    );
  }
  if (!res.ok) {
    throw new ApiError(
      res.status === 404
        ? "No se encontró el recurso solicitado."
        : `El servidor respondió con un error (${res.status}).`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

function query(
  params: Record<string, string | number | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface SearchParams {
  q: string;
  genero?: string;
  autor?: string;
  limit?: number;
  offset?: number;
}

export function getFacets(): Promise<FacetsResponse> {
  return getJson<FacetsResponse>("/api/v1/facets");
}

export function searchPages(params: SearchParams): Promise<SearchResponse> {
  return getJson<SearchResponse>(`/api/v1/search${query({ ...params })}`);
}

export function getBook(libroId: string): Promise<BookDetail> {
  return getJson<BookDetail>(`/api/v1/books/${encodeURIComponent(libroId)}`);
}

export function getPage(libroId: string, numero: number, q?: string): Promise<PageResponse> {
  return getJson<PageResponse>(
    `/api/v1/ref/${encodeURIComponent(libroId)}/pagina/${numero}${query({ q })}`,
  );
}

export function getCitation(
  libroId: string,
  numero: number,
  estilo: CitationStyle,
): Promise<CitationResponse> {
  return getJson<CitationResponse>(
    `/api/v1/cite/${encodeURIComponent(libroId)}/pagina/${numero}${query({ estilo })}`,
  );
}

export interface BooksParams {
  genero?: string;
  autor?: string;
  limit?: number;
  offset?: number;
}

export function getBooks(params: BooksParams = {}): Promise<BookListResponse> {
  return getJson<BookListResponse>(`/api/v1/books${query({ ...params })}`);
}

export function getBookPages(
  libroId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<PageListResponse> {
  return getJson<PageListResponse>(
    `/api/v1/books/${encodeURIComponent(libroId)}/paginas${query({ ...params })}`,
  );
}
