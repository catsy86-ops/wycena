/**
 * Lokalny store dla działu elektrycznego.
 * Przechowuje: własne ceny cennika, szablony wycen.
 * Dane zapisywane w localStorage — trwałe między sesjami.
 */

import type { ElectricalPricingItem } from "@/app/api/pricing/electrical/route";
import type { QuoteItem, VatRate, Unit } from "@/types";

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface ElectricalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  items: Array<{
    name: string;
    qty: number;
    unit: string;
    priceId?: string;
    priceNetto: number;
    vatRate: number;
  }>;
  notes: string;
  usageCount: number;
  createdAt: string;
  isBuiltin: boolean;
}

// ─── Klucze localStorage ──────────────────────────────────────────────────────

const KEYS = {
  customPrices: "gksystem-electrical-prices",
  templates: "gksystem-electrical-templates",
};

// ─── Wbudowane szablony ───────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES: ElectricalTemplate[] = [
  {
    id: "tpl-mieszkanie-standard",
    name: "Wymiana instalacji — mieszkanie standard",
    description: "Kompleksowa wymiana instalacji elektrycznej w mieszkaniu 50-70m²",
    category: "instalacja",
    icon: "🏠",
    items: [
      { name: "Prowadzenie przewodów w bruździe", qty: 180, unit: "mb", priceId: "EL-IN-001", priceNetto: 55, vatRate: 8 },
      { name: "Montaż puszki instalacyjnej", qty: 36, unit: "szt", priceId: "EL-IN-004", priceNetto: 50, vatRate: 8 },
      { name: "Montaż gniazdka elektrycznego pojedynczego", qty: 20, unit: "szt", priceId: "EL-GN-001", priceNetto: 80, vatRate: 8 },
      { name: "Montaż gniazdka elektrycznego podwójnego", qty: 8, unit: "szt", priceId: "EL-GN-002", priceNetto: 100, vatRate: 8 },
      { name: "Montaż wyłącznika światła pojedynczego", qty: 8, unit: "szt", priceId: "EL-GN-004", priceNetto: 70, vatRate: 8 },
      { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001", priceNetto: 600, vatRate: 8 },
      { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: 12, unit: "szt", priceId: "EL-RZ-002", priceNetto: 60, vatRate: 8 },
      { name: "Montaż wyłącznika różnicowoprądowego (RCD)", qty: 2, unit: "szt", priceId: "EL-RZ-003", priceNetto: 120, vatRate: 8 },
      { name: "Montaż ochronnika przepięć (SPD)", qty: 1, unit: "szt", priceId: "EL-RZ-004", priceNetto: 200, vatRate: 8 },
      { name: "Pomiar rezystancji izolacji", qty: 12, unit: "obwód", priceId: "EL-PM-001", priceNetto: 80, vatRate: 23 },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 12, unit: "obwód", priceId: "EL-PM-002", priceNetto: 70, vatRate: 23 },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004", priceNetto: 400, vatRate: 23 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Szablon dla mieszkania ~60m². Dostosuj ilości do rzeczywistego metrażu.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
  {
    id: "tpl-oswietlenie-led",
    name: "Modernizacja oświetlenia LED",
    description: "Wymiana oświetlenia na LED w mieszkaniu lub biurze",
    category: "oswietlenie",
    icon: "💡",
    items: [
      { name: "Montaż oprawy podtynkowej (downlight)", qty: 12, unit: "szt", priceId: "EL-OS-003", priceNetto: 80, vatRate: 8 },
      { name: "Montaż taśmy LED (mb)", qty: 10, unit: "mb", priceId: "EL-OS-004", priceNetto: 40, vatRate: 8 },
      { name: "Montaż ściemniacza (dimmer)", qty: 3, unit: "szt", priceId: "EL-GN-006", priceNetto: 120, vatRate: 8 },
      { name: "Montaż wyłącznika światła pojedynczego", qty: 4, unit: "szt", priceId: "EL-GN-004", priceNetto: 70, vatRate: 8 },
      { name: "Prowadzenie przewodów w bruździe", qty: 40, unit: "mb", priceId: "EL-IN-001", priceNetto: 55, vatRate: 8 },
      { name: "Montaż puszki instalacyjnej", qty: 8, unit: "szt", priceId: "EL-IN-004", priceNetto: 50, vatRate: 8 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Modernizacja oświetlenia na LED. Dostosuj ilości do liczby pomieszczeń.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
  {
    id: "tpl-rozdzielnica",
    name: "Wymiana rozdzielnicy",
    description: "Wymiana tablicy elektrycznej z pomiarami odbioru",
    category: "rozdzielnia",
    icon: "⚡",
    items: [
      { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001", priceNetto: 600, vatRate: 8 },
      { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: 10, unit: "szt", priceId: "EL-RZ-002", priceNetto: 60, vatRate: 8 },
      { name: "Montaż wyłącznika różnicowoprądowego (RCD)", qty: 2, unit: "szt", priceId: "EL-RZ-003", priceNetto: 120, vatRate: 8 },
      { name: "Montaż ochronnika przepięć (SPD)", qty: 1, unit: "szt", priceId: "EL-RZ-004", priceNetto: 200, vatRate: 8 },
      { name: "Pomiar rezystancji izolacji", qty: 10, unit: "obwód", priceId: "EL-PM-001", priceNetto: 80, vatRate: 23 },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 10, unit: "obwód", priceId: "EL-PM-002", priceNetto: 70, vatRate: 23 },
      { name: "Pomiar wyłącznika różnicowoprądowego", qty: 2, unit: "szt", priceId: "EL-PM-003", priceNetto: 50, vatRate: 23 },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004", priceNetto: 400, vatRate: 23 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Wymiana rozdzielnicy z pełnym odbiorem. Dostosuj liczbę bezpieczników.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
  {
    id: "tpl-pomiary",
    name: "Pomiary elektryczne — odbiór",
    description: "Kompleksowe pomiary instalacji elektrycznej z protokołem",
    category: "pomiar",
    icon: "📋",
    items: [
      { name: "Pomiar rezystancji izolacji", qty: 10, unit: "obwód", priceId: "EL-PM-001", priceNetto: 80, vatRate: 23 },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 10, unit: "obwód", priceId: "EL-PM-002", priceNetto: 70, vatRate: 23 },
      { name: "Pomiar wyłącznika różnicowoprądowego", qty: 2, unit: "szt", priceId: "EL-PM-003", priceNetto: 50, vatRate: 23 },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004", priceNetto: 400, vatRate: 23 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Pomiary odbiorcze instalacji elektrycznej. Dostosuj liczbę obwodów.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
  {
    id: "tpl-ladowarka-ev",
    name: "Montaż ładowarki EV (wallbox)",
    description: "Instalacja punktu ładowania pojazdu elektrycznego",
    category: "instalacja",
    icon: "🔌",
    items: [
      { name: "Montaż ładowarki EV (wallbox)", qty: 1, unit: "szt", priceId: "EL-IN-009", priceNetto: 800, vatRate: 8 },
      { name: "Prowadzenie przewodów w rurce ochronnej (mb)", qty: 20, unit: "mb", priceId: "EL-IN-003", priceNetto: 45, vatRate: 8 },
      { name: "Rozbudowa rozdzielnicy (dodanie obwodu)", qty: 1, unit: "szt", priceId: "EL-RZ-006", priceNetto: 180, vatRate: 8 },
      { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: 1, unit: "szt", priceId: "EL-RZ-002", priceNetto: 60, vatRate: 8 },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 1, unit: "obwód", priceId: "EL-PM-002", priceNetto: 70, vatRate: 23 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Montaż ładowarki EV. Dostosuj długość trasy kablowej.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
  {
    id: "tpl-awaria",
    name: "Usunięcie awarii elektrycznej",
    description: "Lokalizacja i naprawa awarii instalacji elektrycznej",
    category: "naprawa",
    icon: "🔧",
    items: [
      { name: "Lokalizacja i usunięcie awarii elektrycznej", qty: 1, unit: "kpl", priceId: "EL-NA-001", priceNetto: 250, vatRate: 8 },
      { name: "Naprawa instalacji elektrycznej (godz)", qty: 2, unit: "godz", priceId: "EL-NA-002", priceNetto: 130, vatRate: 8 },
      { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: 80, vatRate: 23 },
    ],
    notes: "Naprawa awarii elektrycznej. Dostosuj czas pracy do zakresu.",
    usageCount: 0,
    createdAt: new Date().toISOString(),
    isBuiltin: true,
  },
];

// ─── Funkcje localStorage ─────────────────────────────────────────────────────

export function loadCustomPrices(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS.customPrices);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveCustomPrices(prices: Record<string, number>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.customPrices, JSON.stringify(prices));
}

export function loadUserTemplates(): ElectricalTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.templates);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveUserTemplates(templates: ElectricalTemplate[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.templates, JSON.stringify(templates));
}

export function getAllTemplates(): ElectricalTemplate[] {
  return [...BUILTIN_TEMPLATES, ...loadUserTemplates()];
}

export function incrementTemplateUsage(id: string): void {
  const user = loadUserTemplates();
  const idx = user.findIndex((t) => t.id === id);
  if (idx !== -1) {
    user[idx].usageCount++;
    saveUserTemplates(user);
  }
  // Dla wbudowanych — tylko w pamięci (nie persystujemy)
}
