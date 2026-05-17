"use client";

import { motion } from "framer-motion";
import { Check, Send, FileText, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { QuoteStatus } from "@/types";

interface StatusEvent {
  status: QuoteStatus;
  date: Date;
  note?: string;
}

interface StatusTimelineProps {
  events: StatusEvent[];
  currentStatus: QuoteStatus;
}

const STATUS_CONFIG: Record<QuoteStatus, { icon: React.ReactNode; label: string; color: string }> = {
  szkic: { icon: <FileText className="h-3.5 w-3.5" />, label: "Szkic", color: "oklch(0.72 0.18 60)" },
  wyslana: { icon: <Send className="h-3.5 w-3.5" />, label: "Wysłana", color: "oklch(0.52 0.19 220)" },
  zaakceptowana: { icon: <Check className="h-3.5 w-3.5" />, label: "Zaakceptowana", color: "oklch(0.55 0.18 155)" },
  odrzucona: { icon: <X className="h-3.5 w-3.5" />, label: "Odrzucona", color: "oklch(0.60 0.20 25)" },
};

/**
 * Timeline zmian statusu wyceny.
 * Pokazuje historię: kiedy utworzona, wysłana, zaakceptowana/odrzucona.
 */
export function StatusTimeline({ events, currentStatus }: StatusTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const config = STATUS_CONFIG[event.status];
        const isLast = i === events.length - 1;
        const isCurrent = event.status === currentStatus && isLast;

        return (
          <motion.div
            key={i}
            className="flex gap-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {/* Linia + kropka */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
                style={{
                  background: `color-mix(in oklch, ${config.color} 20%, transparent)`,
                  border: `1.5px solid ${config.color}`,
                  color: config.color,
                }}
              >
                {config.icon}
              </div>
              {!isLast && (
                <div className="w-px flex-1 min-h-4" style={{ background: "oklch(0.52 0.19 220 / 0.15)" }} />
              )}
            </div>

            {/* Treść */}
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: isCurrent ? config.color : undefined }}>
                  {config.label}
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklch, ${config.color} 15%, transparent)`, color: config.color }}>
                    Aktualny
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(event.date), "dd.MM.yyyy HH:mm", { locale: pl })}
              </div>
              {event.note && <div className="text-xs text-muted-foreground mt-0.5">{event.note}</div>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
