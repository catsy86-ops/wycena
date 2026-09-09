/**
 * Generuje PDF protokołu pomiarowego (odbioru instalacji elektrycznej).
 * Wg PN-HD 60364-6-61 (Bezpieczeństwo instalacji elektrycznych)
 * 
 * Zawiera:
 * - Dane instalacji (adres, typ, napięcie)
 * - Dane elektryka (imię, nazwisko, uprawnienia)
 * - Pomiary rezystancji izolacji
 * - Pomiary skuteczności ochrony (zerowanie)
 * - Pomiary napięcia, prądu, mocy
 * - Oświadczenie zgodności
 * - Podpisy
 */

import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { CompanySettings } from "@/types";

export interface MeasurementData {
  // Dane instalacji
  installationAddress: string;
  installationType: "mieszkanie" | "dom" | "biuro" | "hala" | "inne";
  installationArea?: number; // m²
  voltage: "230V" | "400V" | "230/400V";
  phases: 1 | 3;
  mainBreaker?: string; // np. "B32"
  
  // Dane elektryka
  electricianName: string;
  electricianLicense?: string; // nr uprawnień
  electricianPhone?: string;
  
  // Pomiary rezystancji izolacji (Ω)
  insulationResistance: Array<{
    circuit: string; // np. "Obwód 1 - Oświetlenie"
    phase?: string; // L1, L2, L3, N
    resistance: number; // MΩ
    minRequired?: number; // minimum wymagane
    pass: boolean;
  }>;
  
  // Pomiary skuteczności ochrony (Ω)
  protectionEffectiveness: Array<{
    circuit: string;
    resistance: number; // mΩ
    maxAllowed?: number; // maksimum dozwolone
    pass: boolean;
  }>;
  
  // Pomiary napięcia, prądu, mocy
  measurements: Array<{
    circuit: string;
    voltage?: number; // V
    current?: number; // A
    power?: number; // W
    powerFactor?: number; // cos φ
  }>;
  
  // Ogólne
  measurementDate: Date;
  nextMeasurementDate?: Date; // zalecana data następnego pomiaru
  notes?: string;
  installationPassed: boolean; // czy instalacja przeszła odbiór
  recommendations?: string[];
}

