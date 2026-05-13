"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileText, Package, Users, Plus, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const serviceCount = useServiceStore((s) => s.services.length);
  const clientCount = useClientStore((s) => s.clients.length);
  const quoteCount = useQuoteStore((s) => s.quotes.length);
  const quotes = useQuoteStore((s) => s.quotes);
  const recentQuotes = useMemo(() => quotes.slice(0, 5), [quotes]);

  const acceptedCount = quotes.filter((q) => q.status === "zaakceptowana").length;
  const pendingCount = quotes.filter((q) => q.status === "wyslana").length;
  const totalRevenue = quotes
    .filter((q) => q.status === "zaakceptowana")
    .reduce((sum, q) => sum + q.totalBrutto, 0);

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
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Pulpit
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Przegląd Twojej działalności</p>
            </div>
            <Link href="/wyceny/nowa">
              <Button className="btn-primary w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Nowa wycena
              </Button>
            </Link>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Link href={stat.href}>
                    <Card className="card-modern overflow-hidden group cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <div className="text-xl sm:text-3xl font-bold tracking-tight">{stat.value}</div>
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
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{acceptedCount}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Zaakceptowane</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">{pendingCount}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Oczekujące</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern col-span-2 md:col-span-1">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">
                      {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalRevenue)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Przychód</div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  {recentQuotes.map((q) => (
                    <motion.div
                      key={q.id}
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <Link
                        href={`/wyceny/${q.id}`}
                        className="flex items-center justify-between rounded-xl border border-border/50 p-3 sm:p-4 hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-colors shrink-0">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm truncate">{q.number}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{q.clientName || "Brak klienta"}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
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