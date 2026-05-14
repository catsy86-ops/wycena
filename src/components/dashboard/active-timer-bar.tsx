"use client";

import { useState, useEffect } from "react";
import { Clock, StopCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTimeStore } from "@/store/time-store";

export function ActiveTimerBar() {
  const activeTimer = useTimeStore((s) => s.activeTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(activeTimer.startTime).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="card-modern rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{activeTimer.description || "Bez opisu"}</div>
              <div className="text-xs text-muted-foreground truncate">{activeTimer.clientName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <div className="font-mono text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {timeStr}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => stopTimer()}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
            >
              <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
