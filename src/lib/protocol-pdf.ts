/**
 * PDF Generation for Electrical Measurement Protocols
 * Generowanie PDF protokołów pomiarowych
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MeasurementProtocol, MeasurementEntry, formatProtocolDate, getMeasurementStatusLabel } from "./electrical-protocols";

interface PDFOptions {
  includeSignatures?: boolean;
  includeNotes?: boolean;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
}

/**
 * Generuje PDF protokołu pomiarowego
 */
export function generateProtocolPDF(protocol: MeasurementProtocol, options: PDFOptions = {}): jsPDF {
  const {
    includeSignatures = true,
    includeNotes = true,
    companyName = "Elektryk",
    companyAddress = "",
    companyPhone = "",
    companyEmail = "",
    companyTaxId = "",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // ─── Nagłówek ─────────────────────────────────────────────────────────────

  // Logo / Nazwa firmy
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, yPos);
  yPos += 8;

  // Dane firmy
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (companyAddress) doc.text(`Adres: ${companyAddress}`, margin, yPos), (yPos += 4);
  if (companyPhone) doc.text(`Tel: ${companyPhone}`, margin, yPos), (yPos += 4);
  if (companyEmail) doc.text(`Email: ${companyEmail}`, margin, yPos), (yPos += 4);
  if (companyTaxId) doc.text(`NIP: ${companyTaxId}`, margin, yPos), (yPos += 4);

  yPos += 4;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // ─── Tytuł ────────────────────────────────────────────────────────────────

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const titleMap: Record<string, string> = {
    nowa: "PROTOKÓŁ POMIAROWY - NOWA INSTALACJA",
    modernizacja: "PROTOKÓŁ POMIAROWY - MODERNIZACJA",
    naprawa: "PROTOKÓŁ POMIAROWY - NAPRAWA",
    przegląd: "PROTOKÓŁ POMIAROWY - PRZEGLĄD OKRESOWY",
  };
  doc.text(titleMap[protocol.installationType] || "PROTOKÓŁ POMIAROWY", margin, yPos);
  yPos += 8;

  // Numer i data
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Numer: ${protocol.number}`, margin, yPos);
  yPos += 5;
  doc.text(`Data: ${formatProtocolDate(protocol.date)}`, margin, yPos);
  yPos += 8;

  // ─── Informacje Ogólne ────────────────────────────────────────────────────

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMACJE OGÓLNE", margin, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const infoData = [
    ["Lokalizacja:", protocol.location],
    ["Klient:", protocol.clientName],
    ["Adres klienta:", protocol.clientAddress],
    ["Elektryk:", protocol.electricianName],
    ["Licencja:", protocol.electricianLicense],
  ];

  infoData.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", margin + 50, yPos);
    yPos += 5;
  });

  yPos += 4;

  // ─── Pomiary ──────────────────────────────────────────────────────────────

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("WYNIKI POMIARÓW", margin, yPos);
  yPos += 6;

  // Tabela pomiarów
  const tableData = protocol.measurements.map((m) => [
    m.description,
    m.location,
    m.expectedValue || "-",
    m.measuredValue || "-",
    m.unit,
    getMeasurementStatusLabel(m.status),
    m.notes || "-",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Pomiar", "Lokalizacja", "Wartość oczekiwana", "Wartość zmierzona", "Jednostka", "Status", "Uwagi"]],
    body: tableData,
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 12 },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: () => {
      yPos = (doc as any).lastAutoTable?.finalY ?? yPos + 6;
    },
  });

  yPos = (doc as any).lastAutoTable?.finalY ?? yPos + 6;

  // ─── Normy ────────────────────────────────────────────────────────────────

  if (protocol.measurements.some((m) => m.norm)) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NORMY ZASTOSOWANE", margin, yPos);
    yPos += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    const norms = [...new Set(protocol.measurements.map((m) => m.norm).filter(Boolean))];
    norms.forEach((norm) => {
      doc.text(`• ${norm}`, margin + 5, yPos);
      yPos += 4;
    });

    yPos += 2;
  }

  // ─── Uwagi ────────────────────────────────────────────────────────────────

  if (includeNotes && protocol.notes) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("UWAGI", margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(protocol.notes, contentWidth - 5);
    doc.text(notesLines, margin + 2, yPos);
    yPos += notesLines.length * 4 + 4;
  }

  // ─── Podpisy ──────────────────────────────────────────────────────────────

  if (includeSignatures) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    yPos += 10;

    // Podpisy
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PODPISY", margin, yPos);
    yPos += 8;

    const startYSignatures = yPos;

    // Podpis elektryka
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Elektryk:", margin, yPos);
    yPos += 2;
    doc.line(margin, yPos, margin + 50, yPos);
    yPos += 3;

    if (protocol.signatureElectrician && protocol.signatureElectrician.startsWith("data:image")) {
      try {
        doc.addImage(protocol.signatureElectrician, "PNG", margin, yPos, 45, 18);
        yPos += 20;
      } catch {
        yPos += 5;
      }
    } else {
      yPos += 5;
    }
    doc.text(protocol.electricianName || "___________________", margin, yPos);

    // Podpis klienta
    let clientY = startYSignatures;
    const clientX = margin + 70;
    doc.text("Klient:", clientX, clientY);
    clientY += 2;
    doc.line(clientX, clientY, clientX + 50, clientY);
    clientY += 3;

    if (protocol.signatureClient && protocol.signatureClient.startsWith("data:image")) {
      try {
        doc.addImage(protocol.signatureClient, "PNG", clientX, clientY, 45, 18);
        clientY += 20;
      } catch {
        clientY += 5;
      }
    } else {
      clientY += 5;
    }
    doc.text(protocol.clientName || "___________________", clientX, clientY);

    yPos = Math.max(yPos, clientY) + 6;
  }

  // ─── Stopka ───────────────────────────────────────────────────────────────

  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Strona ${i} z ${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
    doc.text(
      `Wygenerowano: ${formatProtocolDate(new Date())}`,
      margin,
      pageHeight - 5
    );
  }

  return doc;
}

/**
 * Pobiera PDF protokołu
 */
export function downloadProtocolPDF(protocol: MeasurementProtocol, options: PDFOptions = {}): void {
  const doc = generateProtocolPDF(protocol, options);
  const filename = `Protokol_${protocol.number.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}

/**
 * Generuje PDF porównania pomiarów (dla wielu protokołów)
 */
export function generateComparisonPDF(protocols: MeasurementProtocol[], options: PDFOptions = {}): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = margin;

  // Nagłówek
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PORÓWNANIE POMIARÓW", margin, yPos);
  yPos += 8;

  // Tabela porównawcza
  const tableData = protocols.flatMap((protocol) =>
    protocol.measurements.map((m) => [
      protocol.number,
      formatProtocolDate(protocol.date),
      m.description,
      m.measuredValue || "-",
      m.unit,
      getMeasurementStatusLabel(m.status),
    ])
  );

  autoTable(doc, {
    startY: yPos,
    head: [["Protokół", "Data", "Pomiar", "Wartość", "Jednostka", "Status"]],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  return doc;
}

/**
 * Generuje raport z protokołów (podsumowanie)
 */
export function generateProtocolReportPDF(protocols: MeasurementProtocol[], options: PDFOptions = {}): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = margin;

  // Nagłówek
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RAPORT Z PROTOKOŁÓW POMIAROWYCH", margin, yPos);
  yPos += 8;

  // Statystyki
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("STATYSTYKI", margin, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const totalMeasurements = protocols.reduce((sum, p) => sum + p.measurements.length, 0);
  const passedMeasurements = protocols.reduce(
    (sum, p) => sum + p.measurements.filter((m) => m.status === "pass").length,
    0
  );
  const failedMeasurements = protocols.reduce(
    (sum, p) => sum + p.measurements.filter((m) => m.status === "fail").length,
    0
  );
  const warningMeasurements = protocols.reduce(
    (sum, p) => sum + p.measurements.filter((m) => m.status === "warning").length,
    0
  );

  doc.text(`Liczba protokołów: ${protocols.length}`, margin, yPos);
  yPos += 5;
  doc.text(`Łączna liczba pomiarów: ${totalMeasurements}`, margin, yPos);
  yPos += 5;
  doc.text(`Pomiary prawidłowe: ${passedMeasurements} (${((passedMeasurements / totalMeasurements) * 100).toFixed(1)}%)`, margin, yPos);
  yPos += 5;
  doc.text(`Pomiary nieprawidłowe: ${failedMeasurements} (${((failedMeasurements / totalMeasurements) * 100).toFixed(1)}%)`, margin, yPos);
  yPos += 5;
  doc.text(`Ostrzeżenia: ${warningMeasurements} (${((warningMeasurements / totalMeasurements) * 100).toFixed(1)}%)`, margin, yPos);
  yPos += 8;

  // Lista protokołów
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LISTA PROTOKOŁÓW", margin, yPos);
  yPos += 6;

  const protocolData = protocols.map((p) => [
    p.number,
    formatProtocolDate(p.date),
    p.clientName,
    p.location,
    p.measurements.filter((m) => m.status === "pass").length,
    p.measurements.filter((m) => m.status === "fail").length,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Numer", "Data", "Klient", "Lokalizacja", "OK", "Błędy"]],
    body: protocolData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  return doc;
}
