"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = [
  "oklch(0.52 0.19 220)", "oklch(0.62 0.17 195)", "oklch(0.55 0.18 155)",
  "oklch(0.72 0.18 60)", "oklch(0.65 0.20 320)", "oklch(0.60 0.22 280)",
];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

/**
 * Celebration component — shows confetti animation.
 * Usage: <Celebration trigger={showCelebration} onComplete={() => setShowCelebration(false)} />
 */
export function Celebration({ trigger, onComplete }: { trigger: boolean; onComplete?: () => void }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const newPieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, 3500);

    return () => clearTimeout(timer);
  }, [trigger, onComplete]);

  return (
    <AnimatePresence>
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${piece.x}%`,
            top: "-10px",
            width: piece.size,
            height: piece.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: piece.color,
          }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{
            y: "100vh",
            rotate: piece.rotation + 720,
            opacity: [1, 1, 0.8, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: piece.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </AnimatePresence>
  );
}

/**
 * Hook to trigger celebration.
 */
export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);

  function celebrate() {
    setCelebrating(true);
  }

  function onComplete() {
    setCelebrating(false);
  }

  return { celebrating, celebrate, onComplete };
}
