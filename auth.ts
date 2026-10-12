import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { allowSignIn } from "@/lib/auth-policy";
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
  callbacks: {
    signIn: allowSignIn,
  },
});

/** Signed-in user's email, or null (also when auth is not configured). */
export async function sessionEmail(): Promise<string | null> {
  if (!authEnabled) return null;
  return (await auth())?.user?.email ?? null;
}

/**
 * Calls the API as the signed-in user (Server Actions / Route Handlers). Only
 * requires a session: the editor role is enforced by the API (403). Returns
 * null without a session (typed, so callers never match error strings).
 */
export async function apiFetchAsSignedIn(path: string, init?: RequestInit): Promise<Response | null> {
  const email = await sessionEmail();
  return email ? apiFetchAs(email, path, init) : null;
}
