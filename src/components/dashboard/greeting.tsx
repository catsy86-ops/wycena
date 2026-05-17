"use client";

import { useMemo } from "react";
import { useSettingsStore } from "@/store/settings-store";
import { useQuoteStore } from "@/store/quote-store";
import { useScheduleStore } from "@/store/schedule-store";
import { motion } from "framer-motion";
import { Wrench, Sun, Moon, CloudSun } from "lucide-react";
import { isToday } from "date-fns";

export function Greeting() {
  const settings = useSettingsStore((s) => s.settings);
  const quotes = useQuoteStore((s) => s.quotes);
  const events = useScheduleStore((s) => s.events);

  const { greeting, icon, summary } = useMemo(() => {
    const hour = new Date().getHours();
    let greeting: string;
    let icon: React.ReactNode;

    if (hour < 6) { greeting = "Dobrej nocy"; icon = <Moon className="h-5 w-5 text-indigo-400" />; }
    else if (hour < 12) { greeting = "Dzień dobry"; icon = <Sun className="h-5 w-5 text-amber-400" />; }
    else if (hour < 18) { greeting = "Cześć"; icon = <CloudSun className="h-5 w-5 text-orange-400" />; }
    else { greeting = "Dobry wieczór"; icon = <Moon className="h-5 w-5 text-indigo-400" />; }

    // Podsumowanie dnia
    const todayEvents = events.filter((e) => e.status !== "anulowane" && isToday(new Date(e.startTime)));
    const todayQuotes = quotes.filter((q) => isToday(new Date(q.createdAt)));
    const parts: string[] = [];
    if (todayEvents.length > 0) parts.push(`${todayEvents.length} ${todayEvents.length === 1 ? "zlecenie" : "zleceń"} na dziś`);
    if (todayQuotes.length > 0) parts.push(`${todayQuotes.length} ${todayQuotes.length === 1 ? "nowa wycena" : "nowe wyceny"}`);
    if (parts.length === 0) parts.push("Brak zaplanowanych zleceń na dziś");

    return { greeting, icon, summary: parts.join(" · ") };
  }, [events, quotes]);

  const name = settings?.name?.split(" ")[0] || "";

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon}
      </motion.div>
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-pipe">
          {greeting}{name ? `, ${name}` : ""}!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{summary}</p>
      </div>
    </motion.div>
  );
}
