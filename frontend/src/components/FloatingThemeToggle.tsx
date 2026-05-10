"use client";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Page-corner mount point for the theme toggle. Pinned to the bottom
 * of the viewport so it never collides with per-page headers.
 */
export function FloatingThemeToggle() {
  /* Bottom-left: avoids covering right-aligned primary CTAs (onboarding review,
     deposit, etc.) which sit in the same corner on narrow viewports. */
  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      <ThemeToggle />
    </div>
  );
}
