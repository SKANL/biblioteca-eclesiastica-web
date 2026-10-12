/** Per-device reader preferences in localStorage (may be unavailable: private mode, blocked storage). */

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const local = (): Storage | undefined => (typeof localStorage === "undefined" ? undefined : localStorage);

export function readPref<T extends string>(
  key: string,
  allowed: readonly T[] | RegExp,
  fallback: T,
  storage: Storage | undefined = local(),
): T {
  try {
    const value = storage?.getItem(key) ?? null;
    const ok = value !== null && (allowed instanceof RegExp ? allowed.test(value) : allowed.includes(value as T));
    return ok ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string, storage: Storage | undefined = local()): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // ponytail: storage full/blocked → preference just isn't remembered
  }
}

/** Leading call runs now; later calls inside `ms` collapse into one trailing call with the latest args. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let last = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A;
  return (...args: A) => {
    pending = args;
    const wait = last + ms - Date.now();
    if (wait <= 0 && !timer) {
      last = Date.now();
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = undefined;
        last = Date.now();
        fn(...pending);
      }, wait);
    }
  };
}

export const TEXT_SCALES = ["0.875", "1", "1.125", "1.25", "1.5"] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export function stepScale(current: string, direction: 1 | -1): TextScale {
  const i = TEXT_SCALES.indexOf(current as TextScale);
  const next = (i < 0 ? 1 : i) + direction;
  return TEXT_SCALES[Math.min(TEXT_SCALES.length - 1, Math.max(0, next))];
}

export const PREF = {
  view: "bve:vista", // "imagen" | "texto"
  theme: "bve:tema", // "system" | "light" | "dark"
  scale: "bve:texto",
  progress: (libroId: string) => `bve:progreso:${libroId}`,
};
