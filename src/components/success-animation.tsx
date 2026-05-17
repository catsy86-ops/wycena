"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useState, useCallback } from "react";

/**
 * Animacja sukcesu — checkmark z kółkiem.
 * Pojawia się na 1.5s po triggerze.
 */
export function SuccessAnimation({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "oklch(0.55 0.18 155 / 0.15)", border: "2px solid oklch(0.55 0.18 155 / 0.4)" }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Check className="h-10 w-10" style={{ color: "oklch(0.55 0.18 155)" }} strokeWidth={3} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook do triggerowania animacji sukcesu.
 */
export function useSuccessAnimation() {
  const [show, setShow] = useState(false);

  const trigger = useCallback(() => {
    setShow(true);
    setTimeout(() => setShow(false), 1500);
  }, []);

  return { show, trigger };
}
