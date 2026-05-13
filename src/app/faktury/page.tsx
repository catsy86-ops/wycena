"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoiceStore } from "@/store/invoice-store";
import { useQuoteStore } from "@/store/quote-store";
import { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS, type InvoiceStatus, type Payment } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileCheck, Trash2, Eye, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { AnimatedEmptyState } from "@/components/animated-empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  niezaplacona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  czesciowo: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  zaplacona: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  anulowana: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
};

export default function FakturyPage() {
  const router = useRouter();
  const invoices = useInvoiceStore((s) => s.invoices);
  const loading = useInvoiceStore((s) => s.loading);
  const search = useInvoiceStore((s) => s.search);
  const statusFilter = useInvoiceStore((s) => s.statusFilter);
  const setSearch = useInvoiceStore((s) => s.setSearch);
  const setStatusFilter = useInvoiceStore((s) => s.setStatusFilter);
  const add = useInvoiceStore((s) => s.add);
  const remove = useInvoiceStore((s) => s.remove);
  const changeStatus = useInvoiceStore((s) => s.changeStatus);
  const addPayment = useInvoiceStore((s) => s.addPayment);
  const getTotalPaidForInvoice = useInvoiceStore((s) => s.getTotalPaidForInvoice);

  const quotes = useQuoteStore((s) => s.quotes);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [form, setForm] = useState({ quoteId: "", clientName: "", clientNip: "", issueDate: "", dueDate: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: "przelew" as Payment["method"], notes: "" });

  const filtered = invoices.filter((inv) => {
    const matchesSearch = inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function openAdd() {
    setForm({ quoteId: "", clientName: "", clientNip: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "" });
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
    const id = await add({
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
    setDialogOpen(false);
  }

  function handleDelete(id: number) {
    remove(id);
    toast.success("Faktura usunięta");
  }

  function openPayment(id: number) {
    setSelectedInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
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
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
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
                Faktury
              </motion.h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Fakturowanie i śledzenie płatności</p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-primary w-full sm:w-auto" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Nowa faktura
              </Button>
            </motion.div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
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
                          return (
                            <motion.tr
                              key={inv.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              className="group border-b border-border/50 hover:bg-accent/50 transition-colors"
                            >
                              <TableCell className="font-semibold">{inv.number}</TableCell>
                              <TableCell>{inv.clientName}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{format(new Date(inv.issueDate), "dd.MM.yyyy", { locale: pl })}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{format(new Date(inv.dueDate), "dd.MM.yyyy", { locale: pl })}</TableCell>
                              <TableCell>
                                <Badge className={STATUS_COLORS[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(inv.totalBrutto)}</TableCell>
                              <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPayment(inv.id!)}>
                                    <Wallet className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" />}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </AlertDialogTrigger>
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
        </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nowa faktura z wyceny</DialogTitle>
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
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleSave}>Utwórz fakturę</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogClose render={<Button variant="outline" />}>Anuluj</DialogClose>
            <Button className="btn-primary" onClick={handleAddPayment}>Dodaj płatność</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
