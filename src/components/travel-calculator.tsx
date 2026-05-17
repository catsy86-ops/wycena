"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, round } from "@/lib/calculations";

interface TravelCalculatorProps {
  /** Adres firmy (z ustawień) */
  fromAddress?: string;
  /** Stawka za km (z modelu wyceny) */
  ratePerKm?: number;
  /** Callback po obliczeniu */
  onCalculated?: (km: number, cost: number) => void;
}

/**
 * Kalkulator kosztów dojazdu.
 * Oblicza dystans i koszt na podstawie adresów.
 * Bez Google Maps API — używa prostej heurystyki (w produkcji podpiąć Google Distance Matrix).
 */
export function TravelCalculator({ fromAddress = "", ratePerKm = 2.5, onCalculated }: TravelCalculatorProps) {
  const [from, setFrom] = useState(fromAddress);
  const [to, setTo] = useState("");
  const [rate, setRate] = useState(ratePerKm);
  const [result, setResult] = useState<{ km: number; cost: number; duration: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculate() {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);

    // Symulacja obliczenia dystansu (w produkcji: Google Distance Matrix API)
    // Heurystyka: losowy dystans 5-50km na podstawie długości adresów
    await new Promise((r) => setTimeout(r, 800));

    const seed = (from.length + to.length) * 7 + from.charCodeAt(0);
    const km = round(5 + (seed % 45) + Math.random() * 10);
    const duration = `${Math.round(km * 1.5)} min`;
    const cost = round(km * rate * 2); // tam i z powrotem

    setResult({ km, cost, duration });
    onCalculated?.(km, cost);
    setLoading(false);
  }

  return (
    <Card className="card-modern">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          Kalkulator dojazdu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Z (adres firmy)</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={from} onChange={(e) => setFrom(e.target.value)} className="pl-8 h-8 text-sm" placeholder="Twój adres" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Do (adres klienta)</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="pl-8 h-8 text-sm" placeholder="Adres klienta" />
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Stawka/km (PLN)</Label>
            <Input type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="h-8 text-sm w-24" />
          </div>
          <Button size="sm" className="btn-primary h-8" onClick={calculate} disabled={loading || !from.trim() || !to.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
            Oblicz
          </Button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-lg p-3 text-sm"
              style={{ background: "oklch(0.52 0.19 220 / 0.05)", border: "1px solid oklch(0.52 0.19 220 / 0.15)" }}
            >
              <div className="space-y-0.5">
                <div className="font-semibold">{result.km} km (tam i z powrotem)</div>
                <div className="text-xs text-muted-foreground">~{result.duration} w jedną stronę</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-primary">{formatCurrency(result.cost)}</div>
                <div className="text-[10px] text-muted-foreground">koszt dojazdu</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-muted-foreground">
          * Dystans szacunkowy. W produkcji integracja z Google Maps Distance Matrix API.
        </p>
      </CardContent>
    </Card>
  );
}
