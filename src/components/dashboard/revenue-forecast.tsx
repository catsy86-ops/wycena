"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, round } from "@/lib/calculations";
import { Zap } from "lucide-react";
import { startOfMonth, differenceInDays, getDaysInMonth } from "date-fns";
import { motion } from "framer-motion";

export function RevenueForecast() {
  const quotes = useQuoteStore((s) => s.quotes);

  const { current, forecast, daysElapsed, daysTotal, pace } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const daysElapsed = differenceInDays(now, monthStart) + 1;
    const daysTotal = getDaysInMonth(now);

    const current = quotes
      .filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= monthStart)
      .reduce((s, q) => s + q.totalBrutto, 0);

    const dailyRate = daysElapsed > 0 ? current / daysElapsed : 0;
    const forecast = round(dailyRate * daysTotal);
    const pace = daysElapsed > 0 ? round(dailyRate) : 0;

    return { current: round(current), forecast, daysElapsed, daysTotal, pace };
  }, [quotes]);

  if (current === 0) return null;

  return (
    <Card className="card-steel">
      <CardContent className="pt-3 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground">Prognoza miesiąca</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-lg font-black text-primary tabular-nums">{formatCurrency(forecast)}</div>
            <div className="text-[10px] text-muted-foreground">
              przy tempie {formatCurrency(pace)}/dzień
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{daysElapsed}/{daysTotal} dni</div>
            <motion.div
              className="h-1.5 w-16 rounded-full overflow-hidden mt-1"
              style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "oklch(0.52 0.19 220)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(daysElapsed / daysTotal) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
