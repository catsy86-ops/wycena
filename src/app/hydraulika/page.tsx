"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Droplets, Wrench, ShieldCheck, Flame, Plus, Calculator,
  ArrowRight, FileText, CheckCircle2, ChevronRight, Sparkles,
  Search, Package, AlertTriangle, Layers, Gauge, ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { useMaterialStore } from "@/store/material-store";
import { PlumbingProtocolManager } from "@/components/plumbing-protocol-manager";
import { PLUMBING_STANDARDS } from "@/lib/plumbing-protocols";
import Link from "next/link";
import { toast } from "sonner";
import { sounds } from "@/lib/audio";
import {
  calcHeatPumpDemand,
  CLIMATE_ZONES_PL,
  INSULATION_STANDARDS,
  type ClimateZone,
  type InsulationStandard,
} from "@/lib/heatpump-calc";

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

  // Magazyn materiałów
  const materials = useMaterialStore((s) => s.materials);
  const loadMaterials = useMaterialStore((s) => s.load);
  const quotes = useQuoteStore((s) => s.quotes);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Filtrowanie materiałów hydraulicznych
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>("all");

  const hydraulicMaterials = useMemo(() => {
    const electricalKeywords = [
      "kabel", "przewód", "gniazdko", "wyłącznik", "bezpiecznik", "puszka",
      "korytko", "peszel", "rozdzielnic", "wago", "oprawa", "led", "lampa",
      "nadprądow", "różnicowoprądow", "rcd", "spd", "przepięć", "szyna łączeniowa",
      "aparatura", "teletechnika", "utp", "domofon"
    ];

    let filtered = materials.filter((m) => {
      // 1. Jawny znacznik branży
      if (m.trade === "hydraulika") return true;
      if (m.trade === "elektryka") return false;

      // 2. Wyklucz pozycje elektryczne
      const nameLower = m.name.toLowerCase();
      if (electricalKeywords.some((kw) => nameLower.includes(kw))) return false;

      // 3. Sprawdź cechy hydrauliczne
      const catLower = m.category.toLowerCase();
      const hydraulicMarkers = ["rur", "pex", "pcv", "miedź", "syfon", "bateri", "zawór", "wc", "kanalizacj", "ogrzewan", "izolacj", "uszczeln"];
      return (
        hydraulicMarkers.some((kw) => nameLower.includes(kw) || catLower.includes(kw))
      );
    });

    if (materialCategoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === materialCategoryFilter);
    }
    if (materialSearchTerm) {
      const lower = materialSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(lower) || m.sku?.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [materials, materialCategoryFilter, materialSearchTerm]);

  const hydraulicCategories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach((m) => {
      if (m.trade === "hydraulika") cats.add(m.category);
    });
    return Array.from(cats);
  }, [materials]);

  // ─── Kalkulator pętli podłogówki PEX ─────────────────────────────────────────
  const [floorArea, setFloorArea] = useState<number>(65);
  const [floorPitch, setFloorPitch] = useState<number>(15); // rozstaw w cm (10, 15, 20)
  const [supplyDistance, setSupplyDistance] = useState<number>(8); // doprowadzenie do rozdzielacza w m

  const underfloorCalc = useMemo(() => {
    const area = Math.max(0, floorArea);
    // Średnia ilość rury na 1 m²:
    // rozstaw 10 cm: ~10 mb/m²
    // rozstaw 15 cm: ~6.7 mb/m²
    // rozstaw 20 cm: ~5 mb/m²
    let pipePerM2 = 6.7;
    if (floorPitch === 10) pipePerM2 = 10.0;
    else if (floorPitch === 20) pipePerM2 = 5.0;

    const purePipeLength = area * pipePerM2;
    // Maksymalna długość pojedynczej pętli wg normy PN-EN 1264 (rura 16x2): do 100-110m (ze spadkami ciśnienia)
    const maxLoopLength = 95;
    const estimatedLoops = area > 0 ? Math.max(1, Math.ceil(purePipeLength / maxLoopLength)) : 0;
    // Każda pętla ma podejście do szafki rozdzielacza (zasilanie + powrót)
    const totalPipeLength = Math.round(purePipeLength + estimatedLoops * supplyDistance * 2);
    const avgLoopLength = estimatedLoops > 0 ? Math.round(totalPipeLength / estimatedLoops) : 0;
    // Pojemność wodna rury PEX 16x2.0: ~0.113 l/mb
    const waterVolumeLiters = (totalPipeLength * 0.113).toFixed(1);

    // Szacunek kosztu materiałów (rura PEX + spinki + taśma brzegowa + rozdzielacz)
    const pexPipePrice = 4.8; // zł/mb
    const laborCost = area * 45; // 45 zł/m² robocizna

    return {
      totalPipeLength,
      estimatedLoops,
      avgLoopLength,
      waterVolumeLiters,
      pexCost: totalPipeLength * pexPipePrice,
      manifoldCost: Math.round(estimatedLoops * 90 + 150),
      laborCost,
    };
  }, [floorArea, floorPitch, supplyDistance]);

  const handleAddUnderfloorToQuote = () => {
    const items = [
      {
        name: `Rura PEX 16x2.0 do ogrzewania podłogowego (${underfloorCalc.totalPipeLength} mb)`,
        quantity: underfloorCalc.totalPipeLength,
        unit: "m" as const,
        priceNettoPerUnit: 4.8,
        vatRate: 23 as const,
      },
      {
        name: `Układanie pętli podłogówki (rozstaw ${floorPitch}cm, ${underfloorCalc.estimatedLoops} obwodów)`,
        quantity: floorArea,
        unit: "m²" as const,
        priceNettoPerUnit: 45,
        vatRate: 8 as const,
      },
      {
        name: `Rozdzielacz C.O. ${underfloorCalc.estimatedLoops}-obwodowy z rotametrami i szafką`,
        quantity: 1,
        unit: "kpl" as const,
        priceNettoPerUnit: underfloorCalc.manifoldCost,
        vatRate: 8 as const,
      },
      {
        name: "Próba ciśnieniowa instalacji podłogowej wg PN-EN 1264",
        quantity: 1,
        unit: "usł" as const,
        priceNettoPerUnit: 250,
        vatRate: 8 as const,
      },
    ];

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_plumbing_quote", JSON.stringify(items));
    toast.success("Przeniesiono kalkulację ogrzewania podłogowego do nowej wyceny!");
    router.push("/wyceny/nowa?source=hydraulika");
  };

  // ─── Stan Kalkulatora Pomp Ciepła i OZC (PN-EN 12831 / WT 2021) ───────────
  const [hpArea, setHpArea] = useState<number>(150);
  const [hpHeight, setHpHeight] = useState<number>(2.6);
  const [hpClimateZone, setHpClimateZone] = useState<ClimateZone>("III");
  const [hpInsulation, setHpInsulation] = useState<InsulationStandard>("wt2021");
  const [hpOccupants, setHpOccupants] = useState<number>(4);
  const [hpSystemType, setHpSystemType] = useState<"floor_only" | "radiators_low_temp" | "radiators_high_temp" | "mixed">("floor_only");
  const [hpHotWaterComfort, setHpHotWaterComfort] = useState<"eco" | "standard" | "high">("standard");

  const heatPumpResult = useMemo(() => {
    return calcHeatPumpDemand({
      heatedAreaM2: hpArea,
      ceilingHeightM: hpHeight,
      climateZone: hpClimateZone,
      insulation: hpInsulation,
      occupantsCount: hpOccupants,
      heatingSystemType: hpSystemType,
      hotWaterComfort: hpHotWaterComfort,
    });
  }, [hpArea, hpHeight, hpClimateZone, hpInsulation, hpOccupants, hpSystemType, hpHotWaterComfort]);

  const handleAddHeatPumpToQuote = () => {
    const pkg = heatPumpResult.recommendedPackage;
    const items = [
      {
        name: `${heatPumpResult.suggestedPumpModel} (A+++, ${heatPumpResult.norm})`,
        quantity: 1,
        unit: "kpl" as const,
        priceNettoPerUnit: pkg.pumpPriceNetto,
        vatRate: 8 as const,
      },
      {
        name: `Zasobnik C.W.U. ${heatPumpResult.dhwTankVolumeLiters}L z dużą wężownicą (min. 2.5 m²) do pompy ciepła`,
        quantity: 1,
        unit: "kpl" as const,
        priceNettoPerUnit: pkg.dhwPriceNetto,
        vatRate: 8 as const,
      },
      {
        name: `Zbiornik buforowy C.O. ${heatPumpResult.bufferTankVolumeLiters}L (sprzęgło hydrauliczne)`,
        quantity: 1,
        unit: "kpl" as const,
        priceNettoPerUnit: pkg.bufferPriceNetto,
        vatRate: 8 as const,
      },
      {
        name: "Armatura kotłowni (grupa bezp., naczynia przeponowe, separator magnetyczny, zawór 3-dr)",
        quantity: 1,
        unit: "kpl" as const,
        priceNettoPerUnit: pkg.hydraulicAccessoriesPriceNetto,
        vatRate: 8 as const,
      },
      {
        name: "Montaż maszynowni, podłączenie hydrauliczne i freonowe, próba azotem i uruchomienie",
        quantity: 1,
        unit: "usł" as const,
        priceNettoPerUnit: pkg.laborPriceNetto,
        vatRate: 8 as const,
      },
    ];

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_plumbing_quote", JSON.stringify(items));
    toast.success(`Przeniesiono zestaw pompy ciepła ${heatPumpResult.recommendedPumpPowerKW} kW do nowej wyceny!`);
    router.push("/wyceny/nowa?source=hydraulika");
  };

  // Filtrujemy wyceny hydrauliczne (z wykluczeniem pozycji elektrycznych)
  const hydraulicQuotes = useMemo(() => {
    const keywords = ["woda", "wod-kan", "bateria", "umywalk", "wanna", "prysznic", "wc", "stelaż", "podłogów", "kocioł", "grzejnik", "syfon", "kanalizacj", "hydraul", "pex"];
    const electricalBlacklist = ["kabel", "przewód", "peszel", "rozdzielni", "bezpiecznik", "wago", "rcd", "spd", "gniazd"];

    return quotes.filter((q) =>
      q.items.some((item) => {
        const nameLower = item.name.toLowerCase();
        const hasPlumbing = keywords.some((kw) => nameLower.includes(kw));
        const isElectrical = electricalBlacklist.some((kw) => nameLower.includes(kw));
        return hasPlumbing && !isElectrical;
      })
    );
  }, [quotes]);

  // Kalkulator sumy punktów
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
    sounds.playClick(delta > 0 ? 880 : 640);
    setSelectedPoints((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleCreateQuoteFromCalculator = () => {
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

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_plumbing_quote", JSON.stringify(items));
    router.push("/wyceny/nowa?source=hydraulika");
  };

  return (
    <div className="space-y-6 pb-32 lg:pb-6">
      {/* Header branżowy */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900/60 p-4 sm:p-5 rounded-2xl border border-cyan-700/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Droplets className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Moduł Hydrauliczny
              <Badge className="bg-cyan-600 text-white text-[10px] font-bold">WOD-KAN / C.O.</Badge>
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/80">
              Szybki kosztorys instalacji, magazyn materiałów, pętle PEX i protokoły prób ciśnieniowych
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
        <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full max-w-4xl h-auto p-1 bg-muted/60">
          <TabsTrigger value="calculator" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <Calculator className="h-4 w-4 shrink-0 text-cyan-500" />
            <span>Kalkulator</span>
          </TabsTrigger>
          <TabsTrigger value="heatpump" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <Flame className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-semibold text-amber-600 dark:text-amber-400">Pompa & OZC</span>
          </TabsTrigger>
          <TabsTrigger value="underfloor" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <Layers className="h-4 w-4 shrink-0 text-cyan-500" />
            <span>Podłogówka PEX</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <Package className="h-4 w-4 shrink-0 text-cyan-500" />
            <span>Materiały</span>
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-500" />
            <span>Protokoły prób</span>
          </TabsTrigger>
          <TabsTrigger value="standards" className="gap-1.5 py-2 px-2 text-xs sm:text-sm font-medium">
            <FileText className="h-4 w-4 shrink-0 text-cyan-500" />
            <span>Normy PN</span>
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

                        {/* Kontrolki ilości (+/-) */}
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
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono">{formatCurrency(totalSummary.brutto)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2 py-5 shadow-md"
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
                    Wymóg gwarancyjny PN-EN 806
                  </div>
                  <p className="text-muted-foreground">
                    Pamiętaj o wykonaniu próby ciśnieniowej przed zalaniem posadzki lub zakryciem rur. Protokół odbioru zabezpiecza instalatora przed roszczeniami.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sticky Bottom Bar na telefonach */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-cyan-500/20 p-3 shadow-xl flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Razem brutto (8% VAT):</div>
              <div className="text-base font-black text-cyan-600 dark:text-cyan-400 leading-tight font-mono">
                {formatCurrency(totalSummary.brutto)}
              </div>
            </div>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2 h-11 px-5"
              onClick={handleCreateQuoteFromCalculator}
              disabled={totalSummary.netto === 0}
            >
              Utwórz wycenę
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* ─── Zakładka: Kalkulator Pomp Ciepła i OZC (PN-EN 12831 / WT 2021) ─── */}
        <TabsContent value="heatpump" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Formularz wprowadzania danych budynku */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-amber-500/30 shadow-sm">
                <CardHeader className="p-4 pb-3 border-b bg-amber-500/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Flame className="h-5 w-5 text-amber-500" />
                      Parametry budynku i zapotrzebowanie (OZC)
                    </CardTitle>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-xs">
                      PN-EN 12831 / WT 2021
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Oblicz straty przenikania, wentylacji i moc grzewczą pod pompę ciepła
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Powierzchnia i wysokość */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="hp-area" className="text-xs font-semibold">
                        Powierzchnia ogrzewana (m²)
                      </Label>
                      <Input
                        id="hp-area"
                        type="number"
                        min={20}
                        max={1000}
                        value={hpArea}
                        onChange={(e) => setHpArea(Math.max(1, Number(e.target.value) || 0))}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="hp-height" className="text-xs font-semibold">
                        Wysokość kondygnacji (m)
                      </Label>
                      <Input
                        id="hp-height"
                        type="number"
                        step={0.1}
                        min={2.0}
                        max={5.0}
                        value={hpHeight}
                        onChange={(e) => setHpHeight(Number(e.target.value) || 2.6)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Strefa klimatyczna i Standard izolacji */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Strefa klimatyczna Polski</Label>
                      <Select
                        value={hpClimateZone}
                        onValueChange={(val) => {
                          if (val) setHpClimateZone(val as ClimateZone);
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CLIMATE_ZONES_PL).map(([key, zone]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              <span className="font-bold">Strefa {key}</span> ({zone.designOutdoorTemp}°C) - {zone.regionDescription}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[11px] text-muted-foreground block">
                        Projektowa temp. zewn.: <strong>{CLIMATE_ZONES_PL[hpClimateZone]?.designOutdoorTemp}°C</strong>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Standard izolacji budynku</Label>
                      <Select
                        value={hpInsulation}
                        onValueChange={(val) => {
                          if (val) setHpInsulation(val as InsulationStandard);
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INSULATION_STANDARDS).map(([key, info]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {info.label} (~{info.specificHeatLossWperM2} W/m²)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {INSULATION_STANDARDS[hpInsulation]?.description}
                      </span>
                    </div>
                  </div>

                  {/* Odbiorniki i C.W.U. */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Typ instalacji grzewczej</Label>
                      <Select
                        value={hpSystemType}
                        onValueChange={(val: any) => setHpSystemType(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor_only" className="text-xs">Podłogówka 100% (35°C)</SelectItem>
                          <SelectItem value="radiators_low_temp" className="text-xs">Grzejniki niskotemp. (45°C)</SelectItem>
                          <SelectItem value="mixed" className="text-xs">Mieszana: podłogówka + grzejniki</SelectItem>
                          <SelectItem value="radiators_high_temp" className="text-xs">Grzejniki tradycyjne (55°C)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="hp-occupants" className="text-xs font-semibold">
                        Liczba domowników (C.W.U.)
                      </Label>
                      <Input
                        id="hp-occupants"
                        type="number"
                        min={1}
                        max={12}
                        value={hpOccupants}
                        onChange={(e) => setHpOccupants(Math.max(1, Number(e.target.value) || 1))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Komfort ciepłej wody</Label>
                      <Select
                        value={hpHotWaterComfort}
                        onValueChange={(val: any) => setHpHotWaterComfort(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eco" className="text-xs">Eco (30 L/os/dobę)</SelectItem>
                          <SelectItem value="standard" className="text-xs">Standard (50 L/os/dobę)</SelectItem>
                          <SelectItem value="high" className="text-xs">Wysoki / wanna (70 L/os/dobę)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wyjaśnienia inżynieryjne */}
              <div className="p-3.5 rounded-xl bg-muted/40 border text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-cyan-600" />
                  Dobór wg wytycznych PORT PC i PN-EN 12831:
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Nowoczesne inwerterowe pompy ciepła dobiera się na 100% obciążenia budynku w punkcie biwalentnym (-7°C do -10°C). 
                  Zintegrowana grzałka szczytowa 3-9 kW wspomaga układ jedynie w rzadkie noce z temperaturą poniżej projektowej.
                </p>
              </div>
            </div>

            {/* Wyniki obliczeń i Kompletna kotłownia */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-md">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Rekomendowana Pompa Ciepła
                    </span>
                    <Badge className="bg-amber-600 text-white font-mono text-xs">
                      {heatPumpResult.recommendedPumpPowerKW} kW (A+++)
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-black text-foreground">
                    {heatPumpResult.suggestedPumpModel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  {/* Wskaźniki OZC */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-background border text-left">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Moc OZC (c.o.)</span>
                      <span className="text-base font-black text-foreground font-mono">
                        {heatPumpResult.buildingTransmissionLossKW} kW
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border text-left">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Dodatek C.W.U.</span>
                      <span className="text-base font-black text-foreground font-mono">
                        +{heatPumpResult.hotWaterDemandKW} kW
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border text-left">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Zbiornik buforowy</span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {heatPumpResult.bufferTankVolumeLiters} L
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border text-left">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Zasobnik C.W.U.</span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {heatPumpResult.dhwTankVolumeLiters} L
                      </span>
                    </div>
                  </div>

                  {/* Sprawność i zużycie */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Szacowany sezonowy SCOP:</span>
                      <span className="font-bold text-foreground font-mono">{heatPumpResult.scopEstimate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Punkt biwalencji:</span>
                      <span className="font-bold text-foreground font-mono">{heatPumpResult.bivalentPointTempC}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Roczne zapotrzebowanie ciepła:</span>
                      <span className="font-bold text-foreground font-mono">{heatPumpResult.estimatedYearlyHeatKWh.toLocaleString("pl-PL")} kWh/rok</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Szacowany pobór prądu:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {Math.round(heatPumpResult.estimatedYearlyHeatKWh / heatPumpResult.scopEstimate).toLocaleString("pl-PL")} kWh/rok
                      </span>
                    </div>
                  </div>

                  {/* Kosztorys montażu maszynowni */}
                  <div className="pt-2 border-t space-y-1.5 text-xs">
                    <div className="font-bold text-foreground flex items-center justify-between">
                      <span>Kompletna kotłownia z montażem:</span>
                      <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                        {formatCurrency(heatPumpResult.recommendedPackage.totalNetto)} netto
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>• Jednostka pompy ciepła:</span>
                        <span className="font-mono">{formatCurrency(heatPumpResult.recommendedPackage.pumpPriceNetto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Zasobnik C.W.U. ({heatPumpResult.dhwTankVolumeLiters}L):</span>
                        <span className="font-mono">{formatCurrency(heatPumpResult.recommendedPackage.dhwPriceNetto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Bufor C.O. ({heatPumpResult.bufferTankVolumeLiters}L):</span>
                        <span className="font-mono">{formatCurrency(heatPumpResult.recommendedPackage.bufferPriceNetto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Armatura, filtry, zawory, naczynia:</span>
                        <span className="font-mono">{formatCurrency(heatPumpResult.recommendedPackage.hydraulicAccessoriesPriceNetto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Montaż, hydraulika, freon, rozruch:</span>
                        <span className="font-mono">{formatCurrency(heatPumpResult.recommendedPackage.laborPriceNetto)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pt-1 border-t text-foreground font-bold">
                      <span>Razem brutto (8% VAT):</span>
                      <span className="text-base text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(heatPumpResult.recommendedPackage.totalNetto * 1.08)}
                      </span>
                    </div>
                  </div>

                  {/* Przycisk akcji */}
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 py-5 shadow-md"
                    onClick={handleAddHeatPumpToQuote}
                  >
                    Przenieś zestaw pompy ciepła do wyceny
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Zakładka 2: Materiały Hydrauliczne (Magazyn i cennik) ─── */}
        <TabsContent value="materials" className="space-y-4">
          <Card className="border-cyan-600/30">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-cyan-600" />
                    Baza Materiałów Hydraulicznych
                  </CardTitle>
                  <CardDescription>
                    Kształtki PEX, miedź, rury kanalizacyjne, armatura C.O. i rozdzielacze podłogówki
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-cyan-500/40 text-cyan-600 font-mono">
                    {hydraulicMaterials.length} pozycji
                  </Badge>
                  <Link href="/magazyn">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Otwórz cały Magazyn
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Filtry wyszukiwania */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 border-t border-border/40 mt-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj złączki, PEX, rury, SKU..."
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={materialCategoryFilter} onValueChange={(v) => setMaterialCategoryFilter(v || "all")}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Wszystkie kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie kategorie</SelectItem>
                    <SelectItem value="Rury i PEX">Rury i PEX</SelectItem>
                    <SelectItem value="Kształtki PEX">Kształtki PEX</SelectItem>
                    <SelectItem value="Kształtki miedź">Kształtki miedź</SelectItem>
                    <SelectItem value="Zawory i armatura">Zawory i armatura</SelectItem>
                    <SelectItem value="Ogrzewanie i C.O.">Ogrzewanie i C.O.</SelectItem>
                    <SelectItem value="Kanalizacja">Kanalizacja</SelectItem>
                    <SelectItem value="Izolacja">Izolacja</SelectItem>
                    <SelectItem value="Uszczelnienia">Uszczelnienia</SelectItem>
                    <SelectItem value="Syfony">Syfony</SelectItem>
                    <SelectItem value="Baterie">Baterie</SelectItem>
                    {hydraulicCategories
                      .filter((c) => !["Rury i PEX", "Kształtki PEX", "Kształtki miedź", "Zawory i armatura", "Ogrzewanie i C.O.", "Kanalizacja", "Izolacja", "Uszczelnienia", "Syfony", "Baterie"].includes(c))
                      .map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {(materialSearchTerm || materialCategoryFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setMaterialSearchTerm("");
                      setMaterialCategoryFilter("all");
                    }}
                  >
                    Resetuj filtry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hydraulicMaterials.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Droplets className="h-12 w-12 mx-auto mb-3 opacity-30 text-cyan-500" />
                  <div className="text-base font-semibold mb-1">Brak materiałów hydraulicznych</div>
                  <div className="text-xs">Nie znaleziono materiałów spełniających zadane kryteria.</div>
                  <Button
                    className="mt-4 text-xs"
                    variant="outline"
                    onClick={() => {
                      setMaterialSearchTerm("");
                      setMaterialCategoryFilter("all");
                    }}
                  >
                    Wyczyść filtry wyszukiwania
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-[11px] sm:text-xs">
                        <th className="text-left py-2.5 font-medium">Nazwa materiału</th>
                        <th className="text-left py-2.5 font-medium">Kategoria</th>
                        <th className="text-left py-2.5 font-medium">SKU</th>
                        <th className="text-right py-2.5 font-medium">Cena zakupu</th>
                        <th className="text-right py-2.5 font-medium">Cena wyceny</th>
                        <th className="text-right py-2.5 font-medium">Stan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {hydraulicMaterials.map((mat) => {
                        const isLowStock = mat.stockQuantity <= mat.minStockLevel;
                        return (
                          <tr key={mat.id || mat.sku} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 font-medium text-foreground">
                              {mat.name}
                            </td>
                            <td className="py-2.5">
                              <Badge variant="secondary" className="text-[10px]">
                                {mat.category}
                              </Badge>
                            </td>
                            <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                              {mat.sku || "—"}
                            </td>
                            <td className="py-2.5 text-right text-muted-foreground font-mono">
                              {formatCurrency(mat.purchasePrice)}
                            </td>
                            <td className="py-2.5 text-right font-bold font-mono text-cyan-600 dark:text-cyan-400">
                              {formatCurrency(mat.salePrice)}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full ${
                                isLowStock
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {isLowStock && <AlertTriangle className="h-3 w-3" />}
                                {mat.stockQuantity} {mat.unit}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Zakładka 3: Kalkulator Pętli Ogrzewania Podłogowego PEX ─── */}
        <TabsContent value="underfloor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-cyan-600/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-5 w-5 text-cyan-600" />
                    Kalkulator Doboru Pętli PEX i Rozdzielacza
                  </CardTitle>
                  <CardDescription>
                    Oblicz zapotrzebowanie na rurę PEX 16x2.0, liczbę pętli, objętość zładu wg normy PN-EN 1264
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Powierzchnia grzewcza (m²)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={floorArea}
                        onChange={(e) => setFloorArea(Number(e.target.value))}
                        className="h-10 text-sm font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Rozstaw rur (cm)</Label>
                      <Select value={String(floorPitch)} onValueChange={(v) => setFloorPitch(Number(v))}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 cm (strefy brzegowe, łazienki ~10 m/m²)</SelectItem>
                          <SelectItem value="15">15 cm (standard domowy ~6.7 m/m²)</SelectItem>
                          <SelectItem value="20">20 cm (sypialnie, niskie zapotrzebowanie ~5 m/m²)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Śr. odległość do szafki (m)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={supplyDistance}
                        onChange={(e) => setSupplyDistance(Number(e.target.value))}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  {/* Wyniki techniczne */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/40">
                    <div className="bg-muted/40 p-3 rounded-xl border">
                      <div className="text-[11px] text-muted-foreground">Rura PEX 16:</div>
                      <div className="text-lg font-black text-foreground font-mono mt-0.5">
                        {underfloorCalc.totalPipeLength} mb
                      </div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border">
                      <div className="text-[11px] text-muted-foreground">Liczba pętli / sekcji:</div>
                      <div className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                        {underfloorCalc.estimatedLoops} obw.
                      </div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border">
                      <div className="text-[11px] text-muted-foreground">Śr. długość pętli:</div>
                      <div className="text-lg font-black text-foreground font-mono mt-0.5">
                        {underfloorCalc.avgLoopLength} m
                      </div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border">
                      <div className="text-[11px] text-muted-foreground">Zład wody z pętli:</div>
                      <div className="text-lg font-black text-foreground font-mono mt-0.5">
                        {underfloorCalc.waterVolumeLiters} L
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-cyan-50/50 dark:bg-cyan-950/20 p-3 rounded-lg border border-cyan-500/20">
                    💡 <strong>Wskazówka montażowa PN-EN 1264:</strong> Długość pojedynczej pętli rury 16x2.0 nie powinna przekraczać 100-110 mb, aby utrzymać odpowiednie opory hydrauliczne dla pompy obiegowej. Rozstaw 10 cm zaleca się przy oknach balkonowych i w łazienkach.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel kosztowy podłogówki */}
            <div className="space-y-4">
              <Card className="border-cyan-600/30 shadow-md">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-600" />
                    Kalkulacja kosztorysu PEX
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Materiały + robocizna dla {floorArea} m²
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="space-y-1.5 text-xs text-muted-foreground border-b pb-3">
                    <div className="flex justify-between">
                      <span>Rura PEX ({underfloorCalc.totalPipeLength}m):</span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(underfloorCalc.totalPipeLength * 4.8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rozdzielacz ({underfloorCalc.estimatedLoops} obw.) + szafka:</span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(underfloorCalc.manifoldCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Robocizna ({floorArea} m²):</span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(underfloorCalc.laborCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Próba ciśnieniowa:</span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(250)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-foreground pt-1">
                      <span>Razem netto:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono">
                        {formatCurrency(underfloorCalc.totalPipeLength * 4.8 + underfloorCalc.manifoldCost + underfloorCalc.laborCost + 250)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2 py-5 shadow-md"
                    onClick={handleAddUnderfloorToQuote}
                    disabled={floorArea <= 0}
                  >
                    Wstaw kalkulację do wyceny
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Zakładka 4: Protokoły Prób Ciśnieniowych ─── */}
        <TabsContent value="protocols">
          <PlumbingProtocolManager />
        </TabsContent>

        {/* ─── Zakładka 5: Normy i Wytyczne Branżowe ─── */}
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
