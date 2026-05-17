"use client";

import { useState, useEffect, useMemo } from "react";
import { useTimeStore } from "@/store/time-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { formatCurrency, round } from "@/lib/calculations";
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play, Square, Plus, Trash2, Clock, Timer, Search, Copy,
  TrendingUp, BarChart3, Target, Calendar, Download, Users,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BoltRow, PipeSeparator, PipeProgress, GaugeDisplay, FlowIndicator, HydraulicBadge } from "@/components/hydraulic-decorations";

const CATEGORY_LABELS: Record<string, string> = { robocizna: "Robocizna", dojazd: "Dojazd", inne: "Inne" };
const CATEGORY_COLORS: Record<string, string> = {
  robocizna: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  dojazd: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  inne: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

type TimeCategory = "robocizna" | "dojazd" | "inne";

const EMPTY_FORM = {
  clientName: "", description: "", startTime: "", endTime: "",
  hourlyRate: 120, category: "robocizna" as TimeCategory, notes: "", quoteId: "",
};

const WEEKLY_GOAL_KEY = "wycenka_weekly_hours_goal";

export default function CzasPage() {
  const entries = useTimeStore((s) => s.entries);
  const loading = useTimeStore((s) => s.loading);
  const search = useTimeStore((s) => s.search);
  const categoryFilter = useTimeStore((s) => s.categoryFilter);
  const activeTimer = useTimeStore((s) => s.activeTimer);
  const setSearch = useTimeStore((s) => s.setSearch);
  const setCategoryFilter = useTimeStore((s) => s.setCategoryFilter);
  const startTimer = useTimeStore((s) => s.startTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const add = useTimeStore((s) => s.add);
  const remove = useTimeStore((s) => s.remove);
  const clients = useClientStore((s) => s.clients);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [timerForm, setTimerForm] = useState({ clientName: "", description: "", hourlyRate: 120, category: "robocizna" as TimeCategory });
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState("list");
  const [weeklyGoal, setWeeklyGoal] = useState(40);

  // Load weekly goal
  useEffect(() => {
    const saved = localStorage.getItem(WEEKLY_GOAL_KEY);
    if (saved) setWeeklyGoal(parseInt(saved) || 40);
  }, []);

  // Timer elapsed
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // ─── Statystyki ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeekEntries = entries.filter((e) => isWithinInterval(new Date(e.startTime), { start: weekStart, end: weekEnd }));
    const lastWeekEntries = entries.filter((e) => isWithinInterval(new Date(e.startTime), { start: lastWeekStart, end: lastWeekEnd }));

    const thisWeekHours = round(thisWeekEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
    const lastWeekHours = round(lastWeekEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
    const thisWeekEarnings = round(thisWeekEntries.reduce((s, e) => s + e.totalCost, 0));
    const lastWeekEarnings = round(lastWeekEntries.reduce((s, e) => s + e.totalCost, 0));

    const totalHours = round(entries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
    const totalEarnings = round(entries.reduce((s, e) => s + e.totalCost, 0));
    const effectiveRate = totalHours > 0 ? round(totalEarnings / totalHours) : 0;

    const weeklyProgress = weeklyGoal > 0 ? Math.min(100, round((thisWeekHours / weeklyGoal) * 100)) : 0;
    const hoursTrend = lastWeekHours > 0 ? round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100) : 0;

    return { thisWeekHours, lastWeekHours, thisWeekEarnings, lastWeekEarnings, totalHours, totalEarnings, effectiveRate, weeklyProgress, hoursTrend };
  }, [entries, weeklyGoal]);

  // ─── Wykres godzin per dzień (14 dni) ───────────────────────────────────
  const dailyChart = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayEntries = entries.filter((e) => {
        const d = new Date(e.startTime);
        return d >= dayStart && d < dayEnd;
      });
      const hours = round(dayEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
      return { day: format(day, "dd.MM", { locale: pl }), dayName: format(day, "EEE", { locale: pl }), hours };
    });
  }, [entries]);

  // ─── Grupowanie po klientach ────────────────────────────────────────────
  const clientGroups = useMemo(() => {
    const groups: Record<string, { clientName: string; hours: number; earnings: number; count: number }> = {};
    entries.forEach((e) => {
      if (!groups[e.clientName]) groups[e.clientName] = { clientName: e.clientName, hours: 0, earnings: 0, count: 0 };
      groups[e.clientName].hours += e.durationMinutes / 60;
      groups[e.clientName].earnings += e.totalCost;
      groups[e.clientName].count += 1;
    });
    return Object.values(groups).sort((a, b) => b.hours - a.hours).map((g) => ({ ...g, hours: round(g.hours), earnings: round(g.earnings) }));
  }, [entries]);

  // ─── Filtrowanie ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [entries, search, categoryFilter]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  function handleStartTimer() {
    if (!timerForm.clientName || !timerForm.description) { toast.error("Wypełnij klienta i opis"); return; }
    startTimer(timerForm);
    toast.success("Timer uruchomiony");
  }

  async function handleStopTimer() {
    const id = await stopTimer();
    if (id) toast.success("Czas zapisany");
  }

  function handleAdd() {
    if (!form.clientName || !form.description || !form.startTime || !form.endTime) { toast.error("Wypełnij wymagane pola"); return; }
    add({
      clientName: form.clientName, description: form.description,
      startTime: new Date(form.startTime), endTime: new Date(form.endTime),
      hourlyRate: form.hourlyRate, category: form.category,
      notes: form.notes || undefined,
      quoteId: form.quoteId ? parseInt(form.quoteId) : undefined,
    });
    toast.success("Czas dodany");
    setDialogOpen(false);
  }

  function handleDuplicate(entry: typeof entries[0]) {
    const now = new Date();
    const duration = entry.durationMinutes * 60000;
    setForm({
      clientName: entry.clientName, description: entry.description,
      startTime: format(now, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(now.getTime() + duration), "yyyy-MM-dd'T'HH:mm"),
      hourlyRate: entry.hourlyRate, category: entry.category,
      notes: entry.notes || "", quoteId: entry.quoteId ? String(entry.quoteId) : "",
    });
    setDialogOpen(true);
  }

  async function handleExportCSV() {
    const headers = ["Klient", "Opis", "Data", "Czas (min)", "Stawka/h", "Koszt", "Kategoria"];
    const rows = filtered.map((e) => [
      e.clientName, e.description, format(new Date(e.startTime), "dd.MM.yyyy HH:mm"),
      String(e.durationMinutes), String(e.hourlyRate), String(e.totalCost), e.category,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `czas-pracy-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Eksport CSV");
  }

  const formatDuration = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return `${h}h ${m}min`; };
  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Czas pracy</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Śledzenie godzin, analityka i raporty</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="btn-secondary" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
              </Button>
              <Button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" />Dodaj wpis
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* Timer aktywny */}
        {activeTimer && (
          <StaggerItem>
            <Card className="card-modern border-primary/30" style={{ background: "oklch(0.52 0.19 220 / 0.04)" }}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div className="h-3 w-3 rounded-full bg-red-500" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <div>
                      <div className="font-bold">{activeTimer.description}</div>
                      <div className="text-sm text-muted-foreground">{activeTimer.clientName} · {formatCurrency(activeTimer.hourlyRate)}/h</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-mono font-black text-primary tabular-nums">{formatElapsed(elapsed)}</div>
                    <div className="text-sm text-muted-foreground">≈ {formatCurrency(round((elapsed / 3600) * activeTimer.hourlyRate))}</div>
                    <Button variant="destructive" size="sm" onClick={handleStopTimer}>
                      <Square className="mr-1 h-4 w-4" />Stop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Quick start timer */}
        {!activeTimer && (
          <StaggerItem>
            <Card className="card-modern">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Klient</Label>
                      <Select onValueChange={(v) => { const c = clients.find((c) => c.id === parseInt(v ?? "")); if (c) setTimerForm({ ...timerForm, clientName: c.name }); }} value="">
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Wybierz..." /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Lub wpisz</Label>
                      <Input className="h-9 text-sm" placeholder="Klient" value={timerForm.clientName} onChange={(e) => setTimerForm({ ...timerForm, clientName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Opis</Label>
                      <Input className="h-9 text-sm" placeholder="Co robisz?" value={timerForm.description} onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Stawka/h</Label>
                      <Input className="h-9 text-sm" type="number" value={timerForm.hourlyRate} onChange={(e) => setTimerForm({ ...timerForm, hourlyRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <Button className="btn-primary h-9 shrink-0" onClick={handleStartTimer}>
                    <Play className="h-4 w-4" />Start
                  </Button>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* KPI + Cel tygodniowy */}
        <StaggerItem>
          <BoltRow>Statystyki tygodnia</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="pressure-indicator" />
                  Ten tydzień
                </div>
                <div className="text-xl font-black tabular-nums">{stats.thisWeekHours}h</div>
                {stats.hoursTrend !== 0 && (
                  <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${stats.hoursTrend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {stats.hoursTrend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stats.hoursTrend > 0 ? "+" : ""}{stats.hoursTrend}%
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="card-gauge">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Zarobek (tydzień)</div>
                <div className="text-lg font-black text-primary tabular-nums">{formatCurrency(stats.thisWeekEarnings)}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Efektywna stawka</div>
                <div className="text-lg font-black tabular-nums">{formatCurrency(stats.effectiveRate)}/h</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Łącznie</div>
                <div className="text-lg font-black tabular-nums">{stats.totalHours}h</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{formatCurrency(stats.totalEarnings)}</div>
              </CardContent>
            </Card>
            {/* Cel tygodniowy — PipeProgress */}
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />Cel</div>
                  <span className="text-xs font-bold">{stats.weeklyProgress}%</span>
                </div>
                <PipeProgress percent={stats.weeklyProgress} />
                <div className="text-[10px] text-muted-foreground mt-1">{stats.thisWeekHours}/{weeklyGoal}h</div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Tabs: Lista / Wykres / Klienci */}
        <StaggerItem>
          <BoltRow>Wpisy</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Lista ({filtered.length})</TabsTrigger>
              <TabsTrigger value="chart">Wykres</TabsTrigger>
              <TabsTrigger value="clients">Klienci</TabsTrigger>
            </TabsList>

            {/* ── Lista ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Szukaj..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                      <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" /></div>
                  ) : filtered.length === 0 ? (
                    <AnimatedEmptyState icon={Clock} title="Brak wpisów" description="Uruchom timer lub dodaj wpis ręcznie" />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="table-header-industrial">
                          <TableRow>
                            <TableHead>Klient</TableHead>
                            <TableHead>Opis</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Czas</TableHead>
                            <TableHead className="text-right">Koszt</TableHead>
                            <TableHead>Kat.</TableHead>
                            <TableHead className="w-20">Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filtered.slice(0, 50).map((e, i) => (
                              <motion.tr
                                key={e.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                className="border-b border-border/50 hover:bg-accent/50 transition-colors group"
                              >
                                <TableCell className="font-semibold text-sm">{e.clientName}</TableCell>
                                <TableCell className="text-sm max-w-48 truncate">{e.description}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{format(new Date(e.startTime), "dd.MM.yy HH:mm", { locale: pl })}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{formatDuration(e.durationMinutes)}</Badge></TableCell>
                                <TableCell className="text-right font-bold text-primary text-sm">{formatCurrency(e.totalCost)}</TableCell>
                                <TableCell><Badge className={`text-[10px] ${CATEGORY_COLORS[e.category] || ""}`}>{CATEGORY_LABELS[e.category]}</Badge></TableCell>
                                <TableCell>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(e)} title="Kopiuj">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Usuń wpis</AlertDialogTitle><AlertDialogDescription>Usunąć ten wpis czasu?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={() => { remove(e.id!); toast.success("Usunięto"); }}>Usuń</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Wykres ── */}
            <TabsContent value="chart" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Godziny pracy — ostatnie 14 dni</CardTitle>
                  <CardDescription>Dzienny rozkład czasu pracy</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dayName" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} unit="h" />
                      <Tooltip formatter={(v) => `${v}h`} labelFormatter={(_, payload) => payload?.[0]?.payload?.day || ""} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {dailyChart.map((entry, i) => (
                          <motion.rect key={i} fill={entry.hours >= 8 ? "oklch(0.55 0.18 155)" : entry.hours > 0 ? "oklch(0.52 0.19 220)" : "oklch(0.52 0.19 220 / 0.2)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Klienci ── */}
            <TabsContent value="clients" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Czas per klient</CardTitle>
                </CardHeader>
                <CardContent>
                  {clientGroups.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Brak danych</p>
                  ) : (
                    <div className="space-y-3">
                      {clientGroups.map((g, i) => {
                        const maxH = clientGroups[0]?.hours || 1;
                        const pct = round((g.hours / maxH) * 100);
                        return (
                          <div key={g.clientName} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate max-w-[50%]">{g.clientName}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground">{g.count} wpisów</span>
                                <span className="text-xs font-semibold">{g.hours}h</span>
                                <span className="font-bold text-primary text-sm">{formatCurrency(g.earnings)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.52 0.19 220 / 0.1)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: "oklch(0.52 0.19 220)" }}
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

      {/* ── Dialog dodawania ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Dodaj wpis czasu</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Klient</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nazwa klienta" />
              </div>
              <div className="grid gap-2">
                <Label>Powiązana wycena (opcj.)</Label>
                <Select value={form.quoteId} onValueChange={(v) => setForm({ ...form, quoteId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Brak" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Brak</SelectItem>
                    {quotes.slice(0, 20).map((q) => <SelectItem key={q.id} value={String(q.id)}>{q.number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Opis pracy</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Co robiłeś?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Rozpoczęcie</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Zakończenie</Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stawka/h (PLN)</Label>
                <Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notatki (opcj.)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Dodatkowe informacje..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleAdd}>Dodaj wpis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
