export const LIVE_MIN_CHARS = 2;
export const LIVE_DELAY_MS = 300;

/**
 * Href for a search-as-you-type update: sets `q`, keeps every other param,
 * drops `pagina`. Returns `null` when the input is too short to search yet;
 * blank input clears `q`.
 */
export function liveSearchHref(
  basePath: string,
  currentSearch: string,
  input: string,
): string | null {
  const q = input.trim();
  if (q.length > 0 && q.length < LIVE_MIN_CHARS) return null;
  const params = new URLSearchParams(currentSearch);
  params.delete("pagina");
  if (q) params.set("q", q);
  else params.delete("q");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Trailing debounce; timers are injectable for tests. */
export function createDebouncer<T>(
  fn: (value: T) => void,
  delay = LIVE_DELAY_MS,
  timers: {
    set: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
    clear: (id: ReturnType<typeof setTimeout>) => void;
  } = { set: (cb, ms) => setTimeout(cb, ms), clear: (id) => clearTimeout(id) },
) {
  let id: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (id !== undefined) timers.clear(id);
    id = undefined;
  };
  return {
    call(value: T) {
      cancel();
      id = timers.set(() => {
        id = undefined;
        fn(value);
      }, delay);
    },
    cancel,
  };
}
