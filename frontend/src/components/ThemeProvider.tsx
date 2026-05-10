"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "veranda-theme";
const DEFAULT_THEME: Theme = "dark";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

/**
 * Inline script that runs *before* React hydrates so the html[data-theme]
 * attribute is set on the very first paint — eliminates FOUC.
 *
 * Stored as a stringified IIFE so it can be embedded via
 * `dangerouslySetInnerHTML` in <head>.
 */
export const themeBootstrapScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var prefersLight = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (prefersLight ? 'light' : '${DEFAULT_THEME}');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
  }
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The bootstrap script has already set data-theme on <html> before
  // hydration. To avoid an SSR/CSR mismatch we always start with the
  // SAME default the script falls back to (DEFAULT_THEME), then resync
  // from the actual html attribute in a layout effect on the client.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const attr = document.documentElement.getAttribute("data-theme");
    const resolved: Theme = attr === "light" ? "light" : "dark";
    if (resolved !== theme) setThemeState(resolved);
    // Run only on mount — subsequent flips happen via applyTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        /* ignore quota/private-mode failures */
      }
    }
    setThemeState(t);
    // Fire a custom event so non-React consumers (canvas redraw, etc.)
    // can react to the change without polling.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("veranda:themechange", { detail: { theme: t } }),
      );
    }
  }, []);

  // Sync across browser tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const next = e.newValue === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      setThemeState(next);
      window.dispatchEvent(
        new CustomEvent("veranda:themechange", { detail: { theme: next } }),
      );
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme: applyTheme,
      toggle: () => applyTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme, applyTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback for components rendered outside the provider —
    // e.g. during a partial mount. Returns a no-op shim.
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Hook for canvas / non-React paint code: returns a counter that bumps
 * every time the theme changes. Add it to your effect deps to trigger
 * a redraw with the freshly-resolved CSS variable values.
 */
export function useThemeRevision(): number {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const onChange = () => setRev((r) => r + 1);
    window.addEventListener("veranda:themechange", onChange);
    return () => window.removeEventListener("veranda:themechange", onChange);
  }, []);
  return rev;
}
