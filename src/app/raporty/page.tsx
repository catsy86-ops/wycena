"use client";

import { useMemo } from "react";
import { useQuoteStore } from "@/store/quote-store";
import { useClientStore } from "@/store/client-store";
import { useServiceStore } from "@/store/service-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, TrendingUp, Users, Package, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function RaportyPage() {
  const quotes = useQuoteStore((s) => s.quotes);
  const clients = useClientStore((s) => s.clients);
  const services = useServiceStore((s) => s.services);
  const invoices = useInvoiceStore((s) => s.invoices);

  const stats = useMemo(() => {
    const totalQuotes = quotes.length;
    const acceptedQuotes = quotes.filter((q) => q.status === "zaakceptowana").length;
    const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
    const totalRevenue = quotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0);
    const avgQuoteValue = totalQuotes > 0 ? totalRevenue / acceptedQuotes : 0;
    const pendingQuotes = quotes.filter((q) => q.status === "wyslana").length;
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === "zaplacona").length;
    const unpaidAmount = invoices.filter((i) => i.status !== "zaplacona" && i.status !== "anulowana").reduce((s, i) => s + i.totalBrutto, 0);

    return {
      totalQuotes,
      acceptedQuotes,
      conversionRate,
      totalRevenue,
      avgQuoteValue,
      pendingQuotes,
      totalInvoices,
      paidInvoices,
      unpaidAmount,
    };
  }, [quotes, invoices]);

  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      const date = new Date(q.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + q.totalBrutto;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({
        month: month.slice(5) === "01" ? `Sty ${month.slice(0, 4)}` :
          month.slice(5) === "02" ? `Lut ${month.slice(0, 4)}` :
          month.slice(5) === "03" ? `Mar ${month.slice(0, 4)}` :
          month.slice(5) === "04" ? `Kwi ${month.slice(0, 4)}` :
          month.slice(5) === "05" ? `Maj ${month.slice(0, 4)}` :
          month.slice(5) === "06" ? `Cze ${month.slice(0, 4)}` :
          month.slice(5) === "07" ? `Lip ${month.slice(0, 4)}` :
          month.slice(5) === "08" ? `Sie ${month.slice(0, 4)}` :
          month.slice(5) === "09" ? `Wrz ${month.slice(0, 4)}` :
          month.slice(5) === "10" ? `Paz ${month.slice(0, 4)}` :
          month.slice(5) === "11" ? `Lis ${month.slice(0, 4)}` :
          `Gru ${month.slice(0, 4)}`,
        revenue,
      }));
  }, [quotes]);

  const clientRevenue = useMemo(() => {
    const revenue: Record<string, number> = {};
    quotes.filter((q) => q.status === "zaakceptowana").forEach((q) => {
      revenue[q.clientName] = (revenue[q.clientName] || 0) + q.totalBrutto;
    });
    return Object.entries(revenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [quotes]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    quotes.forEach((q) => {
      counts[q.status] = (counts[q.status] || 0) + 1;
    });
    const labels: Record<string, string> = { szkic: "Szkic", wyslana: "Wysłana", zaakceptowana: "Zaakceptowana", odrzucona: "Odrzucona" };
    return Object.entries(counts).map(([name, value]) => ({ name: labels[name] || name, value }));
  }, [quotes]);

  const serviceUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    quotes.forEach((q) => {
      q.items.forEach((item) => {
        usage[item.name] = (usage[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 25) + "..." : name, count }));
  }, [quotes]);

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <div>
            <motion.h1
              className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              Raporty i analityka
            </motion.h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Podsumowanie działalności i trendy</p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold"><AnimatedCounter value={stats.totalQuotes} /></div>
                    <div className="text-xs text-muted-foreground">Wyceny łącznie</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                    <div className="text-xs text-muted-foreground">Konwersja</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 shrink-0">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{formatCurrency(stats.avgQuoteValue)}</div>
                    <div className="text-xs text-muted-foreground">Śr. wartość</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold"><AnimatedCounter value={stats.pendingQuotes} /></div>
                    <div className="text-xs text-muted-foreground">Oczekujące</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Przychód miesięczny</CardTitle>
                <CardDescription>Przychód z zaakceptowanych wycen</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyRevenue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Brak danych</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Najlepsi klienci</CardTitle>
                <CardDescription>Według przychodu z zaakceptowanych wycen</CardDescription>
              </CardHeader>
              <CardContent>
                {clientRevenue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Brak danych</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={clientRevenue}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {clientRevenue.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Status wycen</CardTitle>
                <CardDescription>Podział według statusu</CardDescription>
              </CardHeader>
              <CardContent>
                {statusDistribution.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Brak danych</div>
                ) : (
                  <div className="space-y-3">
                    {statusDistribution.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Najpopularniejsze usługi</CardTitle>
                <CardDescription>Według ilości użycia</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceUsage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Brak danych</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold"><AnimatedCounter value={stats.paidInvoices} /></div>
                    <div className="text-xs text-muted-foreground">Opłacone faktury</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(stats.unpaidAmount)}</div>
                    <div className="text-xs text-muted-foreground">Nieopłacone</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-modern">
              <CardContent className="pt-6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold"><AnimatedCounter value={clients.length} /></div>
                    <div className="text-xs text-muted-foreground">Klienci</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}
