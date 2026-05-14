"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileText, Package, Users, Plus, TrendingUp, Clock, CheckCircle2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { LiveClock } from "@/components/dashboard/live-clock";
import { ActiveTimerBar } from "@/components/dashboard/active-timer-bar";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LowStockAlert } from "@/components/dashboard/low-stock-alert";
import { QuoteStatusBar } from "@/components/dashboard/quote-status-bar";
import { TopClients } from "@/components/dashboard/top-clients";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export default function DashboardPage() {
  const serviceCount = useServiceStore((s) => s.services.length);
  const clientCount = useClientStore((s) => s.clients.length);
  const quoteCount = useQuoteStore((s) => s.quotes.length);
  const quotes = useQuoteStore((s) => s.quotes);
  const recentQuotes = useMemo(() => quotes.slice(0, 5), [quotes]);

  const invoices = useInvoiceStore((s) => s.invoices);

  const acceptedCount = quotes.filter((q) => q.status === "zaakceptowana").length;
  const pendingCount = quotes.filter((q) => q.status === "wyslana").length;
  const totalRevenue = quotes
    .filter((q) => q.status === "zaakceptowana")
    .reduce((sum, q) => sum + q.totalBrutto, 0);
  const conversionRate = quoteCount > 0 ? Math.round((acceptedCount / quoteCount) * 100) : 0;
  const avgQuoteValue = acceptedCount > 0 ? totalRevenue / acceptedCount : 0;
  const unpaidInvoices = invoices.filter((i) => i.status === "niezaplacona" || i.status === "czesciowo");
  const unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + i.totalBrutto, 0);

  const stats = [
    {
      title: "Usługi",
      value: serviceCount,
      icon: Package,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/25",
      href: "/uslugi",
      label: "Zarządzaj usługami",
    },
    {
      title: "Klienci",
      value: clientCount,
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
      shadow: "shadow-indigo-500/25",
      href: "/klienci",
      label: "Zarządzaj klientami",
    },
    {
      title: "Wyceny",
      value: quoteCount,
      icon: FileText,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-500/25",
      href: "/wyceny",
      label: "Przeglądaj wyceny",
    },
  ];

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5 md:space-y-6">
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Pulpit
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Przegląd Twojej działalności</p>
            </div>
            <Link href="/wyceny/nowa">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-primary w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Nowa wycena
                </Button>
              </motion.div>
            </Link>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="card-modern rounded-xl p-3 sm:p-4">
            <LiveClock />
          </div>
        </StaggerItem>

        <StaggerItem>
          <ActiveTimerBar />
        </StaggerItem>

        <StaggerItem>
          <QuickActions />
        </StaggerItem>

        <StaggerItem>
          <LowStockAlert />
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={stat.href}>
                    <Card className="card-modern overflow-hidden group cursor-pointer relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4 relative z-10">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <motion.div
                          className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg`}
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </motion.div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 relative z-10">
                        <div className="text-xl sm:text-3xl font-bold tracking-tight">
                          <AnimatedCounter value={stat.value} duration={1.5} />
                        </div>
                        <p className="text-[10px] sm:text-xs text-primary mt-1 sm:mt-2 group-hover:underline">{stat.label}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="card-modern">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold">
                        <AnimatedCounter value={acceptedCount} duration={1.2} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Zaakceptowane</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="card-modern">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold">
                        <AnimatedCounter value={pendingCount} duration={1.2} />
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Oczekujące</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/raporty">
                <Card className="card-modern cursor-pointer">
                  <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold">{conversionRate}%</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">Konwersja</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card className="card-modern">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 shrink-0">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-bold">
                        {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(avgQuoteValue)}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Śr. wartość</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </StaggerItem>

        {unpaidAmount > 0 && (
          <StaggerItem>
            <Link href="/faktury">
              <motion.div whileHover={{ y: -4, scale: 1.01 }}>
                <Card className="card-modern border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer">
                  <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-300">
                          {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(unpaidAmount)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">Nieopłacone faktury ({unpaidInvoices.length})</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <QuoteStatusBar />
            <RevenueChart />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <TopClients />
            <UpcomingEvents />
          </div>
        </StaggerItem>

        {recentQuotes.length > 0 && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-base sm:text-lg">Ostatnie wyceny</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {recentQuotes.map((q, index) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 8, scale: 1.01 }}
                    >
                      <Link
                        href={`/wyceny/${q.id}`}
                        className="flex items-center justify-between rounded-xl border border-border/50 p-3 sm:p-4 hover:bg-accent/50 transition-all duration-300 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 relative z-10">
                          <motion.div
                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-colors shrink-0"
                            whileHover={{ rotate: 5, scale: 1.1 }}
                          >
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm truncate">{q.number}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{q.clientName || "Brak klienta"}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2 relative z-10">
                          <div className="font-bold text-xs sm:text-sm">
                            {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(q.totalBrutto)}
                          </div>
                          <span className={`text-[10px] sm:text-xs ${getStatusColor(q.status)}`}>
                            {getStatusText(q.status)}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}
      </StaggerContainer>
    </PageTransition>
  );
}

function getStatusText(status: string) {
  const map: Record<string, string> = { szkic: "Szkic", wyslana: "Wysłana", zaakceptowana: "Zaakceptowana", odrzucona: "Odrzucona" };
  return map[status] || status;
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    szkic: "text-amber-600 dark:text-amber-400",
    wyslana: "text-blue-600 dark:text-blue-400",
    zaakceptowana: "text-green-600 dark:text-green-400",
    odrzucona: "text-red-600 dark:text-red-400",
  };
  return map[status] || "";
}
