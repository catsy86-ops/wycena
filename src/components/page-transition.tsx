"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/* ─── Warianty przejść ─── */

const PIPE_VARIANTS = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.25,
      ease: "easeIn" as const,
    },
  },
};

const STAGGER_CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const STAGGER_ITEM_VARIANTS = {
  hidden: {
    opacity: 0,
    y: 18,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.38,
      ease: "easeOut" as const,
    },
  },
};

/* ─── Pasek postępu "rury" przy ładowaniu ─── */
function PipeProgressBar() {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none"
      style={{
        background: "linear-gradient(90deg, oklch(0.52 0.19 220), oklch(0.62 0.17 195), oklch(0.52 0.19 220))",
        backgroundSize: "200% 100%",
      }}
      initial={{ scaleX: 0, transformOrigin: "left" }}
      animate={{
        scaleX: [0, 0.3, 0.6, 0.8, 1],
        backgroundPosition: ["0% 0", "100% 0"],
      }}
      exit={{ opacity: 0 }}
      transition={{
        scaleX: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        backgroundPosition: { duration: 1, repeat: Infinity, ease: "linear" },
      }}
    />
  );
}

/* ─── Główny wrapper przejścia ─── */
interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <>
      <PipeProgressBar />
      <motion.div
        key={pathname}
        variants={PIPE_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: "clip-path, opacity, transform" }}
      >
        {children}
      </motion.div>
    </>
  );
}

/* ─── Stagger container ─── */
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  delay = 0.05,
  staggerDelay = 0.07,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Stagger item ─── */
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={STAGGER_ITEM_VARIANTS}
    >
      {children}
    </motion.div>
  );
}

/* ─── Efekt "spawu" — pojawienie się z iskrami ─── */
interface WeldRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function WeldReveal({ children, className, delay = 0 }: WeldRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Efekt "rury" — wjazd z lewej ─── */
interface PipeSlideProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right" | "up" | "down";
}

export function PipeSlide({
  children,
  className,
  delay = 0,
  direction = "left",
}: PipeSlideProps) {
  const initial = {
    left:  { x: -40, opacity: 0 },
    right: { x: 40,  opacity: 0 },
    up:    { y: -30, opacity: 0 },
    down:  { y: 30,  opacity: 0 },
  }[direction];

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Licznik z animacją "ciśnienia" ─── */
interface PressureCountProps {
  value: number;
  className?: string;
}

export function PressureCount({ value, className }: PressureCountProps) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ scale: 1.3, opacity: 0, filter: "blur(4px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {value}
    </motion.span>
  );
}
