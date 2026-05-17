"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, round } from "@/lib/calculations";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { subDays } from "date-fns";

export function CashFlow() {
  const quotes = useQuoteStore((s) => s.quotes);
  const invoices = useInvoiceStore((s) => s.invoices);

  const { income, unpaid, balance } = useMemo(() => {
    const last30 = subDays(new Date(), 30);
    const income = invoices
      .filter((i) => i.status === "zaplacona" && new Date(i.updatedAt) >= last30)
      .reduce((s, i) => s + i.totalBrutto, 0);
    const unpaid = invoices
      .filter((i) => i.status === "niezaplacona" || i.status === "czesciowo")
      .reduce((s, i) => s + i.totalBrutto, 0);
    const balance = round(income - unpaid);
    return { income: round(income), unpaid: round(unpaid), balance };
  }, [invoices]);

  const isPositive = balance >= 0;

  return (
    <Card className="card-gauge">
      <CardContent className="pt-3 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Cash flow (30 dni)
          </span>
          <span className={`text-xs font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{formatCurrency(balance)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <div>
              <div className="text-sm font-bold tabular-nums">{formatCurrency(income)}</div>
              <div className="text-[9px] text-muted-foreground">Wpływy</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-red-400" />
            <div>
              <div className="text-sm font-bold tabular-nums">{formatCurrency(unpaid)}</div>
              <div className="text-[9px] text-muted-foreground">Nieopłacone</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
