"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";

/**
 * Hook zwracający badge'e powiadomień dla sidebara.
 */
export function useSidebarBadges() {
  const quotes = useQuoteStore((s) => s.quotes);
  const invoices = useInvoiceStore((s) => s.invoices);

  return useMemo(() => {
    const now = new Date();

    // Wygasłe wyceny
    const expiredQuotes = quotes.filter((q) =>
      (q.status === "wyslana" || q.status === "szkic") &&
      q.validUntil && new Date(q.validUntil) < now
    ).length;

    // Nieopłacone faktury
    const unpaidInvoices = invoices.filter((i) =>
      (i.status === "niezaplacona" || i.status === "czesciowo") &&
      i.dueDate && new Date(i.dueDate) < now
    ).length;

    return {
      wyceny: expiredQuotes,
      faktury: unpaidInvoices,
    };
  }, [quotes, invoices]);
}
