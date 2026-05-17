"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/calculations";
import type { Quote } from "@/types";

interface HoverPreviewProps {
  quote: Quote;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<string, string> = {
  szkic: "Szkic", wyslana: "Wysłana", zaakceptowana: "Zaakceptowana", odrzucona: "Odrzucona",
};

/**
 * Hover preview — najechanie na element pokazuje mini-podgląd wyceny.
 */
export function HoverPreview({ quote, children }: HoverPreviewProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleEnter() {
    timeoutRef.current = setTimeout(() => setShow(true), 400);
  }

  function handleLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(false);
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 mt-1 w-56 rounded-lg shadow-xl border p-3 pointer-events-none"
            style={{
              background: "oklch(0.99 0.003 60)",
              borderColor: "oklch(0.88 0.015 55)",
            }}
          >
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-sm">{quote.number}</div>
              <div className="text-muted-foreground">{quote.clientName || "Brak klienta"}</div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{STATUS_LABELS[quote.status]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Brutto:</span>
                <span className="font-bold text-primary">{formatCurrency(quote.totalBrutto)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pozycji:</span>
                <span>{quote.items.length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
