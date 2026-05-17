"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { pl } from "date-fns/locale";

interface RelativeTimeProps {
  date: Date | string;
  /** Pokaż pełną datę w tooltip */
  showTooltip?: boolean;
  className?: string;
}

/**
 * Komponent wyświetlający czas relatywny ("2 godziny temu").
 * Aktualizuje się co minutę.
 * Hover pokazuje pełną datę.
 */
export function RelativeTime({ date, showTooltip = true, className }: RelativeTimeProps) {
  const [, setTick] = useState(0);
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Aktualizuj co minutę
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const relative = formatDistanceToNow(dateObj, { addSuffix: true, locale: pl });
  const full = format(dateObj, "dd.MM.yyyy HH:mm", { locale: pl });

  if (showTooltip) {
    return (
      <time dateTime={dateObj.toISOString()} title={full} className={className}>
        {relative}
      </time>
    );
  }

  return (
    <time dateTime={dateObj.toISOString()} className={className}>
      {relative}
    </time>
  );
}
