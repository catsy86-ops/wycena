"use client";

import { useMemo } from "react";
import { useTimeStore } from "@/store/time-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, round } from "@/lib/calculations";
import { TrendingUp, Clock, Package, DollarSign } from "lucide-react";
import { PipeProgress } from "@/components/hydraulic-decorations";
import type { Quote } from "@/types";

interface QuoteProfitabilityProps {
  quote: Quote;
}

/**
 * Analiza rentowności wyceny — ile zarobiono po odjęciu kosztów.
 * Łączy dane z wyceny + czas pracy + materiały.
 */
export function QuoteProfitability({ quote }: QuoteProfitabilityProps) {
  const entries = useTimeStore((s) => s.entries);

  const analysis = useMemo(() => {
    // Przychód z wyceny
    const revenue = quote.totalBrutto;

    // Koszty czasu pracy (z modułu czas)
    const timeEntries = entries.filter((e) => e.quoteId === quote.id);
    const laborCost = round(timeEntries.reduce((s, e) => s + e.totalCost, 0));
    const laborHours = round(timeEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);

    // Koszty materiałów (szacunek — pozycje bez serviceId)
    const materialCost = round(
      quote.items
        .filter((i) => !i.serviceId)
        .reduce((s, i) => s + i.nettotal * 0.6, 0) // zakładamy 60% ceny to koszt zakupu
    );

    // Koszty dodatkowe
    const additionalCost = round(
      (quote.additionalCosts || []).reduce((s, c) => s + c.amount, 0)
    );

    const totalCost = round(laborCost + materialCost + additionalCost);
    const profit = round(revenue - totalCost);
    const marginPercent = revenue > 0 ? round((profit / revenue) * 100) : 0;
    const effectiveRate = laborHours > 0 ? round(profit / laborHours) : 0;

    return { revenue, laborCost, laborHours, materialCost, additionalCost, totalCost, profit, marginPercent, effectiveRate };
  }, [quote, entries]);

  const color = analysis.marginPercent >= 30 ? "oklch(0.55 0.18 155)" :
    analysis.marginPercent >= 15 ? "oklch(0.72 0.18 60)" : "oklch(0.60 0.20 25)";

  return (
    <Card className="card-steel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Rentowność wyceny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Marża */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Marża</span>
          <span className="text-lg font-black" style={{ color }}>{analysis.marginPercent}%</span>
        </div>
        <PipeProgress percent={Math.max(0, analysis.marginPercent)} />

        {/* Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Przychód:</span>
            <span className="font-semibold">{formatCurrency(analysis.revenue)}</span>
          </div>
          {analysis.laborCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Robocizna ({analysis.laborHours}h):</span>
              <span className="text-red-500">-{formatCurrency(analysis.laborCost)}</span>
            </div>
          )}
          {analysis.materialCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Materiały (szac.):</span>
              <span className="text-red-500">-{formatCurrency(analysis.materialCost)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t">
            <span className="font-semibold">Zysk:</span>
            <span className="font-black" style={{ color }}>{formatCurrency(analysis.profit)}</span>
          </div>
          {analysis.effectiveRate > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Efektywna stawka:</span>
              <span>{formatCurrency(analysis.effectiveRate)}/h</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
