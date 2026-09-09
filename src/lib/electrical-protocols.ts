/**
 * Electrical Measurement Protocols & Standards
 * Biblioteka do generowania protokołów pomiarowych i dokumentacji elektrycznej
 */

import { format } from "date-fns";
import { pl } from "date-fns/locale";

// ─── Typy Protokołów ──────────────────────────────────────────────────────────

export interface MeasurementProtocol {
  id: string;
  number: string;
  date: Date;
  location: string;
  clientName: string;
  clientAddress: string;
  electricianName: string;
  electricianLicense: string;
  installationType: "nowa" | "modernizacja" | "naprawa" | "przegląd";
  measurements: MeasurementEntry[];
  notes: string;
  status: "draft" | "completed" | "signed";
  signatureDate?: Date;
  signatureElectrician?: string;
  signatureClient?: string;
}

export interface MeasurementEntry {
  id: string;
  type: "voltage" | "current" | "resistance" | "continuity" | "earthing" | "insulation" | "rcd" | "breaker";
  description: string;
  location: string;
  expectedValue?: string;
  measuredValue: string;
  unit: string;
  status: "pass" | "fail" | "warning";
  notes?: string;
  norm?: string;
}

// ─── Normy SEP (Stowarzyszenie Elektryków Polskich) ──────────────────────────

export interface ElectricalStandard {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "installation" | "safety" | "measurement" | "materials" | "design";
  year: number;
  scope: string;
  keyRequirements: string[];
  relatedNorms: string[];
}

