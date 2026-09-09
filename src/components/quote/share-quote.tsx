"use client";

import { useState } from "react";
import { Share2, Mail, Copy, Check, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Quote } from "@/types";
import { formatCurrency } from "@/lib/calculations";

interface ShareQuoteProps {
  quote: Quote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog udostępniania wyceny — WhatsApp + SMS + Email + kopiowanie oferty.
 */
export function ShareQuoteDialog({ quote, open, onOpenChange }: ShareQuoteProps) {
  const [copied, setCopied] = useState(false);

  // Generowanie pełnego podsumowania tekstowego oferty (samowystarczalne, bez konieczności wspólnej bazy)
  const itemsSummary = quote.items
    .slice(0, 5)
    .map((item) => `• ${item.name} (${item.quantity} ${item.unit}) — ${formatCurrency(item.bruttoTotal)}`)
    .join("\n");
  const moreItemsCount = Math.max(0, quote.items.length - 5);
  const itemsText = moreItemsCount > 0 ? `${itemsSummary}\n  ...oraz ${moreItemsCount} innych pozycji` : itemsSummary;

  const validUntilText = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString("pl-PL")
    : "14 dni od wystawienia";

  const fullQuoteText = `Dzień dobry!\nPrzesyłam ofertę nr ${quote.number} dla: ${quote.clientName || "Klienta"}\n\nPozycje wyceny:\n${itemsText}\n\nŁĄCZNA KWOTA: ${formatCurrency(quote.totalBrutto)} brutto\nOferta ważna do: ${validUntilText}\n\nProszę o informację zwrotną i potwierdzenie terminu realizacji.\nPozdrawiam!`;

  function copyText() {
    navigator.clipboard.writeText(fullQuoteText);
    setCopied(true);
    toast.success("Treść oferty skopiowana do schowka");
    setTimeout(() => setCopied(false), 2000);
  }

  function sendEmail() {
    const subject = encodeURIComponent(`Wycena ${quote.number} — ${formatCurrency(quote.totalBrutto)}`);
    const body = encodeURIComponent(fullQuoteText);
    const mailto = `mailto:${quote.clientEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
    toast.success("Otwarto klienta email");
  }

  function sendWhatsApp() {
    const text = encodeURIComponent(fullQuoteText);
    const phone = quote.clientPhone ? quote.clientPhone.replace(/\D/g, "") : "";
    const url = phone
      ? `https://wa.me/48${phone.startsWith("48") ? phone.slice(2) : phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    toast.success("Otwarto WhatsApp z gotową ofertą");
  }

  function sendSms() {
    const shortText = encodeURIComponent(
      `Oferta ${quote.number} dla ${quote.clientName || "Klienta"}: ${formatCurrency(quote.totalBrutto)} brutto. Pozycje: ${quote.items.length}, ważna do ${validUntilText}. Proszę o potwierdzenie.`
    );
    const phone = quote.clientPhone || "";
    window.open(`sms:${phone}?body=${shortText}`, "_blank");
    toast.success("Otwarto wiadomość SMS");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Udostępnij wycenę
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Gotowy tekst oferty do schowka */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5 text-primary" />
                Gotowa oferta (Messenger, OLX, SMS)
              </label>
            </div>
            <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground whitespace-pre-line max-h-28 overflow-y-auto font-sans leading-relaxed">
              {fullQuoteText}
            </div>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 text-xs h-9" onClick={copyText}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Skopiowano ofertę do schowka!" : "Kopiuj gotową treść oferty do schowka"}
            </Button>
          </div>

          {/* Szybka wysyłka WhatsApp / SMS */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
              Szybka wiadomość do klienta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                onClick={sendWhatsApp}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                onClick={sendSms}
              >
                <Smartphone className="h-4 w-4 text-blue-600" />
                Wiadomość SMS
              </Button>
            </div>
            {quote.clientPhone && (
              <p className="text-[10px] text-muted-foreground">Nr klienta: {quote.clientPhone}</p>
            )}
          </div>

          {/* Wyślij emailem */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" />
              Wyślij emailem
            </label>
            <div className="flex gap-2">
              <Input value={quote.clientEmail || ""} readOnly placeholder="Brak emaila klienta" className="text-sm" />
              <Button className="btn-primary shrink-0" onClick={sendEmail} disabled={!quote.clientEmail}>
                <Mail className="h-4 w-4" />
                Wyślij
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Otworzy klienta email z przygotowaną wiadomością i ofertą.</p>
          </div>

          {/* Info */}
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "oklch(0.52 0.19 220 / 0.05)", border: "1px solid oklch(0.52 0.19 220 / 0.1)" }}>
            <div className="flex justify-between"><span className="text-muted-foreground">Numer:</span><span className="font-semibold">{quote.number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Klient:</span><span>{quote.clientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kwota:</span><span className="font-bold text-primary">{formatCurrency(quote.totalBrutto)}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
