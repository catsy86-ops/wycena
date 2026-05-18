"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useTimeStore } from "@/store/time-store";
import { useScheduleStore } from "@/store/schedule-store";
import { STATUS_LABELS } from "@/types";
import type { ClientContactEntry, ClientVisitNote } from "@/types";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Mail, MapPin, FileText, Calendar, TrendingUp,
  Building2, Tag, Plus, ExternalLink, MessageSquare, Clock,
  Star, Shield, Download, Trash2, Award, BarChart3, PhoneCall,
  Send, Eye, Zap, CalendarDays, History, StickyNote, TrendingDown,
} from "lucide-react";
import { format, differenceInDays, formatDistanceToNow, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BoltRow, PipeProgress, HydraulicBadge, FlowIndicator } from "@/components/hydraulic-decorations";
import { exportClientData, deleteClientData } from "@/lib/backup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const TAG_COLORS = ["bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"];

const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  telefon: <PhoneCall className="h-3.5 w-3.5 text-blue-500" />,
  email: <Send className="h-3.5 w-3.5 text-emerald-500" />,
  wizyta: <Eye className="h-3.5 w-3.5 text-violet-500" />,
  sms: <MessageSquare className="h-3.5 w-3.5 text-amber-500" />,
  inne: <Zap className="h-3.5 w-3.5 text-gray-500" />,
};

const CONTACT_TYPE_LABELS: Record<string, string> = {
  telefon: "Telefon",
  email: "Email",
  wizyta: "Wizyta",
  sms: "SMS",
  inne: "Inne",
};

