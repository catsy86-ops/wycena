"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useInvoiceStore } from "@/store/invoice-store";
import { useQuoteStore } from "@/store/quote-store";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, type InvoiceStatus, type Payment } from "@/types";
import { formatCurrency, round } from "@/lib/calculations";
import { format, isToday, isThisWeek, isThisMonth, isPast } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, FileCheck, Trash2, Eye, Wallet, Copy, Edit2, Download, BarChart3,
  AlertCircle, CheckSquare, TrendingUp, Calendar, DollarSign, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  niezaplacona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  czesciowo: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  zaplacona: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  anulowana: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
};

export default function FakturyPage() {
  const router = useRouter();
  const invoices = useInvoiceStore((s) => s.invoices);
  const payments = useInvoiceStore((s) => s.payments);
  const loading = useInvoiceStore((s) => s.loading);
  const search = useInvoiceStore((s) => s.search);
  const statusFilter = useInvoiceStore((s) => s.statusFilter);
  const dateFilter = useInvoiceStore((s) => s.dateFilter);
  const selectedInvoices = useInvoiceStore((s) => s.selectedInvoices);
  const setSearch = useInvoiceStore((s) => s.setSearch);
  const setStatusFilter = useInvoiceStore((s) => s.setStatusFilter);
  const setDateFilter = useInvoiceStore((s) => s.setDateFilter);
  const toggleInvoiceSelection = useInvoiceStore((s) => s.toggleInvoiceSelection);
  const clearSelection = useInvoiceStore((s) => s.clearSelection);
  const selectAll = useInvoiceStore((s) => s.selectAll);
  const add = useInvoiceStore((s) => s.add);
  const update = useInvoiceStore((s) => s.update);
  const remove = useInvoiceStore((s) => s.remove);
  const bulkDelete = useInvoiceStore((s) => s.bulkDelete);
  const bulkChangeStatus = useInvoiceStore((s) => s.bulkChangeStatus);
  const bulkDuplicate = useInvoiceStore((s) => s.bulkDuplicate);
  const changeStatus = useInvoiceStore((s) => s.changeStatus);
  const addPayment = useInvoiceStore((s) => s.addPayment);
  const getTotalPaidForInvoice = useInvoiceStore((s) => s.getTotalPaidForInvoice);
  const getTotalStats = useInvoiceStore((s) => s.getTotalStats);

  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [form, setForm] = useState({ quoteId: "", clientName: "", clientNip: "", issueDate: "", dueDate: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: "przelew" as Payment["method"], notes: "" });

  // Filtering
  const filtered = useMemo(() => {
    return invoices.filter((inv: typeof invoices[0]) => {
      const matchesSearch = inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      const invDate = new Date(inv.issueDate);
      let matchesDate = true;
      if (dateFilter === "today") matchesDate = isToday(invDate);
      else if (dateFilter === "week") matchesDate = isThisWeek(invDate, { weekStartsOn: 1 });
      else if (dateFilter === "month") matchesDate = isThisMonth(invDate);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, search, statusFilter, dateFilter]);

  // Stats
  const stats = useMemo(() => getTotalStats(), [invoices, payments]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; przychod: number; zaplacone: number }> = {};
    invoices.forEach((inv: typeof invoices[0]) => {
      const month = format(new Date(inv.issueDate), "MMM yyyy", { locale: pl });
      if (!data[month]) data[month] = { month, przychod: 0, zaplacone: 0 };
      data[month].przychod += inv.totalBrutto;
      const totalPaid = getTotalPaidForInvoice(inv.id!);
      data[month].zaplacone += totalPaid;
    });
    return Object.values(data).slice(-12);
  }, [invoices, payments]);

  function openAdd() {
    setForm({ quoteId: "", clientName: "", clientNip: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "" });
    setEditingId(null);
    setDialogOpen(true);
  }

  function handleSelectQuote(quoteId: string) {
    const quote = quotes.find((q) => q.id === parseInt(quoteId));
    if (quote) {
      setForm({
        quoteId,
        clientName: quote.clientName,
        clientNip: quote.clientNip || "",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    }
  }

  async function handleSave() {
    const quote = quotes.find((q) => q.id === parseInt(form.quoteId));
    if (!quote) {
      toast.error("Wybierz wycenę");
      return;
    }
    if (editingId) {
      await update(editingId, {
        clientName: form.clientName,
        clientNip: form.clientNip || undefined,
        issueDate: new Date(form.issueDate),
        dueDate: new Date(form.dueDate),
      });
      toast.success("Faktura zaktualizowana");
    } else {
      await add({
        quoteId: quote.id,
        clientName: form.clientName,
        clientNip: form.clientNip || undefined,
        items: quote.items,
        additionalCosts: quote.additionalCosts || [],
        totalNetto: quote.totalNetto,
        totalVat: quote.totalVat,
        totalBrutto: quote.totalBrutto,
        status: "niezaplacona",
        issueDate: new Date(form.issueDate),
        dueDate: new Date(form.dueDate),
      });
      toast.success("Faktura utworzona");
    }
    setDialogOpen(false);
  }

  function handleEdit(inv: typeof invoices[0]) {
    setForm({
      quoteId: String(inv.quoteId || ""),
      clientName: inv.clientName,
      clientNip: inv.clientNip || "",
      issueDate: format(new Date(inv.issueDate), "yyyy-MM-dd"),
      dueDate: format(new Date(inv.dueDate), "yyyy-MM-dd"),
    });
    setEditingId(inv.id!);
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    await remove(id);
    toast.success("Faktura usunięta");
  }

  async function handleBulkDelete() {
    await bulkDelete(Array.from(selectedInvoices));
    clearSelection();
    toast.success("Faktury usunięte");
  }

  async function handleBulkChangeStatus(status: InvoiceStatus) {
    await bulkChangeStatus(Array.from(selectedInvoices), status);
    clearSelection();
    toast.success("Status zmieniony");
  }

  async function handleBulkDuplicate() {
    await bulkDuplicate(Array.from(selectedInvoices));
    clearSelection();
    toast.success("Faktury zduplikowane");
  }

  function openPayment(id: number) {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i: typeof invoices[0]) => i.id === id);
    if (inv) {
      const totalPaid = getTotalPaidForInvoice(id);
      setPaymentForm({ amount: Math.round((inv.totalBrutto - totalPaid) * 100) / 100, method: "przelew", notes: "" });
    }
    setPaymentDialogOpen(true);
  }

  async function handleAddPayment() {
    if (!selectedInvoiceId) return;
    await addPayment({
      invoiceId: selectedInvoiceId,
      amount: paymentForm.amount,
      date: new Date(),
      method: paymentForm.method,
      notes: paymentForm.notes || undefined,
    });
    const inv = invoices.find((i: typeof invoices[0]) => i.id === selectedInvoiceId);
    if (inv) {
      const totalPaid = getTotalPaidForInvoice(selectedInvoiceId) + paymentForm.amount;
      if (totalPaid >= inv.totalBrutto) {
        changeStatus(selectedInvoiceId, "zaplacona");
      } else if (totalPaid > 0) {
        changeStatus(selectedInvoiceId, "czesciowo");
      }
    }
    toast.success("Płatność dodana");
    setPaymentDialogOpen(false);
  }

  function handleExportCSV() {
    const headers = ["Numer", "Klient", "Wystawiona", "Termin", "Status", "Brutto", "Opłacono", "Do zapłaty"];
    const rows = filtered.map((inv: typeof invoices[0]) => {
      const totalPaid = getTotalPaidForInvoice(inv.id!);
      return [
        inv.number,
        inv.clientName,
        format(new Date(inv.issueDate), "dd.MM.yyyy"),
        format(new Date(inv.dueDate), "dd.MM.yyyy"),
        INVOICE_STATUS_LABELS[inv.status],
        String(inv.totalBrutto),
        String(totalPaid),
        String(inv.totalBrutto - totalPaid),
      ];
    });
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faktury-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Eksport CSV");
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(16);
    doc.text("Raport Faktur", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Wygenerowano: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.text("Podsumowanie:", 14, 32);
    doc.setFontSize(9);
    doc.text(`Razem do zapłaty: ${formatCurrency(stats.total)}`, 14, 39);
    doc.text(`Opłacone: ${formatCurrency(stats.paid)}`, 14, 45);
    doc.text(`Zalegające: ${formatCurrency(stats.pending)}`, 14, 51);
    doc.text(`Przeterminowane: ${formatCurrency(stats.overdue)}`, 14, 57);
    
    const tableData = filtered.map((inv: typeof invoices[0]) => {
      const totalPaid = getTotalPaidForInvoice(inv.id!);
      return [
        inv.number,
        inv.clientName,
        format(new Date(inv.issueDate), "dd.MM.yyyy"),
        format(new Date(inv.dueDate), "dd.MM.yyyy"),
        INVOICE_STATUS_LABELS[inv.status],
        `${inv.totalBrutto}zł`,
        `${totalPaid}zł`,
      ];
    });
    
    (doc as any).autoTable({
      head: [["Numer", "Klient", "Wystawiona", "Termin", "Status", "Brutto", "Opłacono"]],
      body: tableData,
      startY: 65,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });
    
    doc.save(`faktury-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Eksport PDF");
  }

  function handleViewPDF(inv: typeof invoices[0]) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.text("FAKTURA", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Numer: ${inv.number}`, 14, 25);
    doc.text(`Data wystawienia: ${format(new Date(inv.issueDate), "dd.MM.yyyy")}`, 14, 31);
    doc.text(`Termin płatności: ${format(new Date(inv.dueDate), "dd.MM.yyyy")}`, 14, 37);
    
    doc.setFontSize(10);
    doc.text("Klient:", 14, 47);
    doc.text(inv.clientName, 14, 53);
    if (inv.clientNip) doc.text(`NIP: ${inv.clientNip}`, 14, 59);
    
    doc.setFontSize(10);
    doc.text("Pozycje:", 14, 75);
    
    const tableData = inv.items.map((item) => [
      item.name,
      String(item.quantity),
      item.unit,
      `${item.priceNettoPerUnit}zł`,
      `${item.nettotal}zł`,
    ]);
    
    (doc as any).autoTable({
      head: [["Nazwa", "Ilość", "J.m.", "Cena netto", "Razem netto"]],
      body: tableData,
      startY: 80,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255 },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Razem netto: ${formatCurrency(inv.totalNetto)}`, 14, finalY);
    doc.text(`VAT: ${formatCurrency(inv.totalVat)}`, 14, finalY + 6);
    doc.text(`Razem brutto: ${formatCurrency(inv.totalBrutto)}`, 14, finalY + 12);
    
    doc.output("dataurlstring");
    window.open(doc.output("dataurlstring"), "_blank");
    toast.success("Podgląd PDF");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe section-industrial">Faktury</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Fakturowanie i śledzenie płatności</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="btn-secondary" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
              </Button>
              <Button variant="outline" className="btn-secondary" onClick={handleExportPDF}>
                <FileCheck className="h-4 w-4" /><span className="hidden sm:inline">PDF</span>
              </Button>
              <Button className="btn-primary" onClick={openAdd}>
                <Plus className="h-4 w-4" />Nowa faktura
              </Button>
            </div>
          </div>
        </StaggerItem>

        {/* Stats Cards */}
        <StaggerItem>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />Razem
                </div>
                <div className="text-xl font-black tabular-nums">{formatCurrency(stats.total)}</div>
              </CardContent>
            </Card>
            <Card className="card-gauge">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Opłacone</div>
                <div className="text-lg font-black text-green-600 tabular-nums">{formatCurrency(stats.paid)}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground">Zalegające</div>
                <div className="text-lg font-black text-amber-600 tabular-nums">{formatCurrency(stats.pending)}</div>
              </CardContent>
            </Card>
            <Card className="card-steel">
              <CardContent className="pt-4 p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Przeterminowane
                </div>
                <div className="text-lg font-black text-red-600 tabular-nums">{formatCurrency(stats.overdue)}</div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Tabs */}
        <StaggerItem>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Lista ({filtered.length})</TabsTrigger>
              <TabsTrigger value="reports">Raporty</TabsTrigger>
              <TabsTrigger value="analytics">Analityka</TabsTrigger>
            </TabsList>

            {/* ── Lista ── */}
            <TabsContent value="list" className="mt-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Szukaj faktur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as InvoiceStatus | "all")}>
                        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Wszystkie statusy</SelectItem>
                          {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
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
                  {selectedInvoices.size > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary">{selectedInvoices.size} zaznaczonych</Badge>
                      <Button size="sm" variant="outline" onClick={() => selectAll(filtered.map((i) => i.id!))}>
                        <CheckSquare className="h-3 w-3 mr-1" />Zaznacz wszystkie
                      </Button>
                      <Select onValueChange={(v) => handleBulkChangeStatus(v as InvoiceStatus)}>
                        <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Zmień status" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={handleBulkDuplicate}>
                        <Copy className="h-3 w-3 mr-1" />Duplikuj
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Usuń</Button>} />
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Usuń faktury</AlertDialogTitle><AlertDialogDescription>Usunąć {selectedInvoices.size} faktur?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Anuluj</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Usuń</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button size="sm" variant="outline" onClick={clearSelection}>Wyczyść</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <TableSkeleton rows={5} />
                  ) : filtered.length === 0 ? (
                    <AnimatedEmptyState
                      icon={FileCheck}
                      title={invoices.length === 0 ? "Brak faktur" : "Brak wyników"}
                      description={invoices.length === 0 ? "Utwórz pierwszą fakturę z wyceny" : "Spróbuj zmienić kryteria wyszukiwania"}
                      action={invoices.length === 0 ? (
                        <Button className="btn-primary" onClick={openAdd}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nowa faktura
                        </Button>
                      ) : undefined}
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"><Checkbox checked={selectedInvoices.size === filtered.length && filtered.length > 0} onCheckedChange={(checked) => checked ? selectAll(filtered.map((i) => i.id!)) : clearSelection()} /></TableHead>
                            <TableHead>Numer</TableHead>
                            <TableHead>Klient</TableHead>
                            <TableHead>Wystawiona</TableHead>
                            <TableHead>Termin</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Brutto</TableHead>
                            <TableHead className="text-right">Opłacono</TableHead>
                            <TableHead className="w-20">Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filtered.map((inv, index) => {
                              const totalPaid = getTotalPaidForInvoice(inv.id!);
                              const isOverdue = isPast(new Date(inv.dueDate)) && inv.status !== "zaplacona";
                              return (
                                <motion.tr
                                  key={inv.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ delay: index * 0.05 }}
                                  className={`group border-b border-border/50 hover:bg-accent/50 transition-colors ${isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                                >
                                  <TableCell><Checkbox checked={selectedInvoices.has(inv.id!)} onCheckedChange={() => toggleInvoiceSelection(inv.id!)} /></TableCell>
                                  <TableCell className="font-semibold">{inv.number}</TableCell>
                                  <TableCell>{inv.clientName}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{format(new Date(inv.issueDate), "dd.MM.yyyy", { locale: pl })}</TableCell>
                                  <TableCell className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                                    {format(new Date(inv.dueDate), "dd.MM.yyyy", { locale: pl })}
                                    {isOverdue && <span className="ml-1">⚠️</span>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={STATUS_COLORS[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(inv.totalBrutto)}</TableCell>
                                  <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewPDF(inv)} title="Podgląd">
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(inv)} title="Edytuj">
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPayment(inv.id!)} title="Płatność">
                                        <Wallet className="h-3.5 w-3.5" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Usuń fakturę</AlertDialogTitle>
                                            <AlertDialogDescription>Czy na pewno chcesz usunąć fakturę {inv.number}?</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(inv.id!)}>Usuń</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Raporty ── */}
            <TabsContent value="reports" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Monthly Report */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Raport Miesięczny</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {useMemo(() => {
                      const monthInvoices = invoices.filter((i) => isThisMonth(new Date(i.issueDate)));
                      const monthTotal = monthInvoices.reduce((s, i) => s + i.totalBrutto, 0);
                      const monthPaid = monthInvoices.reduce((s, i) => s + getTotalPaidForInvoice(i.id!), 0);
                      const monthVat = monthInvoices.reduce((s, i) => s + i.totalVat, 0);
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Faktury</div>
                              <div className="text-lg font-bold">{monthInvoices.length}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Przychód</div>
                              <div className="text-lg font-bold text-primary">{formatCurrency(monthTotal)}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">Opłacone</div>
                              <div className="text-lg font-bold text-green-600">{formatCurrency(monthPaid)}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-accent/50">
                              <div className="text-xs text-muted-foreground">VAT</div>
                              <div className="text-lg font-bold">{formatCurrency(monthVat)}</div>
                            </div>
                          </div>
                        </>
                      );
                    }, [invoices, payments])}
                  </CardContent>
                </Card>

                {/* Payment Status */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Status Płatności</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-950/20">
                      <span className="text-sm">Opłacone</span>
                      <span className="font-bold text-green-600">{invoices.filter((i) => i.status === "zaplacona").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                      <span className="text-sm">Częściowo opłacone</span>
                      <span className="font-bold text-amber-600">{invoices.filter((i) => i.status === "czesciowo").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/20">
                      <span className="text-sm">Nieopłacone</span>
                      <span className="font-bold text-red-600">{invoices.filter((i) => i.status === "niezaplacona").length}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950/20">
                      <span className="text-sm">Anulowane</span>
                      <span className="font-bold text-slate-600">{invoices.filter((i) => i.status === "anulowana").length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend Chart */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trend Przychodu (12 miesięcy)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-[10px]" tick={{ fontSize: 10 }} />
                      <YAxis className="text-[10px]" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} />
                      <Line type="monotone" dataKey="przychod" stroke="oklch(0.52 0.19 220)" strokeWidth={2} name="Przychód" />
                      <Line type="monotone" dataKey="zaplacone" stroke="oklch(0.55 0.18 155)" strokeWidth={2} name="Opłacone" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Analityka ── */}
            <TabsContent value="analytics" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Payment Methods */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Metody Płatności</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {useMemo(() => {
                        const methods: Record<string, number> = {};
                        payments.forEach((p) => {
                          methods[p.method] = (methods[p.method] || 0) + p.amount;
                        });
                        return Object.entries(methods).map(([method, amount]) => (
                          <div key={method} className="flex items-center justify-between p-2 rounded bg-accent/50">
                            <span className="text-sm">{PAYMENT_METHOD_LABELS[method as Payment["method"]]}</span>
                            <span className="font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ));
                      }, [payments])}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Clients */}
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top Klienci</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {useMemo(() => {
                        const clients: Record<string, number> = {};
                        invoices.forEach((i) => {
                          clients[i.clientName] = (clients[i.clientName] || 0) + i.totalBrutto;
                        });
                        return Object.entries(clients)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([name, amount]) => (
                            <div key={name} className="flex items-center justify-between p-2 rounded bg-accent/50">
                              <span className="text-sm truncate">{name}</span>
                              <span className="font-bold shrink-0">{formatCurrency(amount)}</span>
                            </div>
                          ));
                      }, [invoices])}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Invoices */}
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Faktury Przeterminowane
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {useMemo(() => {
                    const overdue = invoices.filter((i) => isPast(new Date(i.dueDate)) && i.status !== "zaplacona");
                    if (overdue.length === 0) {
                      return <p className="text-sm text-muted-foreground">Brak przeterminowanych faktur</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {overdue.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/20">
                            <div>
                              <div className="font-semibold text-sm">{inv.number}</div>
                              <div className="text-xs text-muted-foreground">{inv.clientName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-red-600">{formatCurrency(inv.totalBrutto - getTotalPaidForInvoice(inv.id!))}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "dd.MM.yyyy")}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }, [invoices, payments])}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </StaggerItem>
      </StaggerContainer>

      {/* Dialog - Add/Edit Invoice */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edytuj fakturę" : "Nowa faktura z wyceny"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Wybierz wycenę</Label>
              <Select value={form.quoteId} onValueChange={(v) => v && handleSelectQuote(v)}>
                <SelectTrigger><SelectValue placeholder="Wybierz wycenę..." /></SelectTrigger>
                <SelectContent>
                  {quotes.filter((q) => q.status === "zaakceptowana").map((q) => (
                    <SelectItem key={q.id} value={String(q.id)}>{q.number} - {q.clientName} ({formatCurrency(q.totalBrutto)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Klient</Label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>NIP</Label>
              <Input value={form.clientNip} onChange={(e) => setForm({ ...form, clientNip: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data wystawienia</Label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Termin płatności</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button className="btn-primary" onClick={handleSave}>{editingId ? "Zaktualizuj" : "Utwórz"} fakturę</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Add Payment */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj płatność</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Kwota (PLN)</Label>
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label>Metoda płatności</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v as Payment["method"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Uwagi</Label>
              <Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button className="btn-primary" onClick={handleAddPayment}>Dodaj płatność</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
