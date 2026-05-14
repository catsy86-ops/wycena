"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuoteStore } from "@/store/quote-store";
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
import { ArrowLeft, Printer, FileDown, Trash2, Copy, FileText, Users, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";

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
  const settings = useSettingsStore((s) => s.settings);

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

  function handlePrint() {
    window.print();
  }

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
      y += 5;
      doc.text(settings.name, margin, y);
      y += 5;
      if (settings.address) { doc.text(settings.address, margin, y); y += 5; }
      if (settings.phone) { doc.text(`Tel: ${settings.phone}`, margin, y); y += 5; }
      if (settings.email) { doc.text(`Email: ${settings.email}`, margin, y); y += 5; }
      if (settings.nip) { doc.text(`NIP: ${settings.nip}`, margin, y); y += 5; }
    }

    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(`Oferta nr: ${q.number}`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(`Data: ${format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}`, margin, y);
    if (q.validUntil) {
      y += 5;
      doc.text(`Ważna do: ${format(new Date(q.validUntil), "dd.MM.yyyy", { locale: pl })}`, margin, y);
    }

    if (q.clientName) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Klient:", pageWidth - margin, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5;
      doc.text(q.clientName, pageWidth - margin, y, { align: "right" });
      if (q.clientAddress) { y += 5; doc.text(q.clientAddress, pageWidth - margin, y, { align: "right" }); }
      if (q.clientPhone) { y += 5; doc.text(`Tel: ${q.clientPhone}`, pageWidth - margin, y, { align: "right" }); }
      if (q.clientEmail) { y += 5; doc.text(`Email: ${q.clientEmail}`, pageWidth - margin, y, { align: "right" }); }
      if (q.clientNip) { y += 5; doc.text(`NIP: ${q.clientNip}`, pageWidth - margin, y, { align: "right" }); }
    }

    y += 10;

    const tableBody = q.items.map((item) => [
      item.name,
      item.quantity.toString(),
      UNIT_LABELS[item.unit],
      formatCurrency(item.priceNettoPerUnit),
      item.discountPercent > 0 ? `${item.discountPercent}%` : "-",
      `${item.vatRate}%`,
      formatCurrency(item.nettotal),
      formatCurrency(item.bruttoTotal),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Nazwa", "Ilość", "Jedn.", "Cena netto", "Rabat", "VAT", "Netto", "Brutto"]],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40 },
        3: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    const totalNetto = q.items.reduce((s, i) => s + i.nettotal, 0);
    const totalVat = q.items.reduce((s, i) => s + i.vatAmount, 0);
    const totalBruttoBefore = q.items.reduce((s, i) => s + i.bruttoTotal, 0);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Suma netto: ${formatCurrency(totalNetto)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text(`Suma VAT: ${formatCurrency(totalVat)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text(`Suma brutto: ${formatCurrency(totalBruttoBefore)}`, pageWidth - margin, y, { align: "right" });

    if (q.globalDiscountPercent > 0) {
      y += 6;
      const discountAmt = round(totalBruttoBefore * q.globalDiscountPercent / 100);
      doc.text(`Rabat (${q.globalDiscountPercent}%): -${formatCurrency(discountAmt)}`, pageWidth - margin, y, { align: "right" });
    }

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`DO ZAPŁATY: ${formatCurrency(q.totalBrutto)}`, pageWidth - margin, y, { align: "right" });

    if (q.notes) {
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Uwagi:", margin, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      const lines = doc.splitTextToSize(q.notes, pageWidth - margin * 2);
      doc.text(lines, margin, y);
    }

    if (settings?.bankAccount) {
      y += 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Konto bankowe: ${settings.bankName || ""} ${settings.bankAccount}`, margin, y);
    }

    doc.save(`wycena-${q.number.replace(/\//g, "-")}.pdf`);
    toast.success("PDF wygenerowany");
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6 max-w-5xl mx-auto">
        <StaggerItem>
          <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="btn-ghost" onClick={() => router.push("/wyceny")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{q.number}</h1>
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
              <Button variant="outline" size="sm" className="btn-secondary" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />Duplikuj
              </Button>
              <Button variant="outline" size="sm" className="btn-secondary" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />Drukuj
              </Button>
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

        {(q.clientName || settings?.name) && (
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              {settings?.name && (
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Sprzedawca</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold">{settings.name}</div>
                      {settings.address && <div>{settings.address}</div>}
                      {settings.phone && <div>Tel: {settings.phone}</div>}
                      {settings.email && <div>Email: {settings.email}</div>}
                      {settings.nip && <div>NIP: {settings.nip}</div>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {q.clientName && (
                <Card className="card-modern">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Klient</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold">{q.clientName}</div>
                      {q.clientAddress && <div>{q.clientAddress}</div>}
                      {q.clientPhone && <div>Tel: {q.clientPhone}</div>}
                      {q.clientEmail && <div>Email: {q.clientEmail}</div>}
                      {q.clientNip && <div>NIP: {q.clientNip}</div>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </StaggerItem>
        )}

        <StaggerItem>
          <Card className="card-modern">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" />Pozycje wyceny</CardTitle></CardHeader>
            <CardContent>
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
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{UNIT_LABELS[item.unit]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.priceNettoPerUnit)}</TableCell>
                      <TableCell className="text-center">{item.discountPercent > 0 ? `${item.discountPercent}%` : "-"}</TableCell>
                      <TableCell className="text-center">{VAT_RATE_LABELS[item.vatRate]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.nettotal)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.vatAmount)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.bruttoTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            <Card className="card-modern">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Informacje</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data utworzenia:</span>
                  <span>{format(new Date(q.createdAt), "dd.MM.yyyy", { locale: pl })}</span>
                </div>
                {q.validUntil && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ważna do:</span>
                    <span>{format(new Date(q.validUntil), "dd.MM.yyyy", { locale: pl })}</span>
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

            <Card className="card-modern bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
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
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Rabat globalny ({q.globalDiscountPercent}%):</span>
                    <span>-{formatCurrency(round(q.items.reduce((s, i) => s + i.bruttoTotal, 0) * q.globalDiscountPercent / 100))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <span>DO ZAPŁATY:</span>
                  <span>{formatCurrency(q.totalBrutto)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </PageTransition>
  );
}