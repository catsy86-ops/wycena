import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
} from "docx";
import type { Quote, CompanySettings } from "@/types";
import { UNIT_LABELS } from "@/types";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * Generuje dokument Word (.docx) z wyceny.
 */
export async function generateQuoteDocx(quote: Quote, settings?: CompanySettings | null): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
      children: [
        // Nagłówek
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "OFERTA CENOWA", bold: true, size: 36, color: "2563EB" }),
          ],
        }),

        // Numer i data
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `Oferta nr: ${quote.number}`, bold: true, size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: `Data: ${format(new Date(quote.createdAt), "dd.MM.yyyy", { locale: pl })}`, size: 20 }),
          ],
        }),
        ...(quote.validUntil ? [new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: `Ważna do: ${format(new Date(quote.validUntil), "dd.MM.yyyy", { locale: pl })}`, size: 20 })],
        })] : []),

        // Sprzedawca
        ...(settings?.name ? [
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Sprzedawca:", bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: settings.name, size: 20 })] }),
          ...(settings.address ? [new Paragraph({ children: [new TextRun({ text: settings.address, size: 18 })] })] : []),
          ...(settings.phone ? [new Paragraph({ children: [new TextRun({ text: `Tel: ${settings.phone}`, size: 18 })] })] : []),
          ...(settings.nip ? [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `NIP: ${settings.nip}`, size: 18 })] })] : []),
        ] : []),

        // Klient
        ...(quote.clientName ? [
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Klient:", bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: quote.clientName, size: 20 })] }),
          ...(quote.clientAddress ? [new Paragraph({ children: [new TextRun({ text: quote.clientAddress, size: 18 })] })] : []),
          ...(quote.clientPhone ? [new Paragraph({ children: [new TextRun({ text: `Tel: ${quote.clientPhone}`, size: 18 })] })] : []),
          ...(quote.clientNip ? [new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `NIP: ${quote.clientNip}`, size: 18 })] })] : []),
        ] : []),

        // Tabela pozycji
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: "Pozycje:", bold: true, size: 20 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Header
            new TableRow({
              children: ["Nazwa", "Ilość", "Jedn.", "Cena netto", "VAT", "Netto", "Brutto"].map((h) =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: "2563EB" },
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: "FFFFFF" })] })],
                })
              ),
            }),
            // Rows
            ...quote.items.map((item) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.name, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.quantity), size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: UNIT_LABELS[item.unit], size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.priceNettoPerUnit), size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.vatRate}%`, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.nettotal), size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.bruttoTotal), bold: true, size: 18 })] })] }),
                ],
              })
            ),
          ],
        }),

        // Podsumowanie
        new Paragraph({ spacing: { before: 300 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Suma netto: ${formatCurrency(quote.totalNetto)}`, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Suma VAT: ${formatCurrency(quote.totalVat)}`, size: 20 })] }),
        ...(quote.globalDiscountPercent > 0 ? [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Rabat: ${quote.globalDiscountPercent}%`, size: 20, color: "16A34A" })] }),
        ] : []),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100 },
          children: [new TextRun({ text: `DO ZAPŁATY: ${formatCurrency(quote.totalBrutto)}`, bold: true, size: 28, color: "2563EB" })],
        }),

        // Uwagi
        ...(quote.notes ? [
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Uwagi:", bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: quote.notes, size: 18 })] }),
        ] : []),

        // Dane bankowe
        ...(settings?.bankAccount ? [
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Konto: ${settings.bankName || ""} ${settings.bankAccount}`, size: 16, italics: true })] }),
        ] : []),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
