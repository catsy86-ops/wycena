"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useSettingsStore } from "@/store/settings-store";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Target, TrendingUp, Flame } from "lucide-react";

const DEFAULT_GOAL = 50000;

export function MonthlyGoal() {
  const quotes = useQuoteStore((s) => s.quotes);
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  // Load goal from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gksystem_monthly_goal");
    if (saved) setGoal(parseInt(saved) || DEFAULT_GOAL);
  }, []);

  const { current, percent, daysLeft, dailyNeeded } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const daysLeft = daysInMonth - now.getDate();

    const current = quotes
      .filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= monthStart)
      .reduce((s, q) => s + q.totalBrutto, 0);

    const percent = goal > 0 ? Math.min(100, round((current / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - current);
    const dailyNeeded = daysLeft > 0 ? round(remaining / daysLeft) : 0;

    return { current: round(current), percent, daysLeft, dailyNeeded };
  }, [quotes, goal]);

  const isAchieved = percent >= 100;
  const isClose = percent >= 80 && !isAchieved;

  return (
    <Card className="card-modern overflow-hidden relative">
      {/* Tło — gradient postępu */}
      <motion.div
        className="absolute inset-0 opacity-10"
        style={{
          background: isAchieved
            ? "linear-gradient(135deg, oklch(0.55 0.18 155), oklch(0.50 0.20 165))"
            : "linear-gradient(135deg, oklch(0.52 0.19 220), oklch(0.62 0.17 195))",
        }}
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={{ scaleX: percent / 100 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      <CardContent className="pt-4 p-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isAchieved ? (
              <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}>
                <Flame className="h-5 w-5 text-amber-500" />
              </motion.div>
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            <span className="text-sm font-bold">Cel miesięczny</span>
          </div>
          <span className="text-xs text-muted-foreground">{daysLeft} dni do końca</span>
        </div>

        {/* Gauge / progress */}
        <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: isAchieved
                ? "linear-gradient(90deg, oklch(0.55 0.18 155), oklch(0.65 0.20 130))"
                : isClose
                ? "linear-gradient(90deg, oklch(0.65 0.18 85), oklch(0.72 0.20 60))"
                : "linear-gradient(90deg, oklch(0.52 0.19 220), oklch(0.62 0.17 195))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
          {/* Pulsujący punkt na końcu */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-md"
            style={{ left: `calc(${Math.min(percent, 98)}% - 4px)` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xl font-black">{formatCurrency(current)}</div>
            <div className="text-xs text-muted-foreground">z {formatCurrency(goal)}</div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${isAchieved ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>
              {percent}%
            </div>
            {!isAchieved && dailyNeeded > 0 && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(dailyNeeded)}/dzień
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
