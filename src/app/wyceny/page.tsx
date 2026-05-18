"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
import { useServiceStore } from "@/store/service-store";
import { useClientStore } from "@/store/client-store";
import { STATUS_LABELS, UNIT_LABELS, type QuoteStatus } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, MoreHorizontal, Copy, FileText, Send, Check, X, Eye,
  ChevronUp, ChevronDown, Calendar, Download, Kanban, List, Brain,
  Lightbulb, TrendingUp, ArrowRight, Sparkles, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const KANBAN_COLUMNS: { status: QuoteStatus; label: string; color: string; borderColor: string }[] = [
  { status: "szkic", label: "Szkic", color: "bg-amber-50 dark:bg-amber-950/20", borderColor: "border-t-amber-500" },
  { status: "wyslana", label: "Wysłana", color: "bg-blue-50 dark:bg-blue-950/20", borderColor: "border-t-blue-500" },
  { status: "zaakceptowana", label: "Zaakceptowana", color: "bg-green-50 dark:bg-green-950/20", borderColor: "border-t-green-500" },
  { status: "odrzucona", label: "Odrzucona", color: "bg-red-50 dark:bg-red-950/20", borderColor: "border-t-red-500" },
];

type SortKey = "number" | "clientName" | "createdAt" | "status" | "totalNetto" | "totalBrutto";
type SortDir = "asc" | "desc";

