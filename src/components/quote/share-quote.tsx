"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Mail, Link2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 * Dialog udostępniania wyceny — email + link publiczny.
 */
export function ShareQuoteDialog({ quote, open, onOpenChange }: ShareQuoteProps) {
  const [copied, setCopied] = useState(false);

  // Generuj link publiczny (w produkcji: prawdziwy URL z tokenem)
  const publicLink = `${typeof window !== "undefined" ? window.location.origin : ""}/wyceny/${quote.id}`;

  function copyLink() {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success("Link skopiowany");
    setTimeout(() => setCopied(false), 2000);
  }

  function sendEmail() {
    const subject = encodeURIComponent(`Wycena ${quote.number} — ${formatCurrency(quote.totalBrutto)}`);
    const body = encodeURIComponent(
      `Dzień dobry,\n\nPrzesyłam wycenę nr ${quote.number} na kwotę ${formatCurrency(quote.totalBrutto)} brutto.\n\nLink do wyceny: ${publicLink}\n\nWycena ważna do: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("pl-PL") : "bezterminowo"}.\n\nZ poważaniem`
    );
    const mailto = `mailto:${quote.clientEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
    toast.success("Otwarto klienta email");
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
          {/* Link publiczny */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              Link do wyceny
            </label>
            <div className="flex gap-2">
              <Input value={publicLink} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Klient może otworzyć ten link i zobaczyć wycenę bez logowania.</p>
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
            <p className="text-[10px] text-muted-foreground">Otworzy domyślny klient email z przygotowaną wiadomością i linkiem.</p>
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