export const ELECTRICAL_STANDARDS: ElectricalStandard[] = [
  {
    id: "pn-hd-60364",
    code: "PN-HD 60364",
    title: "Instalacje elektryczne niskiego napięcia",
    description: "Główna norma dla instalacji elektrycznych w budynkach",
    category: "installation",
    year: 2016,
    scope: "Instalacje elektryczne w budynkach mieszkalnych, użyteczności publicznej i przemysłowych",
    keyRequirements: [
      "Ochrona przed porażeniem prądem",
      "Ochrona przed przegrzaniem",
      "Ochrona przed przetężeniami",
      "Uziemienie i zerowanie",
      "Selektywność zabezpieczeń",
    ],
    relatedNorms: ["PN-EN 60898-1", "PN-EN 60947-2", "PN-HD 60364-5-52"],
  },
  {
    id: "pn-hd-60364-5-52",
    code: "PN-HD 60364-5-52",
    title: "Dobór i montaż urządzeń elektrycznych - Przewody",
    description: "Norma dotycząca doboru przekrojów przewodów",
    category: "materials",
    year: 2016,
    scope: "Dobór przekrojów przewodów w instalacjach elektrycznych",
    keyRequirements: [
      "Obciążalność prądowa przewodów",
      "Spadek napięcia",
      "Ochrona przed przegrzaniem",
      "Metody montażu",
      "Warunki otoczenia",
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 60898-1"],
  },
  {
    id: "pn-en-60898-1",
    code: "PN-EN 60898-1",
    title: "Wyłączniki automatyczne do ochrony instalacji",
    description: "Norma dla wyłączników automatycznych",
    category: "safety",
    year: 2016,
    scope: "Wyłączniki automatyczne do ochrony instalacji elektrycznych",
    keyRequirements: [
      "Charakterystyka wyzwalania",
      "Prąd znamionowy",
      "Zdolność wyłączająca",
      "Selektywność",
      "Testy i badania",
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 60947-2"],
  },
  {
    id: "pn-en-61008-1",
    code: "PN-EN 61008-1",
    title: "Wyłączniki różnicowoprądowe",
    description: "Norma dla wyłączników RCD",
    category: "safety",
    year: 2012,
    scope: "Wyłączniki różnicowoprądowe do ochrony przed porażeniem",
    keyRequirements: [
      "Prąd różnicowoprądowy znamionowy",
      "Czas wyzwalania",
      "Selektywność",
      "Testy funkcjonalne",
      "Ochrona przed porażeniem",
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 61009-1"],
  },
  {
    id: "pn-en-61009-1",
    code: "PN-EN 61009-1",
    title: "Wyłączniki różnicowoprądowe z wbudowaną ochroną",
    description: "Norma dla wyłączników RCBO",
    category: "safety",
    year: 2012,
    scope: "Wyłączniki różnicowoprądowe z wbudowaną ochroną przed przetężeniami",
    keyRequirements: [
      "Ochrona przed porażeniem",
      "Ochrona przed przetężeniami",
      "Selektywność",
      "Testy i badania",
    ],
    relatedNorms: ["PN-EN 61008-1", "PN-EN 60898-1"],
  },
  {
    id: "pn-en-60950-1",
    code: "PN-EN 60950-1",
    title: "Bezpieczeństwo urządzeń elektrycznych",
    description: "Norma bezpieczeństwa dla urządzeń elektrycznych",
    category: "safety",
    year: 2005,
    scope: "Bezpieczeństwo urządzeń elektrycznych do użytku domowego i podobnego",
    keyRequirements: [
      "Ochrona przed porażeniem",
      "Ochrona przed przegrzaniem",
      "Ochrona przed pożarem",
      "Ochrona mechaniczna",
      "Testy bezpieczeństwa",
    ],
    relatedNorms: ["PN-HD 60364"],
  },
  {
    id: "pn-en-61557",
    code: "PN-EN 61557",
    title: "Bezpieczeństwo - Urządzenia do badania, pomiaru, nadzoru i sygnalizacji",
    description: "Norma dla urządzeń pomiarowych",
    category: "measurement",
    year: 2007,
    scope: "Urządzenia do pomiaru parametrów instalacji elektrycznych",
    keyRequirements: [
      "Dokładność pomiarów",
      "Bezpieczeństwo operatora",
      "Kalibracja",
      "Procedury pomiarowe",
      "Dokumentacja",
    ],
    relatedNorms: ["PN-HD 60364"],
  },
  {
    id: "pn-en-50160",
    code: "PN-EN 50160",
    title: "Charakterystyka napięcia zasilającego",
    description: "Norma dotycząca jakości napięcia",
    category: "measurement",
    year: 2010,
    scope: "Charakterystyka napięcia w publicznych sieciach zasilających",
    keyRequirements: [
      "Częstotliwość",
      "Amplituda napięcia",
      "Odkształcenia harmoniczne",
      "Fluktuacje napięcia",
      "Niezrównoważenie faz",
    ],
    relatedNorms: ["PN-HD 60364"],
  },
  {
    id: "pn-en-60364-4-41",
    code: "PN-EN 60364-4-41",
    title: "Ochrona przed porażeniem prądem",
    description: "Norma ochrony przed porażeniem",
    category: "safety",
    year: 2016,
    scope: "Ochrona przed bezpośrednim i pośrednim porażeniem prądem",
    keyRequirements: [
      "Ochrona przed bezpośrednim porażeniem",
      "Ochrona przed pośrednim porażeniem",
      "Uziemienie",
      "Zerowanie",
      "Wyłączniki RCD",
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 61008-1"],
  },
  {
    id: "pn-en-60364-4-43",
    code: "PN-EN 60364-4-43",
    title: "Ochrona przed przetężeniami",
    description: "Norma ochrony przed przetężeniami",
    category: "safety",
    year: 2016,
    scope: "Ochrona instalacji przed przetężeniami prądowymi",
    keyRequirements: [
      "Dobór bezpieczników",
      "Dobór wyłączników",
      "Koordynacja zabezpieczeń",
      "Selektywność",
      "Testy",
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 60898-1"],
  },
];

// ─── Funkcje Pomocnicze ───────────────────────────────────────────────────────

export function getStandardByCode(code: string): ElectricalStandard | undefined {
  return ELECTRICAL_STANDARDS.find((s) => s.code === code);
}

export function getStandardsByCategory(category: ElectricalStandard["category"]): ElectricalStandard[] {
  return ELECTRICAL_STANDARDS.filter((s) => s.category === category);
}

export function getRelatedStandards(code: string): ElectricalStandard[] {
  const standard = getStandardByCode(code);
  if (!standard) return [];
  return standard.relatedNorms
    .map((code) => getStandardByCode(code))
    .filter(Boolean) as ElectricalStandard[];
}

// ─── Szablony Protokołów ──────────────────────────────────────────────────────

export interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  installationType: MeasurementProtocol["installationType"];
  measurements: Omit<MeasurementEntry, "id" | "measuredValue" | "status">[];
  relatedNorms: string[];
}

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: "new-installation",
    name: "Protokół Nowej Instalacji",
    description: "Pełny protokół pomiarowy dla nowej instalacji elektrycznej",
    installationType: "nowa",
    measurements: [
      {
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        unit: "V",
        norm: "PN-EN 50160",
      },
      {
        type: "continuity",
        description: "Ciągłość przewodów ochronnych",
        location: "Wszystkie obwody",
        expectedValue: "< 0,1 Ω",
        unit: "Ω",
        norm: "PN-HD 60364-6-61",
      },
      {
        type: "insulation",
        description: "Rezystancja izolacji",
        location: "Wszystkie obwody",
        expectedValue: "> 1 MΩ",
        unit: "MΩ",
        norm: "PN-HD 60364-6-61",
      },
      {
        type: "earthing",
        description: "Rezystancja uziemienia",
        location: "Uziemienie główne",
        expectedValue: "< 10 Ω",
        unit: "Ω",
        norm: "PN-HD 60364-5-54",
      },
      {
        type: "rcd",
        description: "Test wyłącznika RCD",
        location: "Wszystkie RCD",
        expectedValue: "< 30 mA",
        unit: "mA",
        norm: "PN-EN 61008-1",
      },
      {
        type: "breaker",
        description: "Test wyłącznika automatycznego",
        location: "Wszystkie wyłączniki",
        expectedValue: "Prawidłowe wyzwalanie",
        unit: "-",
        norm: "PN-EN 60898-1",
      },
    ],
    relatedNorms: ["PN-HD 60364", "PN-HD 60364-6-61", "PN-EN 61008-1"],
  },
  {
    id: "modernization",
    name: "Protokół Modernizacji",
    description: "Protokół dla modernizacji istniejącej instalacji",
    installationType: "modernizacja",
    measurements: [
      {
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        unit: "V",
        norm: "PN-EN 50160",
      },
      {
        type: "insulation",
        description: "Rezystancja izolacji",
        location: "Zmodernizowane obwody",
        expectedValue: "> 1 MΩ",
        unit: "MΩ",
        norm: "PN-HD 60364-6-61",
      },
      {
        type: "continuity",
        description: "Ciągłość przewodów ochronnych",
        location: "Zmodernizowane obwody",
        expectedValue: "< 0,1 Ω",
        unit: "Ω",
        norm: "PN-HD 60364-6-61",
      },
    ],
    relatedNorms: ["PN-HD 60364", "PN-HD 60364-6-61"],
  },
  {
    id: "periodic-inspection",
    name: "Protokół Przeglądu Okresowego",
    description: "Protokół przeglądu okresowego instalacji",
    installationType: "przegląd",
    measurements: [
      {
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        unit: "V",
        norm: "PN-EN 50160",
      },
      {
        type: "insulation",
        description: "Rezystancja izolacji",
        location: "Wszystkie obwody",
        expectedValue: "> 1 MΩ",
        unit: "MΩ",
        norm: "PN-HD 60364-6-61",
      },
      {
        type: "rcd",
        description: "Test wyłącznika RCD",
        location: "Wszystkie RCD",
        expectedValue: "< 30 mA",
        unit: "mA",
        norm: "PN-EN 61008-1",
      },
    ],
    relatedNorms: ["PN-HD 60364", "PN-EN 61008-1"],
  },
  {
    id: "repair",
    name: "Protokół Naprawy",
    description: "Protokół dla naprawy instalacji",
    installationType: "naprawa",
    measurements: [
      {
        type: "voltage",
        description: "Napięcie zasilające",
        location: "Rozdzielnica główna",
        expectedValue: "230V ±10%",
        unit: "V",
        norm: "PN-EN 50160",
      },
      {
        type: "continuity",
        description: "Ciągłość przewodów ochronnych",
        location: "Naprawione obwody",
        expectedValue: "< 0,1 Ω",
        unit: "Ω",
        norm: "PN-HD 60364-6-61",
      },
    ],
    relatedNorms: ["PN-HD 60364"],
  },
];

export function getProtocolTemplate(id: string): ProtocolTemplate | undefined {
  return PROTOCOL_TEMPLATES.find((t) => t.id === id);
}

export function createProtocolFromTemplate(
  templateId: string,
  overrides: Partial<MeasurementProtocol>
): MeasurementProtocol | null {
  const template = getProtocolTemplate(templateId);
  if (!template) return null;

  const measurements = template.measurements.map((m) => ({
    ...m,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    measuredValue: "",
    status: "pass" as const,
  }));

  return {
    id: `proto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    number: `PROTO/${format(new Date(), "yyyy/MM")}/${Math.floor(Math.random() * 10000)}`,
    date: new Date(),
    location: "",
    clientName: "",
    clientAddress: "",
    electricianName: "",
    electricianLicense: "",
    installationType: template.installationType,
    measurements,
    notes: "",
    status: "draft",
    ...overrides,
  };
}

// ─── Walidacja Pomiarów ────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMeasurement(entry: MeasurementEntry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!entry.measuredValue) {
    errors.push(`Brak wartości zmierzonej dla: ${entry.description}`);
  }

  // Walidacja napięcia
  if (entry.type === "voltage") {
    const value = parseFloat(entry.measuredValue);
    if (value < 207 || value > 253) {
      warnings.push(`Napięcie ${value}V poza normą PN-EN 50160 (207-253V)`);
    }
  }

  // Walidacja rezystancji izolacji
  if (entry.type === "insulation") {
    const value = parseFloat(entry.measuredValue);
    if (value < 1) {
      errors.push(`Rezystancja izolacji ${value}MΩ poniżej minimum 1MΩ`);
    }
  }

  // Walidacja ciągłości
  if (entry.type === "continuity") {
    const value = parseFloat(entry.measuredValue);
    if (value > 0.1) {
      warnings.push(`Rezystancja ciągłości ${value}Ω powyżej 0,1Ω`);
    }
  }

  // Walidacja uziemienia
  if (entry.type === "earthing") {
    const value = parseFloat(entry.measuredValue);
    if (value > 10) {
      errors.push(`Rezystancja uziemienia ${value}Ω powyżej 10Ω`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateProtocol(protocol: MeasurementProtocol): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!protocol.clientName) errors.push("Brak nazwy klienta");
  if (!protocol.location) errors.push("Brak lokalizacji");
  if (!protocol.electricianName) errors.push("Brak imienia i nazwiska elektryka");
  if (!protocol.electricianLicense) errors.push("Brak numeru licencji elektryka");

  if (protocol.measurements.length === 0) {
    errors.push("Brak pomiarów w protokole");
  }

  protocol.measurements.forEach((m) => {
    const validation = validateMeasurement(m);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Formatowanie Danych ──────────────────────────────────────────────────────

export function formatProtocolDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "-";
  return format(d, "dd.MM.yyyy", { locale: pl });
}

export function formatProtocolDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "-";
  return format(d, "dd.MM.yyyy HH:mm", { locale: pl });
}

export function getMeasurementStatusLabel(status: MeasurementEntry["status"]): string {
  const labels: Record<MeasurementEntry["status"], string> = {
    pass: "✓ Prawidłowy",
    fail: "✗ Nieprawidłowy",
    warning: "⚠ Ostrzeżenie",
  };
  return labels[status];
}

export function getMeasurementStatusColor(status: MeasurementEntry["status"]): string {
  const colors: Record<MeasurementEntry["status"], string> = {
    pass: "text-green-600",
    fail: "text-red-600",
    warning: "text-amber-600",
  };
  return colors[status];
}
