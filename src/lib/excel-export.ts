import * as XLSX from "xlsx";
import { PlumbingPressureProtocol, formatPlumbingDate } from "./plumbing-protocols";
import { Quote } from "@/types";

/**
 * Eksportuje listę protokołów prób ciśnieniowych do arkusza kalkulacyjnego Excel (.xlsx)
 */
export function exportPlumbingProtocolsToExcel(
  protocols: PlumbingPressureProtocol[],
  filename = "Rejestr_prob_cisnieniowych.xlsx"
): void {
  const rows = protocols.map((p, idx) => ({
    "Lp.": idx + 1,
    "Numer protokołu": p.number,
    "Data próby": formatPlumbingDate(p.date),
    "Klient / Inwestor": p.clientName,
    "Adres / Lokalizacja": p.location,
    "Telefon": p.clientPhone || "-",
    "Instalator": p.plumberName,
    "Uprawnienia": p.plumberLicense || "-",
    "Rodzaj instalacji": p.installationType,
    "Materiał rur": p.pipeMaterial,
    "Medium próbne": p.testMedium,
    "Ciśnienie robocze [bar]": p.workingPressureBar,
    "Ciśnienie próbne [bar]": p.testPressureBar,
    "Czas trwania [min]": p.durationMinutes,
    "Ciśnienie początkowe [bar]": p.initialPressureBar,
    "Ciśnienie końcowe [bar]": p.finalPressureBar,
    "Spadek ciśnienia [bar]": p.pressureDropBar,
    "Wynik próby": p.testResult.toUpperCase(),
    "Podpis instalatora": p.signaturePlumber ? "ZŁOŻONY (E-PODPIS)" : "BRAK",
    "Podpis klienta": p.signatureClient ? "ZŁOŻONY (E-PODPIS)" : "BRAK",
    "Uwagi": p.notes || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Dostosowanie szerokości kolumn
  const colWidths = [
    { wch: 5 },  // Lp.
    { wch: 22 }, // Numer
    { wch: 14 }, // Data
    { wch: 22 }, // Klient
    { wch: 30 }, // Adres
    { wch: 14 }, // Telefon
    { wch: 20 }, // Instalator
    { wch: 18 }, // Uprawnienia
    { wch: 24 }, // Rodzaj
    { wch: 14 }, // Materiał
    { wch: 14 }, // Medium
    { wch: 15 }, // Robocze
    { wch: 15 }, // Próbne
    { wch: 14 }, // Czas
    { wch: 16 }, // Początkowe
    { wch: 16 }, // Końcowe
    { wch: 16 }, // Spadek
    { wch: 14 }, // Wynik
    { wch: 18 }, // Podpis inst.
    { wch: 18 }, // Podpis klient
    { wch: 35 }, // Uwagi
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Protokoły Prób");

  XLSX.writeFile(workbook, filename);
}

/**
 * Eksportuje wycenę do wieloarkuszowego Excela (.xlsx)
 */
export function exportQuoteToExcel(quote: Quote, filename?: string): void {
  const safeFilename = filename || `Wycena_${quote.number.replace(/\//g, "-")}.xlsx`;

  // Arkusz 1: Pozycje kosztorysu
  const itemRows = quote.items.map((item, idx) => ({
    "Lp.": idx + 1,
    "Nazwa usługi / materiału": item.name,
    "Ilość": item.quantity,
    "J.m.": item.unit,
    "Cena jedn. netto [zł]": item.priceNettoPerUnit,
    "Wartość netto [zł]": item.quantity * item.priceNettoPerUnit,
    "VAT [%]": item.vatRate,
    "Wartość brutto [zł]": item.quantity * item.priceNettoPerUnit * (1 + item.vatRate / 100),
  }));

  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  wsItems["!cols"] = [
    { wch: 5 },
    { wch: 45 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
  ];

  // Arkusz 2: Podsumowanie
  const summaryRows = [
    { "Parametr": "Numer wyceny", "Wartość": quote.number },
    { "Parametr": "Klient", "Wartość": quote.clientName },
    { "Parametr": "Adres inwestycji", "Wartość": quote.clientAddress || "-" },
    { "Parametr": "Telefon", "Wartość": quote.clientPhone || "-" },
    { "Parametr": "Email", "Wartość": quote.clientEmail || "-" },
    { "Parametr": "Suma Netto [zł]", "Wartość": quote.totalNetto },
    { "Parametr": "Suma VAT [zł]", "Wartość": quote.totalVat },
    { "Parametr": "Suma Brutto [zł]", "Wartość": quote.totalBrutto },
    { "Parametr": "Uwagi", "Wartość": quote.notes || "-" },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsItems, "Kosztorys");
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Informacje");

  XLSX.writeFile(workbook, safeFilename);
}
