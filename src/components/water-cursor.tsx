"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Droplet {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  life: number;
}

/**
 * Efekt wody podążający za kursorem.
 * Tworzy krople i fale wody przy ruchu myszy.
 * Respektuje prefers-reduced-motion.
 * Tylko desktop (ukryty na touch devices).
 */
export function WaterCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropletsRef = useRef<Droplet[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, moving: false });
  const frameRef = useRef<number>(0);
  const idCounter = useRef(0);
  const lastSpawn = useRef(0);
  const [enabled, setEnabled] = useState(true);

  // Check reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setEnabled(false);
    // Check touch device
    if ("ontouchstart" in window) setEnabled(false);
  }, []);

  const spawnDroplet = useCallback((x: number, y: number) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    dropletsRef.current.push({
      id: idCounter.current++,
      x,
      y,
      size: 2 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.5, // gravity bias
      life: 1,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking
    function handleMouseMove(e: MouseEvent) {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.moving = true;

      // Spawn droplets with throttle
      const now = Date.now();
      if (now - lastSpawn.current > 30) {
        lastSpawn.current = now;
        // Spawn 1-2 droplets per move
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          spawnDroplet(
            e.clientX + (Math.random() - 0.5) * 10,
            e.clientY + (Math.random() - 0.5) * 10
          );
        }
      }
    }

    function handleMouseStop() {
      mouseRef.current.moving = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseStop);

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const droplets = dropletsRef.current;

      // Update and draw droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];

        // Physics
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.03; // gravity
        d.vx *= 0.98; // friction
        d.life -= 0.015;
        d.opacity = d.life * 0.5;
        d.size *= 0.995;

        // Remove dead droplets
        if (d.life <= 0 || d.opacity <= 0.01) {
          droplets.splice(i, 1);
          continue;
        }

        // Draw droplet
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);

        // Water gradient
        const gradient = ctx.createRadialGradient(
          d.x - d.size * 0.3, d.y - d.size * 0.3, 0,
          d.x, d.y, d.size
        );
        gradient.addColorStop(0, `rgba(96, 165, 250, ${d.opacity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${d.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(37, 99, 235, ${d.opacity * 0.2})`);

        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(d.x - d.size * 0.25, d.y - d.size * 0.25, d.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${d.opacity * 0.4})`;
        ctx.fill();
      }

      // Draw cursor glow when moving
      if (mouseRef.current.moving && droplets.length > 0) {
        const { x, y } = mouseRef.current;
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        glowGradient.addColorStop(0, "rgba(96, 165, 250, 0.08)");
        glowGradient.addColorStop(1, "rgba(96, 165, 250, 0)");
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }

      // Limit max droplets for performance
      if (droplets.length > 60) {
        droplets.splice(0, droplets.length - 60);
      }

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseStop);
    };
  }, [enabled, spawnDroplet]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9998] hidden md:block"
      style={{ mixBlendMode: "screen" }}
      aria-hidden="true"
    />
  );
}
