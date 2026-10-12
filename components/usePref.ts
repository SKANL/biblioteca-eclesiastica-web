"use client";

import { useSyncExternalStore } from "react";
import { readPref, writePref } from "@/lib/prefs";

const EVENT = "bve:pref";
// Same-session fallback when localStorage is blocked: the choice still applies until reload.
const session = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** A persisted per-device preference; the server (and hydration) render `fallback`. */
export function usePref<T extends string>(key: string, allowed: readonly T[] | RegExp, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (session.get(key) as T | undefined) ?? readPref(key, allowed, fallback),
    () => fallback,
  );
  const set = (next: T) => {
    session.set(key, next);
    writePref(key, next);
    window.dispatchEvent(new Event(EVENT));
  };
  return [value, set];
}
