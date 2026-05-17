"use client";

import { useMemo } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import { useTimeStore } from "@/store/time-store";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Gauge, AlertTriangle } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, differenceInMinutes } from "date-fns";

export function WorkloadIndicator() {
  const events = useScheduleStore((s) => s.events);
  const entries = useTimeStore((s) => s.entries);

  const { scheduledHours, workedHours, loadPercent, status } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Godziny zaplanowane (z harmonogramu)
    const weekEvents = events.filter((e) =>
      e.status !== "anulowane" &&
      isWithinInterval(new Date(e.startTime), { start: weekStart, end: weekEnd })
    );
    const scheduledMinutes = weekEvents.reduce((s, e) => {
      return s + differenceInMinutes(new Date(e.endTime), new Date(e.startTime));
    }, 0);
    const scheduledHours = Math.round(scheduledMinutes / 60 * 10) / 10;

    // Godziny przepracowane (z time entries)
    const weekEntries = entries.filter((e) =>
      isWithinInterval(new Date(e.startTime), { start: weekStart, end: weekEnd })
    );
    const workedHours = Math.round(weekEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60 * 10) / 10;

    // Dostępność: 40h/tydzień
    const availability = 40;
    const totalPlanned = scheduledHours + workedHours;
    const loadPercent = Math.min(120, Math.round((totalPlanned / availability) * 100));

    let status: "low" | "normal" | "high" | "overload";
    if (loadPercent < 40) status = "low";
    else if (loadPercent < 75) status = "normal";
    else if (loadPercent < 100) status = "high";
    else status = "overload";

    return { scheduledHours, workedHours, loadPercent, status };
  }, [events, entries]);

  const colors = {
    low: "oklch(0.52 0.19 220)",
    normal: "oklch(0.55 0.18 155)",
    high: "oklch(0.72 0.18 60)",
    overload: "oklch(0.60 0.20 25)",
  };

  const labels = {
    low: "Niskie obciążenie",
    normal: "Optymalne",
    high: "Wysokie obciążenie",
    overload: "Przeciążenie!",
  };

  return (
    <Card className="card-modern">
      <CardContent className="pt-3 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            Obciążenie tygodnia
          </span>
          <span className="text-xs font-bold" style={{ color: colors[status] }}>
            {loadPercent}%
          </span>
        </div>

        {/* Gauge bar */}
        <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: "oklch(0.52 0.19 220 / 0.08)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: colors[status] }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(loadPercent, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          {/* Marker 100% */}
          <div className="absolute top-0 bottom-0 w-px" style={{ left: "100%", background: "oklch(0.52 0.19 220 / 0.3)" }} />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {status === "overload" && <AlertTriangle className="h-3 w-3" style={{ color: colors.overload }} />}
            <span className="text-[10px]" style={{ color: colors[status] }}>{labels[status]}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {workedHours}h zrobione · {scheduledHours}h zaplanowane
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