export default function WycenyPage() {
  const router = useRouter();
  const quotes = useQuoteStore((s) => s.quotes);
  const loading = useQuoteStore((s) => s.loading);
  const search = useQuoteStore((s) => s.search);
  const statusFilter = useQuoteStore((s) => s.statusFilter);
  const setSearch = useQuoteStore((s) => s.setSearch);
  const setStatusFilter = useQuoteStore((s) => s.setStatusFilter);
  const remove = useQuoteStore((s) => s.remove);
  const changeStatus = useQuoteStore((s) => s.changeStatus);
  const duplicate = useQuoteStore((s) => s.duplicate);
  const services = useServiceStore((s) => s.services);
  const clients = useClientStore((s) => s.clients);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewQuote, setPreviewQuote] = useState<typeof quotes[0] | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "ai">("list");
  const [draggedQuoteId, setDraggedQuoteId] = useState<number | null>(null);

  // ─── Sorting ───────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ─── Filtering ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = quotes.filter((q) => {
      const matchesSearch = q.number.toLowerCase().includes(search.toLowerCase()) || q.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      let matchesDate = true;
      if (dateFrom) matchesDate = matchesDate && new Date(q.createdAt) >= new Date(dateFrom);
      if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); matchesDate = matchesDate && new Date(q.createdAt) <= to; }
      let matchesAmount = true;
      if (amountMin) matchesAmount = matchesAmount && q.totalBrutto >= parseFloat(amountMin);
      if (amountMax) matchesAmount = matchesAmount && q.totalBrutto <= parseFloat(amountMax);
      return matchesSearch && matchesStatus && matchesDate && matchesAmount;
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "number": cmp = a.number.localeCompare(b.number); break;
        case "clientName": cmp = a.clientName.localeCompare(b.clientName); break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "totalNetto": cmp = a.totalNetto - b.totalNetto; break;
        case "totalBrutto": cmp = a.totalBrutto - b.totalBrutto; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [quotes, search, statusFilter, dateFrom, dateTo, sortKey, sortDir, amountMin, amountMax]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedQuotes = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // ─── AI Suggestions ────────────────────────────────────────────────────
  const aiSuggestions = useMemo(() => {
    const suggestions: { type: string; title: string; description: string; action?: () => void }[] = [];
    // Stale drafts
    const staleDrafts = quotes.filter((q) => q.status === "szkic" && new Date(q.updatedAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (staleDrafts.length > 0) suggestions.push({ type: "warning", title: `${staleDrafts.length} szkiców starszych niż 7 dni`, description: "Rozważ wysłanie lub usunięcie nieaktualnych szkiców" });
    // High value pending
    const highValue = quotes.filter((q) => q.status === "wyslana" && q.totalBrutto > 5000);
    if (highValue.length > 0) suggestions.push({ type: "opportunity", title: `${highValue.length} wysłanych wycen powyżej 5000 zł`, description: "Skontaktuj się z klientami — follow-up zwiększa konwersję o 30%" });
    // Conversion rate
    const total = quotes.length;
    const accepted = quotes.filter((q) => q.status === "zaakceptowana").length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    if (rate < 40 && total > 5) suggestions.push({ type: "insight", title: `Konwersja: ${rate}% (poniżej 40%)`, description: "Rozważ obniżenie cen lub dodanie wariantów ekonomicznych" });
    // Popular services not used recently
    const topServices = services.slice(0, 3);
    if (topServices.length > 0 && quotes.length > 0) {
      const recentItems = quotes.slice(0, 10).flatMap((q) => q.items.map((i) => i.name.toLowerCase()));
      const unused = topServices.filter((s) => !recentItems.includes(s.name.toLowerCase()));
      if (unused.length > 0) suggestions.push({ type: "tip", title: "Popularne usługi nieużywane ostatnio", description: `Rozważ dodanie: ${unused.map((s) => s.name).join(", ")}` });
    }
    // Repeat clients
    const clientQuotes: Record<string, number> = {};
    quotes.forEach((q) => { clientQuotes[q.clientName] = (clientQuotes[q.clientName] || 0) + 1; });
    const repeatClients = Object.entries(clientQuotes).filter(([_, count]) => count >= 3).map(([name]) => name);
    if (repeatClients.length > 0) suggestions.push({ type: "opportunity", title: `${repeatClients.length} stałych klientów (3+ wycen)`, description: `Rozważ rabat lojalnościowy dla: ${repeatClients.slice(0, 3).join(", ")}` });
    return suggestions;
  }, [quotes, services]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span className="ml-1 text-muted-foreground/30"><ChevronUp className="h-3 w-3 inline" /></span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}</span>;
  }

  async function handleDuplicate(id: number) { await duplicate(id); toast.success("Wycena zduplikowana"); }
  async function handleQuickStatus(id: number, status: QuoteStatus) { changeStatus(id, status); toast.success(`Status: ${STATUS_LABELS[status]}`); }
  function handleDelete() { if (deleteId) { remove(deleteId); toast.success("Wycena usunięta"); setDeleteId(null); } }

  // ─── Kanban drag & drop ────────────────────────────────────────────────
  function handleDragStart(quoteId: number) { setDraggedQuoteId(quoteId); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  function handleDrop(e: React.DragEvent, targetStatus: QuoteStatus) {
    e.preventDefault();
    if (draggedQuoteId !== null) {
      changeStatus(draggedQuoteId, targetStatus);
      toast.success(`Status zmieniony na: ${STATUS_LABELS[targetStatus]}`);
      setDraggedQuoteId(null);
    }
  }

  function exportToCSV() {
    const headers = ["Numer", "Klient", "Data", "Status", "Netto", "VAT", "Brutto"];
    const rows = filtered.map((q) => [q.number, q.clientName, format(new Date(q.createdAt), "dd.MM.yyyy"), STATUS_LABELS[q.status], q.totalNetto.toFixed(2), q.totalVat.toFixed(2), q.totalBrutto.toFixed(2)]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wyceny-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV wyeksportowany");
  }

  const deleteQuote = deleteId ? quotes.find((q) => q.id === deleteId) : null;

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Wyceny</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Zarządzaj wycenami i ofertami</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filtered.length > 0 && (
                <Button variant="outline" className="btn-secondary" onClick={exportToCSV}>
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
                </Button>
              )}
              <Link href="/wyceny/nowa">
                <Button className="btn-primary"><Plus className="h-4 w-4" />Nowa wycena</Button>
              </Link>
            </div>
          </div>
        </StaggerItem>

        {/* View mode tabs */}
        <StaggerItem>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-1"><List className="h-3.5 w-3.5" />Lista</TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-1"><Kanban className="h-3.5 w-3.5" />Kanban</TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-1"><Brain className="h-3.5 w-3.5" />AI Sugestie</TabsTrigger>
            </TabsList>

            {/* ── Lista ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Szukaj wycen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as QuoteStatus | "all")}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie statusy</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-40" />
                      <span className="text-muted-foreground text-sm">-</span>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-40" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Kwota:</span>
                      <Input type="number" min="0" placeholder="Od" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-24 h-8 text-xs" />
                      <span className="text-muted-foreground text-xs">-</span>
                      <Input type="number" min="0" placeholder="Do" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-24 h-8 text-xs" />
                    </div>
                  </div>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary">{selectedIds.size} zaznaczonych</Badge>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { selectedIds.forEach((id) => changeStatus(id, "wyslana")); setSelectedIds(new Set()); toast.success("Status zmieniony"); }}>→ Wysłana</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { selectedIds.forEach((id) => changeStatus(id, "zaakceptowana")); setSelectedIds(new Set()); toast.success("Status zmieniony"); }}>→ Zaakceptowana</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => { selectedIds.forEach((id) => remove(id)); setSelectedIds(new Set()); toast.success("Usunięto"); }}>Usuń ({selectedIds.size})</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Wyczyść</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
                    <AnimatedEmptyState icon={FileText} title={quotes.length === 0 ? "Brak wycen" : "Brak wyników"} description={quotes.length === 0 ? "Utwórz pierwszą wycenę!" : "Zmień kryteria wyszukiwania"} action={quotes.length === 0 ? <Link href="/wyceny/nowa"><Button className="btn-primary"><Plus className="mr-2 h-4 w-4" />Nowa wycena</Button></Link> : undefined} />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("number")}>Numer<SortIcon column="number" /></TableHead>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("clientName")}>Klient<SortIcon column="clientName" /></TableHead>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>Data<SortIcon column="createdAt" /></TableHead>
                              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>Status<SortIcon column="status" /></TableHead>
                              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("totalBrutto")}>Brutto<SortIcon column="totalBrutto" /></TableHead>
                              <TableHead className="w-12">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {paginatedQuotes.map((q, index) => (
                                <motion.tr key={q.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: Math.min(index * 0.03, 0.3) }} className="group border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => router.push(`/wyceny/${q.id}`)}>
                                  <TableCell className="font-semibold">{q.number}</TableCell>
                                  <TableCell>{q.clientName || <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        {(["szkic", "wyslana", "zaakceptowana", "odrzucona"] as QuoteStatus[]).filter((s) => s !== q.status).map((s) => (
                                          <DropdownMenuItem key={s} onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, s); }}>{STATUS_LABELS[s]}</DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                  <TableCell className="text-right font-bold text-primary">{formatCurrency(q.totalBrutto)}</TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreviewQuote(q); }}><Eye className="h-3.5 w-3.5 mr-2" />Podgląd</DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/wyceny/${q.id}/edytuj`); }}><FileText className="h-3.5 w-3.5 mr-2" />Edytuj</DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(q.id!); }}><Copy className="h-3.5 w-3.5 mr-2" />Duplikuj</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(q.id!); }}><X className="h-3.5 w-3.5 mr-2" />Usuń</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                          <p className="text-sm text-muted-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} z {filtered.length}</p>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Poprzednia</Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Następna</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Kanban ── */}
            <TabsContent value="kanban" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {KANBAN_COLUMNS.map((col) => {
                  const columnQuotes = quotes.filter((q) => q.status === col.status);
                  const columnTotal = columnQuotes.reduce((s, q) => s + q.totalBrutto, 0);
                  return (
                    <div
                      key={col.status}
                      className={`rounded-xl border-t-4 ${col.borderColor} ${col.color} p-3 min-h-[300px] transition-all ${draggedQuoteId !== null ? "ring-2 ring-primary/20" : ""}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.status)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-sm">{col.label}</h3>
                          <p className="text-xs text-muted-foreground">{columnQuotes.length} wycen · {formatCurrency(columnTotal)}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{columnQuotes.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {columnQuotes.slice(0, 10).map((q) => (
                            <motion.div
                              key={q.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              draggable
                              onDragStart={() => handleDragStart(q.id!)}
                              onDragEnd={() => setDraggedQuoteId(null)}
                              className={`p-3 rounded-lg bg-card border border-border/50 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${draggedQuoteId === q.id ? "opacity-50 scale-95" : ""}`}
                              onClick={() => router.push(`/wyceny/${q.id}`)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm truncate">{q.number}</div>
                                  <div className="text-xs text-muted-foreground truncate">{q.clientName || "—"}</div>
                                </div>
                                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">{format(new Date(q.createdAt), "dd.MM", { locale: pl })}</span>
                                <span className="text-sm font-bold text-primary">{formatCurrency(q.totalBrutto)}</span>
                              </div>
                              {q.variants && q.variants.length > 0 && (
                                <div className="mt-1"><Badge variant="outline" className="text-[9px]">{q.variants.length} wariantów</Badge></div>
                              )}
                              {q.photos && q.photos.length > 0 && (
                                <div className="mt-1"><Badge variant="outline" className="text-[9px]">📷 {q.photos.length}</Badge></div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {columnQuotes.length > 10 && (
                          <p className="text-xs text-center text-muted-foreground pt-2">+{columnQuotes.length - 10} więcej</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── AI Sugestie ── */}
            <TabsContent value="ai" className="mt-4 space-y-4">
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />Inteligentne sugestie</CardTitle>
                </CardHeader>
                <CardContent>
                  {aiSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak sugestii — wszystko wygląda dobrze! 🎉</div>
                  ) : (
                    <div className="space-y-3">
                      {aiSuggestions.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`p-4 rounded-lg border ${s.type === "warning" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" : s.type === "opportunity" ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : s.type === "insight" ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20" : "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20"}`}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              {s.type === "warning" && <span className="text-lg">⚠️</span>}
                              {s.type === "opportunity" && <span className="text-lg">💰</span>}
                              {s.type === "insight" && <span className="text-lg">📊</span>}
                              {s.type === "tip" && <span className="text-lg">💡</span>}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{s.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick stats */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <Card className="card-steel"><CardContent className="pt-4 p-3">
                  <div className="text-xs text-muted-foreground">Konwersja</div>
                  <div className="text-xl font-black">{quotes.length > 0 ? Math.round((quotes.filter((q) => q.status === "zaakceptowana").length / quotes.length) * 100) : 0}%</div>
                </CardContent></Card>
                <Card className="card-steel"><CardContent className="pt-4 p-3">
                  <div className="text-xs text-muted-foreground">Śr. wartość</div>
                  <div className="text-lg font-black">{formatCurrency(quotes.filter((q) => q.status === "zaakceptowana").length > 0 ? quotes.filter((q) => q.status === "zaakceptowana").reduce((s, q) => s + q.totalBrutto, 0) / quotes.filter((q) => q.status === "zaakceptowana").length : 0)}</div>
                </CardContent></Card>
                <Card className="card-steel"><CardContent className="pt-4 p-3">
                  <div className="text-xs text-muted-foreground">Z wariantami</div>
                  <div className="text-xl font-black">{quotes.filter((q) => q.variants && q.variants.length > 0).length}</div>
                </CardContent></Card>
                <Card className="card-steel"><CardContent className="pt-4 p-3">
                  <div className="text-xs text-muted-foreground">Ze zdjęciami</div>
                  <div className="text-xl font-black">{quotes.filter((q) => q.photos && q.photos.length > 0).length}</div>
                </CardContent></Card>
              </div>
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </StaggerContainer>

      {/* Delete dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Usuń wycenę</AlertDialogTitle><AlertDialogDescription>Usunąć wycenę{deleteQuote ? ` "${deleteQuote.number}"` : ""}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview dialog */}
      <Dialog open={previewQuote !== null} onOpenChange={(open) => { if (!open) setPreviewQuote(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{previewQuote?.number}</span>
              {previewQuote && <Badge className={STATUS_COLORS[previewQuote.status]}>{STATUS_LABELS[previewQuote.status]}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {previewQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Klient</div>
                  <div className="font-semibold">{previewQuote.clientName || "—"}</div>
                  {previewQuote.clientAddress && <div className="text-muted-foreground">{previewQuote.clientAddress}</div>}
                  {previewQuote.clientNip && <div>NIP: {previewQuote.clientNip}</div>}
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Data</div>
                  <div>{format(new Date(previewQuote.createdAt), "dd.MM.yyyy", { locale: pl })}</div>
                  {previewQuote.validUntil && <div className="text-muted-foreground">Ważna do: {format(new Date(previewQuote.validUntil), "dd.MM.yyyy")}</div>}
                </div>
              </div>
              <Separator />
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nazwa</TableHead><TableHead className="text-center">Ilość</TableHead><TableHead>Jedn.</TableHead><TableHead className="text-right">Brutto</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {previewQuote.items.map((item, idx) => (
                    <TableRow key={item.id || idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{UNIT_LABELS[item.unit]}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(item.bruttoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Variants preview */}
              {previewQuote.variants && previewQuote.variants.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-semibold mb-2">Warianty wyceny ({previewQuote.variants.length})</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {previewQuote.variants.map((v) => (
                        <div key={v.id} className={`p-3 rounded-lg border ${previewQuote.selectedVariantId === v.id ? "border-primary bg-primary/5" : "border-border/50"}`}>
                          <div className="font-semibold text-sm">{v.name}</div>
                          <div className="text-lg font-black text-primary">{formatCurrency(v.totalBrutto)}</div>
                          {previewQuote.selectedVariantId === v.id && <Badge className="mt-1 text-[9px]">Wybrany</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Photos preview */}
              {previewQuote.photos && previewQuote.photos.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-semibold mb-2">Galeria zdjęć ({previewQuote.photos.length})</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {previewQuote.photos.map((photo) => (
                        <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border border-border/50">
                          <img src={photo.dataUrl} alt={photo.caption || ""} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Netto:</span><span>{formatCurrency(previewQuote.totalNetto)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT:</span><span>{formatCurrency(previewQuote.totalVat)}</span></div>
                {previewQuote.globalDiscountPercent > 0 && <div className="flex justify-between text-sm text-green-600"><span>Rabat ({previewQuote.globalDiscountPercent}%):</span><span>-{formatCurrency(Math.round(previewQuote.items.reduce((s, i) => s + i.bruttoTotal, 0) * previewQuote.globalDiscountPercent / 100))}</span></div>}
                <Separator />
                <div className="flex justify-between text-xl font-black text-primary"><span>DO ZAPŁATY:</span><span>{formatCurrency(previewQuote.totalBrutto)}</span></div>
              </div>
              {previewQuote.notes && <><Separator /><div className="text-sm"><div className="text-muted-foreground mb-1">Uwagi:</div><div className="whitespace-pre-wrap">{previewQuote.notes}</div></div></>}
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose><Button variant="outline">Zamknij</Button></DialogClose>
                <Button onClick={() => router.push(`/wyceny/${previewQuote.id}`)}>Otwórz</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
