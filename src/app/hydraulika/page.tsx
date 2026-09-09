"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets, Wrench, ShieldCheck, Flame, Plus, Calculator,
  ArrowRight, FileText, CheckCircle2, ChevronRight, Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { PlumbingProtocolManager } from "@/components/plumbing-protocol-manager";
import { PLUMBING_STANDARDS } from "@/lib/plumbing-protocols";
import Link from "next/link";
import { toast } from "sonner";

// Typowe pakiety i punkty hydrauliczne z cenami rynkowymi
const PLUMBING_FAST_POINTS = [
  { id: "p1", name: "Podejście wod-kan (woda + odpływ)", price: 250, unit: "pkt", defaultQty: 4, desc: "Bruzda, rury PEX + PCV pod baterię/odpływ" },
  { id: "p2", name: "Montaż stelaża podtynkowego WC", price: 280, unit: "kpl", defaultQty: 1, desc: "Montaż stelaża Geberit/Grohe ze zbiornikiem" },
  { id: "p3", name: "Biały montaż (umywalka + bateria + syfon)", price: 200, unit: "kpl", defaultQty: 1, desc: "Zawieszenie umywalki, montaż armatury i odpływu" },
  { id: "p4", name: "Montaż kabiny prysznicowej / walk-in", price: 450, unit: "szt", defaultQty: 1, desc: "Montaż ścianki szklanej, brodzika lub odpływu liniowego" },
  { id: "p5", name: "Montaż wanny z zabudową", price: 500, unit: "szt", defaultQty: 1, desc: "Ustawienie, poziomowanie, podłączenie syfonu" },
  { id: "p6", name: "Ogrzewanie podłogowe (układanie rur PEX)", price: 45, unit: "m²", defaultQty: 40, desc: "Styropian, folia, rura PEX 16, podpięcie pod rozdzielacz" },
  { id: "p7", name: "Montaż rozdzielacza CO / podłogówki", price: 400, unit: "kpl", defaultQty: 1, desc: "Szafka, rozdzielacz z rotametrami, zawory odcinające" },
  { id: "p8", name: "Montaż kotła gazowego / pompy ciepła", price: 2200, unit: "kpl", defaultQty: 1, desc: "Podłączenie hydrauliczne, naczynie, filtry, zawory" },
  { id: "p9", name: "Próba ciśnieniowa z protokołem PN-EN", price: 250, unit: "usł", defaultQty: 1, desc: "Próba szczelności manometrem, protokół odbiorczy" },
];

