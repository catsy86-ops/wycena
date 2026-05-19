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
import {
  Zap, Cable, CircuitBoard, Lightbulb, Power, Plug,
  FileText, TrendingUp, Users, Package, Plus, Search,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  AlertTriangle, CheckCircle2, Clock, Wrench,
} from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { CableSeparator, ScrewRow, ElectricalBadge, CurrentIndicator, WireProgress } from "@/components/electrical-decorations";
import { toast } from "sonner";
import Link from "next/link";
import { format, subMonths, isThisMonth } from "date-fns";
import { pl } from "date-fns/locale";

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
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);
  const services = useServiceStore((s) => s.services);
  const timeEntries = useTimeStore((s) => s.entries);
  const materials = useMaterialStore((s) => s.materials);

  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // ─── Statystyki elektryczne ─────────────────────────────────────────────
  // Filtrujemy wyceny które zawierają usługi elektryczne
  // (na podstawie nazw usług zawierających słowa kluczowe)
  const electricalKeywords = ["elektr", "gniazdko", "wyłącznik", "kabel", "przewód", "bezpiecznik", "rozdzielni", "oświetleni", "lampa", "led", "pomiar", "instalacj", "fotowolt", "ładowark", "ups", "domofon", "alarm"];

  const isElectricalItem = useCallback((name: string) => {
    const lower = name.toLowerCase();
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
  const electricalMaterials = useMemo(() => {
    const keywords = ["kabel", "przewód", "gniazdko", "wyłącznik", "bezpiecznik", "puszka", "rura", "korytko", "złączka", "taśma"];
    return materials.filter((m) => keywords.some((kw) => m.name.toLowerCase().includes(kw)));
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
              <Link href="/elektryka/protokoly">
                <Button variant="outline">
                  <FileText className="h-4 w-4" />
                  Protokoły
                </Button>
              </Link>
              <Link href="/elektryka/nowa">
                <Button className="btn-switch">
                  <Plus className="h-4 w-4" />
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Przegląd</TabsTrigger>
              <TabsTrigger value="cennik">Cennik</TabsTrigger>
              <TabsTrigger value="wyceny">Wyceny</TabsTrigger>
              <TabsTrigger value="materialy">Materiały</TabsTrigger>
            </TabsList>

            {/* ── Przegląd ── */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Kategorie */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {ELECTRICAL_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card key={cat.id} className="card-panel cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => { setCategoryFilter(cat.id); setActiveTab("cennik"); }}>
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Materiały Elektryczne</CardTitle>
                  <CardDescription>Materiały powiązane z usługami elektrycznymi</CardDescription>
                </CardHeader>
                <CardContent>
                  {electricalMaterials.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <div className="text-lg font-semibold mb-1">Brak materiałów elektrycznych</div>
                      <div className="text-sm">Dodaj materiały z kategorii elektrycznej do magazynu</div>
                      <Link href="/materialy">
                        <Button className="mt-4" variant="outline">
                          <Plus className="h-4 w-4" /> Dodaj materiały
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 font-medium">Nazwa</th>
                            <th className="text-left py-2 font-medium">Kategoria</th>
                            <th className="text-right py-2 font-medium">Cena zakupu</th>
                            <th className="text-right py-2 font-medium">Cena sprzedaży</th>
                            <th className="text-right py-2 font-medium">Stan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {electricalMaterials.map((m) => (
                            <tr key={m.id} className="border-b border-border/50 hover:bg-accent/50">
                              <td className="py-2 font-medium">{m.name}</td>
                              <td className="py-2 text-muted-foreground">{m.category}</td>
                              <td className="py-2 text-right">{formatCurrency(m.purchasePrice)}</td>
                              <td className="py-2 text-right font-semibold">{formatCurrency(m.salePrice)}</td>
                              <td className="py-2 text-right">
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
          </Tabs>
        </StaggerItem>

        <StaggerItem>
          <CurrentIndicator active />
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
