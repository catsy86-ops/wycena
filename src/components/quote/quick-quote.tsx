"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { calcQuoteItem, calcTotalBrutto, formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Check, User } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { QuoteItem, VatRate } from "@/types";

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

/**
 * Szybka wycena na miejscu — uproszczony formularz do użycia na tablecie u klienta.
 * Duże przyciski, mniej pól, szybkie dodawanie usług z katalogu.
 */
export function QuickQuote() {
  const router = useRouter();
  const services = useServiceStore((s) => s.services);
  const clients = useClientStore((s) => s.clients);
  const addQuote = useQuoteStore((s) => s.add);

  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving] = useState(false);

  function addService(serviceId: number) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((prev) => [...prev, calcQuoteItem({
      id: generateId(), serviceId: service.id, name: service.name,
      quantity: 1, unit: service.unit, priceNettoPerUnit: service.priceNetto,
      vatRate: service.vatRate, discountPercent: 0, nettotal: 0, vatAmount: 0, bruttoTotal: 0,
    })]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const total = calcTotalBrutto(items);

  async function handleSave() {
    if (!clientName.trim() || items.length === 0) {
      toast.error("Podaj klienta i dodaj min. 1 usługę");
      return;
    }
    setSaving(true);
    try {
      const id = await addQuote({
        clientName, items, additionalCosts: [], progressiveDiscounts: [],
        globalDiscountPercent: 0, status: "szkic",
        totalNetto: items.reduce((s, i) => s + i.nettotal, 0),
        totalVat: items.reduce((s, i) => s + i.vatAmount, 0),
        totalBrutto: total,
      });
      toast.success("Wycena utworzona!");
      router.push(`/wyceny/${id}`);
    } finally { setSaving(false); }
  }

  return (
    <Card className="card-gauge">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Szybka wycena
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Klient */}
        <div className="flex gap-2">
          <User className="h-5 w-5 text-muted-foreground mt-1.5 shrink-0" />
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nazwa klienta"
            className="text-lg h-12"
          />
        </div>

        {/* Usługi — duże przyciski */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {services.slice(0, 12).map((s) => {
            const isAdded = items.some((i) => i.serviceId === s.id);
            return (
              <motion.button
                key={s.id}
                onClick={() => !isAdded && addService(s.id!)}
                className={`rounded-xl border p-3 text-left transition-all ${isAdded ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-accent/30"}`}
                whileTap={{ scale: 0.95 }}
                disabled={isAdded}
              >
                <div className="text-xs font-semibold truncate">{s.name}</div>
                <div className="text-sm font-bold text-primary mt-0.5">{formatCurrency(s.priceNetto)}</div>
                {isAdded && <Check className="h-3 w-3 text-primary mt-1" />}
              </motion.button>
            );
          })}
        </div>

        {/* Dodane pozycje */}
        {items.length > 0 && (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-1.5">
                <span className="truncate">{item.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold tabular-nums">{formatCurrency(item.bruttoTotal)}</span>
                  <button onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suma + Zapisz */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Do zapłaty</div>
            <div className="text-2xl font-black text-primary tabular-nums">{formatCurrency(total)}</div>
          </div>
          <Button className="btn-primary h-12 px-6 text-base" onClick={handleSave} disabled={saving || items.length === 0}>
            {saving ? "Zapisywanie..." : "Zapisz wycenę"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