export async function generateMeasurementProtocolPdf(
  data: MeasurementData,
  settings?: CompanySettings | null
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // ─── Nagłówek ─────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setTextColor(25, 99, 235); // blue-600
  doc.text("PROTOKÓŁ POMIAROWY", pageWidth / 2, yPosition, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text("Odbiór instalacji elektrycznej", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 12;
  doc.setDrawColor(25, 99, 235);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 5;

  // ─── Dane firmy ────────────────────────────────────────────────────────────
  if (settings?.name) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Wykonawca:", 15, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(settings.name, 50, yPosition);
    yPosition += 5;

    if (settings.address) {
      doc.text(settings.address, 50, yPosition);
      yPosition += 5;
    }
    if (settings.phone) {
      doc.text(`Tel: ${settings.phone}`, 50, yPosition);
      yPosition += 5;
    }
    if (settings.nip) {
      doc.text(`NIP: ${settings.nip}`, 50, yPosition);
      yPosition += 5;
    }
  }

  yPosition += 3;

  // ─── Dane instalacji ──────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DANE INSTALACJI", 15, yPosition);
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const installationInfo = [
    ["Adres instalacji:", data.installationAddress],
    ["Typ instalacji:", data.installationType === "mieszkanie" ? "Mieszkanie" : 
                       data.installationType === "dom" ? "Dom jednorodzinny" :
                       data.installationType === "biuro" ? "Biuro" :
                       data.installationType === "hala" ? "Hala produkcyjna" : "Inne"],
    ...(data.installationArea ? [["Powierzchnia:", `${data.installationArea} m²`]] : []),
    ["Napięcie zasilania:", data.voltage],
    ["Liczba faz:", `${data.phases}f`],
    ...(data.mainBreaker ? [["Główny wyłącznik:", data.mainBreaker]] : []),
  ];

  installationInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 50, yPosition);
    yPosition += 4;
  });

  yPosition += 3;

  // ─── Dane elektryka ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text("DANE ELEKTRYKA", 15, yPosition);
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Imię i nazwisko: ${data.electricianName}`, 15, yPosition);
  yPosition += 4;

  if (data.electricianLicense) {
    doc.text(`Nr uprawnień: ${data.electricianLicense}`, 15, yPosition);
    yPosition += 4;
  }

  if (data.electricianPhone) {
    doc.text(`Telefon: ${data.electricianPhone}`, 15, yPosition);
    yPosition += 4;
  }

  yPosition += 3;

  // ─── Pomiary rezystancji izolacji ─────────────────────────────────────────
  if (data.insulationResistance.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("POMIARY REZYSTANCJI IZOLACJI", 15, yPosition);
    yPosition += 5;

    const insulationTable = data.insulationResistance.map((m) => [
      m.circuit,
      m.phase || "-",
      `${m.resistance} MΩ`,
      m.minRequired ? `≥ ${m.minRequired} MΩ` : "≥ 0.5 MΩ",
      m.pass ? "✓ OK" : "✗ FAIL",
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Obwód", "Faza", "Pomiar", "Wymagane", "Wynik"]],
      body: insulationTable,
      theme: "grid",
      headStyles: { fillColor: [25, 99, 235], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        4: { textColor: data.insulationResistance.every((m) => m.pass) ? [34, 197, 94] : [239, 68, 68] },
      },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;
  }

  // ─── Pomiary skuteczności ochrony ─────────────────────────────────────────
  if (data.protectionEffectiveness.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("POMIARY SKUTECZNOŚCI OCHRONY (ZEROWANIE)", 15, yPosition);
    yPosition += 5;

    const protectionTable = data.protectionEffectiveness.map((m) => [
      m.circuit,
      `${m.resistance} mΩ`,
      m.maxAllowed ? `≤ ${m.maxAllowed} mΩ` : "≤ 2100 mΩ",
      m.pass ? "✓ OK" : "✗ FAIL",
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Obwód", "Pomiar", "Maksimum", "Wynik"]],
      body: protectionTable,
      theme: "grid",
      headStyles: { fillColor: [25, 99, 235], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        3: { textColor: data.protectionEffectiveness.every((m) => m.pass) ? [34, 197, 94] : [239, 68, 68] },
      },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;
  }

  // ─── Pomiary napięcia, prądu, mocy ─────────────────────────────────────────
  if (data.measurements.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("POMIARY NAPIĘCIA, PRĄDU, MOCY", 15, yPosition);
    yPosition += 5;

    const measurementsTable = data.measurements.map((m) => [
      m.circuit,
      m.voltage ? `${m.voltage} V` : "-",
      m.current ? `${m.current} A` : "-",
      m.power ? `${m.power} W` : "-",
      m.powerFactor ? `${m.powerFactor.toFixed(2)}` : "-",
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Obwód", "Napięcie", "Prąd", "Moc", "cos φ"]],
      body: measurementsTable,
      theme: "grid",
      headStyles: { fillColor: [25, 99, 235], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;
  }

  // ─── Wynik odbioru ────────────────────────────────────────────────────────
  yPosition += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  
  const [r, g, b] = data.installationPassed ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(r, g, b);
  const resultText = data.installationPassed ? "✓ INSTALACJA PRZESZŁA ODBIÓR" : "✗ INSTALACJA NIE PRZESZŁA ODBIORU";
  doc.text(resultText, pageWidth / 2, yPosition, { align: "center" });
  doc.setTextColor(0, 0, 0);

  yPosition += 8;

  // ─── Rekomendacje ─────────────────────────────────────────────────────────
  if (data.recommendations && data.recommendations.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("REKOMENDACJE:", 15, yPosition);
    yPosition += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    data.recommendations.forEach((rec) => {
      const lines = doc.splitTextToSize(`• ${rec}`, pageWidth - 30);
      doc.text(lines, 15, yPosition);
      yPosition += lines.length * 3 + 1;
    });

    yPosition += 2;
  }

  // ─── Uwagi ────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("UWAGI:", 15, yPosition);
    yPosition += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(noteLines, 15, yPosition);
    yPosition += noteLines.length * 3 + 2;
  }

  // ─── Data i podpisy ───────────────────────────────────────────────────────
  yPosition += 5;
  doc.setFontSize(8);
  doc.text(`Data pomiaru: ${format(data.measurementDate, "dd.MM.yyyy", { locale: pl })}`, 15, yPosition);
  yPosition += 4;

  if (data.nextMeasurementDate) {
    doc.text(
      `Następny pomiar zalecany: ${format(data.nextMeasurementDate, "dd.MM.yyyy", { locale: pl })}`,
      15,
      yPosition
    );
    yPosition += 4;
  }

  yPosition += 8;

  // Podpisy
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Podpis elektryka:", 15, yPosition);
  doc.line(15, yPosition + 2, 50, yPosition + 2);

  doc.text("Podpis odbiorcy:", pageWidth / 2, yPosition);
  doc.line(pageWidth / 2, yPosition + 2, pageWidth - 15, yPosition + 2);

  // ─── Stopka ───────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Wygenerowano: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: pl })}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  return doc.output("blob");
}
