"use client";

import Link from "next/link";
import { useMemo, lazy, Suspense } from "react";
import {
  FileText, Plus, TrendingUp, Clock,
  CheckCircle2, BarChart3, AlertCircle, ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { formatCurrency } from "@/lib/calculations";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { Greeting } from "@/components/dashboard/greeting";
import { WorkStreak } from "@/components/dashboard/work-streak";
import { MonthlyGoal } from "@/components/dashboard/monthly-goal";
import { ActiveTimerBar } from "@/components/dashboard/active-timer-bar";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { QuickNotes } from "@/components/dashboard/quick-notes";
import { WorkloadIndicator } from "@/components/dashboard/workload-indicator";
import { Sparkline } from "@/components/dashboard/sparkline";
import { PipeSeparator, BoltRow, FlowIndicator, HydraulicBadge, PressureStatus } from "@/components/hydraulic-decorations";
import { CashFlow } from "@/components/dashboard/cash-flow";
import { RevenueForecast } from "@/components/dashboard/revenue-forecast";
import { TopServicesMonth } from "@/components/dashboard/top-services-month";
import { AIInsight } from "@/components/dashboard/ai-insight";
import { QuickTimer } from "@/components/dashboard/quick-timer";
import { subMonths, subDays, startOfDay, isSameDay } from "date-fns";

// Lazy load heavy dashboard widgets (recharts, etc.)
const NotificationsCenter = lazy(() => import("@/components/dashboard/notifications-center").then((m) => ({ default: m.NotificationsCenter })));
const TodaySchedule = lazy(() => import("@/components/dashboard/today-schedule").then((m) => ({ default: m.TodaySchedule })));
const RecentActivity = lazy(() => import("@/components/dashboard/recent-activity").then((m) => ({ default: m.RecentActivity })));
const QuoteStatusBar = lazy(() => import("@/components/dashboard/quote-status-bar").then((m) => ({ default: m.QuoteStatusBar })));
const RevenueChart = lazy(() => import("@/components/dashboard/revenue-chart").then((m) => ({ default: m.RevenueChart })));


export default function DashboardPage() {
  const serviceCount = useServiceStore((s) => s.services.length);
  const clientCount = useClientStore((s) => s.clients.length);
  const quotes = useQuoteStore((s) => s.quotes);
  const invoices = useInvoiceStore((s) => s.invoices);

  const {
    quoteCount, acceptedCount, pendingCount, totalRevenue,
    conversionRate, avgQuoteValue, unpaidAmount, unpaidCount,
    expiredQuotes, revenueTrend, recentQuotes, sparklineQuotes, sparklineRevenue,
  } = useMemo(() => {
    const quoteCount = quotes.length;
    const acceptedCount = quotes.filter((q) => q.status === "zaakceptowana").length;
    const pendingCount = quotes.filter((q) => q.status === "wyslana").length;
    const totalRevenue = quotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const conversionRate = quoteCount > 0 ? Math.round((acceptedCount / quoteCount) * 100) : 0;
    const avgQuoteValue = acceptedCount > 0 ? totalRevenue / acceptedCount : 0;

    const unpaidInvoices = invoices.filter((i) => i.status === "niezaplacona" || i.status === "czesciowo");
    const unpaidAmount = unpaidInvoices.reduce((s, i) => s + i.totalBrutto, 0);
    const unpaidCount = unpaidInvoices.length;

    const now = new Date();
    const expiredQuotes = quotes.filter((q) =>
      (q.status === "wyslana" || q.status === "szkic") && q.validUntil && new Date(q.validUntil) < now
    ).slice(0, 5);

    // Trend przychodu vs poprzedni miesiąc
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = subMonths(thisMonth, 1);
    const thisMonthRev = quotes.filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= thisMonth).reduce((s, q) => s + q.totalBrutto, 0);
    const lastMonthRev = quotes.filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= lastMonth && new Date(q.createdAt) < thisMonth).reduce((s, q) => s + q.totalBrutto, 0);
    const revenueTrend = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

    const recentQuotes = quotes.slice(0, 5);

    // Sparkline data — wyceny per dzień (7 dni)
    const sparklineQuotes: number[] = [];
    const sparklineRevenue: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const dayQuotes = quotes.filter((q) => isSameDay(new Date(q.createdAt), day));
      sparklineQuotes.push(dayQuotes.length);
      sparklineRevenue.push(dayQuotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0));
    }

    return { quoteCount, acceptedCount, pendingCount, totalRevenue, conversionRate, avgQuoteValue, unpaidAmount, unpaidCount, expiredQuotes, revenueTrend, recentQuotes, sparklineQuotes, sparklineRevenue };
  }, [quotes, invoices]);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-4 md:space-y-5">

        {/* ── Header: Powitanie + Streak + Nowa wycena ── */}
        <StaggerItem>
          <div className="card-gauge rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <Greeting />
                <WorkStreak />
              </div>
              <Link href="/wyceny/nowa">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="btn-valve">
                    <Plus className="h-4 w-4" />
                    Nowa wycena
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </StaggerItem>

        {/* ── Active timer ── */}
        <StaggerItem>
          <ActiveTimerBar />
        </StaggerItem>

        {/* ── Separator hydrauliczny ── */}
        <StaggerItem>
          <PipeSeparator />
        </StaggerItem>

        {/* ── Pogoda + Notatki + Obciążenie ── */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <div className="glow-hover"><WeatherWidget /></div>
            <div className="glow-hover"><WorkloadIndicator /></div>
            <div className="glow-hover"><QuickNotes /></div>
          </div>
        </StaggerItem>

        {/* ── AI Insight + Quick Timer ── */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <AIInsight />
            <QuickTimer />
          </div>
        </StaggerItem>

        {/* ── Cel miesięczny + Quick actions ── */}
        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <MonthlyGoal />
            <QuickActions />
          </div>
        </StaggerItem>

        {/* ── KPI Cards ── */}
        <StaggerItem>
          <BoltRow>Statystyki</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { title: "Wyceny", value: quoteCount, icon: FileText, color: "from-blue-500 to-indigo-600", href: "/wyceny", sparkline: sparklineQuotes },
              { title: "Zaakceptowane", value: acceptedCount, icon: CheckCircle2, color: "from-green-500 to-emerald-600", href: "/wyceny", sparkline: undefined },
              { title: "Oczekujące", value: pendingCount, icon: Clock, color: "from-amber-500 to-orange-600", href: "/wyceny", sparkline: undefined },
              { title: "Konwersja", value: conversionRate, icon: TrendingUp, color: "from-violet-500 to-purple-600", href: "/raporty", suffix: "%", sparkline: undefined },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                >
                  <Link href={stat.href}>
                    <Card className="card-steel cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200 glow-hover">
                      <CardContent className="pt-4 p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl sm:text-2xl font-black">
                              <AnimatedCounter value={stat.value} duration={1.2} />{stat.suffix || ""}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.title}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            {stat.sparkline && <Sparkline data={stat.sparkline} height={18} width={48} />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </StaggerItem>

        {/* ── Przychód + Średnia + Trend ── */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Card className="card-gauge">
              <CardContent className="pt-4 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="pressure-indicator" />
                    Przychód łączny
                  </span>
                  <Sparkline data={sparklineRevenue} height={20} width={56} />
                </div>
                <div className="text-lg sm:text-xl font-black text-primary tabular-nums">{formatCurrency(totalRevenue)}</div>
                {revenueTrend !== 0 && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${revenueTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    <ArrowUpRight className={`h-3 w-3 ${revenueTrend < 0 ? "rotate-90" : ""}`} />
                    {revenueTrend > 0 ? "+" : ""}{revenueTrend}% vs poprzedni miesiąc
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Średnia wartość</div>
                <div className="text-lg sm:text-xl font-black tabular-nums">{formatCurrency(avgQuoteValue)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">zaakceptowanych wycen</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3 sm:p-4">
                <div className="text-xs text-muted-foreground mb-1">Baza</div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-lg font-black">{clientCount}</div>
                    <div className="text-[10px] text-muted-foreground">klientów</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">{serviceCount}</div>
                    <div className="text-[10px] text-muted-foreground">usług</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* ── Cash flow + Prognoza + Top usługi ── */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <div className="glow-hover"><CashFlow /></div>
            <div className="glow-hover"><RevenueForecast /></div>
            <div className="glow-hover"><TopServicesMonth /></div>
          </div>
        </StaggerItem>

        {/* ── Alerty: nieopłacone + wygasłe ── */}
        {(unpaidAmount > 0 || expiredQuotes.length > 0) && (
          <StaggerItem>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {unpaidAmount > 0 && (
                <Link href="/faktury">
                  <motion.div whileHover={{ y: -2 }}>
                    <Card className="card-modern border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer">
                      <CardContent className="pt-4 p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-lg font-black text-amber-700 dark:text-amber-300">{formatCurrency(unpaidAmount)}</div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">Nieopłacone faktury ({unpaidCount})</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              )}
              {expiredQuotes.length > 0 && (
                <Link href="/wyceny">
                  <motion.div whileHover={{ y: -2 }}>
                    <Card className="card-modern border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 cursor-pointer">
                      <CardContent className="pt-4 p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25 shrink-0">
                            <AlertCircle className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-red-700 dark:text-red-300">Wygasłe wyceny ({expiredQuotes.length})</div>
                            <div className="text-xs text-red-600 dark:text-red-400 truncate">{expiredQuotes.map((q) => q.number).join(", ")}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              )}
            </div>
          </StaggerItem>
        )}

        {/* ── Powiadomienia + Dzisiejszy harmonogram ── */}
        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <Suspense fallback={<div className="h-48 rounded-xl bg-muted/30 animate-pulse" />}>
              <NotificationsCenter />
            </Suspense>
            <Suspense fallback={<div className="h-48 rounded-xl bg-muted/30 animate-pulse" />}>
              <TodaySchedule />
            </Suspense>
          </div>
        </StaggerItem>

        {/* ── Wykresy ── */}
        <StaggerItem>
          <BoltRow>Analityka</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <Suspense fallback={<div className="h-64 rounded-xl bg-muted/30 animate-pulse" />}>
              <QuoteStatusBar />
            </Suspense>
            <Suspense fallback={<div className="h-64 rounded-xl bg-muted/30 animate-pulse" />}>
              <RevenueChart />
            </Suspense>
          </div>
        </StaggerItem>

        {/* ── Ostatnia aktywność + Ostatnie wyceny ── */}
        <StaggerItem>
          <BoltRow>Aktywność</BoltRow>
        </StaggerItem>
        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            <Suspense fallback={<div className="h-48 rounded-xl bg-muted/30 animate-pulse" />}>
              <RecentActivity />
            </Suspense>

            {/* Ostatnie wyceny — kompaktowa lista */}
            {recentQuotes.length > 0 && (
              <Card className="card-modern">
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Ostatnie wyceny</span>
                    <Link href="/wyceny" className="text-xs text-primary hover:underline">Wszystkie →</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="space-y-1.5">
                    {recentQuotes.map((q, i) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href={`/wyceny/${q.id}`}
                          className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              q.status === "zaakceptowana" ? "bg-emerald-500" :
                              q.status === "wyslana" ? "bg-blue-500" :
                              q.status === "odrzucona" ? "bg-red-500" : "bg-amber-500"
                            }`} />
                            <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{q.number}</span>
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">{q.clientName}</span>
                          </div>
                          <span className="text-sm font-bold shrink-0 ml-2">{formatCurrency(q.totalBrutto)}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </StaggerItem>

        {/* ── Flow indicator na dole ── */}
        <StaggerItem>
          <FlowIndicator active />
        </StaggerItem>

      </StaggerContainer>
    </PageTransition>
  );
}
