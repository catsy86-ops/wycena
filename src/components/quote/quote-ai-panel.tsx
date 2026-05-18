"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIConversionPrediction } from "@/components/ai-assistant";
import { Sparkles } from "lucide-react";
import { round } from "@/lib/calculations";

interface QuoteAIPanelProps {
  clientId?: number | null;
  quoteValue: number;
}

/**
 * Panel AI w formularzu wyceny — predykcja konwersji.
 * Pokazuje szansę na akceptację na podstawie historii klienta i kwoty.
 */
export function QuoteAIPanel({ clientId, quoteValue }: QuoteAIPanelProps) {
  const quotes = useQuoteStore((s) => s.quotes);

  const { clientHistory, avgQuoteValue } = useMemo(() => {
    // Historia klienta
    let total = 0;
    let accepted = 0;
    if (clientId) {
      const clientQuotes = quotes.filter((q) => q.clientId === clientId);
      total = clientQuotes.length;
      accepted = clientQuotes.filter((q) => q.status === "zaakceptowana").length;
    }

    // Średnia wartość wyceny
    const acceptedQuotes = quotes.filter((q) => q.status === "zaakceptowana");
    const avgQuoteValue = acceptedQuotes.length > 0
      ? round(acceptedQuotes.reduce((s, q) => s + q.totalBrutto, 0) / acceptedQuotes.length)
      : 0;

    return { clientHistory: { total, accepted }, avgQuoteValue };
  }, [quotes, clientId]);

  if (quoteValue <= 0) return null;

  return (
    <Card className="card-modern border-amber-200/30 dark:border-amber-800/20">
      <CardHeader className="pb-2 p-3">
        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          AI Analiza
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <AIConversionPrediction
          clientHistory={clientHistory}
          quoteValue={quoteValue}
          avgQuoteValue={avgQuoteValue}
        />
      </CardContent>
    </Card>
  );
}
