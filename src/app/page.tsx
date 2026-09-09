"use client";

import Link from "next/link";
import { useMemo, lazy, Suspense } from "react";
import {
  FileText, Plus, TrendingUp, Clock,
  CheckCircle2, ArrowUpRight, Droplets, Zap, ShieldCheck,
  ChevronRight, Users, Wrench, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { formatCurrency } from "@/lib/calculations";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { Greeting } from "@/components/dashboard/greeting";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Sparkline } from "@/components/dashboard/sparkline";
import { subMonths, subDays, startOfDay, isSameDay } from "date-fns";
import { sounds } from "@/lib/audio";

// Lazy load widżety wspierające
const TodaySchedule = lazy(() => import("@/components/dashboard/today-schedule").then((m) => ({ default: m.TodaySchedule })));
const RecentActivity = lazy(() => import("@/components/dashboard/recent-activity").then((m) => ({ default: m.RecentActivity })));
const NotificationsCenter = lazy(() => import("@/components/dashboard/notifications-center").then((m) => ({ default: m.NotificationsCenter })));
const AIInsight = lazy(() => import("@/components/dashboard/ai-insight").then((m) => ({ default: m.AIInsight })));

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

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = subMonths(thisMonth, 1);
    const thisMonthRev = quotes.filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= thisMonth).reduce((s, q) => s + q.totalBrutto, 0);
    const lastMonthRev = quotes.filter((q) => q.status === "zaakceptowana" && new Date(q.createdAt) >= lastMonth && new Date(q.createdAt) < thisMonth).reduce((s, q) => s + q.totalBrutto, 0);
    const revenueTrend = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

    const recentQuotes = quotes.slice(0, 5);

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
      <StaggerContainer className="space-y-5 max-w-6xl mx-auto pb-10">

        {/* ── 1. Czysty, nowoczesny Hero Header z podświetleniem ── */}
        <StaggerItem>
          <div className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-700/60 shadow-xl">
            {/* Ozdobny akcent świetlny */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <Greeting />
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                System szybkich wycen i protokołów dla instalatorów
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto relative z-10">
              <Link href="/hydraulika" className="flex-1 sm:flex-initial" onClick={() => sounds.playClick(900)}>
                <Button className="w-full btn-glow-cyan text-white font-bold gap-1.5 shadow-md text-xs sm:text-sm h-10 px-4">
                  <Droplets className="h-4 w-4" />
                  Hydraulika
                </Button>
              </Link>

              <Link href="/elektryka" className="flex-1 sm:flex-initial" onClick={() => sounds.playClick(1050)}>
                <Button className="w-full btn-glow-amber text-slate-950 font-black gap-1.5 shadow-md text-xs sm:text-sm h-10 px-4">
                  <Zap className="h-4 w-4 fill-current" />
                  Elektryka
                </Button>
              </Link>

              <Link href="/wyceny/nowa" className="flex-1 sm:flex-initial" onClick={() => sounds.playSuccess()}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 shadow-md text-xs sm:text-sm h-10 px-4 active:scale-95 transition-transform">
                  <Plus className="h-4 w-4" />
                  Nowa wycena
                </Button>
              </Link>
            </div>
          </div>
        </StaggerItem>

        {/* ── 2. Skróty najważniejszych operacji ── */}
        <StaggerItem>
          <QuickActions />
        </StaggerItem>

        {/* ── 3. Kluczowe wskaźniki (Zredukowane do 4 czytelnych kart) ── */}
        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Link href="/wyceny" onClick={() => sounds.playClick(800)}>
              <Card className="card-wow hover:border-primary/50 transition-all cursor-pointer h-full border border-border/80 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-xs font-semibold">Wszystkie wyceny</span>
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black font-mono">{quoteCount}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{acceptedCount}</span> zaakceptowane
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/wyceny?status=wyslana" onClick={() => sounds.playClick(850)}>
              <Card className="card-wow hover:border-primary/50 transition-all cursor-pointer h-full border border-border/80 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-xs font-semibold">Oczekujące na decyzję</span>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Wysłane do klienta
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="card-wow h-full border border-border/80 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-semibold">Przychód (zaakceptowane)</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-primary font-mono tabular-nums">
                  {formatCurrency(totalRevenue)}
                </div>
                {revenueTrend !== 0 && (
                  <div className={`text-[11px] font-semibold mt-1 flex items-center gap-0.5 ${revenueTrend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    <ArrowUpRight className={`h-3 w-3 ${revenueTrend < 0 ? "rotate-90" : ""}`} />
                    {revenueTrend > 0 ? "+" : ""}{revenueTrend}% vs ub. miesiąc
                  </div>
                )}
              </CardContent>
            </Card>

            <Link href="/faktury" onClick={() => sounds.playClick(900)}>
              <Card className="card-wow hover:border-primary/50 transition-all cursor-pointer h-full border border-border/80 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-xs font-semibold">Do rozliczenia</span>
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${unpaidAmount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {formatCurrency(unpaidAmount)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {unpaidCount > 0 ? `${unpaidCount} nieopłaconych faktur` : "Wszystko opłacone"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </StaggerItem>

        {/* ── 4. Alerty (Tylko jeśli są istotne) ── */}
        {(unpaidAmount > 0 || expiredQuotes.length > 0) && (
          <StaggerItem>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {unpaidAmount > 0 && (
                <Link href="/faktury">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 transition-colors">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">Nieopłacone faktury:</span> {formatCurrency(unpaidAmount)} ({unpaidCount} dokumentów). Kliknij, aby przejść do windykacji.
                    </div>
                  </div>
                </Link>
              )}
              {expiredQuotes.length > 0 && (
                <Link href="/wyceny">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-red-900 dark:text-red-200 hover:bg-red-100/50 transition-colors">
                    <Clock className="h-5 w-5 text-red-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">Wygasłe oferty ({expiredQuotes.length}):</span> {expiredQuotes.map(q => q.number).join(", ")}. Skontaktuj się z klientem.
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </StaggerItem>
        )}

        {/* ── 5. Główna sekcja: Ostatnie wyceny + Podpowiedzi / Harmonogram ── */}
        <StaggerItem>
          <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
            {/* Lewa kolumna (2/3): Ostatnie wyceny z szybkimi akcjami */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Ostatnie wyceny
                </h2>
                <Link href="/wyceny" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  Zobacz wszystkie ({quoteCount})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recentQuotes.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  Brak utworzonych wycen. Kliknij "Nowa wycena" powyżej, aby zacząć!
                </Card>
              ) : (
                <div className="grid gap-2">
                  {recentQuotes.map((q) => (
                    <Card key={q.id} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                        <Link href={`/wyceny/${q.id}`} className="min-w-0 flex-1 group">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold group-hover:text-primary transition-colors">
                              {q.number}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                q.status === "zaakceptowana" ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" :
                                q.status === "wyslana" ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/40" :
                                q.status === "odrzucona" ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/40" :
                                "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                              }`}
                            >
                              {q.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {q.clientName || "Brak klienta"} · {q.items.length} pozycji
                          </div>
                        </Link>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-foreground tabular-nums">
                            {formatCurrency(q.totalBrutto)}
                          </div>
                          <Link href={`/wyceny/${q.id}`} className="text-[11px] text-primary hover:underline">
                            Szczegóły →
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Prawa kolumna (1/3): Asystent zadań / Szybki harmonogram ── */}
            <div className="space-y-4">
              <Suspense fallback={<div className="h-40 rounded-xl bg-muted/30 animate-pulse" />}>
                <AIInsight />
              </Suspense>

              <Suspense fallback={<div className="h-48 rounded-xl bg-muted/30 animate-pulse" />}>
                <TodaySchedule />
              </Suspense>

              {/* Box narzędziowy */}
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/60 border-dashed">
                <CardContent className="p-4 text-xs space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" />
                    Protokoły odbiorcze w terenie
                  </div>
                  <p className="text-muted-foreground">
                    Twórz na bieżąco protokoły prób ciśnieniowych (hydraulika) oraz pomiarów rezystancji izolacji (elektryka) bezpośrednio ze smartfona.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Link href="/hydraulika" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-[11px] h-7 border-cyan-300">
                        Próba szczelności
                      </Button>
                    </Link>
                    <Link href="/elektryka/protokoly" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-[11px] h-7 border-amber-300">
                        Protokół SEP
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </StaggerItem>

      </StaggerContainer>
    </PageTransition>
  );
}