const SEGMENT_INFO: Record<string, { label: string; className: string; description: string }> = {
  vip: { label: "VIP", className: "text-amber-600 bg-amber-100 dark:bg-amber-900/40", description: "Przychód > 10 000 zł" },
  staly: { label: "Stały", className: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40", description: "≥ 3 wyceny" },
  nowy: { label: "Nowy", className: "text-blue-600 bg-blue-100 dark:bg-blue-900/40", description: "< 30 dni" },
  nieaktywny: { label: "Nieaktywny", className: "text-red-500 bg-red-100 dark:bg-red-900/40", description: "> 90 dni bez aktywności" },
  normal: { label: "Normalny", className: "text-gray-600 bg-gray-100 dark:bg-gray-800", description: "Standardowy klient" },
};

function getInitials(name: string) { return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase(); }
function getAvatarColor(name: string) {
  const colors = ["from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-emerald-500 to-green-600", "from-amber-500 to-orange-600", "from-pink-500 to-rose-600", "from-cyan-500 to-teal-600"];
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const clients = useClientStore((s) => s.clients);
  const updateClient = useClientStore((s) => s.update);
  const removeClient = useClientStore((s) => s.remove);
  const quotes = useQuoteStore((s) => s.quotes);
  const invoices = useInvoiceStore((s) => s.invoices);
  const timeEntries = useTimeStore((s) => s.entries);
  const events = useScheduleStore((s) => s.events);
  const [activeTab, setActiveTab] = useState("overview");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ type: "telefon" as ClientContactEntry["type"], summary: "", outcome: "" });
  const [visitForm, setVisitForm] = useState({ title: "", content: "" });

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);
  const clientQuotes = useMemo(() => quotes.filter((q) => q.clientId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [quotes, id]);
  const clientTime = useMemo(() => timeEntries.filter((e) => e.clientId === id), [timeEntries, id]);
  const clientEvents = useMemo(() => events.filter((e) => e.clientId === id), [events, id]);

  // ─── Statystyki i scoring ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalQuotes = clientQuotes.length;
    const accepted = clientQuotes.filter((q) => q.status === "zaakceptowana");
    const totalRevenue = accepted.reduce((s, q) => s + q.totalBrutto, 0);
    const conversionRate = totalQuotes > 0 ? round((accepted.length / totalQuotes) * 100) : 0;
    const avgValue = accepted.length > 0 ? round(totalRevenue / accepted.length) : 0;
    const lastQuoteDate = clientQuotes[0] ? new Date(clientQuotes[0].createdAt) : null;
    const daysSinceLastQuote = lastQuoteDate ? differenceInDays(new Date(), lastQuoteDate) : null;
    const totalHours = round(clientTime.reduce((s, e) => s + e.durationMinutes, 0) / 60);

    // Scoring (A/B/C/D)
    let score = 0;
    if (totalRevenue > 10000) score += 3; else if (totalRevenue > 3000) score += 2; else if (totalRevenue > 0) score += 1;
    if (conversionRate >= 70) score += 3; else if (conversionRate >= 40) score += 2; else if (conversionRate > 0) score += 1;
    if (totalQuotes >= 5) score += 2; else if (totalQuotes >= 2) score += 1;
    if (daysSinceLastQuote !== null && daysSinceLastQuote < 60) score += 1;

    let grade: "A" | "B" | "C" | "D";
    if (score >= 8) grade = "A"; else if (score >= 5) grade = "B"; else if (score >= 3) grade = "C"; else grade = "D";

    // Częstotliwość
    let avgDaysBetween: number | null = null;
    if (clientQuotes.length >= 2) {
      const dates = clientQuotes.map((q) => new Date(q.createdAt).getTime()).sort();
      const diffs = dates.slice(1).map((d, i) => d - dates[i]);
      avgDaysBetween = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length / 86400000);
    }

    return { totalQuotes, accepted: accepted.length, totalRevenue, conversionRate, avgValue, lastQuoteDate, daysSinceLastQuote, totalHours, grade, score, avgDaysBetween };
  }, [clientQuotes, clientTime]);

  // Wykres przychodu 12 miesięcy
  const revenueChartData = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthRevenue = clientQuotes
        .filter((q) => q.status === "zaakceptowana" && isWithinInterval(new Date(q.createdAt), { start: monthStart, end: monthEnd }))
        .reduce((sum, q) => sum + q.totalBrutto, 0);
      data.push({
        month: format(monthStart, "MMM", { locale: pl }),
        revenue: Math.round(monthRevenue),
      });
    }
    return data;
  }, [clientQuotes]);

  // Segmentacja
  const clientSegment = useMemo(() => {
    const now = new Date();
    if (!client) return "normal";
    const daysSinceCreated = Math.floor((now.getTime() - new Date(client.createdAt).getTime()) / 86400000);
    if (stats.totalRevenue > 10000) return "vip";
    if (stats.totalQuotes >= 3) return "staly";
    if (daysSinceCreated < 30) return "nowy";
    if (stats.daysSinceLastQuote === null || stats.daysSinceLastQuote > 90) return "nieaktywny";
    return "normal";
  }, [client, stats]);

  // Predykcja następnego zamówienia
  const nextOrderPrediction = useMemo(() => {
    if (!stats.avgDaysBetween || !stats.lastQuoteDate) return null;
    const nextDate = new Date(stats.lastQuoteDate.getTime() + stats.avgDaysBetween * 86400000);
    const daysUntil = differenceInDays(nextDate, new Date());
    return { date: nextDate, daysUntil, avgValue: stats.avgValue };
  }, [stats]);

  // Handlers for contact history
  function handleAddContact() {
    if (!contactForm.summary.trim()) { toast.error("Podaj opis kontaktu"); return; }
    const entry: ClientContactEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: contactForm.type,
      summary: contactForm.summary,
      outcome: contactForm.outcome || undefined,
    };
    const existing = client?.contactHistory || [];
    updateClient(id, { contactHistory: [entry, ...existing] });
    setContactForm({ type: "telefon", summary: "", outcome: "" });
    setContactDialogOpen(false);
    toast.success("Kontakt zapisany");
  }

  // Handlers for visit notes
  function handleAddVisit() {
    if (!visitForm.title.trim()) { toast.error("Podaj tytuł wizyty"); return; }
    const note: ClientVisitNote = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      title: visitForm.title,
      content: visitForm.content,
    };
    const existing = client?.visitNotes || [];
    updateClient(id, { visitNotes: [note, ...existing] });
    setVisitForm({ title: "", content: "" });
    setVisitDialogOpen(false);
    toast.success("Notatka z wizyty zapisana");
  }

  if (!client) {
    return (<PageTransition><div className="flex flex-col items-center justify-center py-20 space-y-4"><p className="text-muted-foreground">Klient nie znaleziony</p><Button variant="outline" onClick={() => router.push("/klienci")}>Wróć</Button></div></PageTransition>);
  }

  const tags = client.tags ? client.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const gradeColors = { A: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40", B: "text-blue-600 bg-blue-100 dark:bg-blue-900/40", C: "text-amber-600 bg-amber-100 dark:bg-amber-900/40", D: "text-red-500 bg-red-100 dark:bg-red-900/40" };
  const segmentInfo = SEGMENT_INFO[clientSegment];

  async function handleExportData() {
    const data = await exportClientData(id);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `klient-${client!.name.replace(/\s/g, "-")}-dane.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Dane klienta wyeksportowane (RODO)");
  }

  async function handleDeleteData() {
    const result = await deleteClientData(id);
    toast.success(`Usunięto ${result.deleted} rekordów klienta`);
    router.push("/klienci");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <StaggerItem>
          <div className="card-gauge rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="btn-ghost shrink-0" onClick={() => router.push("/klienci")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(client.name)} text-white text-lg font-bold shrink-0 shadow-lg`}>
                  {getInitials(client.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">{client.name}</h1>
                    <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-bold ${gradeColors[stats.grade]}`}>
                      <Award className="h-3 w-3" />{stats.grade}
                    </span>
                    {segmentInfo && (
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${segmentInfo.className}`} title={segmentInfo.description}>
                        {segmentInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {tags.map((tag, i) => (
                      <Badge key={i} className={`text-[10px] px-1.5 py-0 ${TAG_COLORS[i % TAG_COLORS.length]}`}>{tag}</Badge>
                    ))}
                    {stats.daysSinceLastQuote !== null && stats.daysSinceLastQuote > 90 && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">Nieaktywny</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <a href={`tel:${client.phone}`}><Button variant="outline" size="sm" className="btn-secondary"><Phone className="h-4 w-4" /></Button></a>
                {client.email && <a href={`mailto:${client.email}`}><Button variant="outline" size="sm" className="btn-secondary"><Mail className="h-4 w-4" /></Button></a>}
                <Link href="/wyceny/nowa"><Button size="sm" className="btn-primary"><Plus className="h-4 w-4" />Wycena</Button></Link>
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* KPI */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Wyceny</div>
              <div className="text-xl font-black">{stats.totalQuotes}</div>
              <div className="text-[10px] text-muted-foreground">{stats.accepted} zaakceptowanych</div>
            </CardContent></Card>
            <Card className="card-gauge"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Przychód (LTV)</div>
              <div className="text-lg font-black text-primary tabular-nums">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Konwersja</div>
              <div className="text-xl font-black">{stats.conversionRate}%</div>
              <PipeProgress percent={stats.conversionRate} className="mt-1" />
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Śr. wartość</div>
              <div className="text-lg font-black tabular-nums">{formatCurrency(stats.avgValue)}</div>
            </CardContent></Card>
            <Card className="card-steel"><CardContent className="pt-4 p-3">
              <div className="text-xs text-muted-foreground">Częstotliwość</div>
              <div className="text-lg font-black">{stats.avgDaysBetween ? `co ${stats.avgDaysBetween} dni` : "—"}</div>
              {stats.totalHours > 0 && <div className="text-[10px] text-muted-foreground">{stats.totalHours}h pracy</div>}
            </CardContent></Card>
          </div>
        </StaggerItem>

        {/* Tabs */}
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Dane</TabsTrigger>
              <TabsTrigger value="quotes">Wyceny ({stats.totalQuotes})</TabsTrigger>
              <TabsTrigger value="revenue">Przychód</TabsTrigger>
              <TabsTrigger value="contacts">Kontakty</TabsTrigger>
              <TabsTrigger value="visits">Wizyty</TabsTrigger>
              <TabsTrigger value="settings">RODO</TabsTrigger>
            </TabsList>

            {/* ── Dane kontaktowe ── */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Kontakt</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-blue-500 shrink-0" /><a href={`tel:${client.phone}`} className="hover:text-primary transition-colors">{client.phone}</a></div>
                    {client.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4 shrink-0" /><a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a></div>}
                    {client.address && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0" /><span className="text-muted-foreground">{client.address}</span></div>}
                    {client.nip && <div className="flex items-center gap-3"><Building2 className="h-4 w-4 shrink-0" /><span className="font-mono text-xs">NIP: {client.nip}</span></div>}
                    <Separator />
                    <div className="text-xs text-muted-foreground">Klient od: {format(new Date(client.createdAt), "dd.MM.yyyy", { locale: pl })}</div>
                  </CardContent>
                </Card>

                {nextOrderPrediction && (
                  <Card className="card-gauge">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Predykcja zamówienia</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Następne zamówienie</span>
                        <span className="font-bold text-sm">
                          {nextOrderPrediction.daysUntil > 0
                            ? `za ~${nextOrderPrediction.daysUntil} dni`
                            : <span className="text-amber-600">Spóźnione o {Math.abs(nextOrderPrediction.daysUntil)} dni</span>
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Przewidywana data</span>
                        <span className="text-sm font-medium">{format(nextOrderPrediction.date, "dd.MM.yyyy", { locale: pl })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Śr. wartość</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(nextOrderPrediction.avgValue)}</span>
                      </div>
                      <FlowIndicator active />
                      <p className="text-[10px] text-muted-foreground">Na podstawie interwału {stats.avgDaysBetween} dni</p>
                    </CardContent>
                  </Card>
                )}

                {client.notes && (
                  <Card className="card-modern">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />Notatki</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p></CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ── Wyceny ── */}
            <TabsContent value="quotes" className="mt-4">
              <Card className="card-steel">
                <CardContent className="p-0">
                  {clientQuotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Brak wycen</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="table-header-industrial"><TableRow>
                          <TableHead>Numer</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Brutto</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {clientQuotes.map((q) => (
                            <TableRow key={q.id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/wyceny/${q.id}`)}>
                              <TableCell className="font-semibold text-sm">{q.number}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</TableCell>
                              <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[q.status]}`}>{STATUS_LABELS[q.status]}</Badge></TableCell>
                              <TableCell className="text-right font-bold text-primary text-sm tabular-nums">{formatCurrency(q.totalBrutto)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Przychód (wykres) ── */}
            <TabsContent value="revenue" className="mt-4 space-y-4">
              <Card className="card-steel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Przychód — ostatnie 12 miesięcy</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueChartData.some((d) => d.revenue > 0) ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Przychód"]} contentStyle={{ borderRadius: 8 }} />
                          <Bar dataKey="revenue" fill="oklch(0.55 0.19 220)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Brak danych o przychodzie</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="card-modern"><CardContent className="pt-3 p-3">
                  <div className="text-[10px] text-muted-foreground">Łączny przychód</div>
                  <div className="text-lg font-black text-primary tabular-nums">{formatCurrency(stats.totalRevenue)}</div>
                </CardContent></Card>
                <Card className="card-modern"><CardContent className="pt-3 p-3">
                  <div className="text-[10px] text-muted-foreground">Śr. miesięcznie</div>
                  <div className="text-lg font-black tabular-nums">{formatCurrency(Math.round(stats.totalRevenue / 12))}</div>
                </CardContent></Card>
                <Card className="card-modern"><CardContent className="pt-3 p-3">
                  <div className="text-[10px] text-muted-foreground">Śr. wycena</div>
                  <div className="text-lg font-black tabular-nums">{formatCurrency(stats.avgValue)}</div>
                </CardContent></Card>
                <Card className="card-modern"><CardContent className="pt-3 p-3">
                  <div className="text-[10px] text-muted-foreground">Konwersja</div>
                  <div className="text-lg font-black">{stats.conversionRate}%</div>
                  <PipeProgress percent={stats.conversionRate} className="mt-1" />
                </CardContent></Card>
              </div>
            </TabsContent>

            {/* ── Historia kontaktów ── */}
            <TabsContent value="contacts" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2"><History className="h-4 w-4 text-primary" />Historia kontaktów</h3>
                <Button size="sm" className="btn-primary h-8" onClick={() => setContactDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />Dodaj kontakt
                </Button>
              </div>
              {(!client.contactHistory || client.contactHistory.length === 0) ? (
                <Card className="card-modern">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Brak historii kontaktów</p>
                    <p className="text-xs mt-1">Dodaj wpis, aby śledzić komunikację</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {client.contactHistory.map((entry) => (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="mt-0.5">{CONTACT_TYPE_ICONS[entry.type]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <HydraulicBadge>{CONTACT_TYPE_LABELS[entry.type]}</HydraulicBadge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(entry.date), "dd.MM.yyyy HH:mm", { locale: pl })}</span>
                        </div>
                        <p className="text-sm mt-1">{entry.summary}</p>
                        {entry.outcome && <p className="text-xs text-muted-foreground mt-0.5">Wynik: {entry.outcome}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive/50 hover:text-destructive" onClick={() => { updateClient(id, { contactHistory: (client.contactHistory || []).filter((e) => e.id !== entry.id) }); toast.success("Usunięto"); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Notatki z wizyt ── */}
            <TabsContent value="visits" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" />Notatki z wizyt</h3>
                <Button size="sm" className="btn-primary h-8" onClick={() => setVisitDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />Dodaj notatkę
                </Button>
              </div>
              {(!client.visitNotes || client.visitNotes.length === 0) ? (
                <Card className="card-modern">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Brak notatek z wizyt</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {client.visitNotes.map((note) => (
                    <Card key={note.id} className="card-modern">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{note.title}</h4>
                              <span className="text-[10px] text-muted-foreground">{format(new Date(note.date), "dd.MM.yyyy", { locale: pl })}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.content}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive/50 hover:text-destructive" onClick={() => { updateClient(id, { visitNotes: (client.visitNotes || []).filter((n) => n.id !== note.id) }); toast.success("Usunięto"); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── RODO ── */}
            <TabsContent value="settings" className="mt-4 space-y-4">
              <Card className="card-modern">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Ochrona danych (RODO)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Zgodnie z RODO, klient ma prawo do eksportu i usunięcia swoich danych.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="btn-secondary flex-1" onClick={handleExportData}>
                      <Download className="h-4 w-4" />Eksportuj dane klienta (JSON)
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />Usuń wszystkie dane klienta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usuń dane klienta (RODO)</AlertDialogTitle>
                          <AlertDialogDescription>
                            Zostaną usunięte: dane klienta, wszystkie wyceny, faktury, wpisy czasu i wydarzenia. Tej operacji nie można cofnąć.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteData} className="bg-destructive text-white hover:bg-destructive/90">Usuń bezpowrotnie</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>

        {/* Dialog — dodaj kontakt */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nowy kontakt</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Typ kontaktu</Label>
                <Select value={contactForm.type} onValueChange={(v) => setContactForm({ ...contactForm, type: v as ClientContactEntry["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telefon">Telefon</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="wizyta">Wizyta</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="inne">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Opis</Label>
                <textarea value={contactForm.summary} onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" placeholder="O czym rozmawialiście..." />
              </div>
              <div className="grid gap-2">
                <Label>Wynik (opcjonalnie)</Label>
                <Input value={contactForm.outcome} onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })} placeholder="np. Umówiono wizytę" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
              <Button className="btn-primary" onClick={handleAddContact}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog — dodaj notatkę z wizyty */}
        <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nowa notatka z wizyty</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tytuł</Label>
                <Input value={visitForm.title} onChange={(e) => setVisitForm({ ...visitForm, title: e.target.value })} placeholder="np. Przegląd instalacji" />
              </div>
              <div className="grid gap-2">
                <Label>Treść</Label>
                <textarea value={visitForm.content} onChange={(e) => setVisitForm({ ...visitForm, content: e.target.value })} className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" placeholder="Szczegóły wizyty..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose><Button variant="outline">Anuluj</Button></DialogClose>
              <Button className="btn-primary" onClick={handleAddVisit}>Zapisz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StaggerContainer>
    </PageTransition>
  );
}
