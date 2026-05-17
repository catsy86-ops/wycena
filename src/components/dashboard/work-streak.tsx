"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { motion } from "framer-motion";
import { Flame, Zap, Trophy } from "lucide-react";
import { differenceInCalendarDays, subDays, startOfDay, isSameDay } from "date-fns";

export function WorkStreak() {
  const quotes = useQuoteStore((s) => s.quotes);

  const { streak, bestWeek } = useMemo(() => {
    // Oblicz streak — ile dni z rzędu z nową wyceną
    const today = startOfDay(new Date());
    let streak = 0;
    let checkDate = today;

    // Sprawdź czy dziś jest wycena
    const hasToday = quotes.some((q) => isSameDay(new Date(q.createdAt), today));
    if (!hasToday) {
      // Sprawdź wczoraj
      checkDate = subDays(today, 1);
    }

    while (true) {
      const hasQuote = quotes.some((q) => isSameDay(new Date(q.createdAt), checkDate));
      if (hasQuote) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
      if (streak > 365) break; // safety
    }

    // Najlepszy tydzień (max wycen w 7 dniach)
    let bestWeek = 0;
    for (let i = 0; i < 52; i++) {
      const weekStart = subDays(today, (i + 1) * 7);
      const weekEnd = subDays(today, i * 7);
      const count = quotes.filter((q) => {
        const d = new Date(q.createdAt);
        return d >= weekStart && d <= weekEnd;
      }).length;
      bestWeek = Math.max(bestWeek, count);
    }

    return { streak, bestWeek };
  }, [quotes]);

  if (streak === 0 && bestWeek === 0) return null;

  return (
    <div className="flex items-center gap-4">
      {streak > 0 && (
        <motion.div
          className="flex items-center gap-1.5 text-xs font-semibold"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame className={`h-4 w-4 ${streak >= 7 ? "text-orange-500" : streak >= 3 ? "text-amber-500" : "text-muted-foreground"}`} />
          </motion.div>
          <span className={streak >= 7 ? "text-orange-600 dark:text-orange-400" : streak >= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
            {streak} {streak === 1 ? "dzień" : "dni"} z rzędu
          </span>
        </motion.div>
      )}
      {bestWeek > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" />
          <span>Rekord: {bestWeek}/tydzień</span>
        </div>
      )}
    </div>
  );
}
