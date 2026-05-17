"use client";

import { motion } from "framer-motion";

/**
 * Ilustracja SVG — hydraulik z kluczem (dla pustych stanów wycen/usług).
 */
export function PlumberIllustration({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className || "w-24 h-24"}
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.6, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Rura */}
      <rect x="10" y="50" width="100" height="8" rx="4" fill="oklch(0.52 0.19 220 / 0.3)" />
      <rect x="10" y="50" width="100" height="8" rx="4" stroke="oklch(0.52 0.19 220 / 0.5)" strokeWidth="1" />
      {/* Złączka */}
      <circle cx="60" cy="54" r="8" fill="oklch(0.52 0.19 220 / 0.2)" stroke="oklch(0.52 0.19 220 / 0.4)" strokeWidth="1.5" />
      <circle cx="60" cy="54" r="3" fill="oklch(0.52 0.19 220 / 0.4)" />
      {/* Klucz */}
      <motion.g
        animate={{ rotate: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 54px" }}
      >
        <rect x="55" y="20" width="10" height="30" rx="3" fill="oklch(0.62 0.17 195 / 0.4)" />
        <rect x="50" y="15" width="20" height="10" rx="5" fill="oklch(0.62 0.17 195 / 0.3)" stroke="oklch(0.62 0.17 195 / 0.5)" strokeWidth="1" />
      </motion.g>
      {/* Kropla */}
      <motion.ellipse
        cx="60" cy="75"
        rx="4" ry="5"
        fill="oklch(0.62 0.17 195 / 0.4)"
        animate={{ y: [0, 8, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Nity */}
      <circle cx="20" cy="54" r="2" fill="oklch(0.52 0.19 220 / 0.3)" />
      <circle cx="100" cy="54" r="2" fill="oklch(0.52 0.19 220 / 0.3)" />
      {/* Tekst */}
      <text x="60" y="100" textAnchor="middle" fontSize="8" fill="oklch(0.52 0.19 220 / 0.4)" fontWeight="bold">
        Brak danych
      </text>
    </motion.svg>
  );
}

/**
 * Ilustracja SVG — dokument (dla pustych stanów wycen).
 */
export function DocumentIllustration({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className || "w-20 h-20"}
      viewBox="0 0 100 100"
      fill="none"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.6, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dokument */}
      <rect x="20" y="10" width="60" height="80" rx="4" fill="oklch(0.52 0.19 220 / 0.08)" stroke="oklch(0.52 0.19 220 / 0.3)" strokeWidth="1.5" />
      {/* Linie tekstu */}
      <rect x="30" y="25" width="40" height="3" rx="1.5" fill="oklch(0.52 0.19 220 / 0.2)" />
      <rect x="30" y="35" width="35" height="3" rx="1.5" fill="oklch(0.52 0.19 220 / 0.15)" />
      <rect x="30" y="45" width="30" height="3" rx="1.5" fill="oklch(0.52 0.19 220 / 0.1)" />
      {/* Plus */}
      <motion.g
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <circle cx="70" cy="70" r="12" fill="oklch(0.52 0.19 220 / 0.15)" stroke="oklch(0.52 0.19 220 / 0.3)" strokeWidth="1.5" />
        <line x1="70" y1="64" x2="70" y2="76" stroke="oklch(0.52 0.19 220 / 0.5)" strokeWidth="2" strokeLinecap="round" />
        <line x1="64" y1="70" x2="76" y2="70" stroke="oklch(0.52 0.19 220 / 0.5)" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  );
}

/**
 * Ilustracja SVG — osoby (dla pustych stanów klientów).
 */
export function PeopleIllustration({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className || "w-20 h-20"}
      viewBox="0 0 100 100"
      fill="none"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.6, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Osoba 1 */}
      <circle cx="40" cy="35" r="10" fill="oklch(0.52 0.19 220 / 0.2)" stroke="oklch(0.52 0.19 220 / 0.3)" strokeWidth="1.5" />
      <path d="M25 70 Q25 55 40 55 Q55 55 55 70" fill="oklch(0.52 0.19 220 / 0.15)" stroke="oklch(0.52 0.19 220 / 0.3)" strokeWidth="1.5" />
      {/* Osoba 2 */}
      <circle cx="65" cy="40" r="8" fill="oklch(0.62 0.17 195 / 0.2)" stroke="oklch(0.62 0.17 195 / 0.3)" strokeWidth="1.5" />
      <path d="M53 72 Q53 60 65 60 Q77 60 77 72" fill="oklch(0.62 0.17 195 / 0.15)" stroke="oklch(0.62 0.17 195 / 0.3)" strokeWidth="1.5" />
      {/* Plus */}
      <motion.circle
        cx="80" cy="25" r="8"
        fill="oklch(0.55 0.18 155 / 0.15)"
        stroke="oklch(0.55 0.18 155 / 0.3)"
        strokeWidth="1.5"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <line x1="80" y1="21" x2="80" y2="29" stroke="oklch(0.55 0.18 155 / 0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="76" y1="25" x2="84" y2="25" stroke="oklch(0.55 0.18 155 / 0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </motion.svg>
  );
}
