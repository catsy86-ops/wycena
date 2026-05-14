"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useScheduleStore } from "@/store/schedule-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, MapPin, Phone, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { SCHEDULE_TYPE_LABELS, SCHEDULE_STATUS_LABELS } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  zaplanowane: "bg-blue-500",
  w_trakcie: "bg-amber-500",
  zakonczone: "bg-green-500",
  anulowane: "bg-red-500",
};

const TYPE_COLORS: Record<string, string> = {
  wycena: "from-blue-500 to-indigo-600",
  realizacja: "from-emerald-500 to-green-600",
  przeglad: "from-cyan-500 to-teal-600",
  awaria: "from-red-500 to-rose-600",
  inne: "from-violet-500 to-purple-600",
};

export function UpcomingEvents() {
  const events = useScheduleStore((s) => s.events);

  const upcoming = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    return events
      .filter((e) => {
        const start = new Date(e.startTime);
        return start >= now && start <= tomorrow;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [events]);

  if (upcoming.length === 0) return null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = new Date(date);
    if (d.toDateString() === today.toDateString()) return "Dzisiaj";
    if (d.toDateString() === tomorrow.toDateString()) return "Jutro";
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  return (
    <Card className="card-modern">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          Nadchodzące wydarzenia
        </CardTitle>
        <CardDescription>Najbliższe 24 godziny</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        <div className="space-y-2 sm:space-y-3">
          {upcoming.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/harmonogram`}>
                <div className="rounded-xl border border-border/50 p-3 hover:bg-accent/50 transition-all duration-200 group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br ${TYPE_COLORS[event.type] || TYPE_COLORS.inne} shadow-lg shrink-0`}>
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{event.title}</span>
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[event.status] || "bg-muted-foreground"} shrink-0`} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(event.startTime)} {formatTime(event.startTime)}
                        </span>
                        {event.clientName && (
                          <span className="truncate">{event.clientName}</span>
                        )}
                      </div>
                      {event.address && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
