"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTimeStore } from "@/store/time-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { formatCurrency, round } from "@/lib/calculations";
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, differenceInDays, subDays, startOfDay, eachDayOfInterval, isToday, isThisWeek, isThisMonth } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Play, Square, Plus, Trash2, Clock, Timer, Search, Copy, Edit2, FileJson, Repeat2, Pause, Play as PlayIcon,
  TrendingUp, BarChart3, Target, Calendar, Download, Users, PieChart,
  ArrowUpRight, ArrowDownRight, CheckSquare, AlertCircle, Save,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from "recharts";
import { BoltRow, PipeSeparator, PipeProgress, GaugeDisplay, FlowIndicator, HydraulicBadge } from "@/components/hydraulic-decorations";
import jsPDF from "jspdf";
import "jspdf-autotable";

const CATEGORY_LABELS: Record<string, string> = { robocizna: "Robocizna", dojazd: "Dojazd", inne: "Inne" };
const CATEGORY_COLORS: Record<string, string> = {
  robocizna: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  dojazd: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  inne: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Codziennie",
  weekly: "Co tydzień",
  biweekly: "Co dwa tygodnie",
  monthly: "Co miesiąc",
};

type TimeCategory = "robocizna" | "dojazd" | "inne";

const EMPTY_FORM = {
  clientName: "", description: "", startTime: "", endTime: "",
  hourlyRate: 120, category: "robocizna" as TimeCategory, notes: "", quoteId: "",
};

const EMPTY_TEMPLATE = {
  name: "", clientName: "", category: "robocizna" as TimeCategory, hourlyRate: 120, estimatedMinutes: 60, description: "",
};

const EMPTY_RECURRING = {
  templateId: 0, frequency: "weekly" as const, nextDueDate: "", endDate: "", notes: "",
};

const WEEKLY_GOAL_KEY = "wycenka_weekly_hours_goal";

