"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, round } from "@/lib/calculations";
import { ArrowUpRight, ArrowDownRight, Equal, GitCompare } from "lucide-react";
import type { QuoteVersion } from "@/types";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface VersionDiffProps {
  versionA: QuoteVersion;
  versionB: QuoteVersion;
}

/**
 * Porównanie dwóch wersji wyceny — diff pozycji, kwot, rabatów.
 */
export function VersionDiff({ versionA, versionB }: VersionDiffProps) {
  const bruttoDiff = round(versionB.totalBrutto - versionA.totalBrutto);
  const nettoDiff = round(versionB.totalNetto - versionA.totalNetto);
  const itemsDiff = versionB.items.length - versionA.items.length;
  const discountDiff = round(versionB.globalDiscountPercent - versionA.globalDiscountPercent);

  function DiffValue({ value, suffix = "" }: { value: number; suffix?: string }) {
    if (Math.abs(value) < 0.01) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Equal className="h-3 w-3" />Bez zmian</span>;
    if (value > 0) return <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+{value}{suffix}</span>;
    return <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{value}{suffix}</span>;
  }

  // Pozycje dodane/usunięte
  const addedItems = versionB.items.filter((b) => !versionA.items.some((a) => a.name === b.name));
  const removedItems = versionA.items.filter((a) => !versionB.items.some((b) => b.name === a.name));
  const changedItems = versionB.items.filter((b) => {
    const a = versionA.items.find((ai) => ai.name === b.name);
    return a && (a.priceNettoPerUnit !== b.priceNettoPerUnit || a.quantity !== b.quantity);
  });

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Wersja {versionA.versionNumber} → {versionB.versionNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Podsumowanie zmian */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground">Brutto</div>
            <DiffValue value={bruttoDiff} />
            {bruttoDiff !== 0 && <div className="text-[9px] text-muted-foreground">{formatCurrency(Math.abs(bruttoDiff))}</div>}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Netto</div>
            <DiffValue value={nettoDiff} />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Pozycje</div>
            <DiffValue value={itemsDiff} />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Rabat</div>
            <DiffValue value={discountDiff} suffix="%" />
          </div>
        </div>

        {/* Szczegóły zmian */}
        {(addedItems.length > 0 || removedItems.length > 0 || changedItems.length > 0) && (
          <div className="space-y-2 pt-2 border-t text-xs">
            {addedItems.length > 0 && (
              <div>
                <span className="font-semibold text-emerald-600">+ Dodane:</span>
                {addedItems.map((i) => (
                  <div key={i.id} className="ml-3 text-muted-foreground">{i.name} ({formatCurrency(i.bruttoTotal)})</div>
                ))}
              </div>
            )}
            {removedItems.length > 0 && (
              <div>
                <span className="font-semibold text-red-500">- Usunięte:</span>
                {removedItems.map((i) => (
                  <div key={i.id} className="ml-3 text-muted-foreground line-through">{i.name} ({formatCurrency(i.bruttoTotal)})</div>
                ))}
              </div>
            )}
            {changedItems.length > 0 && (
              <div>
                <span className="font-semibold text-amber-600">~ Zmienione:</span>
                {changedItems.map((b) => {
                  const a = versionA.items.find((ai) => ai.name === b.name)!;
                  return (
                    <div key={b.id} className="ml-3 text-muted-foreground">
                      {b.name}: {formatCurrency(a.bruttoTotal)} → {formatCurrency(b.bruttoTotal)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Daty */}
        <div className="flex justify-between text-[10px] text-muted-foreground pt-2 border-t">
          <span>v{versionA.versionNumber}: {format(new Date(versionA.createdAt), "dd.MM.yy HH:mm", { locale: pl })}</span>
          <span>v{versionB.versionNumber}: {format(new Date(versionB.createdAt), "dd.MM.yy HH:mm", { locale: pl })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
