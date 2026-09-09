"use client";

import Link from "next/link";
import { motion, useAnimation } from "framer-motion";
import { sounds } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BrandLogoProps {
  size?: "sm" | "default" | "lg" | "xl";
  collapsed?: boolean;
  showTagline?: boolean;
  showBadge?: boolean;
  interactive?: boolean;
  href?: string;
  className?: string;
}

export function BrandLogo({
  size = "default",
  collapsed = false,
  showTagline = true,
  showBadge = true,
  interactive = true,
  href = "/",
  className,
}: BrandLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();

  // Rozmiary dla poszczególnych wariantów
  const dims = {
    sm: {
      box: "h-8 w-8",
      svg: 20,
      title: "text-base tracking-tight",
      tagline: "text-[8px] tracking-[0.15em]",
      badge: "text-[8px] px-1 py-0",
      gap: "gap-2.5",
    },
    default: {
      box: "h-10 w-10",
      svg: 24,
      title: "text-xl tracking-tight",
      tagline: "text-[9px] tracking-[0.2em]",
      badge: "text-[9px] px-1.5 py-0.5",
      gap: "gap-3",
    },
    lg: {
      box: "h-12 w-12",
      svg: 28,
      title: "text-2xl tracking-tight",
      tagline: "text-[10px] tracking-[0.22em]",
      badge: "text-[10px] px-2 py-0.5",
      gap: "gap-3.5",
    },
    xl: {
      box: "h-16 w-16",
      svg: 36,
      title: "text-3xl sm:text-4xl tracking-tight",
      tagline: "text-xs tracking-[0.25em]",
      badge: "text-xs px-2.5 py-1",
      gap: "gap-4",
    },
  }[size];

  const handleClick = () => {
    if (interactive) {
      sounds.playClick(1080);
      controls.start({
        scale: [1, 1.15, 0.95, 1.05, 1],
        rotate: [0, -10, 8, -4, 0],
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  };

  const Content = (
    <div
      className={cn(
        "flex items-center select-none group cursor-pointer",
        dims.gap,
        className
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        if (interactive) sounds.playClick(950);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* ── 1. EMBLEM (SYGNET) ── */}
      <div className="relative shrink-0">
        {/* Zewnętrzna pulsująca neonowa aura (Cyan + Amber) */}
        <motion.div
          className={cn(
            "absolute -inset-1 rounded-2xl blur-md pointer-events-none transition-opacity duration-300",
            isHovered ? "opacity-90 scale-110" : "opacity-45"
          )}
          style={{
            background:
              "radial-gradient(circle at 30% 30%, oklch(0.65 0.19 215 / 0.7), oklch(0.75 0.19 65 / 0.5))",
          }}
          animate={{
            scale: isHovered ? [1.1, 1.25, 1.1] : [1, 1.12, 1],
            opacity: isHovered ? [0.8, 1, 0.8] : [0.35, 0.6, 0.35],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Dynamiczny pierścień z obrotem światła */}
        <div
          className={cn(
            "relative rounded-xl p-[1.5px] overflow-hidden",
            dims.box
          )}
          style={{
            background:
              "linear-gradient(135deg, oklch(0.70 0.18 215), oklch(0.80 0.18 65), oklch(0.60 0.19 225))",
            boxShadow:
              "0 4px 18px oklch(0.55 0.19 215 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.4)",
          }}
        >
          {/* Efekt obracającego się promienia światła */}
          <motion.div
            className="absolute -inset-[100%] pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, oklch(0.85 0.18 65 / 0.8) 60deg, transparent 120deg, oklch(0.75 0.19 215 / 0.9) 240deg, transparent 360deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Rdzeń emblematu (wewnętrzne tło ze szkłem) */}
          <motion.div
            animate={controls}
            whileHover={{ scale: 1.05 }}
            className="relative w-full h-full rounded-[10px] flex items-center justify-center overflow-hidden"
            style={{
              background:
                "linear-gradient(145deg, oklch(0.18 0.03 235), oklch(0.11 0.025 240))",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Siatka technologiczna w tle sygnetu */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(1 0 0 / 0.2) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.2) 1px, transparent 1px)",
                backgroundSize: "6px 6px",
              }}
            />

            {/* Główny SVG: Fuzja kropli (Hydraulika) i błyskawicy (Elektryka) */}
            <svg
              width={dims.svg}
              height={dims.svg}
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            >
              <defs>
                {/* Gradient kropli wody: głęboki błękit do jasnego turkusu */}
                <linearGradient id="dropGradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>

                {/* Gradient błyskawicy: energetyczny neonowy amber / złoto */}
                <linearGradient id="boltGradient" x1="12" y1="6" x2="22" y2="26" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>

                {/* Blask neonowy */}
                <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Płynna kropla hydrauliczna (kontur i korpus) */}
              <motion.path
                d="M16 3.5 C16 3.5 8 13.5 8 19.5 C8 24.2 11.6 28 16 28 C20.4 28 24 24.2 24 19.5 C24 13.5 16 3.5 16 3.5 Z"
                fill="url(#dropGradient)"
                opacity="0.85"
                animate={
                  isHovered
                    ? { scale: [1, 1.04, 0.98, 1] }
                    : { scale: [1, 1.02, 1] }
                }
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Połysk na kropli (water specular reflection) */}
              <path
                d="M12 14 C10.5 16.5 10.5 19 11 21 C10 19.5 10 17 11.5 14.5 C12 13.6 12.8 12.5 13.5 11.5 C12.8 12.3 12.3 13.2 12 14 Z"
                fill="white"
                opacity="0.45"
              />

              {/* Błyskawica elektryczna (przecinająca kroplę energii) */}
              <motion.path
                d="M17.5 6.5 L11.5 16.5 H16.5 L14.5 25.5 L22 14.5 H17 L19 6.5 Z"
                fill="url(#boltGradient)"
                filter="url(#logoGlow)"
                stroke="#fff"
                strokeWidth="0.5"
                animate={
                  isHovered
                    ? {
                        opacity: [1, 0.7, 1, 0.9, 1],
                        scale: [1, 1.08, 1],
                      }
                    : {
                        opacity: [0.95, 1, 0.95],
                      }
                }
                transition={{ duration: 1.2, repeat: Infinity }}
              />

              {/* Drobna iskra wierzchołkowa */}
              <motion.circle
                cx="14.5"
                cy="25.5"
                r="1.2"
                fill="#fef08a"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </svg>

            {/* Mikro-błysk świetlny przechodzący pod kątem */}
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background:
                  "linear-gradient(105deg, transparent 35%, oklch(1 0 0 / 0.5) 50%, transparent 65%)",
              }}
              animate={{ x: ["-150%", "200%"] }}
              transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>
        </div>
      </div>

      {/* ── 2. WORDMARK (LOGOTYP TEKSTOWY) ── */}
      {!collapsed && (
        <div className="flex flex-col justify-center min-w-0 text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={cn("font-black tracking-tight", dims.title)}
              style={{
                background:
                  "linear-gradient(180deg, #ffffff 15%, oklch(0.92 0.02 220) 70%, oklch(0.78 0.03 230) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}
            >
              Wycen
            </span>

            {/* "ka" z neonowym akcentem i gradientem Cyan -> Amber */}
            <span
              className={cn(
                "font-black tracking-tight relative",
                dims.title
              )}
              style={{
                background:
                  "linear-gradient(135deg, #38bdf8 0%, #22d3ee 40%, #fbbf24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 8px oklch(0.65 0.19 215 / 0.5))",
              }}
            >
              ka
              {/* Mikro-iskra nad literką "a" */}
              <motion.span
                className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 pointer-events-none shadow-[0_0_8px_#fbbf24]"
                animate={{
                  scale: [1, 1.5, 0.9, 1.4, 1],
                  opacity: [0.7, 1, 0.6, 1, 0.7],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </span>

            {/* Pigułka PRO z neonową ramką */}
            {showBadge && (
              <motion.span
                className={cn(
                  "font-extrabold uppercase rounded-full tracking-wider border shadow-xs ml-0.5",
                  dims.badge
                )}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.60 0.19 215 / 0.25), oklch(0.72 0.18 60 / 0.25))",
                  borderColor: "oklch(0.70 0.18 215 / 0.45)",
                  color: "#f8fafc",
                }}
                whileHover={{ scale: 1.08 }}
              >
                PRO
              </motion.span>
            )}
          </div>

          {/* Podpis branżowy: HYDRAULIKA • ELEKTRYKA */}
          {showTagline && size !== "sm" && (
            <motion.div
              className={cn(
                "font-bold uppercase flex items-center gap-1.5 mt-0.5 text-slate-400 dark:text-slate-400/90",
                dims.tagline
              )}
              initial={{ opacity: 0.8 }}
              animate={isHovered ? { opacity: 1, color: "#93c5fd" } : { opacity: 0.8 }}
            >
              <span className="text-cyan-400/90 font-medium">Hydraulika</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-500/80" />
              <span className="text-amber-400/90 font-medium">Elektryka</span>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {Content}
      </Link>
    );
  }

  return Content;
}