export default function CzasPage() {
  const entries = useTimeStore((s) => s.entries);
  const templates = useTimeStore((s) => s.templates);
  const recurringEntries = useTimeStore((s) => s.recurringEntries);
  const loading = useTimeStore((s) => s.loading);
  const search = useTimeStore((s) => s.search);
  const categoryFilter = useTimeStore((s) => s.categoryFilter);
  const dateFilter = useTimeStore((s) => s.dateFilter);
  const selectedEntries = useTimeStore((s) => s.selectedEntries);
  const activeTimer = useTimeStore((s) => s.activeTimer);
  const setSearch = useTimeStore((s) => s.setSearch);
  const setCategoryFilter = useTimeStore((s) => s.setCategoryFilter);
  const setDateFilter = useTimeStore((s) => s.setDateFilter);
  const toggleEntrySelection = useTimeStore((s) => s.toggleEntrySelection);
  const clearSelection = useTimeStore((s) => s.clearSelection);
  const selectAll = useTimeStore((s) => s.selectAll);
  const startTimer = useTimeStore((s) => s.startTimer);
  const pauseTimer = useTimeStore((s) => s.pauseTimer);
  const resumeTimer = useTimeStore((s) => s.resumeTimer);
  const stopTimer = useTimeStore((s) => s.stopTimer);
  const add = useTimeStore((s) => s.add);
  const update = useTimeStore((s) => s.update);
  const remove = useTimeStore((s) => s.remove);
  const bulkDelete = useTimeStore((s) => s.bulkDelete);
  const bulkChangeCategory = useTimeStore((s) => s.bulkChangeCategory);
  const bulkDuplicate = useTimeStore((s) => s.bulkDuplicate);
  const addTemplate = useTimeStore((s) => s.addTemplate);
  const removeTemplate = useTimeStore((s) => s.removeTemplate);
  const loadTemplates = useTimeStore((s) => s.loadTemplates);
  const addRecurring = useTimeStore((s) => s.addRecurring);
  const removeRecurring = useTimeStore((s) => s.removeRecurring);
  const generateRecurringEntries = useTimeStore((s) => s.generateRecurringEntries);
  const clients = useClientStore((s) => s.clients);
  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [timerForm, setTimerForm] = useState({ clientName: "", description: "", hourlyRate: 120, category: "robocizna" as TimeCategory });
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState("list");
  const [weeklyGoal, setWeeklyGoal] = useState(40);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState(EMPTY_RECURRING);
  const [showNoEntryReminder, setShowNoEntryReminder] = useState(false);
  const keyboardRef = useRef<{ [key: string]: boolean }>({});

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(WEEKLY_GOAL_KEY);
    if (saved) setWeeklyGoal(parseInt(saved) || 40);
    loadTemplates();
  }, [loadTemplates]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardRef.current[e.key] = true;
      
      // Ctrl+T or Cmd+T - Start timer
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (!activeTimer && timerForm.clientName && timerForm.description) {
          startTimer(timerForm);
          toast.success("Timer uruchomiony (Ctrl+T)");
        }
      }
      
      // Ctrl+S or Cmd+S - Stop timer
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTimer) {
          handleStopTimer();
        }
      }
      
      // Ctrl+P or Cmd+P - Pause/Resume timer
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (activeTimer) {
          if (activeTimer.pausedAt) {
            resumeTimer();
            toast.success("Timer wznowiony (Ctrl+P)");
          } else {
            pauseTimer();
            toast.success("Timer wstrzymany (Ctrl+P)");
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keyboardRef.current[e.key] = false;
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTimer, timerForm, startTimer, pauseTimer, resumeTimer]);

  // Timer elapsed
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Check for no entry today reminder
  useEffect(() => {
    const today = startOfDay(new Date());
    const todayEntries = entries.filter((e) => {
      const d = new Date(e.startTime);
      return d >= today && d < new Date(today.getTime() + 86400000);
    });
    setShowNoEntryReminder(todayEntries.length === 0 && !activeTimer);
  }, [entries, activeTimer]);

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

    // Category breakdown
    const categoryBreakdown = Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
      const catEntries = entries.filter((e) => e.category === cat);
      const hours = round(catEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
      const earnings = round(catEntries.reduce((s, e) => s + e.totalCost, 0));
      return { name: label, hours, earnings, value: hours };
    });

    return { thisWeekHours, lastWeekHours, thisWeekEarnings, lastWeekEarnings, totalHours, totalEarnings, effectiveRate, weeklyProgress, hoursTrend, categoryBreakdown };
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
      const eDate = new Date(e.startTime);
      let matchesDate = true;
      if (dateFilter === "today") matchesDate = isToday(eDate);
      else if (dateFilter === "week") matchesDate = isThisWeek(eDate, { weekStartsOn: 1 });
      else if (dateFilter === "month") matchesDate = isThisMonth(eDate);
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [entries, search, categoryFilter, dateFilter]);

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

  async function handleSaveTimerAsTemplate() {
    if (!activeTimer) return;
    if (!activeTimer.description) { toast.error("Wpisz opis"); return; }
    await addTemplate({
      name: activeTimer.description,
      clientName: activeTimer.clientName,
      category: activeTimer.category,
      hourlyRate: activeTimer.hourlyRate,
      estimatedMinutes: Math.round(elapsed / 60),
      description: `Szablon z timera - ${format(new Date(), "dd.MM.yyyy HH:mm")}`,
    });
    toast.success("Szablon zapisany");
  }

  function handleAdd() {
    if (!form.clientName || !form.description || !form.startTime || !form.endTime) { toast.error("Wypełnij wymagane pola"); return; }
    if (editingId) {
      update(editingId, {
        clientName: form.clientName, description: form.description,
        startTime: new Date(form.startTime), endTime: new Date(form.endTime),
        hourlyRate: form.hourlyRate, category: form.category,
        notes: form.notes || undefined,
        quoteId: form.quoteId ? parseInt(form.quoteId) : undefined,
      });
      toast.success("Wpis zaktualizowany");
      setEditingId(null);
    } else {
      add({
        clientName: form.clientName, description: form.description,
        startTime: new Date(form.startTime), endTime: new Date(form.endTime),
        hourlyRate: form.hourlyRate, category: form.category,
        notes: form.notes || undefined,
        quoteId: form.quoteId ? parseInt(form.quoteId) : undefined,
      });
      toast.success("Czas dodany");
    }
    setDialogOpen(false);
  }

  function handleEdit(entry: typeof entries[0]) {
    setForm({
      clientName: entry.clientName, description: entry.description,
      startTime: format(new Date(entry.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(entry.endTime), "yyyy-MM-dd'T'HH:mm"),
      hourlyRate: entry.hourlyRate, category: entry.category,
      notes: entry.notes || "", quoteId: entry.quoteId ? String(entry.quoteId) : "",
    });
    setEditingId(entry.id!);
    setDialogOpen(true);
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
    setEditingId(null);
    setDialogOpen(true);
  }

  async function handleBulkDelete() {
    await bulkDelete(Array.from(selectedEntries));
    clearSelection();
    toast.success("Wpisy usunięte");
  }

  async function handleBulkChangeCategory(category: TimeCategory) {
    await bulkChangeCategory(Array.from(selectedEntries), category);
    clearSelection();
    toast.success("Kategoria zmieniona");
  }

  async function handleBulkDuplicate() {
    await bulkDuplicate(Array.from(selectedEntries));
    clearSelection();
    toast.success("Wpisy zduplikowane");
  }

  async function handleAddTemplate() {
    if (!templateForm.name || !templateForm.clientName) { toast.error("Wypełnij wymagane pola"); return; }
    await addTemplate(templateForm);
    toast.success("Szablon dodany");
    setTemplateDialogOpen(false);
    setTemplateForm(EMPTY_TEMPLATE);
  }

  async function handleAddRecurring() {
    if (!recurringForm.templateId) { toast.error("Wybierz szablon"); return; }
    await addRecurring({
      templateId: recurringForm.templateId,
      frequency: recurringForm.frequency as any,
      nextDueDate: new Date(recurringForm.nextDueDate || new Date()),
      endDate: recurringForm.endDate ? new Date(recurringForm.endDate) : undefined,
      isActive: true,
      notes: recurringForm.notes || undefined,
    });
    toast.success("Powtarzające się wpisy dodane");
    setRecurringDialogOpen(false);
    setRecurringForm(EMPTY_RECURRING);
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

  async function handleExportPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(16);
    doc.text("Raport czasu pracy", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Wygenerowano: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, pageWidth / 2, 22, { align: "center" });
    
    // Summary
    doc.setFontSize(11);
    doc.text("Podsumowanie:", 14, 32);
    doc.setFontSize(9);
    doc.text(`Łącznie godzin: ${stats.totalHours}h`, 14, 39);
    doc.text(`Łącznie zarobek: ${formatCurrency(stats.totalEarnings)}`, 14, 45);
    doc.text(`Efektywna stawka: ${formatCurrency(stats.effectiveRate)}/h`, 14, 51);
    doc.text(`Ten tydzień: ${stats.thisWeekHours}h (${formatCurrency(stats.thisWeekEarnings)})`, 14, 57);
    
    // Table
    const tableData = filtered.map((e) => [
      e.clientName,
      e.description,
      format(new Date(e.startTime), "dd.MM.yyyy HH:mm"),
      `${e.durationMinutes}min`,
      `${e.hourlyRate}zł`,
      `${e.totalCost}zł`,
      CATEGORY_LABELS[e.category],
    ]);
    
    (doc as any).autoTable({
      head: [["Klient", "Opis", "Data", "Czas", "Stawka", "Koszt", "Kat."]],
      body: tableData,
      startY: 65,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });
    
    doc.save(`czas-pracy-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Eksport PDF");
  }

  const formatDuration = (min: number) => { const h = Math.floor(min / 60); const m = min % 60; return `${h}h ${m}min`; };
  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const COLORS = ["oklch(0.52 0.19 220)", "oklch(0.55 0.18 155)", "oklch(0.60 0.15 90)"];

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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="btn-secondary" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
              </Button>
              <Button variant="outline" className="btn-secondary" onClick={handleExportPDF}>
                <FileJson className="h-4 w-4" /><span className="hidden sm:inline">PDF</span>
              </Button>
              <Button variant="outline" className="btn-secondary" onClick={() => { setTemplateForm(EMPTY_TEMPLATE); setTemplateDialogOpen(true); }}>
                <Copy className="h-4 w-4" /><span className="hidden sm:inline">Szablon</span>
              </Button>
              <Button variant="outline" className="btn-secondary" onClick={() => { setRecurringForm(EMPTY_RECURRING); setRecurringDialogOpen(true); }}>
                <Repeat2 className="h-4 w-4" /><span className="hidden sm:inline">Powtarzaj</span>
              </Button>
              <Button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" />Dodaj wpis
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* Reminder - no entry today */}
        {showNoEntryReminder && (
          <StaggerItem>
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Brak wpisu dzisiaj</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">Nie zalogowałeś żadnego czasu pracy dzisiaj. Uruchom timer lub dodaj wpis ręcznie.</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

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
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-3xl font-mono font-black text-primary tabular-nums">{formatElapsed(elapsed)}</div>
                    <div className="text-sm text-muted-foreground">≈ {formatCurrency(round((elapsed / 3600) * activeTimer.hourlyRate))}</div>
                    <div className="flex gap-2">
                      {activeTimer.pausedAt ? (
                        <Button variant="outline" size="sm" onClick={() => { resumeTimer(); toast.success("Wznowiono (Ctrl+P)"); }}>
                          <PlayIcon className="mr-1 h-4 w-4" />Wznów
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => { pauseTimer(); toast.success("Wstrzymano (Ctrl+P)"); }}>
                          <Pause className="mr-1 h-4 w-4" />Pauza
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleSaveTimerAsTemplate}>
                        <Save className="mr-1 h-4 w-4" />Szablon
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleStopTimer}>
                        <Square className="mr-1 h-4 w-4" />Stop
                      </Button>
                    </div>
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

        {/* Tabs: Lista / Wykres / Klienci / Analityka */}
        <StaggerItem>
          <BoltRow>Wpisy</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="list">Lista ({filtered.length})</TabsTrigger>
              <TabsTrigger value="chart">Wykres</TabsTrigger>
              <TabsTrigger value="clients">Klienci</TabsTrigger>
              <TabsTrigger value="analytics">Analityka</TabsTrigger>
              <TabsTrigger value="reports">Raporty</TabsTrigger>
            </TabsList>

            {/* ── Lista z bulk actions ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
                    {/* Quick date filters */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant={dateFilter === "all" ? "default" : "outline"} onClick={() => setDateFilter("all")}>
                        Wszystkie
                      </Button>
                      <Button size="sm" variant={dateFilter === "today" ? "default" : "outline"} onClick={() => setDateFilter("today")}>
                        Dzisiaj
                      </Button>
                      <Button size="sm" variant={dateFilter === "week" ? "default" : "outline"} onClick={() => setDateFilter("week")}>
                        Ten tydzień
                      </Button>
                      <Button size="sm" variant={dateFilter === "month" ? "default" : "outline"} onClick={() => setDateFilter("month")}>
                        Ten miesiąc
                      </Button>
                    </div>
                  </div>
                  {selectedEntries.size > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary">{selectedEntries.size} zaznaczonych</Badge>
                      <Button size="sm" variant="outline" onClick={() => selectAll(filtered.map((e) => e.id!))}>
                        <CheckSquare className="h-3 w-3 mr-1" />Zaznacz wszystkie
                      </Button>
                      <Select onValueChange={(v) => handleBulkChangeCategory(v as TimeCategory)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Zmień kat." /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={handleBulkDuplicate}>
                        <Copy className="h-3 w-3 mr-1" />Duplikuj
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Usuń</Button>} />
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Usuń wpisy</AlertDialogTitle><AlertDialogDescription>Usunąć {selectedEntries.size} wpisów?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Usuń</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button size="sm" variant="outline" onClick={clearSelection}>Wyczyść</Button>
                    </div>
                  )}
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
                            <TableHead className="w-8"><Checkbox checked={selectedEntries.size === filtered.length && filtered.length > 0} onCheckedChange={(checked) => checked ? selectAll(filtered.map((e) => e.id!)) : clearSelection()} /></TableHead>
                            <TableHead>Klient</TableHead>
                            <TableHead>Opis</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Czas</TableHead>
                            <TableHead>Szacunek</TableHead>
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
                                <TableCell><Checkbox checked={selectedEntries.has(e.id!)} onCheckedChange={() => toggleEntrySelection(e.id!)} /></TableCell>
                                <TableCell className="font-semibold text-sm">{e.clientName}</TableCell>
                                <TableCell className="text-sm max-w-48 truncate">{e.description}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{format(new Date(e.startTime), "dd.MM.yy HH:mm", { locale: pl })}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{formatDuration(e.durationMinutes)}</Badge></TableCell>
                                <TableCell>
                                  {e.estimatedMinutes ? (
                                    <div className="text-xs">
                                      <div className={e.durationMinutes > e.estimatedMinutes ? "text-red-600" : "text-green-600"}>
                                        {formatDuration(e.estimatedMinutes)}
                                      </div>
                                      <div className="text-muted-foreground text-[10px]">
                                        {e.durationMinutes > e.estimatedMinutes ? "+" : ""}{e.durationMinutes - e.estimatedMinutes}min
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-bold text-primary text-sm">{formatCurrency(e.totalCost)}</TableCell>
                                <TableCell><Badge className={`text-[10px] ${CATEGORY_COLORS[e.category] || ""}`}>{CATEGORY_LABELS[e.category]}</Badge></TableCell>
                                <TableCell>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)} title="Edytuj">
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(e)} title="Kopiuj">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
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

            {/* ── Analityka (Profitability, Trends, Category Breakdown) ── */}
            <TabsContent value="analytics" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Category Breakdown Pie Chart */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" />Rozkład kategorii</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie data={stats.categoryBreakdown} cx="50%" cy="50%" outerRadius={80}>
                        {stats.categoryBreakdown.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Profitability per Client */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Rentowność per klient</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clientGroups.map((g) => {
                        const profitPerHour = g.hours > 0 ? round(g.earnings / g.hours) : 0;
                        return (
                          <div key={g.clientName} className="flex items-center justify-between text-sm p-2 rounded bg-accent/50">
                            <span className="font-medium truncate">{g.clientName}</span>
                            <span className="text-xs font-bold text-primary">{formatCurrency(profitPerHour)}/h</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Stats */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Statystyki kategorii</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 grid-cols-3">
                    {stats.categoryBreakdown.map((cat) => (
                      <div key={cat.name} className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground">{cat.name}</div>
                        <div className="text-lg font-bold">{cat.hours}h</div>
                        <div className="text-xs text-primary font-semibold">{formatCurrency(cat.earnings)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Raporty (Tygodniowy/Miesięczny) ── */}
            <TabsContent value="reports" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Weekly Report */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Raport Tygodniowy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground">Godziny</div>
                        <div className="text-lg font-bold">{stats.thisWeekHours}h</div>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground">Zarobek</div>
                        <div className="text-lg font-bold text-primary">{formatCurrency(stats.thisWeekEarnings)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground">Średnia/h</div>
                        <div className="text-lg font-bold">{formatCurrency(stats.effectiveRate)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-accent/50">
                        <div className="text-xs text-muted-foreground">Wpisy</div>
                        <div className="text-lg font-bold">{entries.filter((e) => isThisWeek(new Date(e.startTime), { weekStartsOn: 1 })).length}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">Rozkład kategorii</div>
                      {stats.categoryBreakdown.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between text-sm mb-1">
                          <span>{cat.name}</span>
                          <span className="font-semibold">{cat.hours}h ({formatCurrency(cat.earnings)})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Report */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Raport Miesięczny</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {useMemo(() => {
                      const now = new Date();
                      const monthEntries = entries.filter((e) => isThisMonth(new Date(e.startTime)));
                      const monthHours = round(monthEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
                      const monthEarnings = round(monthEntries.reduce((s, e) => s + e.totalCost, 0));
                      const monthRate = monthHours > 0 ? round(monthEarnings / monthHours) : 0;
                      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      const daysPassed = now.getDate();
                      const projectedEarnings = round((monthEarnings / daysPassed) * daysInMonth);
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Godziny</div>
                              <div className="text-lg font-bold">{monthHours}h</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Zarobek</div>
                              <div className="text-lg font-bold text-primary">{formatCurrency(monthEarnings)}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Średnia/h</div>
                              <div className="text-lg font-bold">{formatCurrency(monthRate)}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Wpisy</div>
                              <div className="text-lg font-bold">{monthEntries.length}</div>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-2">Prognoza na koniec miesiąca</div>
                            <div className="p-2 rounded bg-primary/10">
                              <div className="text-sm font-semibold text-primary">{formatCurrency(projectedEarnings)}</div>
                              <div className="text-xs text-muted-foreground">Dni: {daysPassed}/{daysInMonth}</div>
                            </div>
                          </div>
                        </>
                      );
                    }, [entries])}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Weekly Breakdown */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Szczegółowy Rozkład Tygodnia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {useMemo(() => {
                      const now = new Date();
                      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(now, { weekStartsOn: 1 }) });
                      
                      return days.map((day) => {
                        const dayStart = startOfDay(day);
                        const dayEnd = new Date(dayStart.getTime() + 86400000);
                        const dayEntries = entries.filter((e) => {
                          const d = new Date(e.startTime);
                          return d >= dayStart && d < dayEnd;
                        });
                        const hours = round(dayEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60);
                        const earnings = round(dayEntries.reduce((s, e) => s + e.totalCost, 0));
                        
                        return (
                          <div key={day.toISOString()} className="flex items-center justify-between p-2 rounded bg-accent/50">
                            <div>
                              <div className="font-semibold text-sm">{format(day, "EEEE", { locale: pl })}</div>
                              <div className="text-xs text-muted-foreground">{format(day, "dd.MM.yyyy")}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{hours}h</div>
                              <div className="text-xs text-primary">{formatCurrency(earnings)}</div>
                            </div>
                          </div>
                        );
                      });
                    }, [entries])}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>

        {/* Templates Section */}
        {templates.length > 0 && (
          <StaggerItem>
            <BoltRow>Szablony czasu</BoltRow>
          </StaggerItem>
        )}
        {templates.length > 0 && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Szablony ({templates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {templates.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.clientName}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeTemplate(t.id!)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <Badge variant="outline" className="text-[10px]">{formatDuration(t.estimatedMinutes)}</Badge>
                        <Badge className={`text-[10px] ${CATEGORY_COLORS[t.category] || ""}`}>{CATEGORY_LABELS[t.category]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{formatCurrency(t.hourlyRate)}/h · {t.usageCount} użyć</div>
                      <Button size="sm" className="w-full h-7 text-xs" onClick={() => {
                        setTimerForm({ clientName: t.clientName, description: t.name, hourlyRate: t.hourlyRate, category: t.category });
                        toast.success("Szablon załadowany do timera");
                      }}>
                        <Play className="h-3 w-3 mr-1" />Uruchom
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        {/* Recurring Entries Section */}
        {recurringEntries.length > 0 && (
          <StaggerItem>
            <BoltRow>Powtarzające się wpisy</BoltRow>
          </StaggerItem>
        )}
        {recurringEntries.length > 0 && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Powtarzające się ({recurringEntries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recurringEntries.map((r) => {
                    const template = templates.find((t) => t.id === r.templateId);
                    return (
                      <div key={r.id} className="p-3 rounded-lg border border-border/50 flex items-center justify-between group hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{template?.name}</div>
                          <div className="text-xs text-muted-foreground">{FREQUENCY_LABELS[r.frequency]} · Następnie: {format(new Date(r.nextDueDate), "dd.MM.yyyy", { locale: pl })}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.isActive ? "default" : "secondary"} className="text-[10px]">{r.isActive ? "Aktywne" : "Nieaktywne"}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeRecurring(r.id!)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

        <StaggerItem>
          <FlowIndicator active />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Dialog dodawania/edycji wpisu ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edytuj wpis czasu" : "Dodaj wpis czasu"}</DialogTitle></DialogHeader>
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
            <Button className="btn-primary" onClick={handleAdd}>{editingId ? "Zaktualizuj" : "Dodaj"} wpis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog szablonu ── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Utwórz szablon czasu</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nazwa szablonu</Label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="np. Montaż grzejnika" />
            </div>
            <div className="grid gap-2">
              <Label>Klient</Label>
              <Input value={templateForm.clientName} onChange={(e) => setTemplateForm({ ...templateForm, clientName: e.target.value })} placeholder="Nazwa klienta" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stawka/h</Label>
                <Input type="number" value={templateForm.hourlyRate} onChange={(e) => setTemplateForm({ ...templateForm, hourlyRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Szacowany czas (min)</Label>
                <Input type="number" value={templateForm.estimatedMinutes} onChange={(e) => setTemplateForm({ ...templateForm, estimatedMinutes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Kategoria</Label>
              <Select value={templateForm.category} onValueChange={(v) => setTemplateForm({ ...templateForm, category: v as TimeCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Opis (opcj.)</Label>
              <Textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} rows={2} placeholder="Dodatkowe informacje..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleAddTemplate}>Utwórz szablon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog powtarzającego się wpisu ── */}
      <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Dodaj powtarzające się wpisy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Szablon</Label>
              <Select value={String(recurringForm.templateId)} onValueChange={(v) => setRecurringForm({ ...recurringForm, templateId: parseInt(v || "0") })}>
                <SelectTrigger><SelectValue placeholder="Wybierz szablon" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Częstotliwość</Label>
              <Select value={recurringForm.frequency} onValueChange={(v) => setRecurringForm({ ...recurringForm, frequency: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Następny wpis</Label>
                <Input type="date" value={recurringForm.nextDueDate} onChange={(e) => setRecurringForm({ ...recurringForm, nextDueDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Koniec (opcj.)</Label>
                <Input type="date" value={recurringForm.endDate} onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notatki (opcj.)</Label>
              <Textarea value={recurringForm.notes} onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })} rows={2} placeholder="Dodatkowe informacje..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
            <Button className="btn-primary" onClick={handleAddRecurring}>Dodaj powtarzające się</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
