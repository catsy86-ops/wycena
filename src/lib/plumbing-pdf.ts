/**
 * PDF Generation for Plumbing Pressure Test Protocols
 * Generowanie PDF protokołu próby ciśnieniowej szczelności instalacji (PN-EN 806-4 / PN-EN 14336)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PlumbingPressureProtocol, formatPlumbingDate } from "./plumbing-protocols";

interface PDFOptions {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
}

export function generatePlumbingProtocolPDF(
  protocol: PlumbingPressureProtocol,
  options: PDFOptions = {}
): jsPDF {
  const {
    companyName = "Instalatorstwo Hydrauliczne",
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
  const margin = 14;
  let yPos = margin;

  // Nagłówek firmy
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 116, 144); // cyan-700
  doc.text(companyName, margin, yPos);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const companyInfo = [companyAddress, companyPhone && `Tel: ${companyPhone}`, companyEmail && `Email: ${companyEmail}`, companyTaxId && `NIP: ${companyTaxId}`].filter(Boolean).join(" | ");
  if (companyInfo) {
    doc.text(companyInfo, margin, yPos);
    yPos += 6;
  }

  // Linia pozioma
  doc.setDrawColor(14, 116, 144);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Tytuł dokumentu
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("PROTOKÓŁ PRÓBY CIŚNIENIOWEJ SZCZELNOŚCI", pageWidth / 2, yPos, { align: "center" });
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Numer: ${protocol.number} | Data: ${formatPlumbingDate(protocol.date)}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Tabela z danymi instalacji i klienta
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2 },
    body: [
      [
        { content: "ZLECENIODAWCA / KLIENT:", styles: { fontStyle: "bold", textColor: [14, 116, 144] } },
        { content: "WYKONAWCA / INSTALATOR:", styles: { fontStyle: "bold", textColor: [14, 116, 144] } },
      ],
      [
        `Klient: ${protocol.clientName}\nAdres: ${protocol.clientAddress}${protocol.clientPhone ? `\nTel: ${protocol.clientPhone}` : ""}`,
        `Instalator: ${protocol.plumberName}${protocol.plumberLicense ? `\nUprawnienia: ${protocol.plumberLicense}` : ""}\nMiejsce próby: ${protocol.location}`,
      ],
    ],
  });

  yPos = (doc as any).lastAutoTable?.finalY ?? yPos + 25;
  yPos += 4;

  // Parametry techniczne próby
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 116, 144);
  doc.text("PARAMETRY I PRZEBIEG PRÓBY CIŚNIENIOWEJ", margin, yPos);
  yPos += 4;

  const typeLabels: Record<string, string> = {
    woda_zimna_ciepla: "Instalacja wody zimnej i ciepłej użytkowej (PN-EN 806-4)",
    centralne_ogrzewanie: "Instalacja centralnego ogrzewania grzejnikowego (PN-EN 14336)",
    ogrzewanie_podlogowe: "Instalacja ogrzewania podłogowego płaszczyznowego (PN-EN 14336)",
    kanalizacja: "Instalacja kanalizacji sanitarnej - próba napełnieniowa",
    gazowa: "Wewnętrzna instalacja gazowa",
  };

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    styles: { fontSize: 8 },
    head: [["Parametr", "Wartość zadana / Odczyt", "Jednostka / Norma"]],
    body: [
      ["Rodzaj instalacji", typeLabels[protocol.installationType] || protocol.installationType, "PN-EN"],
      ["Materiał rur i kształtek", protocol.pipeMaterial, "Atest PZH"],
      ["Czynnik próbny", protocol.testMedium, "-"],
      ["Ciśnienie robocze instalacji", `${protocol.workingPressureBar} bar`, "bar"],
      ["Wymagane ciśnienie próbne", `${protocol.testPressureBar} bar`, "1.3 - 1.5x robocze"],
      ["Czas trwania próby", `${protocol.durationMinutes} min`, "minuty"],
      ["Ciśnienie początkowe (start)", `${protocol.initialPressureBar} bar`, "odczyt z manometru"],
      ["Ciśnienie końcowe (koniec)", `${protocol.finalPressureBar} bar`, "odczyt z manometru"],
      ["Rzeczywisty spadek ciśnienia", `${protocol.pressureDropBar} bar`, "dopuszczalny: 0.0 bar"],
      ...(protocol.manometerSerial ? [["Nr seryjny manometru", protocol.manometerSerial, "Legalizowany"]] : []),
      ...(protocol.ambientTemperatureC ? [["Temperatura otoczenia", `${protocol.ambientTemperatureC} °C`, "°C"]] : []),
    ],
  });

  yPos = (doc as any).lastAutoTable?.finalY ?? yPos + 40;
  yPos += 6;

  // Wynik końcowy
  const isPassed = protocol.testResult === "pozytywny";
  doc.setFillColor(isPassed ? 236 : 254, isPassed ? 253 : 242, isPassed ? 245 : 242);
  doc.setDrawColor(isPassed ? 16 : 239, isPassed ? 185 : 68, isPassed ? 129 : 68);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 18, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPassed ? 22 : 185, isPassed ? 101 : 28, isPassed ? 52 : 28);
  const resultText = isPassed
    ? "ORZECZENIE: WYNIK PRÓBY POZYTYWNY (BRAK WYCIEKÓW I SPADKU CIŚNIENIA)"
    : "ORZECZENIE: WYNIK PRÓBY NEGATYWNY (STWIERDZONO NIESZCZELNOŚĆ)";
  doc.text(resultText, pageWidth / 2, yPos + 8, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    isPassed
      ? "Instalacja spełnia wymogi szczelności i nadaje się do eksploatacji / zalania jastrychem."
      : "Wymagana lokalizacja nieszczelności, usunięcie usterki i ponowne wykonanie próby.",
    pageWidth / 2,
    yPos + 14,
    { align: "center" }
  );

  yPos += 24;

  // Uwagi
  if (protocol.notes) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("UWAGI I ZALECENIA:", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text(protocol.notes, margin, yPos, { maxWidth: pageWidth - 2 * margin });
    yPos += 12;
  }

  // Sekcja podpisów
  yPos = Math.max(yPos + 8, pageHeight - 35);

  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  // Podpis wykonawcy
  doc.line(margin + 5, yPos + 12, margin + 65, yPos + 12);
  doc.text("Podpis i pieczęć instalatora", margin + 15, yPos + 16);

  // Podpis inwestora / klienta
  doc.line(pageWidth - margin - 65, yPos + 12, pageWidth - margin - 5, yPos + 12);
  doc.text("Podpis inwestora / klienta", pageWidth - margin - 55, yPos + 16);

  return doc;
}

export function downloadPlumbingProtocolPDF(
  protocol: PlumbingPressureProtocol,
  options: PDFOptions = {}
): void {
  const doc = generatePlumbingProtocolPDF(protocol, options);
  const cleanNumber = protocol.number.replace(/\//g, "-");
  doc.save(`Protokol_szczelnosci_${cleanNumber}.pdf`);
}
