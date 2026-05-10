"use client";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Page-corner mount point for the theme toggle. Pinned to the bottom
 * of the viewport so it never collides with per-page headers.
 */
export function FloatingThemeToggle() {
  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      <ThemeToggle />
    </div>
  );
}
