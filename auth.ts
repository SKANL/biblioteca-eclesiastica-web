import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { apiFetchAs } from "@/lib/server/api";

/**
 * Auth.js v5: Google only, JWT session (no DB adapter). Reads AUTH_SECRET,
 * AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET. Without them login is hidden and the
 * public reading flow keeps working.
 */
export const authEnabled = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
});

/** Signed-in user's email, or null (also when auth is not configured). */
export async function sessionEmail(): Promise<string | null> {
  if (!authEnabled) return null;
  return (await auth())?.user?.email ?? null;
}

/** Calls the API as the signed-in user. For Server Actions / Route Handlers. */
export async function apiFetchAsEditor(path: string, init?: RequestInit): Promise<Response> {
  const email = await sessionEmail();
  if (!email) throw new Error("Sesión requerida.");
  return apiFetchAs(email, path, init);
}
