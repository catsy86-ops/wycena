"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
import { useInvoiceStore } from "@/store/invoice-store";
import { useSettingsStore } from "@/store/settings-store";
import { STATUS_LABELS, UNIT_LABELS, VAT_RATE_LABELS, type QuoteStatus } from "@/types";
import { formatCurrency, round } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, Printer, FileDown, Trash2, Copy, FileText, Users,
  Calendar, Tag, Pencil, FileCheck, ExternalLink, ClipboardCopy,
  AlertCircle, History, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion } from "framer-motion";
import Link from "next/link";
import { StatusTimeline } from "@/components/quote/status-timeline";
import { InternalComments, type InternalComment } from "@/components/quote/internal-comments";
import { SignaturePad } from "@/components/quote/signature-pad";
import { ShareQuoteDialog } from "@/components/quote/share-quote";
import { QuoteProfitability } from "@/components/quote/quote-profitability";
import { TimeComparison } from "@/components/quote/time-comparison";
import { Share2, PenTool } from "lucide-react";

const STATUS_COLORS: Record<QuoteStatus, string> = {
  szkic: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  wyslana: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  zaakceptowana: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  odrzucona: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export default function WycenaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const quotes = useQuoteStore((s) => s.quotes);
  const changeStatus = useQuoteStore((s) => s.changeStatus);
  const remove = useQuoteStore((s) => s.remove);
  const duplicate = useQuoteStore((s) => s.duplicate);
  const addInvoice = useInvoiceStore((s) => s.add);
  const settings = useSettingsStore((s) => s.settings);
  const [convertingInvoice, setConvertingInvoice] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [comments, setComments] = useState<InternalComment[]>([]);

  const quote = useMemo(() => quotes.find((item) => item.id === id), [quotes, id]);
  const q = quote!;

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Wycena nie znaleziona</p>
        <Button variant="outline" onClick={() => router.push("/wyceny")}>Wróć do listy</Button>
      </div>
    );
  }

  // Sprawdzenie wygaśnięcia
  const isExpired = q.validUntil && isPast(new Date(q.validUntil)) && q.status !== "zaakceptowana" && q.status !== "odrzucona";
  const daysUntilExpiry = q.validUntil && !isPast(new Date(q.validUntil))
    ? differenceInDays(new Date(q.validUntil), new Date())
    : null;
  const expiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3;

  function handleCopyNumber() {
    navigator.clipboard.writeText(q.number);
    toast.success("Numer skopiowany do schowka");
  }

  function handlePrint() { window.print(); }

  async function handleDuplicate() {
    const newId = await duplicate(id);
    toast.success("Wycena zduplikowana");
    router.push(`/wyceny/${newId}`);
  }

  function handleDelete() {
    remove(id);
    toast.success("Wycena usunięta");
    router.push("/wyceny");
  }

  function handleStatus(newStatus: QuoteStatus) {
    changeStatus(id, newStatus);
    toast.success(`Status zmieniony na: ${STATUS_LABELS[newStatus]}`);
  }

  async function handleConvertToInvoice() {
    setConvertingInvoice(true);
    try {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (settings?.defaultValidityDays ?? 14));
      const invoiceId = await addInvoice({
        quoteId: id,
        clientName: q.clientName,
        clientAddress: q.clientAddress,
        clientNip: q.clientNip,
        items: q.items,
        additionalCosts: q.additionalCosts,
        totalNetto: q.totalNetto,
        totalVat: q.totalVat,
        totalBrutto: q.totalBrutto,
        status: "niezaplacona",
        issueDate: today,
        dueDate,
      });
      if (q.status !== "zaakceptowana") {
        changeStatus(id, "zaakceptowana");
      }
      toast.success("Faktura utworzona");
      router.push(`/faktury`);
    } catch {
      toast.error("Błąd podczas tworzenia faktury");
    } finally {
      setConvertingInvoice(false);
    }
  }

  async function handleExportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("OFERTA CENOWA", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let y = 35;

    if (settings?.name) {
      doc.setFont("helvetica", "bold");
      doc.text("Sprzedawca:", margin, y);
      doc.setFont("helvetica", "normal");
      y += 5; doc.text(settings.name, margin, y);
      y += 5; if (settings.address) { doc.text(settings.address, margin, y); y += 5; }
      if (settings.phone) { doc.text(`Tel: ${settings.phone}`, margin, y); y += 5; }
      if (settings.email) { doc.text(`Email: ${settings.email}`, margin, y); y += 5; }
      if (settings.nip) { doc.text(`NIP: ${settings.nip}`, margin, y); y += 5; }
    }

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Oferta nr: ${q.number}`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 5; doc.text(`Data: ${format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}`, margin, y);
    if (q.validUntil) { y += 5; doc.text(`Ważna do: ${format(new Date(q.validUntil), "dd.MM.yyyy", { locale: pl })}`, margin, y); }

    if (q.clientName) {
      y += 10;
      doc.setFont("helvetica", "bold"); doc.text("Klient:", pageWidth - margin, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5; doc.text(q.clientName, pageWidth - margin, y, { align: "right" });
      if (q.clientAddress) { y += 5; doc.text(q.clientAddress, pageWidth - margin, y, { align: "right" }); }
      if (q.clientPhone) { y += 5; doc.text(`Tel: ${q.clientPhone}`, pageWidth - margin, y, { align: "right" }); }
      if (q.clientEmail) { y += 5; doc.text(`Email: ${q.clientEmail}`, pageWidth - margin, y, { align: "right" }); }
      if (q.clientNip) { y += 5; doc.text(`NIP: ${q.clientNip}`, pageWidth - margin, y, { align: "right" }); }
    }

    y += 10;
    const tableBody = q.items.map((item) => [
      item.name, item.quantity.toString(), UNIT_LABELS[item.unit],
      formatCurrency(item.priceNettoPerUnit),
      item.discountPercent > 0 ? `${item.discountPercent}%` : "-",
      `${item.vatRate}%`, formatCurrency(item.nettotal), formatCurrency(item.bruttoTotal),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Nazwa", "Ilość", "Jedn.", "Cena netto", "Rabat", "VAT", "Netto", "Brutto"]],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40 }, 3: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // Koszty dodatkowe w PDF (punkt 15)
    if (q.additionalCosts && q.additionalCosts.length > 0) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Koszty dodatkowe:", margin, y); y += 5;
      doc.setFont("helvetica", "normal");
      q.additionalCosts.forEach((cost) => {
        doc.text(`${cost.name}: ${formatCurrency(cost.amount)}`, margin + 4, y); y += 5;
      });
      y += 3;
    }

    const totalNetto = q.items.reduce((s, i) => s + i.nettotal, 0);
    const totalVat = q.items.reduce((s, i) => s + i.vatAmount, 0);
    const totalBruttoBefore = q.items.reduce((s, i) => s + i.bruttoTotal, 0);

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Suma netto: ${formatCurrency(totalNetto)}`, pageWidth - margin, y, { align: "right" }); y += 6;
    doc.text(`Suma VAT: ${formatCurrency(totalVat)}`, pageWidth - margin, y, { align: "right" }); y += 6;
    doc.text(`Suma brutto: ${formatCurrency(totalBruttoBefore)}`, pageWidth - margin, y, { align: "right" });

    if (q.globalDiscountPercent > 0) {
      y += 6;
      const discountAmt = round(totalBruttoBefore * q.globalDiscountPercent / 100);
      doc.text(`Rabat (${q.globalDiscountPercent}%): -${formatCurrency(discountAmt)}`, pageWidth - margin, y, { align: "right" });
    }

    y += 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(`DO ZAPŁATY: ${formatCurrency(q.totalBrutto)}`, pageWidth - margin, y, { align: "right" });

    if (q.notes) {
      y += 12; doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("Uwagi:", margin, y); doc.setFont("helvetica", "normal"); y += 5;
      const lines = doc.splitTextToSize(q.notes, pageWidth - margin * 2);
      doc.text(lines, margin, y);
    }

    if (settings?.bankAccount) {
      y += 15; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`Konto bankowe: ${settings.bankName || ""} ${settings.bankAccount}`, margin, y);
    }

    doc.save(`wycena-${q.number.replace(/\//g, "-")}.pdf`);
    toast.success("PDF wygenerowany");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-5xl mx-auto">

        {/* Alert wygaśnięcia (punkt 7) */}
        {isExpired && (
          <StaggerItem>
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">Wycena wygasła</span>
              <span className="text-red-600/70 dark:text-red-400/70">
                — ważna do {format(new Date(q.validUntil!), "dd.MM.yyyy", { locale: pl })}
              </span>
            </motion.div>
          </StaggerItem>
        )}
        {expiringSoon && !isExpired && (
          <StaggerItem>
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Wycena wygasa za <strong>{daysUntilExpiry} {daysUntilExpiry === 1 ? "dzień" : "dni"}</strong></span>
            </motion.div>
          </StaggerItem>
        )}

        {/* Header */}
        <StaggerItem>
          <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push("/wyceny")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                {/* Numer z przyciskiem kopiowania (punkt 12) */}
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-pipe">{q.number}</h1>
                  <button
                    onClick={handleCopyNumber}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Kopiuj numer"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                  <span className="text-sm text-muted-foreground">{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={q.status} onValueChange={(v) => handleStatus((v ?? "szkic") as QuoteStatus)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Przycisk Edytuj (punkt 1) */}
              <Button variant="outline" size="sm" className="btn-secondary" onClick={() => router.push(`/wyceny/${id}/edytuj`)}>
                <Pencil className="mr-2 h-4 w-4" />Edytuj
              </Button>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />Duplikuj
              </Button>
              {/* Konwersja na fakturę (punkt 3) */}
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button size="sm" className="btn-secondary border-emerald-400 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" disabled={convertingInvoice}>
                    <FileCheck className="mr-2 h-4 w-4" />Faktura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Utwórz fakturę</AlertDialogTitle>
                    <AlertDialogDescription>
                      Zostanie utworzona faktura na podstawie wyceny {q.number}. Status wyceny zmieni się na &ldquo;Zaakceptowana&rdquo;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConvertToInvoice}>Utwórz fakturę</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />Drukuj
              </Button>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />Udostępnij
              </Button>
              {q.status === "wyslana" && (
                <Button variant="outline" size="sm" className="btn-secondary border-violet-300 text-violet-700 dark:text-violet-400" onClick={() => setShowSignature(true)}>
                  <PenTool className="mr-2 h-4 w-4" />Podpis
                </Button>
              )}
              <Button size="sm" className="btn-primary" onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />PDF
              </Button>
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />Usuń
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usuń wycenę</AlertDialogTitle>
                    <AlertDialogDescription>Czy na pewno chcesz usunąć wycenę {q.number}?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </StaggerItem>

        {/* Dane stron */}
        {(q.clientName || settings?.name) && (
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              {settings?.name && (
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Sprzedawca</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="font-semibold">{settings.name}</div>
                    {settings.address && <div>{settings.address}</div>}
                    {settings.phone && <div>Tel: {settings.phone}</div>}
                    {settings.email && <div>Email: {settings.email}</div>}
                    {settings.nip && <div>NIP: {settings.nip}</div>}
                  </CardContent>
                </Card>
              )}
              {q.clientName && (
                <Card className="card-modern">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" />Klient</span>
                      {/* Link do klienta (punkt 13) */}
                      {q.clientId && (
                        <Link href={`/klienci/${q.clientId}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" />Profil klienta
                        </Link>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="font-semibold">{q.clientName}</div>
                    {q.clientAddress && <div>{q.clientAddress}</div>}
                    {q.clientPhone && <a href={`tel:${q.clientPhone}`} className="block hover:text-primary transition-colors">Tel: {q.clientPhone}</a>}
                    {q.clientEmail && <a href={`mailto:${q.clientEmail}`} className="block hover:text-primary transition-colors">Email: {q.clientEmail}</a>}
                    {q.clientNip && <div>NIP: {q.clientNip}</div>}
                  </CardContent>
                </Card>
              )}
            </div>
          </StaggerItem>
        )}

        {/* Pozycje */}
        <StaggerItem>
          <Card className="card-modern">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Pozycje wyceny</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead className="text-center">Ilość</TableHead>
                      <TableHead>Jedn.</TableHead>
                      <TableHead className="text-right">Cena netto</TableHead>
                      <TableHead className="text-center">Rabat</TableHead>
                      <TableHead className="text-center">VAT</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">VAT kwota</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.externalPriceSource && (
                            <span className="ml-2 text-xs text-muted-foreground/60">({item.externalPriceSource})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{UNIT_LABELS[item.unit]}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.priceNettoPerUnit)}</TableCell>
                        <TableCell className="text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}</TableCell>
                        <TableCell className="text-center">{VAT_RATE_LABELS[item.vatRate]}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.nettotal)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.vatAmount)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(item.bruttoTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Koszty dodatkowe w widoku (punkt 15) */}
              {q.additionalCosts && q.additionalCosts.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2 text-muted-foreground">Koszty dodatkowe</p>
                  <div className="space-y-1">
                    {q.additionalCosts.map((cost) => (
                      <div key={cost.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{cost.name}</span>
                        <span className="font-semibold">{formatCurrency(cost.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Informacje + Podsumowanie */}
        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            <Card className="card-modern">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Informacje</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data utworzenia:</span>
                  <span>{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ostatnia zmiana:</span>
                  <span>{format(new Date(q.updatedAt), "dd.MM.yyyy HH:mm", { locale: pl })}</span>
                </div>
                {q.validUntil && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ważna do:</span>
                    <span className={isExpired ? "text-red-600 dark:text-red-400 font-semibold" : expiringSoon ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                      {format(new Date(q.validUntil), "dd.MM.yyyy", { locale: pl })}
                      {isExpired && " (wygasła)"}
                      {expiringSoon && !isExpired && ` (za ${daysUntilExpiry} dni)`}
                    </span>
                  </div>
                )}
                {q.notes && (
                  <>
                    <Separator />
                    <div className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" />Uwagi:</div>
                    <div className="whitespace-pre-wrap">{q.notes}</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-gauge">
              <CardHeader><CardTitle className="text-sm">Podsumowanie</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma netto:</span>
                  <span className="font-semibold">{formatCurrency(q.totalNetto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suma VAT:</span>
                  <span className="font-semibold">{formatCurrency(q.totalVat)}</span>
                </div>
                {q.globalDiscountPercent > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Rabat globalny ({q.globalDiscountPercent}%):</span>
                    <span>-{formatCurrency(round(q.items.reduce((s, i) => s + i.bruttoTotal, 0) * q.globalDiscountPercent / 100))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-black text-pipe">
                  <span>DO ZAPŁATY:</span>
                  <span>{formatCurrency(q.totalBrutto)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>

        {/* Historia wersji (punkt 16) */}
        {q.versions && q.versions.length > 0 && (
          <StaggerItem>
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4 text-primary" />Historia wersji ({q.versions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...q.versions].reverse().map((v) => (
                    <div key={v.id} className="flex items-start justify-between rounded-lg border border-border/50 p-3 text-sm">
                      <div>
                        <div className="font-semibold">Wersja {v.versionNumber}</div>
                        {v.changeDescription && <div className="text-muted-foreground text-xs mt-0.5">{v.changeDescription}</div>}
                        {v.createdBy && <div className="text-muted-foreground text-xs">{v.createdBy}</div>}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="font-bold text-primary">{formatCurrency(v.totalBrutto)}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(v.createdAt), "dd.MM.yyyy HH:mm", { locale: pl })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        )}

      </StaggerContainer>

      {/* ── Podpis elektroniczny ── */}
      {showSignature && (
        <div className="max-w-5xl mx-auto mt-6">
          <SignaturePad
            onSign={(dataUrl) => {
              // W produkcji: zapisz podpis w quote i zmień status
              changeStatus(id, "zaakceptowana");
              toast.success("Wycena zaakceptowana z podpisem klienta");
              setShowSignature(false);
            }}
            onCancel={() => setShowSignature(false)}
          />
        </div>
      )}

      {/* ── Nowe sekcje pod wycena ── */}
      <div className="max-w-5xl mx-auto space-y-6 mt-6">
        {/* Timeline + Komentarze + Rentowność */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Timeline statusów */}
          <Card className="card-modern">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Historia statusów</CardTitle></CardHeader>
            <CardContent>
              <StatusTimeline
                events={[
                  { status: "szkic", date: q.createdAt },
                  ...(q.status !== "szkic" ? [{ status: q.status, date: q.updatedAt }] : []),
                ]}
                currentStatus={q.status}
              />
            </CardContent>
          </Card>

          {/* Rentowność */}
          <QuoteProfitability quote={q} />

          {/* Porównanie czasu */}
          <TimeComparison quote={q} />
        </div>

        {/* Komentarze wewnętrzne */}
        <InternalComments
          comments={comments}
          onAdd={(text) => {
            setComments((prev) => [...prev, { id: Date.now().toString(36), text, createdAt: new Date() }]);
          }}
          onRemove={(commentId) => {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          }}
        />
      </div>

      {/* ── Dialog udostępniania ── */}
      <ShareQuoteDialog quote={q} open={shareOpen} onOpenChange={setShareOpen} />

    </PageTransition>
  );
}
