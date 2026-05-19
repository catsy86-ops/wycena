"use client";

import { useState, useEffect } from "react";
import { Minimize2, Maximize2 } from "lucide-react";

const STORAGE_KEY = "gksystem_compact_mode";

/**
 * Przełącznik trybu kompaktowego.
 * Dodaje klasę `compact` do <html> — zmniejsza paddingi i font.
 */
export function CompactModeToggle() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) === "true";
    setCompact(saved);
    if (saved) document.documentElement.classList.add("compact");
  }, []);

  function toggle() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    if (next) {
      document.documentElement.classList.add("compact");
    } else {
      document.documentElement.classList.remove("compact");
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label={compact ? "Tryb komfortowy" : "Tryb kompaktowy"}
      title={compact ? "Tryb komfortowy" : "Tryb kompaktowy"}
    >
      {compact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{compact ? "Komfort" : "Kompakt"}</span>
    </button>
  );
}
