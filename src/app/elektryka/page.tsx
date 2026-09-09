"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { useServiceStore } from "@/store/service-store";
import { useTimeStore } from "@/store/time-store";
import { useMaterialStore } from "@/store/material-store";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Zap, Cable, CircuitBoard, Lightbulb, Power, Plug,
  FileText, TrendingUp, Users, Package, Plus, Search,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  AlertTriangle, CheckCircle2, Clock, Wrench, Calculator, ShieldCheck,
  ChevronRight, Sparkles, Layers,
} from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { CableSeparator, ScrewRow, ElectricalBadge, CurrentIndicator, WireProgress } from "@/components/electrical-decorations";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, subMonths, isThisMonth } from "date-fns";
import { pl } from "date-fns/locale";
import { sounds } from "@/lib/audio";
import {
  calcCableSection,
  calcBreaker,
  CABLE_AMPACITY,
  BREAKER_RATINGS,
  type BreakerChar,
  type BreakerRating,
} from "@/lib/electrical-calc";

// Kategorie usług elektrycznych
const ELECTRICAL_CATEGORIES = [
  { id: "instalacja", label: "Instalacja", icon: Cable, color: "from-amber-500 to-yellow-600" },
  { id: "naprawa", label: "Naprawa", icon: Wrench, color: "from-orange-500 to-red-600" },
  { id: "pomiar", label: "Pomiary", icon: CircuitBoard, color: "from-green-500 to-emerald-600" },
  { id: "oswietlenie", label: "Oświetlenie", icon: Lightbulb, color: "from-purple-500 to-violet-600" },
  { id: "rozdzielnia", label: "Rozdzielnie", icon: Power, color: "from-blue-500 to-indigo-600" },
  { id: "gniazda", label: "Gniazda/Wyłączniki", icon: Plug, color: "from-teal-500 to-cyan-600" },
];

// Typowe usługi elektryczne z cenami orientacyjnymi
const ELECTRICAL_SERVICES_TEMPLATE = [
  { name: "Montaż gniazdka elektrycznego", category: "gniazda", priceMin: 80, priceMax: 150, unit: "szt" },
  { name: "Montaż wyłącznika światła", category: "gniazda", priceMin: 60, priceMax: 120, unit: "szt" },
  { name: "Montaż lampy sufitowej", category: "oswietlenie", priceMin: 100, priceMax: 250, unit: "szt" },
  { name: "Montaż oświetlenia LED", category: "oswietlenie", priceMin: 150, priceMax: 400, unit: "mb" },
  { name: "Wymiana bezpiecznika", category: "rozdzielnia", priceMin: 50, priceMax: 100, unit: "szt" },
  { name: "Montaż rozdzielnicy", category: "rozdzielnia", priceMin: 800, priceMax: 2500, unit: "szt" },
  { name: "Prowadzenie przewodów (bruzda)", category: "instalacja", priceMin: 40, priceMax: 80, unit: "mb" },
  { name: "Prowadzenie przewodów (natynkowe)", category: "instalacja", priceMin: 25, priceMax: 50, unit: "mb" },
  { name: "Montaż skrzynki elektrycznej", category: "rozdzielnia", priceMin: 200, priceMax: 600, unit: "szt" },
  { name: "Pomiar instalacji elektrycznej", category: "pomiar", priceMin: 200, priceMax: 500, unit: "szt" },
  { name: "Pomiar rezystancji izolacji", category: "pomiar", priceMin: 150, priceMax: 300, unit: "szt" },
  { name: "Pomiar skuteczności zerowania", category: "pomiar", priceMin: 100, priceMax: 200, unit: "szt" },
  { name: "Naprawa instalacji elektrycznej", category: "naprawa", priceMin: 150, priceMax: 400, unit: "godz" },
  { name: "Lokalizacja awarii", category: "naprawa", priceMin: 100, priceMax: 300, unit: "szt" },
  { name: "Wymiana instalacji w mieszkaniu", category: "instalacja", priceMin: 5000, priceMax: 15000, unit: "kpl" },
  { name: "Montaż domofonu/wideodomofonu", category: "instalacja", priceMin: 300, priceMax: 800, unit: "szt" },
  { name: "Montaż alarmu", category: "instalacja", priceMin: 1000, priceMax: 3000, unit: "kpl" },
  { name: "Montaż fotowoltaiki", category: "instalacja", priceMin: 15000, priceMax: 40000, unit: "kpl" },
  { name: "Montaż ładowarki EV", category: "instalacja", priceMin: 2000, priceMax: 5000, unit: "szt" },
  { name: "Montaż UPS", category: "instalacja", priceMin: 500, priceMax: 2000, unit: "szt" },
];

