/**
 * Plumbing Measurement Protocols & Standards (Hydraulika)
 * Biblioteka do generowania protokołów prób ciśnieniowych i szczelności instalacji wod-kan/CO/gaz
 * Zgodność z normami: PN-EN 806-4, PN-EN 14336, PN-EN 12056
 */

import { format } from "date-fns";
import { pl } from "date-fns/locale";

// ─── Typy Protokołów Hydraulicznych ──────────────────────────────────────────

export type PlumbingInstallationType = "woda_zimna_ciepla" | "centralne_ogrzewanie" | "ogrzewanie_podlogowe" | "kanalizacja" | "gazowa";

export interface PlumbingPressureProtocol {
  id: string;
  number: string;
  date: Date;
  location: string;
  clientName: string;
  clientAddress: string;
  clientPhone?: string;
  plumberName: string;
  plumberLicense?: string;
  installationType: PlumbingInstallationType;
  pipeMaterial: "PEX" | "Miedź" | "PP-R" | "Stal" | "Inne";
  testMedium: "woda" | "powietrze" | "gaz obojętny";
  testPressureBar: number; // np. 10 bar (1.5x robocze dla wody) lub 6 bar dla CO
  workingPressureBar: number; // ciśnienie robocze (np. 4 bar)
  durationMinutes: number; // czas trwania próby (np. 120 min)
  initialPressureBar: number; // ciśnienie początkowe
  finalPressureBar: number; // ciśnienie końcowe
  pressureDropBar: number; // spadek ciśnienia (musi być 0 lub <= dopuszczalny)
  testResult: "pozytywny" | "negatywny";
  manometerSerial?: string;
  ambientTemperatureC?: number;
  notes: string;
  status: "draft" | "completed" | "signed";
  signatureDate?: Date;
  signaturePlumber?: string;
  signatureClient?: string;
}

// ─── Normy Hydrauliczne ───────────────────────────────────────────────────────

export interface PlumbingStandard {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "woda" | "ogrzewanie" | "kanalizacja" | "gaz";
  year: number;
  requirements: string[];
}

export const PLUMBING_STANDARDS: PlumbingStandard[] = [
  {
    id: "pn-en-806-4",
    code: "PN-EN 806-4",
    title: "Wymagania dotyczące instalacji wodociągowych wewnątrz budynków - Próby ciśnieniowe",
    description: "Główna norma regulująca próby ciśnieniowe i płukanie instalacji wody pitnej",
    category: "woda",
    year: 2010,
    requirements: [
      "Próba ciśnieniowa z ciśnieniem 1.1x do 1.5x ciśnienia roboczego (min. 10 bar dla wody)",
      "Czas trwania próby min. 30 minut lub 2 godziny zależnie od materiału (PEX/PP/Cu)",
      "Dopuszczalny spadek ciśnienia: 0 bar (brak wycieków) lub wg wytycznych producenta rur",
      "Płukanie instalacji wodą zdatną do picia przed oddaniem do eksploatacji",
    ],
  },
  {
    id: "pn-en-14336",
    code: "PN-EN 14336",
    title: "Instalacje ogrzewcze w budynkach - Instalacja i odbiór wodnych instalacji grzewczych",
    description: "Norma odbiorcza instalacji c.o. i ogrzewania płaszczyznowego",
    category: "ogrzewanie",
    year: 2005,
    requirements: [
      "Próba na zimno pod ciśnieniem 1.3x ciśnienia roboczego (min. 4 bar)",
      "Próba na gorąco (rozgrzewanie do maksymalnej temperatury projektowej)",
      "Brak widocznych przecieków na złączkach, zaworach i rozdzielaczach",
      "Protokół wygrzewania jastrychu w przypadku ogrzewania podłogowego",
    ],
  },
  {
    id: "pn-en-12056",
    code: "PN-EN 12056",
    title: "Systemy kanalizacji grawitacyjnej wewnątrz budynków",
    description: "Zasady projektowania, wykonania i prób szczelności kanalizacji sanitarnej",
    category: "kanalizacja",
    year: 2002,
    requirements: [
      "Zachowanie normowych spadków: 1.5% - 3% dla podejść kanalizacyjnych",
      "Próba szczelności napełnieniem wodą do wysokości poziomu zalania",
      "Prawidłowe napowietrzenie pionów (wywiewki ponad dach)",
    ],
  },
];

// ─── Predefiniowane szablony prób ─────────────────────────────────────────────

export const PLUMBING_PROTOCOL_PRESETS = [
  {
    name: "Próba ciśnieniowa wody użytkowej (Z.W. i C.W.U.)",
    type: "woda_zimna_ciepla" as PlumbingInstallationType,
    medium: "woda" as const,
    defaultWorkingPressure: 4.0,
    defaultTestPressure: 10.0,
    durationMinutes: 120,
    norm: "PN-EN 806-4",
  },
  {
    name: "Próba szczelności centralnego ogrzewania (grzejniki)",
    type: "centralne_ogrzewanie" as PlumbingInstallationType,
    medium: "woda" as const,
    defaultWorkingPressure: 2.0,
    defaultTestPressure: 6.0,
    durationMinutes: 60,
    norm: "PN-EN 14336",
  },
  {
    name: "Próba ogrzewania podłogowego (pętle PEX przed zalaniem)",
    type: "ogrzewanie_podlogowe" as PlumbingInstallationType,
    medium: "woda" as const,
    defaultWorkingPressure: 2.5,
    defaultTestPressure: 6.0,
    durationMinutes: 120,
    norm: "PN-EN 14336",
  },
  {
    name: "Próba szczelności kanalizacji sanitarnej (napełnieniowa)",
    type: "kanalizacja" as PlumbingInstallationType,
    medium: "woda" as const,
    defaultWorkingPressure: 0.5,
    defaultTestPressure: 0.5,
    durationMinutes: 30,
    norm: "PN-EN 12056",
  },
];

export function formatPlumbingDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy", { locale: pl });
}
