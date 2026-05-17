"use client";

import { useMemo } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Calendar, MapPin, Phone, Clock } from "lucide-react";
import { isToday, format, differenceInMinutes, isBefore, isAfter } from "date-fns";
import Link from "next/link";

const TYPE_COLORS: Record<string, string> = {
  wycena: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  realizacja: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  przeglad: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  awaria: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  inne: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

export function TodaySchedule() {
  const events = useScheduleStore((s) => s.events);

  const todayEvents = useMemo(() => {
    return events
      .filter((e) => e.status !== "anulowane" && isToday(new Date(e.startTime)))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  if (todayEvents.length === 0) return null;

  const now = new Date();

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Dzisiejszy harmonogram ({todayEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="space-y-2">
          {todayEvents.map((event, i) => {
            const start = new Date(event.startTime);
            const end = new Date(event.endTime);
            const isCurrent = isBefore(start, now) && isAfter(end, now);
            const isPast = isBefore(end, now);
            const minutesUntil = differenceInMinutes(start, now);
            const isNext = !isPast && !isCurrent && minutesUntil <= 60 && minutesUntil > 0;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href="/harmonogram">
                  <div
                    className={`relative flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm ${
                      isCurrent
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : isPast
                        ? "opacity-50 border-border/50"
                        : "border-border/50 hover:border-primary/20"
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCurrent ? "bg-primary animate-pulse" : isPast ? "bg-muted-foreground/30" : "bg-primary/40"
                      }`} />
                      {i < todayEvents.length - 1 && (
                        <div className="w-px h-6 bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          {format(start, "HH:mm")}–{format(end, "HH:mm")}
                        </span>
                        <Badge className={`text-[9px] px-1.5 py-0 ${TYPE_COLORS[event.type] || TYPE_COLORS.inne}`}>
                          {event.type}
                        </Badge>
                        {isCurrent && <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary">Teraz</Badge>}
                        {isNext && <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Za {minutesUntil} min</Badge>}
                      </div>
                      <div className="font-semibold text-sm truncate">{event.title}</div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 shrink-0" />{event.clientName}
                        </span>
                        {event.address && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />{event.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
