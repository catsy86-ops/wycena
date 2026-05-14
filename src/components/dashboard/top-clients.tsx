"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/calculations";

export function TopClients() {
  const quotes = useQuoteStore((s) => s.quotes);

  const topClients = useMemo(() => {
    const revenue: Record<string, { total: number; count: number }> = {};
    quotes
      .filter((q) => q.status === "zaakceptowana")
      .forEach((q) => {
        if (!q.clientName) return;
        if (!revenue[q.clientName]) {
          revenue[q.clientName] = { total: 0, count: 0 };
        }
        revenue[q.clientName].total += q.totalBrutto;
        revenue[q.clientName].count += 1;
      });
    return Object.entries(revenue)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [quotes]);

  if (topClients.length === 0) return null;

  const maxRevenue = topClients[0]?.total || 1;

  return (
    <Card className="card-modern">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          Top klienci
        </CardTitle>
        <CardDescription>Według przychodu</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        <div className="space-y-3">
          {topClients.map((client, i) => (
            <motion.div
              key={client.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href="/klienci">
                <div className="group cursor-pointer">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-colors shrink-0">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{client.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{client.count} wycen</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {formatCurrency(client.total)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-10 sm:ml-11 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(client.total / maxRevenue) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
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
