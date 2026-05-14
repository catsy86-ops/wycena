"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  szkic: { label: "Szkic", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500" },
  wyslana: { label: "Wysłana", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500" },
  zaakceptowana: { label: "Zaakceptowana", color: "text-green-700 dark:text-green-300", bg: "bg-green-500" },
  odrzucona: { label: "Odrzucona", color: "text-red-700 dark:text-red-300", bg: "bg-red-500" },
};

export function QuoteStatusBar() {
  const quotes = useQuoteStore((s) => s.quotes);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    quotes.forEach((q) => {
      counts[q.status] = (counts[q.status] || 0) + 1;
    });
    const total = quotes.length || 1;
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percent: (count / total) * 100,
      ...STATUS_CONFIG[status],
    }));
  }, [quotes]);

  if (quotes.length === 0) return null;

  return (
    <Card className="card-modern">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          Status wycen
        </CardTitle>
        <CardDescription>Łącznie: {quotes.length}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        <div className="space-y-3">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {statusData.map((item) => (
              <motion.div
                key={item.status}
                className={`${item.bg} h-full`}
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${item.bg} shrink-0`} />
                <div>
                  <div className={`text-xs font-medium ${item.color}`}>{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">{item.count} ({item.percent.toFixed(0)}%)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
