"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { useServiceStore } from "@/store/service-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useTimeStore } from "@/store/time-store";
import { useMaterialStore } from "@/store/material-store";
import { useSettingsStore } from "@/store/settings-store";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText, TrendingUp, Users, Package, CheckCircle2, Clock,
  BarChart3, Download, ArrowUpRight, ArrowDownRight, Minus,
  FileSpreadsheet, GitCompare, DollarSign, Target, Brain,
  CalendarDays, FileDown, Timer, Wallet, AlertTriangle,
  TrendingDown, Percent, Activity,
} from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { BoltRow, FlowIndicator } from "@/components/hydraulic-decorations";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  Legend, AreaChart, Area, ComposedChart, RadialBarChart, RadialBar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval,
  isThisMonth, isThisWeek, startOfWeek, endOfWeek, eachDayOfInterval,
  getDay, getMonth, differenceInDays, addMonths, isPast,
} from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function RaportyPage() {
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);
  const services = useServiceStore((s) => s.services);
  const invoices = useInvoiceStore((s) => s.invoices);
  const payments = useInvoiceStore((s) => s.payments);
  const timeEntries = useTimeStore((s) => s.entries);
  const materials = useMaterialStore((s) => s.materials);
  const settings = useSettingsStore((s) => s.settings);
  const getTotalPaidForInvoice = useInvoiceStore((s) => s.getTotalPaidForInvoice);

  const [period, setPeriod] = useState<"6" | "12" | "24">("12");
  const [activeTab, setActiveTab] = useState("overview");
  // KPI Targets state
  const [targets, setTargets] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wycenka-kpi-targets");
      if (saved) return JSON.parse(saved);
    }
    return { quotesTarget: 10, revenueTarget: 50000, conversionTarget: 60, hoursTarget: 160 };
  });
  const [editingTargets, setEditingTargets] = useState(false);

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

      // Time entries for this month
      const monthTime = timeEntries.filter((t) => {
        const d = new Date(t.startTime);
        return d >= monthStart && d <= monthEnd;
      });
      const hours = round(monthTime.reduce((s, t) => s + t.durationMinutes, 0) / 60);
      const laborCost = monthTime.reduce((s, t) => s + t.totalCost, 0);

      return {
        month: format(month, "MMM yy", { locale: pl }),
        fullMonth: format(month, "LLLL yyyy", { locale: pl }),
        revenue: round(revenue),
        quotesCount: total,
        acceptedCount: accepted.length,
        conversion,
        avgValue,
        hours,
        laborCost: round(laborCost),
      };
    });
  }, [quotes, timeEntries, periodMonths]);

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

  // ─── 1. Rentowność (Profit & Loss) ─────────────────────────────────────
  const profitData = useMemo(() => {
    const accepted = quotes.filter((q) => q.status === "zaakceptowana");
    return accepted.map((q) => {
      const revenue = q.totalBrutto;
      // Labor cost from time entries linked to this quote
      const laborEntries = timeEntries.filter((t) => t.quoteId === q.id);
      const laborCost = laborEntries.reduce((s, t) => s + t.totalCost, 0);
      const laborHours = round(laborEntries.reduce((s, t) => s + t.durationMinutes, 0) / 60);
      // Material cost estimate (from items with serviceId linked to materials)
      const materialCost = q.items.reduce((s, item) => {
        const service = services.find((sv) => sv.id === item.serviceId);
        return s + (service?.costPrice || 0) * item.quantity;
      }, 0);
      const totalCost = laborCost + materialCost;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? round((profit / revenue) * 100) : 0;

      return {
        id: q.id,
        number: q.number,
        clientName: q.clientName,
        revenue: round(revenue),
        laborCost: round(laborCost),
        laborHours,
        materialCost: round(materialCost),
        totalCost: round(totalCost),
        profit: round(profit),
        margin,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [quotes, timeEntries, services]);

  const profitSummary = useMemo(() => {
    const totalRevenue = profitData.reduce((s, p) => s + p.revenue, 0);
    const totalCost = profitData.reduce((s, p) => s + p.totalCost, 0);
    const totalProfit = profitData.reduce((s, p) => s + p.profit, 0);
    const avgMargin = profitData.length > 0 ? round(profitData.reduce((s, p) => s + p.margin, 0) / profitData.length) : 0;
    return { totalRevenue, totalCost, totalProfit, avgMargin };
  }, [profitData]);

  // ─── 2. Porównanie okresowe (YoY / MoM) ────────────────────────────────
  const periodComparison = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastYearSameMonthStart = startOfMonth(subMonths(now, 12));
    const lastYearSameMonthEnd = endOfMonth(subMonths(now, 12));

    const thisMonthQuotes = quotes.filter((q) => { const d = new Date(q.createdAt); return d >= thisMonthStart && d <= thisMonthEnd; });
    const lastMonthQuotes = quotes.filter((q) => { const d = new Date(q.createdAt); return d >= lastMonthStart && d <= lastMonthEnd; });
    const lastYearQuotes = quotes.filter((q) => { const d = new Date(q.createdAt); return d >= lastYearSameMonthStart && d <= lastYearSameMonthEnd; });

    const thisRev = thisMonthQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const lastRev = lastMonthQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const yearRev = lastYearQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);

    const thisConv = thisMonthQuotes.length > 0 ? round((thisMonthQuotes.filter((q) => q.status === "zaakceptowana").length / thisMonthQuotes.length) * 100) : 0;
    const lastConv = lastMonthQuotes.length > 0 ? round((lastMonthQuotes.filter((q) => q.status === "zaakceptowana").length / lastMonthQuotes.length) * 100) : 0;
    const yearConv = lastYearQuotes.length > 0 ? round((lastYearQuotes.filter((q) => q.status === "zaakceptowana").length / lastYearQuotes.length) * 100) : 0;

    const momRevChange = lastRev > 0 ? round(((thisRev - lastRev) / lastRev) * 100) : 0;
    const yoyRevChange = yearRev > 0 ? round(((thisRev - yearRev) / yearRev) * 100) : 0;

    return {
      thisMonth: { quotes: thisMonthQuotes.length, revenue: thisRev, conversion: thisConv },
      lastMonth: { quotes: lastMonthQuotes.length, revenue: lastRev, conversion: lastConv },
      lastYear: { quotes: lastYearQuotes.length, revenue: yearRev, conversion: yearConv },
      momRevChange, yoyRevChange,
      momQuoteChange: lastMonthQuotes.length > 0 ? round(((thisMonthQuotes.length - lastMonthQuotes.length) / lastMonthQuotes.length) * 100) : 0,
      yoyQuoteChange: lastYearQuotes.length > 0 ? round(((thisMonthQuotes.length - lastYearQuotes.length) / lastYearQuotes.length) * 100) : 0,
    };
  }, [quotes]);

  // ─── 3. Raport Czasu Pracy ──────────────────────────────────────────────
  const timeReport = useMemo(() => {
    const totalHours = round(timeEntries.reduce((s, t) => s + t.durationMinutes, 0) / 60);
    const totalEarnings = timeEntries.reduce((s, t) => s + t.totalCost, 0);
    const avgHourlyRate = totalHours > 0 ? round(totalEarnings / totalHours) : 0;
    const avgTimePerQuote = quotes.filter((q) => q.status === "zaakceptowana").length > 0
      ? round(totalHours / quotes.filter((q) => q.status === "zaakceptowana").length)
      : 0;

    // By category
    const byCategory: Record<string, { hours: number; cost: number }> = {};
    timeEntries.forEach((t) => {
      if (!byCategory[t.category]) byCategory[t.category] = { hours: 0, cost: 0 };
      byCategory[t.category].hours += t.durationMinutes / 60;
      byCategory[t.category].cost += t.totalCost;
    });
    const categoryData = Object.entries(byCategory).map(([cat, data]) => ({
      name: cat === "robocizna" ? "Robocizna" : cat === "dojazd" ? "Dojazd" : "Inne",
      hours: round(data.hours),
      cost: round(data.cost),
    }));

    // Hourly profitability per client
    const clientTime: Record<string, { name: string; hours: number; earnings: number; revenue: number }> = {};
    timeEntries.forEach((t) => {
      const key = t.clientName || "Brak";
      if (!clientTime[key]) clientTime[key] = { name: key, hours: 0, earnings: 0, revenue: 0 };
      clientTime[key].hours += t.durationMinutes / 60;
      clientTime[key].earnings += t.totalCost;
    });
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      const key = q.clientName || "Brak";
      if (clientTime[key]) clientTime[key].revenue += q.totalBrutto;
    });
    const clientProfitability = Object.values(clientTime)
      .map((c) => ({ ...c, hours: round(c.hours), ratePerHour: c.hours > 0 ? round(c.revenue / c.hours) : 0 }))
      .sort((a, b) => b.ratePerHour - a.ratePerHour)
      .slice(0, 8);

    // Estimated vs actual
    const withEstimate = timeEntries.filter((t) => t.estimatedMinutes && t.estimatedMinutes > 0);
    const estimateAccuracy = withEstimate.length > 0
      ? round(withEstimate.reduce((s, t) => s + (t.durationMinutes / (t.estimatedMinutes || 1)) * 100, 0) / withEstimate.length)
      : 0;

    return { totalHours, totalEarnings, avgHourlyRate, avgTimePerQuote, categoryData, clientProfitability, estimateAccuracy };
  }, [timeEntries, quotes]);

  // ─── 4. Cashflow & Płatności ────────────────────────────────────────────
  const cashflowData = useMemo(() => {
    const now = new Date();
    // Aging report
    const unpaid = invoices.filter((i) => i.status !== "zaplacona" && i.status !== "anulowana");
    const aging = { days30: 0, days60: 0, days90: 0, days90plus: 0 };
    unpaid.forEach((inv) => {
      const days = differenceInDays(now, new Date(inv.dueDate));
      const remaining = inv.totalBrutto - getTotalPaidForInvoice(inv.id!);
      if (days <= 30) aging.days30 += remaining;
      else if (days <= 60) aging.days60 += remaining;
      else if (days <= 90) aging.days90 += remaining;
      else aging.days90plus += remaining;
    });

    // DSO (Days Sales Outstanding)
    const totalReceivables = unpaid.reduce((s, i) => s + (i.totalBrutto - getTotalPaidForInvoice(i.id!)), 0);
    const last90DaysRevenue = invoices
      .filter((i) => new Date(i.issueDate) >= subMonths(now, 3))
      .reduce((s, i) => s + i.totalBrutto, 0);
    const dso = last90DaysRevenue > 0 ? round((totalReceivables / last90DaysRevenue) * 90) : 0;

    // Collection rate
    const totalInvoiced = invoices.filter((i) => i.status !== "anulowana").reduce((s, i) => s + i.totalBrutto, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const collectionRate = totalInvoiced > 0 ? round((totalCollected / totalInvoiced) * 100) : 0;

    // Forecast (next 3 months based on due dates)
    const forecast: { month: string; expected: number; overdue: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const mStart = startOfMonth(addMonths(now, i));
      const mEnd = endOfMonth(addMonths(now, i));
      const monthInvoices = invoices.filter((inv) => {
        const due = new Date(inv.dueDate);
        return due >= mStart && due <= mEnd && inv.status !== "zaplacona" && inv.status !== "anulowana";
      });
      const expected = monthInvoices.reduce((s, inv) => s + (inv.totalBrutto - getTotalPaidForInvoice(inv.id!)), 0);
      const overdueInv = monthInvoices.filter((inv) => isPast(new Date(inv.dueDate)));
      const overdue = overdueInv.reduce((s, inv) => s + (inv.totalBrutto - getTotalPaidForInvoice(inv.id!)), 0);
      forecast.push({ month: format(mStart, "MMM yyyy", { locale: pl }), expected: round(expected), overdue: round(overdue) });
    }

    return { aging, dso, collectionRate, totalReceivables: round(totalReceivables), forecast };
  }, [invoices, payments, getTotalPaidForInvoice]);

  // ─── 5. KPI Targets ─────────────────────────────────────────────────────
  const kpiProgress = useMemo(() => {
    const thisMonthQuotes = quotes.filter((q) => isThisMonth(new Date(q.createdAt)));
    const thisMonthAccepted = thisMonthQuotes.filter((q) => q.status === "zaakceptowana");
    const thisMonthRevenue = thisMonthAccepted.reduce((s, q) => s + q.totalBrutto, 0);
    const thisMonthConversion = thisMonthQuotes.length > 0 ? round((thisMonthAccepted.length / thisMonthQuotes.length) * 100) : 0;
    const thisMonthHours = round(timeEntries.filter((t) => isThisMonth(new Date(t.startTime))).reduce((s, t) => s + t.durationMinutes, 0) / 60);

    return {
      quotes: { current: thisMonthQuotes.length, target: targets.quotesTarget, pct: Math.min(100, round((thisMonthQuotes.length / targets.quotesTarget) * 100)) },
      revenue: { current: thisMonthRevenue, target: targets.revenueTarget, pct: Math.min(100, round((thisMonthRevenue / targets.revenueTarget) * 100)) },
      conversion: { current: thisMonthConversion, target: targets.conversionTarget, pct: Math.min(100, round((thisMonthConversion / targets.conversionTarget) * 100)) },
      hours: { current: thisMonthHours, target: targets.hoursTarget, pct: Math.min(100, round((thisMonthHours / targets.hoursTarget) * 100)) },
    };
  }, [quotes, timeEntries, targets]);

  function saveTargets() {
    localStorage.setItem("wycenka-kpi-targets", JSON.stringify(targets));
    setEditingTargets(false);
    toast.success("Cele zapisane");
  }

  // ─── 6. Prognoza AI (Linear Regression) ────────────────────────────────
  const forecast = useMemo(() => {
    if (monthlyData.length < 3) return [];
    // Simple linear regression on revenue
    const n = monthlyData.length;
    const xs = monthlyData.map((_, i) => i);
    const ys = monthlyData.map((m) => m.revenue);
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next 3 months
    const predictions = [];
    for (let i = 1; i <= 3; i++) {
      const x = n + i - 1;
      const predicted = Math.max(0, round(intercept + slope * x));
      const month = addMonths(new Date(), i);
      predictions.push({
        month: format(month, "MMM yy", { locale: pl }),
        predicted,
        confidence: Math.max(50, round(100 - i * 10)), // decreasing confidence
      });
    }

    // Also predict quotes count
    const quotesYs = monthlyData.map((m) => m.quotesCount);
    const qSumY = quotesYs.reduce((s, y) => s + y, 0);
    const qSumXY = xs.reduce((s, x, i) => s + x * quotesYs[i], 0);
    const qSlope = (n * qSumXY - sumX * qSumY) / (n * sumX2 - sumX * sumX);
    const qIntercept = (qSumY - qSlope * sumX) / n;

    predictions.forEach((p, i) => {
      (p as any).predictedQuotes = Math.max(0, Math.round(qIntercept + qSlope * (n + i)));
    });

    return predictions;
  }, [monthlyData]);

  // ─── 7. Sezonowość (Heatmap data) ──────────────────────────────────────
  const seasonalData = useMemo(() => {
    // Day of week × month heatmap
    const heatmap: { day: number; month: number; count: number }[] = [];
    const dayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];
    const monthLabels = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

    // Initialize
    for (let d = 0; d < 7; d++) {
      for (let m = 0; m < 12; m++) {
        heatmap.push({ day: d, month: m, count: 0 });
      }
    }

    quotes.forEach((q) => {
      const date = new Date(q.createdAt);
      let dayIdx = getDay(date) - 1; // 0=Mon
      if (dayIdx < 0) dayIdx = 6; // Sunday
      const monthIdx = getMonth(date);
      const cell = heatmap.find((h) => h.day === dayIdx && h.month === monthIdx);
      if (cell) cell.count++;
    });

    // Monthly totals for bar chart
    const monthlyTotals = monthLabels.map((label, i) => ({
      month: label,
      count: heatmap.filter((h) => h.month === i).reduce((s, h) => s + h.count, 0),
    }));

    // Day of week totals
    const dayTotals = dayLabels.map((label, i) => ({
      day: label,
      count: heatmap.filter((h) => h.day === i).reduce((s, h) => s + h.count, 0),
    }));

    return { heatmap, dayLabels, monthLabels, monthlyTotals, dayTotals };
  }, [quotes]);

  // ─── 8. Eksport PDF ─────────────────────────────────────────────────────
  function handleExportPDF() {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text("RAPORT WYCENKA", pw / 2, 15, { align: "center" });
    doc.setFontSize(10);
    if (settings?.name) doc.text(settings.name, pw / 2, 22, { align: "center" });
    doc.text(`Wygenerowano: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: pl })}`, pw / 2, 28, { align: "center" });
    doc.text(`Okres: ostatnie ${period} miesięcy`, pw / 2, 34, { align: "center" });

    // KPI Summary
    doc.setFontSize(12);
    doc.text("Podsumowanie KPI", 14, 45);
    doc.setFontSize(9);
    const kpiRows = [
      ["Wyceny łącznie", String(stats.totalQuotes)],
      ["Zaakceptowane", String(stats.acceptedQuotes)],
      ["Konwersja", `${stats.conversionRate}%`],
      ["Przychód łączny", formatCurrency(stats.totalRevenue)],
      ["Średnia wartość", formatCurrency(stats.avgQuoteValue)],
      ["Nieopłacone", formatCurrency(stats.unpaidAmount)],
      ["Trend przychodu", `${stats.revenueTrend > 0 ? "+" : ""}${stats.revenueTrend}%`],
    ];
    (doc as any).autoTable({
      head: [["Metryka", "Wartość"]],
      body: kpiRows,
      startY: 50,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });

    // Monthly revenue table
    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Przychód miesięczny", 14, y);
    const monthRows = monthlyData.slice(-6).map((m) => [m.fullMonth, formatCurrency(m.revenue), String(m.quotesCount), String(m.acceptedCount), `${m.conversion}%`]);
    (doc as any).autoTable({
      head: [["Miesiąc", "Przychód", "Wyceny", "Zaakceptowane", "Konwersja"]],
      body: monthRows,
      startY: y + 5,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });

    // Profitability
    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Rentowność", 14, y);
    doc.setFontSize(9);
    doc.text(`Przychód: ${formatCurrency(profitSummary.totalRevenue)} | Koszty: ${formatCurrency(profitSummary.totalCost)} | Zysk: ${formatCurrency(profitSummary.totalProfit)} | Marża: ${profitSummary.avgMargin}%`, 14, y + 7);

    // Top services
    y += 15;
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Top usługi", 14, y);
    const servRows = topServices.slice(0, 5).map((s) => [s.name, String(s.count), formatCurrency(s.revenue)]);
    (doc as any).autoTable({
      head: [["Usługa", "Ilość", "Przychód"]],
      body: servRows,
      startY: y + 5,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });

    // Top clients
    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Top klienci", 14, y);
    const cliRows = topClients.slice(0, 5).map((c) => [c.name, String(c.quoteCount), formatCurrency(c.revenue)]);
    (doc as any).autoTable({
      head: [["Klient", "Wyceny", "Przychód"]],
      body: cliRows,
      startY: y + 5,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });

    // Cashflow
    y = (doc as any).lastAutoTable.finalY + 10;
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Cashflow", 14, y);
    doc.setFontSize(9);
    doc.text(`DSO: ${cashflowData.dso} dni | Ściągalność: ${cashflowData.collectionRate}% | Należności: ${formatCurrency(cashflowData.totalReceivables)}`, 14, y + 7);

    doc.save(`raport-wycenka-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Raport PDF wyeksportowany");
  }

  // ─── Eksport XLSX ───────────────────────────────────────────────────────
  async function handleExportXLSX() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

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

    const revenueRows = [["Miesiąc", "Przychód", "Wyceny", "Zaakceptowane", "Konwersja %", "Śr. wartość", "Godziny", "Koszt pracy"]];
    monthlyData.forEach((m) => {
      revenueRows.push([m.fullMonth, m.revenue as any, m.quotesCount as any, m.acceptedCount as any, m.conversion as any, m.avgValue as any, m.hours as any, m.laborCost as any]);
    });
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueRows);
    XLSX.utils.book_append_sheet(wb, wsRevenue, "Przychód miesięczny");

    const servRows = [["Usługa", "Ilość", "Przychód brutto"]];
    topServices.forEach((s) => { servRows.push([s.name, s.count as any, s.revenue as any]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(servRows), "Top usługi");

    const clientRows = [["Klient", "Przychód brutto", "Liczba wycen"]];
    topClients.forEach((c) => { clientRows.push([c.name, c.revenue as any, c.quoteCount as any]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clientRows), "Top klienci");

    const profitRows = [["Numer", "Klient", "Przychód", "Koszt pracy", "Koszt materiałów", "Zysk", "Marża %"]];
    profitData.forEach((p) => { profitRows.push([p.number, p.clientName, p.revenue as any, p.laborCost as any, p.materialCost as any, p.profit as any, p.margin as any]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profitRows), "Rentowność");

    const allRows = [["Numer", "Klient", "Data", "Status", "Netto", "VAT", "Brutto", "Rabat %"]];
    quotes.forEach((q) => {
      allRows.push([q.number, q.clientName, format(new Date(q.createdAt), "dd.MM.yyyy"), q.status, q.totalNetto as any, q.totalVat as any, q.totalBrutto as any, q.globalDiscountPercent as any]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allRows), "Wszystkie wyceny");

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
              <p className="text-muted-foreground mt-0.5 text-sm">Trendy, konwersja, rentowność i prognozy</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={period} onValueChange={(v) => setPeriod((v ?? "12") as "6" | "12" | "24")}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 miesięcy</SelectItem>
                  <SelectItem value="12">12 miesięcy</SelectItem>
                  <SelectItem value="24">24 miesiące</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="btn-secondary" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4" /><span className="hidden sm:inline">PDF</span>
              </Button>
              <Button className="btn-primary" onClick={handleExportXLSX}>
                <FileSpreadsheet className="h-4 w-4" /><span className="hidden sm:inline">XLSX</span>
              </Button>
              <Link href="/raporty/porownanie">
                <Button variant="outline" className="btn-secondary">
                  <GitCompare className="h-4 w-4" /><span className="hidden sm:inline">Porównaj</span>
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
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="overview">Przegląd</TabsTrigger>
              <TabsTrigger value="profit">Rentowność</TabsTrigger>
              <TabsTrigger value="periods">Okresy</TabsTrigger>
              <TabsTrigger value="time">Czas</TabsTrigger>
              <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
              <TabsTrigger value="targets">Cele</TabsTrigger>
              <TabsTrigger value="forecast">Prognoza</TabsTrigger>
              <TabsTrigger value="seasonal">Sezonowość</TabsTrigger>
            </TabsList>

            {/* ── Przegląd ── */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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

              {/* Top services & clients */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top usługi wg przychodu</CardTitle></CardHeader>
                  <CardContent>
                    {topServices.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <div className="space-y-2">
                        {topServices.slice(0, 5).map((s, i) => {
                          const maxRev = topServices[0]?.revenue || 1;
                          const pct = round((s.revenue / maxRev) * 100);
                          return (
                            <div key={s.name} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[55%]">{i + 1}. {s.name}</span>
                                <span className="font-bold text-primary shrink-0">{formatCurrency(s.revenue)}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden bg-accent/50">
                                <motion.div className="h-full rounded-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top klienci wg przychodu</CardTitle></CardHeader>
                  <CardContent>
                    {topClients.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div> : (
                      <div className="space-y-2">
                        {topClients.slice(0, 5).map((c, i) => {
                          const maxRev = topClients[0]?.revenue || 1;
                          const pct = round((c.revenue / maxRev) * 100);
                          return (
                            <div key={c.name} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium truncate max-w-[55%]">{i + 1}. {c.name}</span>
                                <span className="font-bold text-primary shrink-0">{formatCurrency(c.revenue)}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden bg-accent/50">
                                <motion.div className="h-full rounded-full" style={{ background: COLORS[i % COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── 1. Rentowność ── */}
            <TabsContent value="profit" className="space-y-4 mt-4">
              {/* Summary cards */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Przychód</div>
                    <div className="text-lg font-black text-primary">{formatCurrency(profitSummary.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Koszty</div>
                    <div className="text-lg font-black text-red-600">{formatCurrency(profitSummary.totalCost)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Zysk netto</div>
                    <div className="text-lg font-black text-green-600">{formatCurrency(profitSummary.totalProfit)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Śr. marża</div>
                    <div className="text-lg font-black">{profitSummary.avgMargin}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Profit chart */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Przychód vs Koszty (miesięcznie)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="revenue" name="Przychód" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="laborCost" name="Koszt pracy" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="revenue" name="Trend" stroke="#10b981" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Per-quote profitability table */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Rentowność per wycena (Top 10)</CardTitle>
                  <CardDescription>Zaakceptowane wyceny z przypisanym czasem pracy</CardDescription>
                </CardHeader>
                <CardContent>
                  {profitData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak danych — przypisz czas pracy do wycen</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 font-medium">Wycena</th>
                            <th className="text-left py-2 font-medium">Klient</th>
                            <th className="text-right py-2 font-medium">Przychód</th>
                            <th className="text-right py-2 font-medium">Koszty</th>
                            <th className="text-right py-2 font-medium">Zysk</th>
                            <th className="text-right py-2 font-medium">Marża</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profitData.slice(0, 10).map((p) => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-accent/50">
                              <td className="py-2 font-semibold">{p.number}</td>
                              <td className="py-2 text-muted-foreground">{p.clientName}</td>
                              <td className="py-2 text-right">{formatCurrency(p.revenue)}</td>
                              <td className="py-2 text-right text-red-600">{formatCurrency(p.totalCost)}</td>
                              <td className="py-2 text-right font-bold text-green-600">{formatCurrency(p.profit)}</td>
                              <td className="py-2 text-right">
                                <Badge className={p.margin >= 30 ? "bg-green-100 text-green-700" : p.margin >= 15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                                  {p.margin}%
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

            {/* ── 2. Porównanie okresowe ── */}
            <TabsContent value="periods" className="space-y-4 mt-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* This month */}
                <Card className="card-modern border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ten miesiąc</CardTitle>
                    <CardDescription>{format(new Date(), "LLLL yyyy", { locale: pl })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Wyceny:</span><span className="font-bold">{periodComparison.thisMonth.quotes}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Przychód:</span><span className="font-bold text-primary">{formatCurrency(periodComparison.thisMonth.revenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Konwersja:</span><span className="font-bold">{periodComparison.thisMonth.conversion}%</span></div>
                  </CardContent>
                </Card>
                {/* Last month */}
                <Card className="card-modern border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Poprzedni miesiąc</CardTitle>
                    <CardDescription>{format(subMonths(new Date(), 1), "LLLL yyyy", { locale: pl })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Wyceny:</span><span className="font-bold">{periodComparison.lastMonth.quotes}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Przychód:</span><span className="font-bold">{formatCurrency(periodComparison.lastMonth.revenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Konwersja:</span><span className="font-bold">{periodComparison.lastMonth.conversion}%</span></div>
                  </CardContent>
                </Card>
                {/* Same month last year */}
                <Card className="card-modern border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Rok temu</CardTitle>
                    <CardDescription>{format(subMonths(new Date(), 12), "LLLL yyyy", { locale: pl })}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Wyceny:</span><span className="font-bold">{periodComparison.lastYear.quotes}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Przychód:</span><span className="font-bold">{formatCurrency(periodComparison.lastYear.revenue)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Konwersja:</span><span className="font-bold">{periodComparison.lastYear.conversion}%</span></div>
                  </CardContent>
                </Card>
              </div>

              {/* Change indicators */}
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Zmiany procentowe</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-accent/50 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Przychód MoM</div>
                      <TrendBadge value={periodComparison.momRevChange} />
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Przychód YoY</div>
                      <TrendBadge value={periodComparison.yoyRevChange} />
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Wyceny MoM</div>
                      <TrendBadge value={periodComparison.momQuoteChange} />
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Wyceny YoY</div>
                      <TrendBadge value={periodComparison.yoyQuoteChange} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trend chart */}
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Konwersja w czasie</CardTitle></CardHeader>
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
            </TabsContent>

            {/* ── 3. Czas Pracy ── */}
            <TabsContent value="time" className="space-y-4 mt-4">
              {/* Time KPIs */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" />Łącznie godzin</div>
                    <div className="text-xl font-black">{timeReport.totalHours}h</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Zarobki</div>
                    <div className="text-lg font-black text-green-600">{formatCurrency(timeReport.totalEarnings)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Śr. stawka/h</div>
                    <div className="text-lg font-black">{formatCurrency(timeReport.avgHourlyRate)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Śr. czas/wycenę</div>
                    <div className="text-lg font-black">{timeReport.avgTimePerQuote}h</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Category breakdown */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Rozkład czasu per kategoria</CardTitle></CardHeader>
                  <CardContent>
                    {timeReport.categoryData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Brak wpisów czasu</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={timeReport.categoryData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="hours" nameKey="name" paddingAngle={2}>
                            {timeReport.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `${v}h`} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Estimate accuracy */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Dokładność szacunków</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="text-4xl font-black mb-2">{timeReport.estimateAccuracy}%</div>
                    <div className="text-sm text-muted-foreground mb-3">rzeczywisty vs szacowany czas</div>
                    <Badge className={timeReport.estimateAccuracy <= 110 && timeReport.estimateAccuracy >= 90 ? "bg-green-100 text-green-700" : timeReport.estimateAccuracy <= 130 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                      {timeReport.estimateAccuracy <= 110 && timeReport.estimateAccuracy >= 90 ? "Dokładne" : timeReport.estimateAccuracy > 110 ? "Przekroczenia" : "Poniżej szacunku"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Client profitability by hour */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Rentowność godzinowa per klient</CardTitle>
                  <CardDescription>Przychód z wycen / przepracowane godziny</CardDescription>
                </CardHeader>
                <CardContent>
                  {timeReport.clientProfitability.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak danych</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={timeReport.clientProfitability} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} zł/h`} />
                        <YAxis type="category" dataKey="name" className="text-[10px]" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip formatter={(v) => `${v} zł/h`} />
                        <Bar dataKey="ratePerHour" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Monthly hours trend */}
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Godziny miesięcznie</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} unit="h" />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── 4. Cashflow ── */}
            <TabsContent value="cashflow" className="space-y-4 mt-4">
              {/* Cashflow KPIs */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" />Należności</div>
                    <div className="text-lg font-black text-amber-600">{formatCurrency(cashflowData.totalReceivables)}</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">DSO</div>
                    <div className="text-lg font-black">{cashflowData.dso} dni</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground">Ściągalność</div>
                    <div className="text-lg font-black text-green-600">{cashflowData.collectionRate}%</div>
                  </CardContent>
                </Card>
                <Card className="card-steel">
                  <CardContent className="pt-4 p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" />90+ dni</div>
                    <div className="text-lg font-black text-red-600">{formatCurrency(cashflowData.aging.days90plus)}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Aging Report */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Aging Report (wiekowanie należności)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <span className="text-sm font-medium">0-30 dni</span>
                        <span className="font-bold text-green-600">{formatCurrency(cashflowData.aging.days30)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                        <span className="text-sm font-medium">31-60 dni</span>
                        <span className="font-bold text-amber-600">{formatCurrency(cashflowData.aging.days60)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <span className="text-sm font-medium">61-90 dni</span>
                        <span className="font-bold text-orange-600">{formatCurrency(cashflowData.aging.days90)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                        <span className="text-sm font-medium">90+ dni</span>
                        <span className="font-bold text-red-600">{formatCurrency(cashflowData.aging.days90plus)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Forecast */}
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Prognoza wpływów (3 miesiące)</CardTitle></CardHeader>
                  <CardContent>
                    {cashflowData.forecast.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Brak faktur</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={cashflowData.forecast}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                          <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="expected" name="Oczekiwane" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="overdue" name="Przeterminowane" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── 5. Cele KPI ── */}
            <TabsContent value="targets" className="space-y-4 mt-4">
              {/* Target settings */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Cele miesięczne</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => editingTargets ? saveTargets() : setEditingTargets(true)}>
                      {editingTargets ? "Zapisz" : "Edytuj cele"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingTargets ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Wyceny/mies.</Label>
                        <Input type="number" value={targets.quotesTarget} onChange={(e) => setTargets({ ...targets, quotesTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Przychód (PLN)</Label>
                        <Input type="number" value={targets.revenueTarget} onChange={(e) => setTargets({ ...targets, revenueTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Konwersja (%)</Label>
                        <Input type="number" value={targets.conversionTarget} onChange={(e) => setTargets({ ...targets, conversionTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Godziny/mies.</Label>
                        <Input type="number" value={targets.hoursTarget} onChange={(e) => setTargets({ ...targets, hoursTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Quotes target */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Wyceny</span>
                          <span className="text-muted-foreground">{kpiProgress.quotes.current} / {kpiProgress.quotes.target}</span>
                        </div>
                        <Progress value={kpiProgress.quotes.pct} className="h-3" />
                        <div className="text-xs text-muted-foreground text-right">{kpiProgress.quotes.pct}%</div>
                      </div>
                      {/* Revenue target */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Przychód</span>
                          <span className="text-muted-foreground">{formatCurrency(kpiProgress.revenue.current)} / {formatCurrency(kpiProgress.revenue.target)}</span>
                        </div>
                        <Progress value={kpiProgress.revenue.pct} className="h-3" />
                        <div className="text-xs text-muted-foreground text-right">{kpiProgress.revenue.pct}%</div>
                      </div>
                      {/* Conversion target */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Konwersja</span>
                          <span className="text-muted-foreground">{kpiProgress.conversion.current}% / {kpiProgress.conversion.target}%</span>
                        </div>
                        <Progress value={kpiProgress.conversion.pct} className="h-3" />
                        <div className="text-xs text-muted-foreground text-right">{kpiProgress.conversion.pct}%</div>
                      </div>
                      {/* Hours target */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Godziny pracy</span>
                          <span className="text-muted-foreground">{kpiProgress.hours.current}h / {kpiProgress.hours.target}h</span>
                        </div>
                        <Progress value={kpiProgress.hours.pct} className="h-3" />
                        <div className="text-xs text-muted-foreground text-right">{kpiProgress.hours.pct}%</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── 6. Prognoza AI ── */}
            <TabsContent value="forecast" className="space-y-4 mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4" />Prognoza przychodu (regresja liniowa)</CardTitle>
                  <CardDescription>Na podstawie trendu z ostatnich {period} miesięcy</CardDescription>
                </CardHeader>
                <CardContent>
                  {forecast.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Za mało danych (min. 3 miesiące)</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={[...monthlyData.slice(-6).map((m) => ({ ...m, predicted: null })), ...forecast.map((f) => ({ month: f.month, revenue: null, predicted: f.predicted }))]}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                          <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => v ? formatCurrency(Number(v)) : "—"} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="revenue" name="Rzeczywisty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="predicted" name="Prognoza" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.6} />
                        </ComposedChart>
                      </ResponsiveContainer>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {forecast.map((f) => (
                          <div key={f.month} className="p-3 rounded-lg bg-accent/50 text-center">
                            <div className="text-xs text-muted-foreground mb-1">{f.month}</div>
                            <div className="text-lg font-black text-primary">{formatCurrency(f.predicted)}</div>
                            <div className="text-xs text-muted-foreground">~{(f as any).predictedQuotes} wycen</div>
                            <Badge variant="secondary" className="mt-1 text-[10px]">pewność: {f.confidence}%</Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quotes vs Accepted trend */}
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-base">Wyceny: utworzone vs zaakceptowane</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
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
            </TabsContent>

            {/* ── 7. Sezonowość ── */}
            <TabsContent value="seasonal" className="space-y-4 mt-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Monthly distribution */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />Aktywność per miesiąc</CardTitle>
                    <CardDescription>Liczba wycen w każdym miesiącu (wszystkie lata)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={seasonalData.monthlyTotals}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Wyceny" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Day of week distribution */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Aktywność per dzień tygodnia</CardTitle>
                    <CardDescription>Kiedy tworzysz najwięcej wycen?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={seasonalData.dayTotals}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="day" className="text-[10px]" tick={{ fontSize: 10 }} />
                        <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Wyceny" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Heatmap */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Heatmapa aktywności (dzień × miesiąc)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Month headers */}
                      <div className="flex gap-1 mb-1 ml-10">
                        {seasonalData.monthLabels.map((m) => (
                          <div key={m} className="flex-1 text-center text-[10px] text-muted-foreground">{m}</div>
                        ))}
                      </div>
                      {/* Rows */}
                      {seasonalData.dayLabels.map((day, dayIdx) => (
                        <div key={day} className="flex gap-1 items-center mb-1">
                          <div className="w-9 text-[10px] text-muted-foreground text-right pr-1">{day}</div>
                          {seasonalData.monthLabels.map((_, monthIdx) => {
                            const cell = seasonalData.heatmap.find((h) => h.day === dayIdx && h.month === monthIdx);
                            const count = cell?.count || 0;
                            const maxCount = Math.max(...seasonalData.heatmap.map((h) => h.count), 1);
                            const intensity = count / maxCount;
                            return (
                              <div
                                key={monthIdx}
                                className="flex-1 h-6 rounded-sm transition-colors"
                                style={{
                                  backgroundColor: count === 0
                                    ? "oklch(0.92 0 0)"
                                    : `oklch(${0.7 - intensity * 0.3} ${0.1 + intensity * 0.1} 220)`,
                                }}
                                title={`${day}, ${seasonalData.monthLabels[monthIdx]}: ${count} wycen`}
                              />
                            );
                          })}
                        </div>
                      ))}
                      {/* Legend */}
                      <div className="flex items-center gap-2 mt-3 ml-10">
                        <span className="text-[10px] text-muted-foreground">Mniej</span>
                        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                          <div
                            key={intensity}
                            className="h-4 w-4 rounded-sm"
                            style={{
                              backgroundColor: intensity === 0
                                ? "oklch(0.92 0 0)"
                                : `oklch(${0.7 - intensity * 0.3} ${0.1 + intensity * 0.1} 220)`,
                            }}
                          />
                        ))}
                        <span className="text-[10px] text-muted-foreground">Więcej</span>
                      </div>
                    </div>
                  </div>
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
