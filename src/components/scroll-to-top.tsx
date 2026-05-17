"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * Przycisk "scroll to top" — pojawia się po scrollowaniu w dół.
 * Pozycja: na mobile — nad bottom nav (left side), na desktop — prawy dolny róg.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    function handleScroll() {
      setVisible(main!.scrollTop > 400);
    }

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    const main = document.querySelector("main");
    main?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          onClick={scrollToTop}
          className="fixed z-40 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-colors bottom-[4.5rem] left-4 md:bottom-6 md:left-auto md:right-6"
          style={{
            background: "oklch(0.52 0.19 220 / 0.85)",
            boxShadow: "0 2px 10px oklch(0.52 0.19 220 / 0.25)",
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Przewiń do góry"
        >
          <ArrowUp className="h-4 w-4 text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
