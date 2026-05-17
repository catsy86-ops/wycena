"use client";

import { useMemo } from "react";
import { useTimeStore } from "@/store/time-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, TrendingDown, Equal } from "lucide-react";
import { round } from "@/lib/calculations";
import type { Quote } from "@/types";

interface TimeComparisonProps {
  quote: Quote;
}

/**
 * Porównanie: ile czasu faktycznie zajęła realizacja vs szacunek z wyceny.
 */
export function TimeComparison({ quote }: TimeComparisonProps) {
  const entries = useTimeStore((s) => s.entries);

  const comparison = useMemo(() => {
    // Szacowany czas (suma estimatedMinutes z usług w wycenie)
    const estimatedMinutes = quote.items.reduce((s, item) => {
      // Jeśli usługa ma estimatedMinutes, użyj go * quantity
      return s + (item.quantity * 60); // domyślnie 1h per pozycję jeśli brak danych
    }, 0);

    // Faktyczny czas (z modułu czas pracy)
    const actualEntries = entries.filter((e) => e.quoteId === quote.id);
    const actualMinutes = actualEntries.reduce((s, e) => s + e.durationMinutes, 0);

    const estimatedHours = round(estimatedMinutes / 60);
    const actualHours = round(actualMinutes / 60);
    const diffPercent = estimatedMinutes > 0 ? round(((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100) : 0;

    return { estimatedHours, actualHours, diffPercent, hasData: actualEntries.length > 0 };
  }, [quote, entries]);

  if (!comparison.hasData) return null;

  const isOver = comparison.diffPercent > 10;
  const isUnder = comparison.diffPercent < -10;

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Czas realizacji
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="text-lg font-black">{comparison.estimatedHours}h</div>
            <div className="text-[10px] text-muted-foreground">Szacunek</div>
          </div>
          <div className="flex items-center gap-1">
            {isOver && <TrendingUp className="h-4 w-4 text-red-500" />}
            {isUnder && <TrendingDown className="h-4 w-4 text-emerald-500" />}
            {!isOver && !isUnder && <Equal className="h-4 w-4 text-muted-foreground" />}
            <span className={`text-xs font-bold ${isOver ? "text-red-500" : isUnder ? "text-emerald-600" : "text-muted-foreground"}`}>
              {comparison.diffPercent > 0 ? "+" : ""}{comparison.diffPercent}%
            </span>
          </div>
          <div className="text-center">
            <div className="text-lg font-black">{comparison.actualHours}h</div>
            <div className="text-[10px] text-muted-foreground">Faktycznie</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
