"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuoteStore } from "@/store/quote-store";
import { STATUS_LABELS, UNIT_LABELS, VAT_RATE_LABELS, type QuoteStatus } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Copy, FileText, Send, Check, X, Eye, ChevronUp, ChevronDown, Calendar, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

type SortKey = "number" | "clientName" | "createdAt" | "status" | "totalNetto" | "totalBrutto";
type SortDir = "asc" | "desc";

export default function WycenyPage() {
  const quotes = useQuoteStore((s) => s.quotes);
  const loading = useQuoteStore((s) => s.loading);
  const search = useQuoteStore((s) => s.search);
  const statusFilter = useQuoteStore((s) => s.statusFilter);
  const setSearch = useQuoteStore((s) => s.setSearch);
  const setStatusFilter = useQuoteStore((s) => s.setStatusFilter);
  const remove = useQuoteStore((s) => s.remove);
  const changeStatus = useQuoteStore((s) => s.changeStatus);
  const duplicate = useQuoteStore((s) => s.duplicate);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewQuote, setPreviewQuote] = useState<typeof quotes[0] | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = quotes.filter((q) => {
      const matchesSearch =
        q.number.toLowerCase().includes(search.toLowerCase()) ||
        q.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(q.createdAt) >= new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(q.createdAt) <= to;
      }
      return matchesSearch && matchesStatus && matchesDate;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "number":
          cmp = a.number.localeCompare(b.number);
          break;
        case "clientName":
          cmp = a.clientName.localeCompare(b.clientName);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "totalNetto":
          cmp = a.totalNetto - b.totalNetto;
          break;
        case "totalBrutto":
          cmp = a.totalBrutto - b.totalBrutto;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [quotes, search, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span className="ml-1 text-muted-foreground/30"><ChevronUp className="h-3 w-3 inline" /></span>;
    return <span className="ml-1 text-blue-500">{sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}</span>;
  }

  async function handleDuplicate(id: number) {
    await duplicate(id);
    toast.success("Wycena zduplikowana");
  }

  async function handleQuickStatus(id: number, status: QuoteStatus) {
    changeStatus(id, status);
    toast.success(`Status zmieniony na: ${STATUS_LABELS[status]}`);
  }

  function handleDelete() {
    if (deleteId) {
      remove(deleteId);
      toast.success("Wycena usunięta");
      setDeleteId(null);
    }
  }

  const deleteQuote = deleteId ? quotes.find((q) => q.id === deleteId) : null;

  function exportToCSV() {
    const headers = ["Numer", "Klient", "Data", "Status", "Netto", "VAT", "Brutto", "Uwagi"];
    const rows = filtered.map((q) => [
      q.number,
      q.clientName,
      format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl }),
      STATUS_LABELS[q.status],
      q.totalNetto.toFixed(2),
      q.totalVat.toFixed(2),
      q.totalBrutto.toFixed(2),
      q.notes || "",
    ]);
    const csvContent = [
      headers.join(";"),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wyceny-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Wyceny wyeksportowane do CSV");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Wyceny
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Zarządzaj wycenami i ofertami</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {filtered.length > 0 && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="btn-secondary w-full sm:w-auto" onClick={exportToCSV}>
                    <Download className="h-4 w-4" />
                    <span className="sm:hidden">Eksport</span>
                  </Button>
                </motion.div>
              )}
              <Link href="/wyceny/nowa">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="btn-primary w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Nowa wycena
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Szukaj wycen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as QuoteStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie statusy</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-40" placeholder="Od" />
                  <span className="text-muted-foreground text-sm shrink-0">-</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-40" placeholder="Do" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton rows={5} />
              ) : filtered.length === 0 ? (
                <AnimatedEmptyState
                  icon={FileText}
                  title={quotes.length === 0 ? "Brak wycen" : "Brak wyników"}
                  description={quotes.length === 0 ? "Utwórz pierwszą wycenę!" : "Spróbuj zmienić kryteria wyszukiwania"}
                  action={quotes.length === 0 ? (
                    <Link href="/wyceny/nowa">
                      <Button className="btn-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Nowa wycena
                      </Button>
                    </Link>
                  ) : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("number")}>Numer<SortIcon column="number" /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("clientName")}>Klient<SortIcon column="clientName" /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>Data<SortIcon column="createdAt" /></TableHead>
                        <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>Status<SortIcon column="status" /></TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("totalNetto")}>Netto<SortIcon column="totalNetto" /></TableHead>
                        <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("totalBrutto")}>Brutto<SortIcon column="totalBrutto" /></TableHead>
                        <TableHead className="w-12">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filtered.map((q, index) => (
                          <motion.tr
                            key={q.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => window.location.href = `/wyceny/${q.id}`}
                          >
                            <TableCell className="font-semibold">{q.number}</TableCell>
                            <TableCell>{q.clientName || <span className="text-muted-foreground">Brak klienta</span>}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <motion.div whileHover={{ scale: 1.05 }}>
                                    <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                                  </motion.div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {q.status !== "szkic" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "szkic"); }}>
                                      <FileText className="h-3.5 w-3.5 mr-2" /> Szkic
                                    </DropdownMenuItem>
                                  )}
                                  {q.status !== "wyslana" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "wyslana"); }}>
                                      <Send className="h-3.5 w-3.5 mr-2" /> Wysłana
                                    </DropdownMenuItem>
                                  )}
                                  {q.status !== "zaakceptowana" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "zaakceptowana"); }}>
                                      <Check className="h-3.5 w-3.5 mr-2" /> Zaakceptowana
                                    </DropdownMenuItem>
                                  )}
                                  {q.status !== "odrzucona" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "odrzucona"); }}>
                                      <X className="h-3.5 w-3.5 mr-2" /> Odrzucona
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(q.totalNetto)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(q.totalBrutto)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreviewQuote(q); }}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Szybki podgląd
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                    <Link href={`/wyceny/${q.id}`} className="flex items-center gap-2 w-full">
                                      <Copy className="h-3.5 w-3.5" /> Podgląd
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(q.id!); }}>
                                    <Copy className="h-3.5 w-3.5" /> Duplikuj
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {q.status === "szkic" && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "wyslana"); }}>
                                      <Send className="h-3.5 w-3.5 mr-2" /> Oznacz jako wysłana
                                    </DropdownMenuItem>
                                  )}
                                  {(q.status === "szkic" || q.status === "wyslana") && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "zaakceptowana"); }}>
                                      <Check className="h-3.5 w-3.5 mr-2" /> Zaakceptowana
                                    </DropdownMenuItem>
                                  )}
                                  {(q.status === "szkic" || q.status === "wyslana") && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickStatus(q.id!, "odrzucona"); }}>
                                      <X className="h-3.5 w-3.5 mr-2" /> Odrzucona
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(q.id!); }}>
                                    <X className="h-3.5 w-3.5 mr-2" /> Usuń
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </StaggerItem>
      </StaggerContainer>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń wycenę</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć wycenę{deleteQuote ? ` "${deleteQuote.number}"` : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <div className="font-semibold">{previewQuote.clientName || "-"}</div>
                  {previewQuote.clientAddress && <div className="text-muted-foreground">{previewQuote.clientAddress}</div>}
                  {previewQuote.clientNip && <div>NIP: {previewQuote.clientNip}</div>}
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Data</div>
                  <div>{format(new Date(previewQuote.createdAt), "dd.MM.yyyy", { locale: pl })}</div>
                  {previewQuote.validUntil && (
                    <div className="text-muted-foreground">Ważna do: {format(new Date(previewQuote.validUntil), "dd.MM.yyyy", { locale: pl })}</div>
                  )}
                </div>
              </div>

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead className="text-center">Ilość</TableHead>
                    <TableHead>Jedn.</TableHead>
                    <TableHead className="text-right">Cena netto</TableHead>
                    <TableHead className="text-right">Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewQuote.items.map((item, idx) => (
                    <TableRow key={item.id || idx}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{UNIT_LABELS[item.unit]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.priceNettoPerUnit)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.bruttoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {previewQuote.additionalCosts.length > 0 && (
                <>
                  <div className="text-sm font-semibold">Koszty dodatkowe:</div>
                  <div className="space-y-1">
                    {previewQuote.additionalCosts.map((cost) => (
                      <div key={cost.id} className="flex justify-between text-sm">
                        <span>{cost.name}</span>
                        <span className="font-semibold">{formatCurrency(cost.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma netto:</span>
                  <span className="font-semibold">{formatCurrency(previewQuote.totalNetto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma VAT:</span>
                  <span className="font-semibold">{formatCurrency(previewQuote.totalVat)}</span>
                </div>
                {previewQuote.globalDiscountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Rabat ({previewQuote.globalDiscountPercent}%):</span>
                    <span>-{formatCurrency(Math.round(previewQuote.items.reduce((s, i) => s + i.bruttoTotal, 0) * previewQuote.globalDiscountPercent / 100))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <span>DO ZAPŁATY:</span>
                  <span>{formatCurrency(previewQuote.totalBrutto)}</span>
                </div>
              </div>

              {previewQuote.notes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">Uwagi:</div>
                    <div className="whitespace-pre-wrap">{previewQuote.notes}</div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose>
                  <Button variant="outline">Zamknij</Button>
                </DialogClose>
                <Button onClick={() => { window.location.href = `/wyceny/${previewQuote.id}`; }}>
                  Otwórz pełny widok
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