export default function ElektrykaPage() {
  const router = useRouter();
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);
  const services = useServiceStore((s) => s.services);
  const timeEntries = useTimeStore((s) => s.entries);
  const materials = useMaterialStore((s) => s.materials);

  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // ─── Szybka wycena punktów elektrycznych ──────────────────────────────────
  const ELECTRICAL_FAST_POINTS = useMemo(() => [
    { id: "el1", name: "Punkt oświetleniowy (wypust sufitowy/ścienny)", price: 90, unit: "pkt", desc: "Przewód YDYp 3x1.5, montaż puszki / wypustu" },
    { id: "el2", name: "Punkt gniazda 230V pojedynczego/podwójnego", price: 100, unit: "pkt", desc: "Bruzda, peszel, przewód YDYp 3x2.5, puszka fi 60" },
    { id: "el3", name: "Punkt gniazda siłowego 400V (kuchnia indukcja / garaż)", price: 220, unit: "pkt", desc: "Przewód YDY 5x2.5 lub 5x4, zabezpieczenie dedykowane" },
    { id: "el4", name: "Biały montaż osprzętu (gniazdo/wyłącznik)", price: 35, unit: "szt", desc: "Osadzenie mechanizmu, podłączenie, ramka ozdobna" },
    { id: "el5", name: "Montaż i podłączenie lampy / kinkietu / plafonu", price: 80, unit: "szt", desc: "Zawieszenie oprawy, podłączenie kostki, test" },
    { id: "el6", name: "Montaż taśmy LED z zasilaczem i profilem ALU", price: 65, unit: "mb", desc: "Montaż profilu, wklejenie taśmy, podłączenie zasilacza 12/24V" },
    { id: "el7", name: "Uzbrojenie rozdzielnicy modułowej (RCD + nadprądowe)", price: 650, unit: "kpl", desc: "Szyny DIN, blok rozdzielczy, aparatura 24-36M, opis obwodów" },
    { id: "el8", name: "Pomiary odbiorcze instalacji (izolacja + pętla zwarcia)", price: 350, unit: "kpl", desc: "Pomiary miernikiem z certyfikatem wzorcowania, protokół SEP" },
    { id: "el9", name: "Podłączenie płyty indukcyjnej z wpisem do gwarancji", price: 180, unit: "szt", desc: "Uprawnienia SEP E+D, wpis w kartę gwarancyjną producenta" },
  ], []);

  const [selectedFastPoints, setSelectedFastPoints] = useState<Record<string, number>>({
    el1: 6,
    el2: 12,
    el3: 1,
    el4: 18,
    el7: 1,
    el8: 1,
  });

  const fastPointsSummary = useMemo(() => {
    let netto = 0;
    Object.entries(selectedFastPoints).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const pt = ELECTRICAL_FAST_POINTS.find((p) => p.id === id);
      if (pt) netto += pt.price * qty;
    });
    const vat = netto * 0.08;
    return { netto, vat, brutto: netto + vat };
  }, [selectedFastPoints, ELECTRICAL_FAST_POINTS]);

  const handleFastPointQty = (id: string, delta: number) => {
    sounds.playClick(delta > 0 ? 880 : 640);
    setSelectedFastPoints((prev) => {
      const cur = prev[id] || 0;
      return { ...prev, [id]: Math.max(0, cur + delta) };
    });
  };

  const handleCreateQuoteFromFastPoints = () => {
    const items = Object.entries(selectedFastPoints)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const pt = ELECTRICAL_FAST_POINTS.find((p) => p.id === id)!;
        return {
          name: pt.name,
          quantity: qty,
          unit: pt.unit as any,
          priceNettoPerUnit: pt.price,
          vatRate: 8 as const,
        };
      });

    if (items.length === 0) {
      toast.error("Wybierz przynajmniej jeden punkt do wyceny.");
      return;
    }

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_electrical_quote", JSON.stringify(items));
    toast.success("Przeniesiono pozycje do formularza wyceny!");
    router.push("/wyceny/nowa?source=elektryka");
  };

  // ─── Stan Kalkulatora Kabla (PN-HD 60364-5-52) ───────────────────────────
  const [cableCurrent, setCableCurrent] = useState<number>(16);
  const [cableLength, setCableLength] = useState<number>(25);
  const [cableVoltage, setCableVoltage] = useState<230 | 400>(230);
  const [cablePhases, setCablePhases] = useState<1 | 3>(1);
  const [cableMaterial, setCableMaterial] = useState<"cu" | "al">("cu");
  const [cableCircuitType, setCableCircuitType] = useState<"lighting" | "power">("power");
  const [cablePowerFactor, setCablePowerFactor] = useState<number>(1.0);

  const cableCalcResult = useMemo(() => {
    if (cableCurrent <= 0 || cableLength <= 0) return null;
    return calcCableSection({
      currentA: cableCurrent,
      lengthM: cableLength,
      voltageV: cableVoltage,
      phases: cablePhases,
      material: cableMaterial,
      circuitType: cableCircuitType,
      powerFactor: cablePowerFactor,
    });
  }, [cableCurrent, cableLength, cableVoltage, cablePhases, cableMaterial, cableCircuitType, cablePowerFactor]);

  const handleAddCableToQuote = () => {
    if (!cableCalcResult) return;
    const items = [
      {
        name: `Przewód ${cableCalcResult.recommendedName} ${cableMaterial === "cu" ? "Cu" : "Al"} (${cablePhases === 1 ? "1-faz 230V" : "3-faz 400V"})`,
        quantity: cableLength,
        unit: "mb" as const,
        priceNettoPerUnit: cableCalcResult.recommendedSection >= 6 ? 18 : 6.5,
        vatRate: 23 as const,
      },
      {
        name: `Układanie i podłączenie przewodu ${cableCalcResult.recommendedName} (trasa ${cableLength} mb)`,
        quantity: cableLength,
        unit: "mb" as const,
        priceNettoPerUnit: 28,
        vatRate: 8 as const,
      },
    ];

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_electrical_quote", JSON.stringify(items));
    toast.success(`Przeniesiono kabel ${cableCalcResult.recommendedName} do nowej wyceny!`);
    router.push("/wyceny/nowa?source=elektryka");
  };

  // ─── Stan Kalkulatora Zabezpieczeń (PN-EN 60898-1) ────────────────────────
  const [breakerPower, setBreakerPower] = useState<number>(3600);
  const [breakerVoltage, setBreakerVoltage] = useState<230 | 400>(230);
  const [breakerPhases, setBreakerPhases] = useState<1 | 3>(1);
  const [breakerPowerFactor, setBreakerPowerFactor] = useState<number>(1.0);
  const [breakerLoadType, setBreakerLoadType] = useState<"resistive" | "inductive" | "motor" | "lighting" | "mixed">("mixed");
  const [breakerCableSection, setBreakerCableSection] = useState<number | undefined>(2.5);

  const breakerCalcResult = useMemo(() => {
    if (breakerPower <= 0) return null;
    return calcBreaker({
      powerW: breakerPower,
      voltageV: breakerVoltage,
      phases: breakerPhases,
      powerFactor: breakerPowerFactor,
      loadType: breakerLoadType,
      cableSection: breakerCableSection,
    });
  }, [breakerPower, breakerVoltage, breakerPhases, breakerPowerFactor, breakerLoadType, breakerCableSection]);

  const handleAddBreakerToQuote = () => {
    if (!breakerCalcResult) return;
    const items = [
      {
        name: `Wyłącznik nadprądowy ${breakerCalcResult.recommendedName} (${breakerCalcResult.norm})`,
        quantity: 1,
        unit: "szt" as const,
        priceNettoPerUnit: 45,
        vatRate: 23 as const,
      },
      {
        name: `Montaż i podłączenie zabezpieczenia ${breakerCalcResult.recommendedName} w rozdzielnicy`,
        quantity: 1,
        unit: "szt" as const,
        priceNettoPerUnit: 60,
        vatRate: 8 as const,
      },
    ];

    sounds.playSuccess();
    localStorage.setItem("gksystem_quick_electrical_quote", JSON.stringify(items));
    toast.success(`Przeniesiono wyłącznik ${breakerCalcResult.recommendedName} do wyceny!`);
    router.push("/wyceny/nowa?source=elektryka");
  };

  // ─── Statystyki elektryczne ─────────────────────────────────────────────
  // Filtrujemy wyceny które zawierają usługi elektryczne
  // (na podstawie nazw usług zawierających słowa kluczowe)
  const isElectricalItem = useCallback((name: string) => {
    const lower = name.toLowerCase();
    // Ścisłe wykluczenie fraz hydraulicznych
    const hydraulicKeywords = [
      "rura pcv", "rura pex", "rura miedzian", "syfon", "bateria", "spłuczka",
      "kanaliz", "wc", "umywalk", "wanna", "prysznic", "wod-kan", "ciśnieni"
    ];
    if (hydraulicKeywords.some((hw) => lower.includes(hw))) return false;

    // Słowa ściśle elektryczne (bez wieloznacznego "instalacj" i ogólnego "pomiar")
    const electricalKeywords = [
      "elektr", "gniazdko", "wyłącznik", "kabel", "przewód", "bezpiecznik",
      "rozdzielni", "oświetleni", "lampa", "led", "pomiar elektryczn", "pomiary sep",
      "rezystancj", "zerowani", "fotowolt", "ładowark", "ups", "domofon", "alarm",
      "wago", "peszel", "aparatura", "rcd", "spd"
    ];
    return electricalKeywords.some((kw) => lower.includes(kw));
  }, []);

  const electricalQuotes = useMemo(() => {
    return quotes.filter((q) => q.items.some((item) => isElectricalItem(item.name)));
  }, [quotes, isElectricalItem]);

  const stats = useMemo(() => {
    const total = electricalQuotes.length;
    const accepted = electricalQuotes.filter((q) => q.status === "zaakceptowana").length;
    const conversionRate = total > 0 ? round((accepted / total) * 100) : 0;
    const revenue = electricalQuotes
      .filter((q) => q.status === "zaakceptowana")
      .reduce((s, q) => s + q.totalBrutto, 0);
    const avgValue = accepted > 0 ? round(revenue / accepted) : 0;
    const pending = electricalQuotes.filter((q) => q.status === "wyslana").length;

    // This month
    const thisMonthQuotes = electricalQuotes.filter((q) => isThisMonth(new Date(q.createdAt)));
    const thisMonthRevenue = thisMonthQuotes
      .filter((q) => q.status === "zaakceptowana")
      .reduce((s, q) => s + q.totalBrutto, 0);

    return { total, accepted, conversionRate, revenue, avgValue, pending, thisMonthQuotes: thisMonthQuotes.length, thisMonthRevenue };
  }, [electricalQuotes]);

  // ─── Top usługi elektryczne ─────────────────────────────────────────────
  const topElectricalServices = useMemo(() => {
    const usage: Record<string, { name: string; count: number; revenue: number }> = {};
    electricalQuotes
      .filter((q) => q.status === "zaakceptowana")
      .forEach((q) => {
        q.items.filter((item) => isElectricalItem(item.name)).forEach((item) => {
          const key = item.name;
          if (!usage[key]) usage[key] = { name: key, count: 0, revenue: 0 };
          usage[key].count += item.quantity;
          usage[key].revenue += item.bruttoTotal;
        });
      });
    return Object.values(usage).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [electricalQuotes, isElectricalItem]);

  // ─── Cennik usług elektrycznych ─────────────────────────────────────────
  const filteredServices = useMemo(() => {
    let filtered = ELECTRICAL_SERVICES_TEMPLATE;
    if (categoryFilter !== "all") {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(lower));
    }
    return filtered;
  }, [categoryFilter, searchTerm]);

  // ─── Materiały elektryczne ──────────────────────────────────────────────
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>("all");

  const electricalMaterials = useMemo(() => {
    const electricalKeywords = [
      "kabel", "przewód", "gniazdko", "wyłącznik", "bezpiecznik", "puszka",
      "korytko", "peszel", "rozdzielnic", "wago", "oprawa", "led", "lampa",
      "nadprądow", "różnicowoprądow", "rcd", "spd", "przepięć", "szyna łączeniowa",
      "aparatura", "teletechnika", "utp", "domofon"
    ];
    const hydraulicExclusions = [
      "pcv", "pex", "miedź", "miedzian", "syfon", "bateria", "spłuczka",
      "kanaliz", "wc", "zawór", "grzejnik", "wod-kan", "wanny", "umywalk", "uszczelka"
    ];
    const hydraulicCategories = ["Rury", "Syfony", "Baterie", "WC", "Uszczelnienia", "Kanalizacja"];

    let filtered = materials.filter((m) => {
      // 1. Jawny znacznik branży
      if (m.trade === "elektryka") return true;
      if (m.trade === "hydraulika") return false;

      // 2. Wyklucz kategorie hydrauliczne
      if (hydraulicCategories.includes(m.category)) return false;

      const nameLower = m.name.toLowerCase();
      // 3. Wyklucz słowa kluczowe hydrauliki
      if (hydraulicExclusions.some((kw) => nameLower.includes(kw))) return false;

      // 4. Dopasuj do elektryki
      const catLower = m.category.toLowerCase();
      return (
        electricalKeywords.some((kw) => nameLower.includes(kw)) ||
        catLower.includes("elektr") ||
        catLower.includes("kabl") ||
        catLower.includes("aparat") ||
        catLower.includes("rozdziel")
      );
    });

    if (materialCategoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === materialCategoryFilter);
    }
    if (materialSearchTerm) {
      const lower = materialSearchTerm.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(lower) || m.sku?.toLowerCase().includes(lower));
    }
    return filtered;
  }, [materials, materialCategoryFilter, materialSearchTerm]);

  const electricalMaterialCategories = useMemo(() => {
    const cats = new Set<string>();
    materials.forEach((m) => {
      if (m.trade === "elektryka") cats.add(m.category);
    });
    return Array.from(cats);
  }, [materials]);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-electrical">
                <Zap className="inline h-7 w-7 mr-2" style={{ color: "oklch(0.72 0.18 60)" }} />
                Dział Elektryczny
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Wyceny, cennik i analityka usług elektrycznych</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/elektryka/protokoly" onClick={() => sounds.playClick(850)}>
                <Button variant="outline" className="border-border/80 hover:border-amber-500/50">
                  <FileText className="h-4 w-4 text-amber-500" />
                  Protokoły
                </Button>
              </Link>
              <Link href="/elektryka/nowa" onClick={() => sounds.playSuccess()}>
                <Button className="btn-glow-amber text-slate-950 font-black gap-1.5 shadow-md">
                  <Plus className="h-4 w-4 stroke-[3]" />
                  Nowa wycena
                </Button>
              </Link>
            </div>
          </div>
        </StaggerItem>

        {/* Current indicator */}
        <StaggerItem>
          <CurrentIndicator active />
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black"><AnimatedCounter value={stats.total} /></div>
                    <div className="text-xs text-muted-foreground">Wyceny elektryczne</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black">{stats.conversionRate}%</div>
                    <div className="text-xs text-muted-foreground">Konwersja</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">{formatCurrency(stats.revenue)}</div>
                    <div className="text-xs text-muted-foreground">Przychód</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-electrical">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">{formatCurrency(stats.avgValue)}</div>
                    <div className="text-xs text-muted-foreground">Śr. wartość</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                    <Cable className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Tabs */}
        <StaggerItem>
          <ScrewRow>Szczegóły</ScrewRow>
        </StaggerItem>
        <StaggerItem>
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              sounds.playClick(940);
              setActiveTab(val);
            }}
          >
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Przegląd</TabsTrigger>
              <TabsTrigger value="quick_calculator" className="text-xs sm:text-sm py-2 font-medium flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-amber-500" />
                <span>Szybka wycena</span>
              </TabsTrigger>
              <TabsTrigger value="engineering_calcs" className="text-xs sm:text-sm py-2 font-medium flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                <span>Kable i aparaty</span>
              </TabsTrigger>
              <TabsTrigger value="cennik" className="text-xs sm:text-sm py-2">Cennik</TabsTrigger>
              <TabsTrigger value="wyceny" className="text-xs sm:text-sm py-2">Wyceny</TabsTrigger>
              <TabsTrigger value="materialy" className="text-xs sm:text-sm py-2">Materiały</TabsTrigger>
            </TabsList>

            {/* ── Przegląd ── */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Kategorie */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {ELECTRICAL_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card
                      key={cat.id}
                      className="card-panel cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
                      onClick={() => {
                        sounds.playClick(850);
                        setCategoryFilter(cat.id);
                        setActiveTab("cennik");
                      }}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} shadow-lg mx-auto mb-2`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-xs font-semibold">{cat.label}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Top usługi */}
              <Card className="card-electrical">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top usługi elektryczne</CardTitle>
                  <CardDescription>Najczęściej wyceniane usługi</CardDescription>
                </CardHeader>
                <CardContent>
                  {topElectricalServices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Brak danych — dodaj wyceny z usługami elektrycznymi
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topElectricalServices.map((s, i) => {
                        const maxRev = topElectricalServices[0]?.revenue || 1;
                        const pct = round((s.revenue / maxRev) * 100);
                        return (
                          <div key={s.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate max-w-[55%]">{i + 1}. {s.name}</span>
                              <span className="font-bold shrink-0" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(s.revenue)}</span>
                            </div>
                            <WireProgress percent={pct} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statystyki tego miesiąca */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Card className="card-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ten miesiąc</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wyceny:</span>
                      <span className="font-bold">{stats.thisMonthQuotes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Przychód:</span>
                      <span className="font-bold" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(stats.thisMonthRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Oczekujące:</span>
                      <span className="font-bold">{stats.pending}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Szybkie akcje</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/elektryka/nowa" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Plus className="h-4 w-4" /> Nowa wycena elektryczna
                      </Button>
                    </Link>
                    <Link href="/uslugi" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Wrench className="h-4 w-4" /> Zarządzaj usługami
                      </Button>
                    </Link>
                    <Link href="/materialy" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Package className="h-4 w-4" /> Materiały elektryczne
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Cennik ── */}
            <TabsContent value="cennik" className="space-y-4 mt-4">
              {/* Filtry */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj usługi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 input-electrical"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Kategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {ELECTRICAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela cennika */}
              <Card className="card-electrical">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cennik Usług Elektrycznych</CardTitle>
                  <CardDescription>Orientacyjne ceny rynkowe (netto)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 font-medium">Usługa</th>
                          <th className="text-center py-2 font-medium">Kategoria</th>
                          <th className="text-right py-2 font-medium">Cena od</th>
                          <th className="text-right py-2 font-medium">Cena do</th>
                          <th className="text-center py-2 font-medium">Jednostka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredServices.map((s) => {
                          const cat = ELECTRICAL_CATEGORIES.find((c) => c.id === s.category);
                          return (
                            <tr key={s.name} className="border-b border-border/50 hover:bg-accent/50">
                              <td className="py-2.5 font-medium">{s.name}</td>
                              <td className="py-2.5 text-center">
                                <ElectricalBadge>{cat?.label || s.category}</ElectricalBadge>
                              </td>
                              <td className="py-2.5 text-right font-semibold">{formatCurrency(s.priceMin)}</td>
                              <td className="py-2.5 text-right font-semibold">{formatCurrency(s.priceMax)}</td>
                              <td className="py-2.5 text-center text-muted-foreground">{s.unit}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Wyceny ── */}
            <TabsContent value="wyceny" className="space-y-4 mt-4">
              <Card className="card-electrical">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Wyceny Elektryczne</CardTitle>
                  <CardDescription>Wyceny zawierające usługi elektryczne</CardDescription>
                </CardHeader>
                <CardContent>
                  {electricalQuotes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <div className="text-lg font-semibold mb-1">Brak wycen elektrycznych</div>
                      <div className="text-sm">Dodaj wycenę z usługami elektrycznymi aby zobaczyć je tutaj</div>
                      <Link href="/wyceny/nowa">
                        <Button className="mt-4 btn-switch">
                          <Plus className="h-4 w-4" /> Nowa wycena
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 font-medium">Numer</th>
                            <th className="text-left py-2 font-medium">Klient</th>
                            <th className="text-left py-2 font-medium">Data</th>
                            <th className="text-center py-2 font-medium">Status</th>
                            <th className="text-right py-2 font-medium">Brutto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {electricalQuotes.slice(0, 20).map((q) => (
                            <tr key={q.id} className="border-b border-border/50 hover:bg-accent/50">
                              <td className="py-2">
                                <Link href={`/wyceny/${q.id}`} className="font-semibold hover:underline" style={{ color: "oklch(0.72 0.18 60)" }}>
                                  {q.number}
                                </Link>
                              </td>
                              <td className="py-2 text-muted-foreground">{q.clientName}</td>
                              <td className="py-2 text-muted-foreground">{format(new Date(q.createdAt), "dd.MM.yyyy")}</td>
                              <td className="py-2 text-center">
                                <Badge variant={q.status === "zaakceptowana" ? "default" : q.status === "odrzucona" ? "destructive" : "secondary"}>
                                  {q.status === "szkic" ? "Szkic" : q.status === "wyslana" ? "Wysłana" : q.status === "zaakceptowana" ? "Zaakceptowana" : "Odrzucona"}
                                </Badge>
                              </td>
                              <td className="py-2 text-right font-bold">{formatCurrency(q.totalBrutto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Materiały ── */}
            <TabsContent value="materialy" className="space-y-4 mt-4">
              <Card className="card-electrical">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-5 w-5 text-amber-500" />
                        Magazyn Materiałów Elektrycznych
                      </CardTitle>
                      <CardDescription>
                        Kable, aparatura modułowa, złączki WAGO i osprzęt elektroinstalacyjny ({electricalMaterials.length} pozycji)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/materialy">
                        <Button size="sm" variant="outline" className="gap-1.5 border-amber-500/30 hover:border-amber-500/60">
                          <Plus className="h-4 w-4 text-amber-500" /> Zarządzaj w magazynie
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Filtry i wyszukiwarka */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 border-t border-border/40 mt-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Szukaj kabla, aparatu, SKU..."
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
                        <SelectItem value="Kable i przewody">Kable i przewody</SelectItem>
                        <SelectItem value="Aparatura modułowa">Aparatura modułowa</SelectItem>
                        <SelectItem value="Rozdzielnice">Rozdzielnice</SelectItem>
                        <SelectItem value="Osprzęt i puszki">Osprzęt i puszki</SelectItem>
                        <SelectItem value="Prowadzenie kabli">Prowadzenie kabli</SelectItem>
                        <SelectItem value="Teletechnika">Teletechnika</SelectItem>
                        {electricalMaterialCategories
                          .filter((c) => !["Kable i przewody", "Aparatura modułowa", "Rozdzielnice", "Osprzęt i puszki", "Prowadzenie kabli", "Teletechnika"].includes(c))
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
                  {electricalMaterials.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-3 opacity-30 text-amber-500" />
                      <div className="text-lg font-semibold mb-1">Brak materiałów elektrycznych</div>
                      <div className="text-sm">Nie znaleziono materiałów spełniających kryteria wyszukiwania.</div>
                      <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => {
                          setMaterialSearchTerm("");
                          setMaterialCategoryFilter("all");
                        }}
                      >
                        Pokaż wszystkie materiały elektryczne
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 font-medium">Nazwa materiału</th>
                            <th className="text-left py-2 font-medium">Kategoria</th>
                            <th className="text-left py-2 font-medium">SKU / Kod</th>
                            <th className="text-right py-2 font-medium">Cena zakupu</th>
                            <th className="text-right py-2 font-medium">Cena sprzedaży</th>
                            <th className="text-right py-2 font-medium">Stan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {electricalMaterials.map((m) => (
                            <tr key={m.id || m.name} className="border-b border-border/50 hover:bg-amber-500/5 transition-colors">
                              <td className="py-2.5 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                  <span>{m.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5">
                                <Badge variant="outline" className="text-[11px] font-normal border-amber-500/30 bg-amber-500/5 text-amber-300">
                                  {m.category}
                                </Badge>
                              </td>
                              <td className="py-2.5 text-xs text-muted-foreground font-mono">
                                {m.sku || "-"}
                              </td>
                              <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(m.purchasePrice)}</td>
                              <td className="py-2.5 text-right font-bold" style={{ color: "oklch(0.78 0.18 65)" }}>
                                {formatCurrency(m.salePrice)}
                              </td>
                              <td className="py-2.5 text-right">
                                <Badge variant={m.stockQuantity <= m.minStockLevel ? "destructive" : "secondary"}>
                                  {m.stockQuantity} {m.unit}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Szybka wycena punktowa instalacji elektrycznej ── */}
            <TabsContent value="quick_calculator" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-amber-500" />
                        Kosztorys punktowy instalacji elektrycznej
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Wybierz ilość punktów instalacyjnych. Ceny obejmują bruzdowanie, okablowanie oraz montaż osprzętu.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {ELECTRICAL_FAST_POINTS.map((pt) => {
                      const qty = selectedFastPoints[pt.id] || 0;
                      return (
                        <div
                          key={pt.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            qty > 0
                              ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                              : "bg-card border-border/60 opacity-80"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{pt.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                                {formatCurrency(pt.price)} / {pt.unit}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pt.desc}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg border-border/80"
                              onClick={() => handleFastPointQty(pt.id, -1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center font-bold text-sm">{qty}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/20"
                              onClick={() => handleFastPointQty(pt.id, 1)}
                            >
                              <Plus className="h-3.5 w-3.5 text-amber-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Podsumowanie punktowe */}
                <div className="space-y-4">
                  <Card className="card-electrical border-amber-500/40 sticky top-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Podsumowanie szacunku
                      </CardTitle>
                      <CardDescription>
                        Szacunkowa wycena robocizny i podstawowych materiałów
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Suma netto:</span>
                          <span className="font-semibold">{formatCurrency(fastPointsSummary.netto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VAT (8% mieszkaniowy):</span>
                          <span>{formatCurrency(fastPointsSummary.vat)}</span>
                        </div>
                        <Separator className="bg-border/60 my-2" />
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-base">Łącznie brutto:</span>
                          <span className="font-black text-xl text-amber-400">
                            {formatCurrency(fastPointsSummary.brutto)}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full btn-glow-amber text-slate-950 font-black gap-2 h-11"
                        onClick={handleCreateQuoteFromFastPoints}
                      >
                        Przenieś do pełnej wyceny
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      <p className="text-[11px] text-muted-foreground text-center">
                        Pozycje zostaną automatycznie przeniesione do edytora nowej wyceny, gdzie możesz dobrać klienta i rabaty.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ── Zaawansowane obliczenia inżynieryjne SEP ── */}
            <TabsContent value="engineering_calcs" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Kalkulator doboru przekroju kabla */}
                <Card className="card-electrical">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Cable className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Dobór Przekroju Kabla</CardTitle>
                          <CardDescription>Norma PN-HD 60364-5-52 i dopuszczalny spadek ΔU</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                        PN-HD 60364
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Prąd obciążenia [A]</span>
                        <Input
                          type="number"
                          min="1"
                          max="250"
                          value={cableCurrent}
                          onChange={(e) => setCableCurrent(parseFloat(e.target.value) || 0)}
                          className="mt-1 h-9 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Długość trasy [m]</span>
                        <Input
                          type="number"
                          min="1"
                          max="500"
                          value={cableLength}
                          onChange={(e) => setCableLength(parseFloat(e.target.value) || 0)}
                          className="mt-1 h-9 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Napięcie zasilania</span>
                        <Select
                          value={String(cableVoltage)}
                          onValueChange={(v) => {
                            const val = parseInt(v ?? "230") as 230 | 400;
                            setCableVoltage(val);
                            setCablePhases(val === 400 ? 3 : 1);
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="230">230 V (1-fazowe)</SelectItem>
                            <SelectItem value="400">400 V (3-fazowe)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Materiał żyły</span>
                        <Select
                          value={cableMaterial}
                          onValueChange={(v) => setCableMaterial(v as "cu" | "al")}
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cu">Miedź (Cu)</SelectItem>
                            <SelectItem value="al">Aluminium (Al)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-semibold text-muted-foreground">Typ odbiornika (kryterium spadku ΔU)</span>
                        <Select
                          value={cableCircuitType}
                          onValueChange={(v) => setCableCircuitType(v as "lighting" | "power")}
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="power">Gniazda wtykowe i siła (max 5.0% ΔU)</SelectItem>
                            <SelectItem value="lighting">Oświetlenie i precyzyjne (max 3.0% ΔU)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {cableCalcResult && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Rekomendowany przekrój
                            </span>
                            <div className="text-2xl font-black text-amber-400">
                              {cableCalcResult.recommendedName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Iz: {cableCalcResult.ampacity} A
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              ΔU: {cableCalcResult.voltageDropPercent}% ({cableCalcResult.voltageDrop} V)
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {cableCalcResult.recommendation}
                        </p>

                        <Button
                          size="sm"
                          className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 gap-1.5 text-xs font-bold"
                          onClick={handleAddCableToQuote}
                        >
                          <Plus className="h-3.5 w-3.5" /> Dodaj kabel {cableCalcResult.recommendedName} do wyceny
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Kalkulator aparatury modułowej i zabezpieczeń */}
                <Card className="card-electrical">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Power className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Dobór Zabezpieczeń Nadprądowych</CardTitle>
                          <CardDescription>Norma PN-EN 60898-1 i koordynacja z przewodami</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                        PN-EN 60898
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-xs font-semibold text-muted-foreground">Moc znamionowa odbiornika [W]</span>
                        <Input
                          type="number"
                          min="100"
                          max="40000"
                          step="100"
                          value={breakerPower}
                          onChange={(e) => setBreakerPower(parseFloat(e.target.value) || 0)}
                          className="mt-1 h-9 font-mono"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-xs font-semibold text-muted-foreground">Napięcie robocze</span>
                        <Select
                          value={String(breakerVoltage)}
                          onValueChange={(v) => {
                            const val = parseInt(v ?? "230") as 230 | 400;
                            setBreakerVoltage(val);
                            setBreakerPhases(val === 400 ? 3 : 1);
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="230">230 V (1-faza)</SelectItem>
                            <SelectItem value="400">400 V (3-fazy)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-semibold text-muted-foreground">Charakterystyka obciążenia</span>
                        <Select
                          value={breakerLoadType}
                          onValueChange={(v) => setBreakerLoadType(v as any)}
                        >
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mixed">Gniazda ogólne / mieszane (Charakterystyka B)</SelectItem>
                            <SelectItem value="lighting">Oświetlenie LED / elektroniczne (Charakterystyka B)</SelectItem>
                            <SelectItem value="resistive">Grzałki, bojlery, piekarniki (Charakterystyka B)</SelectItem>
                            <SelectItem value="motor">Silniki, sprężarki, hydrofory (Charakterystyka C)</SelectItem>
                            <SelectItem value="inductive">Transformatory, klimatyzatory (Charakterystyka C)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {breakerCalcResult && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Zalecany wyłącznik MCB
                            </span>
                            <div className="text-2xl font-black text-amber-400">
                              {breakerCalcResult.recommendedName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-amber-300">
                              Ib: {breakerCalcResult.loadCurrentA} A
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Wykorzystanie: {breakerCalcResult.utilizationPercent}%
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {breakerCalcResult.recommendation}
                        </p>

                        <Button
                          size="sm"
                          className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 gap-1.5 text-xs font-bold"
                          onClick={handleAddBreakerToQuote}
                        >
                          <Plus className="h-3.5 w-3.5" /> Dodaj aparat {breakerCalcResult.recommendedName} do wyceny
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </StaggerItem>

        <StaggerItem>
          <CurrentIndicator active />
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
