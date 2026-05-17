"use client";

import { useMemo, useState } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { useServiceStore } from "@/store/service-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, TrendingUp, Users, Package, CheckCircle2, Clock,
  BarChart3, Download, ArrowUpRight, ArrowDownRight, Minus,
  FileSpreadsheet, GitCompare,
} from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { BoltRow, PipeSeparator, FlowIndicator } from "@/components/hydraulic-decorations";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  Legend, AreaChart, Area, ComposedChart,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

export default function RaportyPage() {
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);
  const services = useServiceStore((s) => s.services);
  const invoices = useInvoiceStore((s) => s.invoices);
  const [period, setPeriod] = useState<"6" | "12" | "24">("12");
  const [activeTab, setActiveTab] = useState("overview");

  const periodMonths = parseInt(period);

  // ─── Statystyki ogólne ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter((q) => q.status === "zaakceptowana").length;
    const conversionRate = totalQuotes > 0 ? round((acceptedQuotes / totalQuotes) * 100) : 0;
    const totalRevenue = quotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const avgQuoteValue = acceptedQuotes > 0 ? round(totalRevenue / acceptedQuotes) : 0;
    const pendingQuotes = quotes.filter((q) => q.status === "wyslana").length;
    const rejectedQuotes = quotes.filter((q) => q.status === "odrzucona").length;
    const unpaidAmount = invoices.filter((i) => i.status !== "zaplacona" && i.status !== "anulowana").reduce((s, i) => s + i.totalBrutto, 0);

    // Porównanie z poprzednim okresem
    const now = new Date();
    const halfPeriod = Math.floor(periodMonths / 2);
    const midDate = subMonths(now, halfPeriod);
    const recentQuotes = quotes.filter((q) => new Date(q.createdAt) >= midDate);
    const olderQuotes = quotes.filter((q) => new Date(q.createdAt) < midDate && new Date(q.createdAt) >= subMonths(now, periodMonths));
    const recentRevenue = recentQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const olderRevenue = olderQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const revenueTrend = olderRevenue > 0 ? round(((recentRevenue - olderRevenue) / olderRevenue) * 100) : 0;

    return { totalQuotes, acceptedQuotes, conversionRate, totalRevenue, avgQuoteValue, pendingQuotes, rejectedQuotes, unpaidAmount, revenueTrend, recentRevenue };
  }, [quotes, invoices, periodMonths]);

  // ─── Dane miesięczne (trend) ────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(subMonths(now, periodMonths - 1));
    const months = eachMonthOfInterval({ start, end: endOfMonth(now) });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthQuotes = quotes.filter((q) => {
        const d = new Date(q.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      const accepted = monthQuotes.filter((q) => q.status === "zaakceptowana");
      const revenue = accepted.reduce((s, q) => s + q.totalBrutto, 0);
      const total = monthQuotes.length;
      const conversion = total > 0 ? round((accepted.length / total) * 100) : 0;
      const avgValue = accepted.length > 0 ? round(revenue / accepted.length) : 0;

      return {
        month: format(month, "MMM yy", { locale: pl }),
        fullMonth: format(month, "LLLL yyyy", { locale: pl }),
        revenue: round(revenue),
        quotesCount: total,
        acceptedCount: accepted.length,
        conversion,
        avgValue,
      };
    });
  }, [quotes, periodMonths]);

  // ─── Top usługi ─────────────────────────────────────────────────────────
  const topServices = useMemo(() => {
    const usage: Record<string, { name: string; count: number; revenue: number }> = {};
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      q.items.forEach((item) => {
        const key = item.name;
        if (!usage[key]) usage[key] = { name: key, count: 0, revenue: 0 };
        usage[key].count += item.quantity;
        usage[key].revenue += item.bruttoTotal;
      });
    });
    return Object.values(usage).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [quotes]);

  // ─── Top klienci ────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const rev: Record<string, { name: string; revenue: number; quoteCount: number; clientId?: number }> = {};
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      const key = q.clientName || "Brak klienta";
      if (!rev[key]) rev[key] = { name: key, revenue: 0, quoteCount: 0, clientId: q.clientId };
      rev[key].revenue += q.totalBrutto;
      rev[key].quoteCount += 1;
    });
    return Object.values(rev).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [quotes]);

  // ─── Status distribution ────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const labels: Record<string, string> = { szkic: "Szkic", wyslana: "Wysłana", zaakceptowana: "Zaakceptowana", odrzucona: "Odrzucona" };
    const counts: Record<string, number> = {};
    quotes.forEach((q) => { counts[q.status] = (counts[q.status] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [quotes]);

  // ─── Eksport XLSX ───────────────────────────────────────────────────────
  async function handleExportXLSX() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Arkusz 1: Podsumowanie
    const summaryData = [
      ["Raport WYCENKA", "", "", format(new Date(), "dd.MM.yyyy HH:mm", { locale: pl })],
      [],
      ["Metryka", "Wartość"],
      ["Wyceny łącznie", stats.totalQuotes],
      ["Zaakceptowane", stats.acceptedQuotes],
      ["Konwersja", `${stats.conversionRate}%`],
      ["Przychód łączny", stats.totalRevenue],
      ["Średnia wartość wyceny", stats.avgQuoteValue],
      ["Oczekujące", stats.pendingQuotes],
      ["Nieopłacone faktury", stats.unpaidAmount],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Podsumowanie");

    // Arkusz 2: Przychód miesięczny
    const revenueRows = [["Miesiąc", "Przychód", "Wyceny", "Zaakceptowane", "Konwersja %", "Śr. wartość"]];
    monthlyData.forEach((m) => {
      revenueRows.push([m.fullMonth, m.revenue as any, m.quotesCount as any, m.acceptedCount as any, m.conversion as any, m.avgValue as any]);
    });
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueRows);
    wsRevenue["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsRevenue, "Przychód miesięczny");

    // Arkusz 3: Top usługi
    const servRows = [["Usługa", "Ilość", "Przychód brutto"]];
    topServices.forEach((s) => { servRows.push([s.name, s.count as any, s.revenue as any]); });
    const wsServ = XLSX.utils.aoa_to_sheet(servRows);
    wsServ["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsServ, "Top usługi");

    // Arkusz 4: Top klienci
    const clientRows = [["Klient", "Przychód brutto", "Liczba wycen"]];
    topClients.forEach((c) => { clientRows.push([c.name, c.revenue as any, c.quoteCount as any]); });
    const wsClients = XLSX.utils.aoa_to_sheet(clientRows);
    wsClients["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsClients, "Top klienci");

    // Arkusz 5: Wszystkie wyceny
    const allRows = [["Numer", "Klient", "Data", "Status", "Netto", "VAT", "Brutto", "Rabat %", "Uwagi"]];
    quotes.forEach((q) => {
      allRows.push([
        q.number, q.clientName, format(new Date(q.createdAt), "dd.MM.yyyy"),
        q.status, q.totalNetto as any, q.totalVat as any, q.totalBrutto as any,
        q.globalDiscountPercent as any, q.notes || "",
      ]);
    });
    const wsAll = XLSX.utils.aoa_to_sheet(allRows);
    wsAll["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsAll, "Wszystkie wyceny");

    XLSX.writeFile(wb, `raport-wycenka-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Raport XLSX wyeksportowany");
  }

  function TrendBadge({ value }: { value: number }) {
    if (value > 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-3 w-3" />+{value}%</span>;
    if (value < 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 dark:text-red-400"><ArrowDownRight className="h-3 w-3" />{value}%</span>;
    return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe">Raporty i analityka</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Trendy, konwersja i rentowność</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod((v ?? "12") as "6" | "12" | "24")}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 miesięcy</SelectItem>
                  <SelectItem value="12">12 miesięcy</SelectItem>
                  <SelectItem value="24">24 miesiące</SelectItem>
                </SelectContent>
              </Select>
              <Button className="btn-primary" onClick={handleExportXLSX}>
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Eksport XLSX</span>
              </Button>
              <Link href="/raporty/porownanie">
                <Button variant="outline" className="btn-secondary">
                  <GitCompare className="h-4 w-4" />
                  <span className="hidden sm:inline">Porównaj</span>
                </Button>
              </Link>
            </div>
          </div>
        </StaggerItem>

        {/* KPI Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="card-modern">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black"><AnimatedCounter value={stats.totalQuotes} /></div>
                    <div className="text-xs text-muted-foreground">Wyceny łącznie</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
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
            <Card className="card-modern">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">Przychód <TrendBadge value={stats.revenueTrend} /></div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">{formatCurrency(stats.avgQuoteValue)}</div>
                    <div className="text-xs text-muted-foreground">Śr. wartość</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Tabs */}
        <StaggerItem>
          <BoltRow>Szczegóły</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Przegląd</TabsTrigger>
              <TabsTrigger value="trends">Trendy</TabsTrigger>
              <TabsTrigger value="services">Usługi</TabsTrigger>
              <TabsTrigger value="clients">Klienci</TabsTrigger>
            </TabsList>

            {/* ── Przegląd ── */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Przychód miesięczny */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Przychód miesięczny</CardTitle>
                    <CardDescription>Zaakceptowane wyceny — ostatnie {period} mies.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {monthlyData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyData}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                          <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => String(l)} />
                          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Status wycen */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Podział statusów</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div>
                    ) : (
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={200}>
                          <PieChart>
                            <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" paddingAngle={2}>
                              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 flex-1">
                          {statusData.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span>{item.name}</span>
                              </div>
                              <span className="font-bold">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Trendy ── */}
            <TabsContent value="trends" className="space-y-4 mt-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Konwersja w czasie */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Konwersja w czasie</CardTitle>
                    <CardDescription>% zaakceptowanych wycen miesięcznie</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Line type="monotone" dataKey="conversion" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Średnia wartość wyceny */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Średnia wartość wyceny</CardTitle>
                    <CardDescription>Trend wartości zaakceptowanych wycen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                        <Bar dataKey="avgValue" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.6} />
                        <Line type="monotone" dataKey="avgValue" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Ilość wycen vs zaakceptowane */}
                <Card className="card-modern lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Wyceny: utworzone vs zaakceptowane</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="quotesCount" name="Utworzone" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="acceptedCount" name="Zaakceptowane" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Usługi ── */}
            <TabsContent value="services" className="space-y-4 mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top 10 usług wg przychodu</CardTitle>
                  <CardDescription>Z zaakceptowanych wycen</CardDescription>
                </CardHeader>
                <CardContent>
                  {topServices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div>
                  ) : (
                    <div className="space-y-3">
                      {topServices.map((s, i) => {
                        const maxRev = topServices[0]?.revenue || 1;
                        const pct = round((s.revenue / maxRev) * 100);
                        return (
                          <div key={s.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate max-w-[60%]">{i + 1}. {s.name}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground">{s.count} szt.</span>
                                <span className="font-bold text-primary">{formatCurrency(s.revenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Klienci ── */}
            <TabsContent value="clients" className="space-y-4 mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top klienci wg przychodu</CardTitle>
                </CardHeader>
                <CardContent>
                  {topClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div>
                  ) : (
                    <div className="space-y-3">
                      {topClients.map((c, i) => {
                        const maxRev = topClients[0]?.revenue || 1;
                        const pct = round((c.revenue / maxRev) * 100);
                        return (
                          <div key={c.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                                  {i + 1}
                                </div>
                                {c.clientId ? (
                                  <Link href={`/klienci/${c.clientId}`} className="font-medium truncate hover:text-primary transition-colors">{c.name}</Link>
                                ) : (
                                  <span className="font-medium truncate">{c.name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground">{c.quoteCount} wycen</span>
                                <span className="font-bold text-primary">{formatCurrency(c.revenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: COLORS[i % COLORS.length] }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>
        <StaggerItem>
          <FlowIndicator active />
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
