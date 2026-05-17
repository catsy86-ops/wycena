"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useScheduleStore } from "@/store/schedule-store";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { differenceInDays, isToday, format } from "date-fns";
import { pl } from "date-fns/locale";
import { formatCurrency } from "@/lib/calculations";
import Link from "next/link";

export function AIInsight() {
  const quotes = useQuoteStore((s) => s.quotes);
  const events = useScheduleStore((s) => s.events);

  const insight = useMemo(() => {
    const now = new Date();

    // 1. Follow-up: wycena wysłana >5 dni bez odpowiedzi
    const followUp = quotes.find((q) => {
      if (q.status !== "wyslana") return false;
      return differenceInDays(now, new Date(q.updatedAt)) >= 5;
    });
    if (followUp) {
      const days = differenceInDays(now, new Date(followUp.updatedAt));
      return {
        text: `Follow-up: wycena ${followUp.number} dla ${followUp.clientName} wysłana ${days} dni temu bez odpowiedzi.`,
        action: "Skontaktuj się",
        href: `/wyceny/${followUp.id}`,
        type: "followup" as const,
      };
    }

    // 2. Wygasająca wycena
    const expiring = quotes.find((q) => {
      if (q.status !== "wyslana" && q.status !== "szkic") return false;
      if (!q.validUntil) return false;
      const days = differenceInDays(new Date(q.validUntil), now);
      return days >= 0 && days <= 2;
    });
    if (expiring) {
      return {
        text: `Wycena ${expiring.number} wygasa ${format(new Date(expiring.validUntil!), "dd.MM", { locale: pl })}. Wyślij przypomnienie klientowi.`,
        action: "Zobacz",
        href: `/wyceny/${expiring.id}`,
        type: "expiring" as const,
      };
    }

    // 3. Dobry dzień na nową wycenę
    const todayQuotes = quotes.filter((q) => isToday(new Date(q.createdAt)));
    if (todayQuotes.length === 0) {
      return {
        text: "Dziś jeszcze nie utworzono żadnej wyceny. Dobry moment na nową ofertę!",
        action: "Nowa wycena",
        href: "/wyceny/nowa",
        type: "suggestion" as const,
      };
    }

    // 4. Gratulacje
    const thisMonth = quotes.filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt).getMonth() === now.getMonth());
    if (thisMonth.length > 0) {
      const revenue = thisMonth.reduce((s, q) => s + q.totalBrutto, 0);
      return {
        text: `Świetny miesiąc! ${thisMonth.length} zaakceptowanych wycen na ${formatCurrency(revenue)}.`,
        action: "Raporty",
        href: "/raporty",
        type: "success" as const,
      };
    }

    return null;
  }, [quotes, events]);

  if (!insight) return null;

  return (
    <Card className="card-modern border-amber-200/50 dark:border-amber-800/30">
      <CardContent className="pt-3 p-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed">{insight.text}</p>
            <Link href={insight.href} className="text-[10px] text-primary hover:underline font-semibold mt-1 inline-block">
              {insight.action} →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
