"use client";

/**
 * Skip to content link — widoczny tylko przy nawigacji klawiaturą (Tab).
 * Accessibility: pozwala pominąć nawigację i przejść do treści.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
      style={{ background: "oklch(0.52 0.19 220)" }}
    >
      Przejdź do treści
    </a>
  );
}