export default function HydraulikaPage() {
  const router = useRouter();
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number>>({
    p1: 4,
    p2: 1,
    p3: 1,
    p4: 1,
    p9: 1,
  });

  const clients = useClientStore((s) => s.clients);
  const quotes = useQuoteStore((s) => s.quotes);

  // Filtrujemy wyceny hydrauliczne
  const hydraulicQuotes = useMemo(() => {
    const keywords = ["woda", "wod-kan", "rura", "bateria", "umywalk", "wanna", "prysznic", "wc", "stelaż", "podłogów", "kocioł", "grzejnik", "syfon", "kanalizacj", "hydraul"];
    return quotes.filter((q) =>
      q.items.some((item) => keywords.some((kw) => item.name.toLowerCase().includes(kw)))
    );
  }, [quotes]);

  // Kalkulator sumy
  const totalSummary = useMemo(() => {
    let netto = 0;
    Object.entries(selectedPoints).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const point = PLUMBING_FAST_POINTS.find((p) => p.id === id);
      if (point) {
        netto += point.price * qty;
      }
    });
    const vat = netto * 0.08; // 8% na usługi mieszkaniowe
    return { netto, vat, brutto: netto + vat };
  }, [selectedPoints]);

  const handleQtyChange = (id: string, delta: number) => {
    setSelectedPoints((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleCreateQuoteFromCalculator = () => {
    // Zapisujemy punkty i przechodzimy do nowej wyceny
    const items = Object.entries(selectedPoints)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const point = PLUMBING_FAST_POINTS.find((p) => p.id === id)!;
        return {
          name: point.name,
          quantity: qty,
          unit: point.unit as any,
          priceNettoPerUnit: point.price,
          vatRate: 8 as const,
        };
      });

    if (items.length === 0) {
      toast.error("Wybierz przynajmniej jeden punkt do wyceny.");
      return;
    }

    // Zapisz do localStorage i przekieruj
    localStorage.setItem("gksystem_quick_plumbing_quote", JSON.stringify(items));
    router.push("/wyceny/nowa?source=hydraulika");
  };

  return (
    <div className="space-y-6 pb-32 lg:pb-6">
      {/* Header branżowy */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-slate-900/40 p-4 sm:p-5 rounded-2xl border border-cyan-800/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Droplets className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Moduł Hydrauliczny
              <Badge className="bg-cyan-600 text-white text-[10px] font-bold">WOD-KAN / C.O.</Badge>
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/70">
              Szybki kosztorys instalacji, protokoły prób ciśnieniowych i normy PN-EN
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/wyceny/nowa">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              Nowa wycena
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md h-auto p-1 bg-muted/60">
          <TabsTrigger value="calculator" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <Calculator className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Kalkulator punktów</span>
            <span className="sm:hidden">Kalkulator</span>
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Protokoły prób</span>
            <span className="sm:hidden">Protokoły</span>
          </TabsTrigger>
          <TabsTrigger value="standards" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Normy PN-EN</span>
            <span className="sm:hidden">Normy PN</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Zakładka 1: Szybki kalkulator punktów ─── */}
        <TabsContent value="calculator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Lista punktów do klikania */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-cyan-600" />
                  Wybierz zakres prac hydraulicznych:
                </h3>
                <span className="text-xs text-muted-foreground">Stawki netto (robocizna + montaż)</span>
              </div>

              <div className="grid gap-2 sm:gap-3">
                {PLUMBING_FAST_POINTS.map((point) => {
                  const qty = selectedPoints[point.id] || 0;
                  return (
                    <Card
                      key={point.id}
                      className={`transition-all duration-200 ${
                        qty > 0 ? "border-cyan-500/60 bg-cyan-50/20 dark:bg-cyan-950/20" : "hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{point.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {point.price} zł / {point.unit}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{point.desc}</p>
                        </div>

                        {/* Kontrolki ilości (+/-) - Ergonomiczne min. 44x44px */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl font-black text-base touch-manipulation active:scale-95"
                            onClick={() => handleQtyChange(point.id, -1)}
                            disabled={qty === 0}
                            aria-label={`Zmniejsz ${point.name}`}
                          >
                            -
                          </Button>
                          <span className="w-9 text-center font-black text-base tabular-nums text-foreground">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl font-black text-base bg-cyan-50 text-cyan-800 border-cyan-400 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-700 touch-manipulation active:scale-95 shadow-sm"
                            onClick={() => handleQtyChange(point.id, 1)}
                            aria-label={`Zwiększ ${point.name}`}
                          >
                            +
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Panel podsumowania bocznego */}
            <div className="space-y-4">
              <Card className="sticky top-20 border-cyan-600/30 shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                    Szybka kalkulacja zlecenia
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Automatycznie wyliczony koszt robocizny
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="space-y-1.5 text-xs text-muted-foreground border-b pb-3">
                    <div className="flex justify-between">
                      <span>Wartość netto:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totalSummary.netto)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (8% mieszkalny):</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totalSummary.vat)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-foreground pt-1">
                      <span>Razem brutto:</span>
                      <span className="text-cyan-600 dark:text-cyan-400">{formatCurrency(totalSummary.brutto)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2 py-5"
                      onClick={handleCreateQuoteFromCalculator}
                      disabled={totalSummary.netto === 0}
                    >
                      Utwórz pełną wycenę
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Możesz przypisać klienta i dodać materiały w kolejnym kroku
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Informacja o próbie szczelności */}
              <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed">
                <CardContent className="p-3 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Wymóg gwarancyjny
                  </div>
                  <p className="text-muted-foreground">
                    Pamiętaj o wykonaniu próby ciśnieniowej przed zalaniem posadzki lub zakryciem rur. Protokół zwalnia Cię z odpowiedzialności w razie zalania.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sticky Bottom Bar na telefonach (monter widzi sumę na bieżąco podczas klikania) */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-cyan-500/20 p-3 shadow-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Razem brutto (8% VAT):</div>
              <div className="text-base font-black text-cyan-600 dark:text-cyan-400 leading-tight">
                {formatCurrency(totalSummary.brutto)}
              </div>
            </div>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2 h-11 px-5 shadow-sm active:scale-95 transition-transform"
              onClick={handleCreateQuoteFromCalculator}
              disabled={totalSummary.netto === 0}
            >
              Utwórz wycenę
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ─── Zakładka 2: Protokoły Prób Ciśnieniowych ─── */}
        <TabsContent value="protocols">
          <PlumbingProtocolManager />
        </TabsContent>

        {/* ─── Zakładka 3: Normy i Wytyczne Branżowe ─── */}
        <TabsContent value="standards">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLUMBING_STANDARDS.map((std) => (
              <Card key={std.id} className="border-t-4 border-t-cyan-600">
                <CardHeader className="p-4 pb-2">
                  <Badge className="w-fit mb-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 font-mono">
                    {std.code}
                  </Badge>
                  <CardTitle className="text-sm font-bold leading-snug">{std.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2">
                  <p className="text-xs text-muted-foreground">{std.description}</p>
                  <div className="space-y-1 pt-2 border-t text-xs">
                    <span className="font-bold text-foreground block mb-1">Główne wymagania:</span>
                    {std.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
