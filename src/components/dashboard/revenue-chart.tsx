"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/calculations";

const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

export function RevenueChart() {
  const quotes = useQuoteStore((s) => s.quotes);

  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};
    quotes
      .filter((q) => q.status === "zaakceptowana")
      .forEach((q) => {
        const d = new Date(q.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = (months[key] || 0) + q.totalBrutto;
      });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, revenue]) => {
        const [, m] = key.split("-");
        const year = key.slice(0, 4);
        return {
          month: `${MONTH_LABELS[parseInt(m) - 1]} ${year}`,
          revenue,
        };
      });
  }, [quotes]);

  if (monthlyRevenue.length === 0) return null;

  return (
    <Card className="card-modern">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-base sm:text-lg">Przychód</CardTitle>
        <CardDescription>Ostatnie 6 miesięcy</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-[10px] sm:text-xs" tick={{ fontSize: 10 }} />
            <YAxis className="text-[10px] sm:text-xs" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
            />
            <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
