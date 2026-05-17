"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StickyHeaderProps {
  children: React.ReactNode;
  /** Offset w px po którym header się przykleja */
  offset?: number;
}

/**
 * Sticky header — przykleja się na górze po scrollowaniu.
 * Używaj na stronach z długim scrollem (wyceny, klienci, usługi).
 *
 * Użycie:
 * <StickyHeader>
 *   <h1>Tytuł</h1>
 *   <Button>Akcja</Button>
 * </StickyHeader>
 */
export function StickyHeader({ children, offset = 80 }: StickyHeaderProps) {
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    function handleScroll() {
      setStuck(main!.scrollTop > offset);
    }

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, [offset]);

  return (
    <>
      {/* Sentinel — niewidoczny element do wykrywania scrollu */}
      <div ref={sentinelRef} className="h-0" />

      {/* Sticky bar */}
      <AnimatePresence>
        {stuck && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-0 z-30 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-2.5 border-b backdrop-blur-lg"
            style={{
              background: "oklch(0.97 0.006 60 / 0.85)",
              borderColor: "oklch(0.52 0.19 220 / 0.1)",
            }}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark mode variant */}
      <style jsx global>{`
        .dark .sticky-header-bar {
          background: oklch(0.11 0.018 230 / 0.9) !important;
        }
      `}</style>
    </>
  );
}
