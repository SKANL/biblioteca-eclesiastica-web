"use client";

/**
 * Sign-out form that first drops the service worker's HTML caches: cached
 * pages contain the signed-in header (email, editor link) and must not be
 * shown to the next person using this device.
 */
export default function SignOutButton({
  action,
  email,
  className,
}: {
  action: () => Promise<void>;
  email: string;
  className: string;
}) {
  async function clearPageCaches() {
    try {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("bve-") && /-pages$/.test(name))
          .map((name) => caches.delete(name)),
      );
    } catch {
      // Cache Storage unavailable (no SW support, private mode): nothing to clear.
    }
  }

  return (
    <form action={async () => { await clearPageCaches(); await action(); }}>
      <button type="submit" className={className} title={email}>
        Salir
      </button>
    </form>
  );
}
