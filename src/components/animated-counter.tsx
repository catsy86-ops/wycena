"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.5,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  const transformedValue = useTransform(
    motionValue,
    [0, 1],
    [0, value]
  );

  useEffect(() => {
    if (isInView) {
      motionValue.set(1);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = transformedValue.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [transformedValue]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {prefix}
      {displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
      {suffix}
    </motion.span>
  );
}
