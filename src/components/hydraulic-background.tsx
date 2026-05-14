"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Droplets, Waves, Droplet, Gauge, Wrench, Zap, Flame, Cog } from "lucide-react";

const BUBBLE_COUNT = 20;
const FLOW_LINE_COUNT = 8;
const PARTICLE_ICONS = [Droplets, Waves, Droplet, Gauge, Wrench, Zap, Flame, Cog];

interface Bubble {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface FlowLine {
  id: number;
  top: number;
  duration: number;
  delay: number;
  width: number;
}

interface Particle {
  id: number;
  Icon: React.ComponentType<{ className?: string }>;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
}

function generateBubbles(): Bubble[] {
  return Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 16,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 10,
    opacity: 0.08 + Math.random() * 0.12,
  }));
}

function generateFlowLines(): FlowLine[] {
  return Array.from({ length: FLOW_LINE_COUNT }, (_, i) => ({
    id: i,
    top: 10 + (i * 90) / FLOW_LINE_COUNT,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 5,
    width: 30 + Math.random() * 40,
  }));
}

function generateParticles(): Particle[] {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    Icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length],
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 12 + Math.random() * 20,
    duration: 20 + Math.random() * 25,
    delay: Math.random() * 15,
    rotation: Math.random() * 360,
  }));
}

const bubbles = generateBubbles();
const flowLines = generateFlowLines();
const particles = generateParticles();

const Bubble = memo(({ data }: { data: Bubble }) => (
  <div
    className="absolute rounded-full bg-blue-400/20 dark:bg-blue-300/10"
    style={{
      left: `${data.left}%`,
      width: data.size,
      height: data.size,
      opacity: data.opacity,
      animation: `hydraulic-bubble ${data.duration}s ease-in-out ${data.delay}s infinite`,
      willChange: "transform, opacity",
    }}
  />
));
Bubble.displayName = "Bubble";

const FlowLine = memo(({ data }: { data: FlowLine }) => (
  <div
    className="absolute h-px overflow-hidden"
    style={{
      top: `${data.top}%`,
      left: 0,
      right: 0,
      opacity: 0.15,
    }}
  >
    <div
      className="h-full bg-gradient-to-r from-transparent via-blue-400 to-transparent dark:via-blue-300"
      style={{
        width: `${data.width}%`,
        animation: `hydraulic-flow ${data.duration}s linear ${data.delay}s infinite`,
        willChange: "transform",
      }}
    />
  </div>
));
FlowLine.displayName = "FlowLine";

const Particle = memo(({ data }: { data: Particle }) => (
  <motion.div
    className="absolute text-blue-400/10 dark:text-blue-300/5"
    style={{
      left: `${data.left}%`,
      top: `${data.top}%`,
      width: data.size,
      height: data.size,
    }}
    initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
    animate={{
      opacity: [0, 0.12, 0.12, 0],
      y: [-20, -80, -120, -160],
      x: [-10, 15, -5, 10],
      rotate: [0, data.rotation, data.rotation * 2, data.rotation * 3],
      scale: [0.6, 1, 0.8, 0.4],
    }}
    transition={{
      duration: data.duration,
      delay: data.delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <data.Icon className="h-full w-full" />
  </motion.div>
));
Particle.displayName = "Particle";

export function HydraulicBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ contain: "strict" }}
    >
      {/* Gradient mesh background */}
      <div className="absolute inset-0 hydraulic-gradient-bg" />

      {/* Animated flow lines */}
      <div className="absolute inset-0">
        {flowLines.map((line) => (
          <FlowLine key={line.id} data={line} />
        ))}
      </div>

      {/* Rising bubbles */}
      <div className="absolute inset-0">
        {bubbles.map((bubble) => (
          <Bubble key={bubble.id} data={bubble} />
        ))}
      </div>

      {/* Floating particles with icons */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <Particle key={particle.id} data={particle} />
        ))}
      </div>

      {/* Corner glow effects */}
      <div
        className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-blue-500/10 dark:bg-blue-400/5 blur-3xl"
        style={{
          animation: "hydraulic-glow 8s ease-in-out infinite",
          willChange: "opacity, transform",
        }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-indigo-500/10 dark:bg-indigo-400/5 blur-3xl"
        style={{
          animation: "hydraulic-glow 10s ease-in-out 2s infinite",
          willChange: "opacity, transform",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 dark:bg-cyan-400/3 blur-3xl"
        style={{
          animation: "hydraulic-glow 12s ease-in-out 4s infinite",
          willChange: "opacity, transform",
        }}
      />
    </div>
  );
}
