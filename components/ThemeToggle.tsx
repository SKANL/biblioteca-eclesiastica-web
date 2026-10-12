"use client";

import { useEffect } from "react";
import { PREF } from "@/lib/prefs";
import { usePref } from "@/components/usePref";

const THEMES = ["system", "light", "dark"] as const;
const LABELS = { system: "Tema del sistema", light: "Tema claro", dark: "Tema oscuro" };

/** Cycles system → light → dark. The first paint is set by the script in app/layout.tsx. */
export default function ThemeToggle({ className }: { className: string }) {
  const [theme, setTheme] = usePref(PREF.theme, THEMES, "system");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  return (
    <button type="button" className={className} onClick={() => setTheme(next)}
      aria-label={`${LABELS[theme]}. Cambiar a ${LABELS[next].toLowerCase()}`}>
      {theme === "dark" ? "Oscuro" : theme === "light" ? "Claro" : "Auto"}
    </button>
  );
}
