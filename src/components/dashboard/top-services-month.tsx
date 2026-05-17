"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { startOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { round } from "@/lib/calculations";

export function TopServicesMonth() {
  const quotes = useQuoteStore((s) => s.quotes);

  const topServices = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const usage: Record<string, number> = {};

    quotes
      .filter((q) => new Date(q.createdAt) >= monthStart)
      .forEach((q) => {
        q.items.forEach((item) => {
          usage[item.name] = (usage[item.name] || 0) + item.quantity;
        });
      });

    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + "…" : name, count }));
  }, [quotes]);

  if (topServices.length === 0) return null;

  const max = topServices[0]?.count || 1;

  return (
    <Card className="card-modern">
      <CardContent className="pt-3 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Wrench className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Top usługi (miesiąc)</span>
        </div>
        <div className="space-y-2">
          {topServices.map((s, i) => (
            <div key={s.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-medium">{s.name}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{s.count}×</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.52 0.19 220 / 0.08)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? "oklch(0.52 0.19 220)" : i === 1 ? "oklch(0.62 0.17 195)" : "oklch(0.55 0.18 240)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${round((s.count / max) * 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
