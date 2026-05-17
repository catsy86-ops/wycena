"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Globalne skróty klawiszowe.
 * Ctrl+K = command palette (obsługiwane przez CommandPalette)
 * Ctrl+N = nowa wycena
 * Ctrl+Shift+N = nowy klient
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignoruj gdy focus jest w input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      // Ctrl+N = nowa wycena
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        router.push("/wyceny/nowa");
      }

      // Ctrl+Shift+N = nowy klient (nie implementujemy nawigacji, bo to zależy od kontekstu)
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
