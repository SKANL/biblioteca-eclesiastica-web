/** The API trusts the email as identity: refuse unverified Google emails. */
export function allowSignIn({
  account,
  profile,
}: {
  account?: { provider?: string } | null;
  profile?: { email_verified?: unknown } | null;
}): boolean {
  return account?.provider !== "google" || profile?.email_verified === true;
}

/**
 * Local-only credentials login for testing the editor area without Google.
 * Requires AUTH_DEV_LOGIN=true plus an explicit AUTH_DEV_EMAILS allowlist, and
 * is always off on Vercel. Returns the allowed (lowercased) emails, or [] = off.
 */
export function devLoginEmails(env: Record<string, string | undefined>): string[] {
  if (env.AUTH_DEV_LOGIN !== "true" || env.VERCEL) return [];
  return (env.AUTH_DEV_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
