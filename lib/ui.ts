/**
 * Clases de UI compartidas: única fuente de verdad para botones, inputs y
 * tarjetas. Evita repetir las mismas cadenas de Tailwind en cada componente.
 */

export const card = "rounded-lg border border-line bg-paper-raised";

export const inputBase =
  "w-full rounded-md border border-line-strong bg-paper-raised px-4 py-3 text-ink placeholder:text-ink-faint focus-visible:border-accent";

export const labelBase = "block text-sm font-semibold text-ink";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimarySm =
  "inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover";

export const btnOutline =
  "inline-flex items-center justify-center rounded-md border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent";

export const btnOutlineDisabled =
  "inline-flex items-center justify-center rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink-faint";

export const spinnerOnAccent =
  "size-4 animate-spin rounded-full border-2 border-accent-ink/40 border-t-accent-ink";

export const spinnerNeutral =
  "size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent";
