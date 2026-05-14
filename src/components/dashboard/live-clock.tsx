"use client";

import { useState, useEffect } from "react";

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const date = now.toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();
  const greeting = hour < 6 ? "Dobranoc" : hour < 12 ? "Dzień dobry" : hour < 18 ? "Miłego popołudnia" : "Dobry wieczór";

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-gradient font-semibold">{greeting}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>{date}</span>
      </div>
      <div className="font-mono text-lg font-bold text-foreground/80 mt-0.5 tabular-nums">
        {time}
      </div>
    </div>
  );
}
