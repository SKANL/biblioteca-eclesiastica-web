import "server-only";
import { cache } from "react";
import { SignJWT } from "jose";

/**
 * Server-only bridge to the API's editor endpoints. Tokens are minted here and
 * never reach the browser. Contract (see pipeline-OCR app/security.py): HS256
 * with API_AUTH_SECRET (= the API's AUTH_SECRET), claims sub=email, email,
 * iat, exp (300 s), iss "biblioteca-web", aud "biblioteca-api".
 */

const TOKEN_TTL = 300; // seconds; the API accepts at most 600

export type Rol = "editor" | "admin" | null;

export interface Me {
  email: string;
  rol: Rol;
}

export async function mintApiToken(
  email: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (!secret) throw new Error("API_AUTH_SECRET no está configurado.");
  if (!normalized) throw new Error("Falta el email del usuario.");
  return new SignJWT({ email: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalized)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL)
    .setIssuer("biblioteca-web")
    .setAudience("biblioteca-api")
    .sign(new TextEncoder().encode(secret));
}

export function canEdit(rol: string | null | undefined): boolean {
  return rol === "editor" || rol === "admin";
}

const SERVER_API_BASE = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/+$/, "");

/** Calls the API as `email` with a freshly minted bearer token (see `apiFetchAsSignedIn` in auth.ts). */
export async function apiFetchAs(
  email: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await mintApiToken(email, process.env.API_AUTH_SECRET ?? "");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${SERVER_API_BASE}${path}`, { cache: "no-store", ...init, headers });
}

/**
 * `{email, rol}` from `GET /api/v1/yo`; `null` when the API is unreachable or
 * rejects (logged, so a misconfigured secret/URL is visible). Deduped per request.
 */
export const getMe = cache(async (email: string): Promise<Me | null> => {
  try {
    const res = await apiFetchAs(email, "/api/v1/yo", { signal: AbortSignal.timeout(3000) });
    if (res.ok) return (await res.json()) as Me;
    console.error(`getMe: GET /api/v1/yo -> ${res.status} (check API_AUTH_SECRET / API_BASE_URL)`);
  } catch (err) {
    console.error("getMe: API unreachable or not configured:", err);
  }
  return null; // treated as non-editor
});
