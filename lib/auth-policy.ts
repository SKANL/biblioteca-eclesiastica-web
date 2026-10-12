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
