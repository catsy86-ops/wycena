"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClientStore } from "@/store/client-store";
import { useQuoteStore } from "@/store/quote-store";
import { useSettingsStore } from "@/store/settings-store";
import type { QuoteItem, VatRate, Unit, QuoteStatus, QuoteAdditionalCost } from "@/types";
import { VAT_RATE_LABELS, UNIT_LABELS } from "@/types";
import { calcQuoteItem, calcQuoteTotals, formatCurrency, round } from "@/lib/calculations";
import {
  loadCustomPrices, saveCustomPrices, getAllTemplates,
  incrementTemplateUsage, type ElectricalTemplate,
} from "@/lib/electrical-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Zap, ArrowLeft, Users, Plus, Trash2, Search, RefreshCw,
  Cable, CircuitBoard, Lightbulb, Power, Plug, Wrench,
  Calculator, FileText, Copy, Brain,
  AlertTriangle, CheckCircle2, Info, Loader2, Edit2, Save,
  LayoutTemplate, Sparkles, Home, Car, Sun,
} from "lucide-react";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { motion, AnimatePresence } from "framer-motion";
import { ScrewRow, ElectricalBadge, CurrentIndicator, WireProgress } from "@/components/electrical-decorations";
import type { ElectricalPricingItem } from "@/app/api/pricing/electrical/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

function makeItem(defaults: Partial<QuoteItem> = {}, vatRate: VatRate = 8): QuoteItem {
  return calcQuoteItem({
    id: genId(), name: "", quantity: 1, unit: "szt",
    priceNettoPerUnit: 0, vatRate, discountPercent: 0,
    nettotal: 0, vatAmount: 0, bruttoTotal: 0, ...defaults,
  });
}
function makeCost(): QuoteAdditionalCost {
  return { id: genId(), name: "", amount: 0, vatRate: 23, category: "inne" };
}

// ─── Kategorie ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "gniazda",     label: "Gniazda/Wyłączniki", icon: Plug,         color: "from-teal-500 to-cyan-600" },
  { id: "oswietlenie", label: "Oświetlenie",         icon: Lightbulb,    color: "from-purple-500 to-violet-600" },
  { id: "instalacja",  label: "Instalacja",          icon: Cable,        color: "from-amber-500 to-yellow-600" },
  { id: "rozdzielnia", label: "Rozdzielnie",         icon: Power,        color: "from-blue-500 to-indigo-600" },
  { id: "pomiar",      label: "Pomiary",             icon: CircuitBoard, color: "from-green-500 to-emerald-600" },
  { id: "naprawa",     label: "Naprawa/Awarie",      icon: Wrench,       color: "from-orange-500 to-red-600" },
  { id: "robocizna",   label: "Robocizna",           icon: Zap,          color: "from-yellow-500 to-amber-600" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// KALKULATOR PRZEKROJU KABLA
// Algorytm wg normy PN-HD 60364-5-52 i IEC 60364
// ═══════════════════════════════════════════════════════════════════════════════

// Rezystywność miedzi [Ω·mm²/m] w temp. 70°C
const COPPER_RESISTIVITY = 0.0225;
// Rezystywność aluminium [Ω·mm²/m] w temp. 70°C
const ALUMINUM_RESISTIVITY = 0.036;

// Dopuszczalne obciążalności prądowe [A] dla kabli YDY w instalacji podtynkowej
// wg PN-HD 60364-5-52, tabela B.52.2 (metoda B2 — w rurce w ścianie)
const CABLE_AMPACITY: Record<number, { cu: number; al: number; name: string }> = {
  1.5:  { cu: 13.5, al: 0,    name: "1,5 mm²" },
  2.5:  { cu: 18.0, al: 13.5, name: "2,5 mm²" },
  4:    { cu: 24.0, al: 18.0, name: "4 mm²"   },
  6:    { cu: 31.0, al: 24.0, name: "6 mm²"   },
  10:   { cu: 42.0, al: 32.0, name: "10 mm²"  },
  16:   { cu: 56.0, al: 43.0, name: "16 mm²"  },
  25:   { cu: 73.0, al: 57.0, name: "25 mm²"  },
  35:   { cu: 89.0, al: 70.0, name: "35 mm²"  },
  50:   { cu: 108,  al: 86.0, name: "50 mm²"  },
  70:   { cu: 136,  al: 108,  name: "70 mm²"  },
  95:   { cu: 164,  al: 130,  name: "95 mm²"  },
  120:  { cu: 188,  al: 150,  name: "120 mm²" },
};

const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Maksymalny dopuszczalny spadek napięcia wg normy [%]
// PN-EN 50160: instalacje odbiorcze ≤ 4% dla oświetlenia, ≤ 5% dla siły
const MAX_VOLTAGE_DROP_LIGHTING = 3; // % — oświetlenie (bardziej restrykcyjne)
const MAX_VOLTAGE_DROP_POWER    = 5; // % — gniazda/siła

export interface CableCalcInput {
  currentA: number;        // prąd obciążenia [A]
  lengthM: number;         // długość kabla [m] (w jedną stronę)
  voltageV: number;        // napięcie [V]: 230 (1-faz) lub 400 (3-faz)
  phases: 1 | 3;           // liczba faz
  material: "cu" | "al";   // materiał: miedź / aluminium
  circuitType: "lighting" | "power"; // typ obwodu
  powerFactor?: number;    // cos φ (domyślnie 1.0 dla rezystancyjnych)
}

export interface CableCalcResult {
  // Wybrany przekrój
  recommendedSection: number;   // mm²
  recommendedName: string;
  // Sprawdzenie obciążalności
  ampacity: number;             // dopuszczalny prąd [A]
  ampacityOk: boolean;
  ampacityMargin: number;       // zapas [%]
  // Spadek napięcia dla wybranego przekroju
  voltageDrop: number;          // [V]
  voltageDropPercent: number;   // [%]
  voltageDropOk: boolean;
  maxAllowedDropPercent: number;
  // Rezystancja kabla
  resistance: number;           // [Ω]
  // Alternatywne przekroje
  alternatives: Array<{
    section: number;
    name: string;
    ampacity: number;
    voltageDrop: number;
    voltageDropPercent: number;
    voltageDropOk: boolean;
    ampacityOk: boolean;
  }>;
  // Ostrzeżenia
  warnings: string[];
  // Zalecenie
  recommendation: string;
}

export function calcCableSection(input: CableCalcInput): CableCalcResult {
  const {
    currentA, lengthM, voltageV, phases, material,
    circuitType, powerFactor = 1.0,
  } = input;

  const resistivity = material === "cu" ? COPPER_RESISTIVITY : ALUMINUM_RESISTIVITY;
  const maxDropPct = circuitType === "lighting" ? MAX_VOLTAGE_DROP_LIGHTING : MAX_VOLTAGE_DROP_POWER;
  const warnings: string[] = [];

  // Współczynnik długości: dla 1-faz = 2L (tam i z powrotem), dla 3-faz = √3·L
  const lengthFactor = phases === 1 ? 2 : Math.sqrt(3);

  // Funkcja obliczająca spadek napięcia dla danego przekroju [mm²]
  function calcDrop(section: number): { drop: number; dropPct: number; resistance: number } {
    const resistance = (resistivity * lengthFactor * lengthM) / section;
    const drop = currentA * resistance * powerFactor;
    const dropPct = (drop / voltageV) * 100;
    return { drop: round(drop * 100) / 100, dropPct: round(dropPct * 100) / 100, resistance: round(resistance * 1000) / 1000 };
  }

  // Znajdź minimalny przekrój spełniający OBYDWA warunki:
  // 1. Obciążalność prądowa ≥ prąd obciążenia
  // 2. Spadek napięcia ≤ dopuszczalny
  let recommendedSection = STANDARD_SECTIONS[STANDARD_SECTIONS.length - 1];

  for (const section of STANDARD_SECTIONS) {
    const data = CABLE_AMPACITY[section];
    if (!data) continue;
    const ampacity = material === "cu" ? data.cu : data.al;
    if (ampacity === 0) continue; // aluminium niedostępne dla małych przekrojów

    const { dropPct } = calcDrop(section);

    if (ampacity >= currentA && dropPct <= maxDropPct) {
      recommendedSection = section;
      break;
    }
  }

  const recData = CABLE_AMPACITY[recommendedSection];
  const recAmpacity = material === "cu" ? recData.cu : recData.al;
  const { drop, dropPct, resistance } = calcDrop(recommendedSection);
  const ampacityMargin = round(((recAmpacity - currentA) / recAmpacity) * 100);

  // Ostrzeżenia
  if (currentA > 200) warnings.push("Bardzo duży prąd — skonsultuj z projektantem");
  if (lengthM > 100) warnings.push("Długa trasa — rozważ zwiększenie przekroju o 1 stopień");
  if (material === "al" && recommendedSection < 10) warnings.push("Aluminium niedostępne dla przekrojów < 10 mm²");
  if (dropPct > maxDropPct * 0.8) warnings.push("Spadek napięcia bliski granicy — rozważ większy przekrój");
  if (phases === 1 && currentA > 32) warnings.push("Duży prąd 1-fazowy — rozważ zasilanie 3-fazowe");

  // Alternatywy (sąsiednie przekroje)
  const alternatives = STANDARD_SECTIONS
    .filter((s) => s !== recommendedSection)
    .slice(0, 6)
    .map((section) => {
      const d = CABLE_AMPACITY[section];
      if (!d) return null;
      const amp = material === "cu" ? d.cu : d.al;
      if (amp === 0) return null;
      const { drop: altDrop, dropPct: altDropPct } = calcDrop(section);
      return {
        section,
        name: d.name,
        ampacity: amp,
        voltageDrop: altDrop,
        voltageDropPercent: altDropPct,
        voltageDropOk: altDropPct <= maxDropPct,
        ampacityOk: amp >= currentA,
      };
    })
    .filter(Boolean) as CableCalcResult["alternatives"];

  let recommendation = "";
  if (ampacityMargin > 30 && dropPct < maxDropPct * 0.5) {
    recommendation = `Przekrój ${recData.name} — duży zapas. Można rozważyć mniejszy jeśli trasa jest krótka.`;
  } else if (ampacityMargin < 10) {
    recommendation = `Przekrój ${recData.name} — mały zapas prądowy. Zalecane zwiększenie o 1 stopień.`;
  } else {
    recommendation = `Przekrój ${recData.name} — optymalny dobór wg normy PN-HD 60364-5-52.`;
  }

  return {
    recommendedSection,
    recommendedName: recData.name,
    ampacity: recAmpacity,
    ampacityOk: recAmpacity >= currentA,
    ampacityMargin,
    voltageDrop: drop,
    voltageDropPercent: dropPct,
    voltageDropOk: dropPct <= maxDropPct,
    maxAllowedDropPercent: maxDropPct,
    resistance,
    alternatives,
    warnings,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KALKULATOR ZABEZPIECZEŃ
// Algorytm wg normy PN-EN 60898-1 i PN-HD 60364-4-43
// ═══════════════════════════════════════════════════════════════════════════════

// Charakterystyki wyzwalania wg PN-EN 60898-1:
// B: 3–5×In  — oświetlenie, gniazda, obwody rezystancyjne
// C: 5–10×In — silniki, transformatory, obwody indukcyjne
// D: 10–20×In — duże silniki, spawarki, obwody z dużymi prądami rozruchowymi

export type BreakerChar = "B" | "C" | "D";
export type BreakerRating = 6 | 10 | 13 | 16 | 20 | 25 | 32 | 40 | 50 | 63;

const BREAKER_RATINGS: BreakerRating[] = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];

export interface BreakerCalcInput {
  powerW: number;           // moc urządzenia [W]
  voltageV: number;         // napięcie [V]: 230 lub 400
  phases: 1 | 3;            // liczba faz
  powerFactor: number;      // cos φ (0.5–1.0)
  loadType: "resistive" | "inductive" | "motor" | "lighting" | "mixed";
  // Opcjonalne — dla dokładniejszego doboru
  startingCurrentMultiplier?: number; // krotność prądu rozruchowego (np. 6 dla silnika)
  simultaneousFactor?: number;        // współczynnik jednoczesności (0–1)
  cableSection?: number;              // przekrój kabla [mm²] — do sprawdzenia koordynacji
}

export interface BreakerCalcResult {
  // Prąd obciążenia
  loadCurrentA: number;
  // Zalecany bezpiecznik
  recommendedRating: BreakerRating;
  recommendedChar: BreakerChar;
  recommendedName: string;
  // Sprawdzenie
  ratingOk: boolean;
  utilizationPercent: number;   // % wykorzystania bezpiecznika
  // Prąd rozruchowy
  startingCurrentA: number;
  startingCurrentOk: boolean;   // czy bezpiecznik wytrzyma rozruch
  // Koordynacja z kablem
  cableCoordinationOk: boolean | null;
  cableMaxCurrent: number | null;
  // Alternatywy
  alternatives: Array<{
    rating: BreakerRating;
    char: BreakerChar;
    name: string;
    utilizationPercent: number;
    startingCurrentOk: boolean;
    cableCoordinationOk: boolean | null;
    recommended: boolean;
  }>;
  // Ostrzeżenia i zalecenia
  warnings: string[];
  recommendation: string;
  // Norma
  norm: string;
}

export function calcBreaker(input: BreakerCalcInput): BreakerCalcResult {
  const {
    powerW, voltageV, phases, powerFactor,
    loadType, startingCurrentMultiplier, simultaneousFactor = 1.0,
    cableSection,
  } = input;

  const warnings: string[] = [];

  // ── Oblicz prąd obciążenia ────────────────────────────────────────────────
  let loadCurrentA: number;
  if (phases === 1) {
    loadCurrentA = powerW / (voltageV * powerFactor);
  } else {
    // 3-faz: P = √3 · U_L · I · cos φ
    loadCurrentA = powerW / (Math.sqrt(3) * voltageV * powerFactor);
  }
  loadCurrentA = round(loadCurrentA * simultaneousFactor * 100) / 100;

  // ── Dobór charakterystyki wyzwalania ─────────────────────────────────────
  let char: BreakerChar;
  let startMult: number;

  switch (loadType) {
    case "motor":
      char = "C";
      startMult = startingCurrentMultiplier ?? 6;
      break;
    case "inductive":
      char = "C";
      startMult = startingCurrentMultiplier ?? 4;
      break;
    case "lighting":
      char = "B";
      startMult = startingCurrentMultiplier ?? 1.5; // świetlówki/LED mają mały prąd rozruchowy
      break;
    case "resistive":
      char = "B";
      startMult = startingCurrentMultiplier ?? 1.0;
      break;
    default: // mixed
      char = "B";
      startMult = startingCurrentMultiplier ?? 2.0;
  }

  const startingCurrentA = round(loadCurrentA * startMult * 100) / 100;

  // ── Dobór znamionowego prądu bezpiecznika ─────────────────────────────────
  // Warunek 1: In ≥ Ib (prąd znamionowy ≥ prąd obciążenia)
  // Warunek 2: bezpiecznik musi wytrzymać prąd rozruchowy
  // Dla char B: Imax_rozruch = 5 × In, dla C: 10 × In, dla D: 20 × In
  const charMultiplier = char === "B" ? 5 : char === "C" ? 10 : 20;

  let recommendedRating = BREAKER_RATINGS[BREAKER_RATINGS.length - 1];
  for (const rating of BREAKER_RATINGS) {
    const maxStartCurrent = rating * charMultiplier;
    if (rating >= loadCurrentA && maxStartCurrent >= startingCurrentA) {
      recommendedRating = rating;
      break;
    }
  }

  // ── Koordynacja z kablem ──────────────────────────────────────────────────
  let cableCoordinationOk: boolean | null = null;
  let cableMaxCurrent: number | null = null;

  if (cableSection && CABLE_AMPACITY[cableSection]) {
    cableMaxCurrent = CABLE_AMPACITY[cableSection].cu; // zakładamy miedź
    // Warunek koordynacji: In ≤ Iz (prąd znamionowy ≤ obciążalność kabla)
    cableCoordinationOk = recommendedRating <= cableMaxCurrent;
    if (!cableCoordinationOk) {
      warnings.push(`Bezpiecznik ${recommendedRating}A przekracza obciążalność kabla ${cableSection}mm² (${cableMaxCurrent}A) — zwiększ przekrój kabla`);
    }
  }

  // ── Ostrzeżenia ───────────────────────────────────────────────────────────
  const utilizationPercent = round((loadCurrentA / recommendedRating) * 100);
  if (utilizationPercent > 90) warnings.push("Bezpiecznik bardzo mocno obciążony (>90%) — rozważ wyższy rating");
  if (utilizationPercent < 40) warnings.push("Bezpiecznik słabo wykorzystany (<40%) — można rozważyć niższy rating");
  if (loadType === "motor" && char === "B") warnings.push("Dla silników zalecana charakterystyka C lub D");
  if (powerFactor < 0.7) warnings.push("Niski cos φ — rozważ kompensację mocy biernej");
  if (phases === 1 && loadCurrentA > 32) warnings.push("Duży prąd 1-fazowy — rozważ zasilanie 3-fazowe");

  // ── Alternatywy ───────────────────────────────────────────────────────────
  const chars: BreakerChar[] = ["B", "C", "D"];
  const alternatives = BREAKER_RATINGS.flatMap((rating) =>
    chars.map((c) => {
      const mult = c === "B" ? 5 : c === "C" ? 10 : 20;
      const startOk = rating * mult >= startingCurrentA;
      const util = round((loadCurrentA / rating) * 100);
      const cableOk = cableMaxCurrent !== null ? rating <= cableMaxCurrent : null;
      return {
        rating,
        char: c,
        name: `${c}${rating}`,
        utilizationPercent: util,
        startingCurrentOk: startOk,
        cableCoordinationOk: cableOk,
        recommended: rating === recommendedRating && c === char,
      };
    })
  ).filter((a) => a.rating >= loadCurrentA && a.startingCurrentOk)
   .sort((a, b) => a.rating - b.rating || a.char.localeCompare(b.char))
   .slice(0, 8);

  // ── Zalecenie ─────────────────────────────────────────────────────────────
  const charDesc = char === "B" ? "obwody rezystancyjne/oświetlenie" : char === "C" ? "silniki/obwody indukcyjne" : "duże silniki/spawarki";
  const recommendation = `Wyłącznik ${char}${recommendedRating} — charakterystyka ${char} (${charDesc}). Prąd obciążenia: ${loadCurrentA.toFixed(2)} A, wykorzystanie: ${utilizationPercent}%.`;

  return {
    loadCurrentA,
    recommendedRating,
    recommendedChar: char,
    recommendedName: `${char}${recommendedRating}`,
    ratingOk: recommendedRating >= loadCurrentA,
    utilizationPercent,
    startingCurrentA,
    startingCurrentOk: recommendedRating * charMultiplier >= startingCurrentA,
    cableCoordinationOk,
    cableMaxCurrent,
    alternatives,
    warnings,
    recommendation,
    norm: "PN-EN 60898-1, PN-HD 60364-4-43",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPONENT: Kalkulator Przekroju Kabla
// ═══════════════════════════════════════════════════════════════════════════════

function CableCalculator({ onAddToQuote }: { onAddToQuote?: (items: Partial<QuoteItem>[]) => void }) {
  const [current, setCurrent] = useState(16);
  const [length, setLength] = useState(20);
  const [voltage, setVoltage] = useState<230 | 400>(230);
  const [phases, setPhases] = useState<1 | 3>(1);
  const [material, setMaterial] = useState<"cu" | "al">("cu");
  const [circuitType, setCircuitType] = useState<"lighting" | "power">("power");
  const [powerFactor, setPowerFactor] = useState(1.0);

  const result = useMemo(() => {
    if (current <= 0 || length <= 0) return null;
    return calcCableSection({ currentA: current, lengthM: length, voltageV: voltage, phases, material, circuitType, powerFactor });
  }, [current, length, voltage, phases, material, circuitType, powerFactor]);

  const statusColor = result
    ? result.voltageDropOk && result.ampacityOk
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
    : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Parametry wejściowe */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold">Prąd obciążenia [A]</Label>
          <Input type="number" min="0.1" max="630" step="0.5" value={current}
            onChange={(e) => setCurrent(parseFloat(e.target.value) || 1)}
            className="mt-1 h-9 font-mono" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Prąd znamionowy odbiornika</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Długość trasy [m]</Label>
          <Input type="number" min="1" max="1000" step="1" value={length}
            onChange={(e) => setLength(parseFloat(e.target.value) || 1)}
            className="mt-1 h-9 font-mono" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Odległość od rozdzielnicy</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Napięcie [V]</Label>
          <Select value={String(voltage)} onValueChange={(v) => { setVoltage(parseInt(v ?? "230") as 230 | 400); setPhases(v === "400" ? 3 : 1); }}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="230">230 V (1-fazowe)</SelectItem>
              <SelectItem value="400">400 V (3-fazowe)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Materiał przewodnika</Label>
          <Select value={material} onValueChange={(v) => setMaterial(v as "cu" | "al")}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cu">Miedź (Cu) — zalecana</SelectItem>
              <SelectItem value="al">Aluminium (Al)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Typ obwodu</Label>
          <Select value={circuitType} onValueChange={(v) => setCircuitType(v as "lighting" | "power")}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="power">Gniazda / siła (max 5% ΔU)</SelectItem>
              <SelectItem value="lighting">Oświetlenie (max 3% ΔU)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Cos φ (współczynnik mocy)</Label>
          <Input type="number" min="0.5" max="1.0" step="0.05" value={powerFactor}
            onChange={(e) => setPowerFactor(Math.min(1, Math.max(0.5, parseFloat(e.target.value) || 1)))}
            className="mt-1 h-9 font-mono" />
          <p className="text-[10px] text-muted-foreground mt-0.5">1.0 = rezystancyjny, 0.8 = indukcyjny</p>
        </div>
      </div>

      {/* Wynik */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* Główny wynik */}
          <div className="rounded-xl border-2 p-4 space-y-3"
            style={{ borderColor: result.voltageDropOk && result.ampacityOk ? "oklch(0.55 0.18 155 / 0.5)" : "oklch(0.60 0.20 25 / 0.5)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Zalecany przekrój</div>
                <div className={`text-3xl font-black mt-1 ${statusColor}`}>{result.recommendedName}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{result.recommendation}</div>
              </div>
              <div className="text-right space-y-1">
                <div className={`flex items-center gap-1 text-sm font-semibold justify-end ${result.ampacityOk ? "text-green-600" : "text-red-600"}`}>
                  {result.ampacityOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  Obciążalność: {result.ampacity} A
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold justify-end ${result.voltageDropOk ? "text-green-600" : "text-red-600"}`}>
                  {result.voltageDropOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  Spadek: {result.voltageDropPercent}% (max {result.maxAllowedDropPercent}%)
                </div>
              </div>
            </div>

            {/* Paski */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Wykorzystanie obciążalności</span>
                  <span className="font-semibold">{round((current / result.ampacity) * 100)}% ({current} A / {result.ampacity} A)</span>
                </div>
                <WireProgress percent={round((current / result.ampacity) * 100)} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Spadek napięcia</span>
                  <span className="font-semibold">{result.voltageDropPercent}% = {result.voltageDrop} V</span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden bg-accent/50">
                  <motion.div className="h-full rounded-full"
                    style={{ background: result.voltageDropOk ? "oklch(0.55 0.18 155)" : "oklch(0.60 0.20 25)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (result.voltageDropPercent / result.maxAllowedDropPercent) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
              </div>
            </div>

            {/* Szczegóły techniczne */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Rezystancja kabla</div>
                <div className="font-bold text-sm">{result.resistance} Ω</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Zapas prądowy</div>
                <div className="font-bold text-sm">{result.ampacityMargin}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Norma</div>
                <div className="font-bold text-[10px]">PN-HD 60364-5-52</div>
              </div>
            </div>
          </div>

          {/* Ostrzeżenia */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {w}
                </div>
              ))}
            </div>
          )}

          {/* Tabela alternatyw */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Porównanie przekrojów</div>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-accent/30 text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Przekrój</th>
                    <th className="text-right py-2 px-2 font-medium">Obciążalność</th>
                    <th className="text-right py-2 px-2 font-medium">Spadek U</th>
                    <th className="text-center py-2 px-2 font-medium">Prąd OK</th>
                    <th className="text-center py-2 px-2 font-medium">Spadek OK</th>
                  </tr>
                </thead>
                <tbody>
                  {[result.recommendedSection, ...result.alternatives.map((a) => a.section)]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .sort((a, b) => a - b)
                    .map((section) => {
                      const isRec = section === result.recommendedSection;
                      const alt = result.alternatives.find((a) => a.section === section);
                      const ampacity = isRec ? result.ampacity : (alt?.ampacity ?? 0);
                      const dropPct = isRec ? result.voltageDropPercent : (alt?.voltageDropPercent ?? 0);
                      const ampOk = ampacity >= current;
                      const dropOk = dropPct <= result.maxAllowedDropPercent;
                      return (
                        <tr key={section} className={`border-b border-border/30 ${isRec ? "bg-amber-50 dark:bg-amber-950/30 font-semibold" : ""}`}>
                          <td className="py-2 px-3">
                            {CABLE_AMPACITY[section]?.name}
                            {isRec && <Badge className="ml-2 text-[9px] px-1 py-0 bg-amber-100 text-amber-700">zalecany</Badge>}
                          </td>
                          <td className="py-2 px-2 text-right">{ampacity} A</td>
                          <td className="py-2 px-2 text-right">{dropPct}%</td>
                          <td className="py-2 px-2 text-center">{ampOk ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}</td>
                          <td className="py-2 px-2 text-center">{dropOk ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dodaj do wyceny */}
          {onAddToQuote && (
            <Button className="w-full btn-switch" onClick={() => {
              onAddToQuote([{
                name: `Prowadzenie przewodów ${result.recommendedName} ${material === "cu" ? "Cu" : "Al"} — ${phases === 1 ? "1-faz" : "3-faz"} ${voltage}V`,
                unit: "mb" as Unit,
                priceNettoPerUnit: 55,
                vatRate: 8 as VatRate,
              }]);
              toast.success(`Dodano kabel ${result.recommendedName} do wyceny`);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Dodaj kabel {result.recommendedName} do wyceny
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPONENT: Kalkulator Zabezpieczeń
// ═══════════════════════════════════════════════════════════════════════════════

const LOAD_TYPE_LABELS: Record<string, string> = {
  resistive:  "Rezystancyjny (grzejnik, bojler)",
  lighting:   "Oświetlenie (LED, świetlówki)",
  inductive:  "Indukcyjny (transformator, cewka)",
  motor:      "Silnik elektryczny",
  mixed:      "Mieszany (gniazda ogólne)",
};

function BreakerCalculator({ onAddToQuote }: { onAddToQuote?: (items: Partial<QuoteItem>[]) => void }) {
  const [power, setPower] = useState(2000);
  const [voltage, setVoltage] = useState<230 | 400>(230);
  const [phases, setPhases] = useState<1 | 3>(1);
  const [powerFactor, setPowerFactor] = useState(1.0);
  const [loadType, setLoadType] = useState<"resistive" | "inductive" | "motor" | "lighting" | "mixed">("mixed");
  const [cableSection, setCableSection] = useState<number | undefined>(undefined);
  const [simultaneousFactor, setSimultaneousFactor] = useState(1.0);

  const result = useMemo(() => {
    if (power <= 0) return null;
    return calcBreaker({
      powerW: power, voltageV: voltage, phases, powerFactor,
      loadType, cableSection, simultaneousFactor,
    });
  }, [power, voltage, phases, powerFactor, loadType, cableSection, simultaneousFactor]);

  const charColors: Record<string, string> = {
    B: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    C: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    D: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="space-y-4">
      {/* Parametry */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold">Moc urządzenia [W]</Label>
          <Input type="number" min="1" max="500000" step="100" value={power}
            onChange={(e) => setPower(parseFloat(e.target.value) || 1)}
            className="mt-1 h-9 font-mono" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Moc znamionowa lub sumaryczna</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Napięcie zasilania</Label>
          <Select value={String(voltage)} onValueChange={(v) => { setVoltage(parseInt(v ?? "230") as 230 | 400); setPhases(v === "400" ? 3 : 1); }}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="230">230 V (1-fazowe)</SelectItem>
              <SelectItem value="400">400 V (3-fazowe)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Typ obciążenia</Label>
          <Select value={loadType} onValueChange={(v) => setLoadType(v as typeof loadType)}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LOAD_TYPE_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Cos φ (współczynnik mocy)</Label>
          <Input type="number" min="0.5" max="1.0" step="0.05" value={powerFactor}
            onChange={(e) => setPowerFactor(Math.min(1, Math.max(0.5, parseFloat(e.target.value) || 1)))}
            className="mt-1 h-9 font-mono" />
        </div>
        <div>
          <Label className="text-xs font-semibold">Wsp. jednoczesności</Label>
          <Input type="number" min="0.1" max="1.0" step="0.05" value={simultaneousFactor}
            onChange={(e) => setSimultaneousFactor(Math.min(1, Math.max(0.1, parseFloat(e.target.value) || 1)))}
            className="mt-1 h-9 font-mono" />
          <p className="text-[10px] text-muted-foreground mt-0.5">1.0 = wszystkie urządzenia jednocześnie</p>
        </div>
        <div>
          <Label className="text-xs font-semibold">Przekrój kabla [mm²] (opcja)</Label>
          <Select value={cableSection ? String(cableSection) : "none"}
            onValueChange={(v) => setCableSection(v === "none" || v === null ? undefined : parseFloat(v ?? "0") || undefined)}>
            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Nie sprawdzaj" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nie sprawdzaj koordynacji</SelectItem>
              {[1.5, 2.5, 4, 6, 10, 16, 25, 35, 50].map((s) => (
                <SelectItem key={s} value={String(s)}>{s} mm²</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Wynik */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* Główny wynik */}
          <div className="rounded-xl border-2 p-4 space-y-3"
            style={{ borderColor: "oklch(0.72 0.18 60 / 0.5)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Zalecany wyłącznik</div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-4xl font-black" style={{ color: "oklch(0.72 0.18 60)" }}>
                    {result.recommendedName}
                  </div>
                  <Badge className={`text-sm px-3 py-1 font-bold ${charColors[result.recommendedChar]}`}>
                    Char. {result.recommendedChar}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{result.recommendation}</div>
              </div>
              <div className="text-right space-y-1 shrink-0">
                <div className="text-xs text-muted-foreground">Prąd obciążenia</div>
                <div className="text-2xl font-black">{result.loadCurrentA.toFixed(2)} A</div>
                <div className="text-xs text-muted-foreground">Prąd rozruchowy</div>
                <div className="text-lg font-bold">{result.startingCurrentA.toFixed(1)} A</div>
              </div>
            </div>

            {/* Pasek wykorzystania */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Wykorzystanie bezpiecznika</span>
                <span className="font-semibold">{result.utilizationPercent}%</span>
              </div>
              <WireProgress percent={result.utilizationPercent} />
            </div>

            {/* Statusy */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/50">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${result.ratingOk ? "text-green-600" : "text-red-600"}`}>
                {result.ratingOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Prąd znam. OK
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${result.startingCurrentOk ? "text-green-600" : "text-red-600"}`}>
                {result.startingCurrentOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Rozruch OK
              </div>
              {result.cableCoordinationOk !== null && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${result.cableCoordinationOk ? "text-green-600" : "text-red-600"}`}>
                  {result.cableCoordinationOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  Koordynacja z kablem
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                {result.norm}
              </div>
            </div>
          </div>

          {/* Legenda charakterystyk */}
          <div className="grid grid-cols-3 gap-2">
            {(["B", "C", "D"] as const).map((c) => (
              <div key={c} className={`rounded-lg p-2 text-xs ${charColors[c]} ${result.recommendedChar === c ? "ring-2 ring-offset-1 ring-current" : "opacity-60"}`}>
                <div className="font-bold">Char. {c}</div>
                <div className="mt-0.5 opacity-80">
                  {c === "B" ? "3–5×In — oświetlenie, gniazda" : c === "C" ? "5–10×In — silniki, transformatory" : "10–20×In — duże silniki, spawarki"}
                </div>
              </div>
            ))}
          </div>

          {/* Ostrzeżenia */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {w}
                </div>
              ))}
            </div>
          )}

          {/* Tabela alternatyw */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Alternatywne dobory</div>
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-accent/30 text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Wyłącznik</th>
                    <th className="text-center py-2 px-2 font-medium">Char.</th>
                    <th className="text-right py-2 px-2 font-medium">Wykorzystanie</th>
                    <th className="text-center py-2 px-2 font-medium">Rozruch</th>
                    {result.cableCoordinationOk !== null && <th className="text-center py-2 px-2 font-medium">Kabel</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.alternatives.map((alt) => (
                    <tr key={`${alt.char}${alt.rating}`}
                      className={`border-b border-border/30 ${alt.recommended ? "bg-amber-50 dark:bg-amber-950/30 font-semibold" : ""}`}>
                      <td className="py-2 px-3">
                        {alt.name}
                        {alt.recommended && <Badge className="ml-2 text-[9px] px-1 py-0 bg-amber-100 text-amber-700">zalecany</Badge>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${charColors[alt.char]}`}>{alt.char}</span>
                      </td>
                      <td className="py-2 px-2 text-right">{alt.utilizationPercent}%</td>
                      <td className="py-2 px-2 text-center">
                        {alt.startingCurrentOk ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                      </td>
                      {result.cableCoordinationOk !== null && (
                        <td className="py-2 px-2 text-center">
                          {alt.cableCoordinationOk === null ? "—" : alt.cableCoordinationOk
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" />
                            : <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dodaj do wyceny */}
          {onAddToQuote && (
            <Button className="w-full btn-switch" onClick={() => {
              onAddToQuote([{
                name: `Montaż wyłącznika nadprądowego ${result.recommendedName}`,
                unit: "szt" as Unit,
                priceNettoPerUnit: 60,
                vatRate: 8 as VatRate,
              }]);
              toast.success(`Dodano wyłącznik ${result.recommendedName} do wyceny`);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Dodaj wyłącznik {result.recommendedName} do wyceny
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDYTOWALNY WIERSZ CENNIKA
// ═══════════════════════════════════════════════════════════════════════════════

function PricelistRow({ item, onEdit, onAdd }: {
  item: ElectricalPricingItem;
  onEdit: (id: string, price: number) => void;
  onAdd: (item: ElectricalPricingItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(item.priceNetto);
  const cat = CATEGORIES.find((c) => c.id === item.category);

  return (
    <motion.tr layout className="border-b border-border/50 hover:bg-accent/30 transition-colors">
      <td className="py-2.5 px-3">
        <div className="font-medium text-sm">{item.name}</div>
        {item.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</div>}
        {item.norm && <span className="text-[10px] text-muted-foreground/60">{item.norm}</span>}
      </td>
      <td className="py-2.5 px-2 text-center">{cat && <ElectricalBadge>{cat.label}</ElectricalBadge>}</td>
      <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">{item.unit}</td>
      <td className="py-2.5 px-2 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <Input type="number" min="0" step="1" value={editPrice}
              onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
              className="h-7 w-24 text-right text-xs" autoFocus />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
              onClick={() => { onEdit(item.id, editPrice); setEditing(false); }}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end">
            <span className="font-semibold text-sm">{formatCurrency(item.priceNetto)}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100"
              onClick={() => { setEditPrice(item.priceNetto); setEditing(true); }}>
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">{formatCurrency(item.priceMin)}–{formatCurrency(item.priceMax)}</div>
      </td>
      <td className="py-2.5 px-2 text-center text-xs">{item.vatRate}%</td>
      <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">
        {item.laborMinutes && item.laborMinutes > 0
          ? item.laborMinutes >= 60 ? `${Math.floor(item.laborMinutes / 60)}h${item.laborMinutes % 60 > 0 ? ` ${item.laborMinutes % 60}m` : ""}` : `${item.laborMinutes}m`
          : "—"}
      </td>
      <td className="py-2.5 px-2">
        <Button size="sm" className="h-7 text-xs btn-switch" onClick={() => onAdd(item)}>
          <Plus className="h-3 w-3 mr-1" /> Dodaj
        </Button>
      </td>
    </motion.tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNA STRONA
// ═══════════════════════════════════════════════════════════════════════════════

export default function NowaWycenaElektrycznaPage() {
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const settings = useSettingsStore((s) => s.settings);
  const addQuote = useQuoteStore((s) => s.add);

  // ── Klient ────────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNip, setClientNip] = useState("");

  // ── Pozycje ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<QuoteItem[]>([makeItem({}, settings?.defaultVatRate || 8)]);
  const [additionalCosts, setAdditionalCosts] = useState<QuoteAdditionalCost[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [activeTab, setActiveTab] = useState("items");

  // ── Cennik API ────────────────────────────────────────────────────────────
  const [pricelist, setPricelist] = useState<ElectricalPricingItem[]>([]);
  const [pricelistLoading, setPricelistLoading] = useState(false);
  const [pricelistError, setPricelistError] = useState("");
  const [pricelistSearch, setPricelistSearch] = useState("");
  const [pricelistCategory, setPricelistCategory] = useState("all");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  // ── Szablony ──────────────────────────────────────────────────────────────
  const [templates] = useState<ElectricalTemplate[]>(() => getAllTemplates());

  // ── AI ────────────────────────────────────────────────────────────────────
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ items: any[]; notes: string; confidence: number } | null>(null);

  // ── Ładuj ceny z localStorage ─────────────────────────────────────────────
  useEffect(() => {
    setCustomPrices(loadCustomPrices());
  }, []);

  // ── Pobierz cennik ────────────────────────────────────────────────────────
  const fetchPricelist = useCallback(async (query = "", category = "all") => {
    setPricelistLoading(true); setPricelistError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/pricing/electrical?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPricelist(data.items || []);
    } catch {
      setPricelistError("Błąd pobierania cennika.");
      toast.error("Nie udało się pobrać cennika");
    } finally { setPricelistLoading(false); }
  }, []);

  useEffect(() => { fetchPricelist(); }, [fetchPricelist]);

  // ── Filtrowany cennik z własnymi cenami ───────────────────────────────────
  const filteredPricelist = useMemo(() => {
    let list = pricelist.map((item) => ({ ...item, priceNetto: customPrices[item.id] ?? item.priceNetto }));
    if (pricelistCategory !== "all") list = list.filter((i) => i.category === pricelistCategory);
    if (pricelistSearch) {
      const q = pricelistSearch.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [pricelist, customPrices, pricelistCategory, pricelistSearch]);

  // ── Edycja ceny (trwała) ──────────────────────────────────────────────────
  function handleEditPrice(id: string, price: number) {
    const updated = { ...customPrices, [id]: price };
    setCustomPrices(updated);
    saveCustomPrices(updated);
    toast.success("Cena zapisana trwale w cenniku");
  }

  // ── Dodaj z cennika ───────────────────────────────────────────────────────
  function addFromPricelist(priceItem: ElectricalPricingItem) {
    const price = customPrices[priceItem.id] ?? priceItem.priceNetto;
    const newItem = makeItem({ name: priceItem.name, unit: priceItem.unit as Unit, priceNettoPerUnit: price, vatRate: priceItem.vatRate as VatRate });
    setItems((prev) => [...prev.filter((i) => i.name !== "" || i.priceNettoPerUnit > 0), newItem]);
    toast.success(`Dodano: ${priceItem.name}`);
  }

  // ── Dodaj z kalkulatora ───────────────────────────────────────────────────
  function addFromCalculator(partials: Partial<QuoteItem>[]) {
    const newItems = partials.map((p) => makeItem(p, (p.vatRate as VatRate) || 8));
    setItems((prev) => [...prev.filter((i) => i.name !== "" || i.priceNettoPerUnit > 0), ...newItems]);
    setActiveTab("items");
  }

  // ── Wczytaj szablon ───────────────────────────────────────────────────────
  function loadTemplate(tpl: ElectricalTemplate) {
    const newItems = tpl.items.map((ti) => makeItem({
      name: ti.name, quantity: ti.qty, unit: ti.unit as Unit,
      priceNettoPerUnit: customPrices[ti.priceId ?? ""] ?? ti.priceNetto,
      vatRate: ti.vatRate as VatRate,
    }));
    setItems(newItems);
    if (tpl.notes) setNotes(tpl.notes);
    incrementTemplateUsage(tpl.id);
    toast.success(`Wczytano szablon: ${tpl.name}`);
    setActiveTab("items");
  }

  // ── AI sugestie ───────────────────────────────────────────────────────────
  async function handleAiSuggest() {
    if (!aiDescription.trim()) { toast.error("Opisz zakres prac"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "electrical_suggest", description: aiDescription }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch { toast.error("Błąd AI"); }
    finally { setAiLoading(false); }
  }

  function applyAiResult() {
    if (!aiResult) return;
    const newItems = aiResult.items.map((ai: any) => makeItem({
      name: ai.name, quantity: ai.qty, unit: ai.unit as Unit,
      priceNettoPerUnit: customPrices[ai.priceId ?? ""] ?? (pricelist.find((p) => p.id === ai.priceId)?.priceNetto ?? 0),
      vatRate: 8 as VatRate,
    }));
    setItems((prev) => [...prev.filter((i) => i.name !== "" || i.priceNettoPerUnit > 0), ...newItems]);
    if (aiResult.notes) setNotes(aiResult.notes);
    setAiResult(null);
    setAiDescription("");
    toast.success(`Dodano ${newItems.length} pozycji z AI`);
    setActiveTab("items");
  }

  // ── Klient ────────────────────────────────────────────────────────────────
  function handleClientSelect(clientId: string) {
    if (!clientId || clientId === "none") {
      setSelectedClientId(null);
      setClientName(""); setClientAddress(""); setClientPhone(""); setClientEmail(""); setClientNip("");
      return;
    }
    const client = clients.find((c) => c.id === parseInt(clientId));
    if (client) {
      setSelectedClientId(client.id!);
      setClientName(client.name); setClientAddress(client.address || "");
      setClientPhone(client.phone); setClientEmail(client.email || ""); setClientNip(client.nip || "");
    }
  }

  // ── Pozycje CRUD ──────────────────────────────────────────────────────────
  function updateItem(id: string, updates: Partial<QuoteItem>) {
    setItems((prev) => prev.map((i) => i.id !== id ? i : calcQuoteItem({ ...i, ...updates })));
  }
  function removeItem(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function copyItem(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: genId(), name: `${prev[idx].name} (kopia)` };
      const next = [...prev]; next.splice(idx + 1, 0, copy); return next;
    });
  }

  // ── Koszty CRUD ───────────────────────────────────────────────────────────
  function updateCost(id: string, updates: Partial<QuoteAdditionalCost>) {
    setAdditionalCosts((prev) => prev.map((c) => c.id !== id ? c : { ...c, ...updates }));
  }
  function removeCost(id: string) { setAdditionalCosts((prev) => prev.filter((c) => c.id !== id)); }

  // ── Sumy ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() => calcQuoteTotals(items, additionalCosts, globalDiscount), [items, additionalCosts, globalDiscount]);

  // ── Zapis ─────────────────────────────────────────────────────────────────
  async function handleSave(status: QuoteStatus = "szkic") {
    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) { toast.error("Dodaj przynajmniej jedną pozycję do wyceny"); return; }
    if (!clientName.trim()) { toast.error("Wprowadź nazwę klienta lub wybierz go z listy"); return; }
    const recalc = validItems.map(calcQuoteItem);
    const validCosts = additionalCosts.filter((c) => c.name.trim());
    const t = calcQuoteTotals(recalc, validCosts, globalDiscount);
    const id = await addQuote({
      clientId: selectedClientId || undefined, clientName,
      clientAddress: clientAddress || undefined, clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined, clientNip: clientNip || undefined,
      items: recalc, additionalCosts: validCosts, progressiveDiscounts: [],
      globalDiscountPercent: globalDiscount, notes: notes || undefined, status,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      totalNetto: t.totalNetto, totalVat: t.totalVat, totalBrutto: t.totalBrutto,
    });
    toast.success(status === "szkic" ? "Zapisano jako szkic" : "Wycena elektryczna utworzona");
    router.push(`/wyceny/${id}`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <StaggerContainer className="space-y-5 max-w-5xl mx-auto pb-24 lg:pb-6">

        {/* Header */}
        <StaggerItem>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/elektryka")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                <Zap className="h-7 w-7" style={{ color: "oklch(0.72 0.18 60)" }} />
                Nowa wycena elektryczna
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Cennik API · Szablony · Kalkulatory · AI sugestie</p>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem><CurrentIndicator active /></StaggerItem>

        {/* Klient */}
        <StaggerItem>
          <Card className="card-electrical">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" style={{ color: "oklch(0.72 0.18 60)" }} /> Dane klienta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select onValueChange={(v) => handleClientSelect(v ?? "none")} value={selectedClientId ? String(selectedClientId) : "none"}>
                <SelectTrigger><SelectValue placeholder="Wybierz klienta z bazy..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nowy klient</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label className="text-xs">Nazwa klienta</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Imię i nazwisko / Firma" className="mt-1" /></div>
                <div><Label className="text-xs">Telefon</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Numer telefonu" className="mt-1" /></div>
                <div><Label className="text-xs">Email</Label>
                  <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" className="mt-1" /></div>
                <div><Label className="text-xs">NIP</Label>
                  <Input value={clientNip} onChange={(e) => setClientNip(e.target.value)} placeholder="NIP (opcjonalnie)" className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Adres realizacji</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adres" className="mt-1" /></div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Główne taby */}
        <StaggerItem>
          <Card className="card-electrical">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" style={{ color: "oklch(0.72 0.18 60)" }} /> Wycena
                  </CardTitle>
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="items" className="text-xs">Pozycje ({items.filter(i => i.name).length})</TabsTrigger>
                    <TabsTrigger value="szablony" className="text-xs"><LayoutTemplate className="h-3 w-3 mr-1" />Szablony</TabsTrigger>
                    <TabsTrigger value="cennik" className="text-xs"><Zap className="h-3 w-3 mr-1" />Cennik API</TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs"><Brain className="h-3 w-3 mr-1" />AI</TabsTrigger>
                    <TabsTrigger value="kabel" className="text-xs"><Cable className="h-3 w-3 mr-1" />Kabel</TabsTrigger>
                    <TabsTrigger value="bezpiecznik" className="text-xs"><Zap className="h-3 w-3 mr-1" />Bezpiecznik</TabsTrigger>
                    <TabsTrigger value="koszty" className="text-xs">Koszty ({additionalCosts.length})</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>

              {/* ── Pozycje ── */}
              <TabsContent value="items">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("szablony")}>
                      <LayoutTemplate className="h-3.5 w-3.5 mr-1" /> Szablon
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("cennik")}>
                      <Zap className="h-3.5 w-3.5 mr-1" /> Z cennika
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("ai")}>
                      <Brain className="h-3.5 w-3.5 mr-1" /> AI sugestie
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, makeItem({}, settings?.defaultVatRate || 8)])}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Ręcznie
                    </Button>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Zap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      Brak pozycji — wybierz szablon, dodaj z cennika lub użyj AI
                    </div>
                  ) : (
                    <AnimatePresence>
                      {items.map((item, idx) => (
                        <motion.div key={item.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="rounded-xl border border-border/60 p-3 bg-accent/20 space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground w-5 pt-2 shrink-0">{idx + 1}.</span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="sm:col-span-2">
                                <Input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                  placeholder="Nazwa usługi / pozycji" className="h-9 font-medium" />
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div><Label className="text-[10px] text-muted-foreground">Ilość</Label>
                                  <Input type="number" min="0.01" step="0.01" value={item.quantity}
                                    onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                                    className="h-8 text-sm" /></div>
                                <div><Label className="text-[10px] text-muted-foreground">Jedn.</Label>
                                  <Select value={item.unit} onValueChange={(v) => updateItem(item.id, { unit: v as Unit })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(UNIT_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                                  </Select></div>
                                <div><Label className="text-[10px] text-muted-foreground">VAT</Label>
                                  <Select value={String(item.vatRate)} onValueChange={(v) => updateItem(item.id, { vatRate: parseInt(v ?? "8") as VatRate })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                                  </Select></div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div><Label className="text-[10px] text-muted-foreground">Cena netto/jedn.</Label>
                                  <Input type="number" min="0" step="0.01" value={item.priceNettoPerUnit}
                                    onChange={(e) => updateItem(item.id, { priceNettoPerUnit: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-sm" /></div>
                                <div><Label className="text-[10px] text-muted-foreground">Rabat %</Label>
                                  <Input type="number" min="0" max="100" step="1" value={item.discountPercent}
                                    onChange={(e) => updateItem(item.id, { discountPercent: parseFloat(e.target.value) || 0 })}
                                    className="h-8 text-sm" /></div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="text-right">
                                <div className="font-bold text-sm" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(item.bruttoTotal)}</div>
                                <div className="text-[10px] text-muted-foreground">brutto</div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => copyItem(item.id)}>
                                  <Copy className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── Szablony ── */}
              <TabsContent value="szablony">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((tpl) => {
                      const cat = CATEGORIES.find((c) => c.id === tpl.category);
                      const Icon = cat?.icon ?? Zap;
                      return (
                        <motion.button key={tpl.id} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => loadTemplate(tpl)}
                          className="rounded-xl border border-border/60 p-4 text-left hover:border-amber-400 dark:hover:border-amber-600 transition-all group bg-card">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat?.color ?? "from-amber-500 to-yellow-600"} shadow-lg shrink-0`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{tpl.icon} {tpl.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{tpl.items.length} pozycji</span>
                                {tpl.isBuiltin && <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700">wbudowany</Badge>}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </CardContent>
              </TabsContent>

              {/* ── Cennik API ── */}
              <TabsContent value="cennik">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Szukaj w cenniku..." value={pricelistSearch}
                        onChange={(e) => setPricelistSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={pricelistCategory} onValueChange={(v) => setPricelistCategory(v ?? "all")}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Kategoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => fetchPricelist(pricelistSearch, pricelistCategory)} disabled={pricelistLoading}>
                      {pricelistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                  {pricelistError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {pricelistError}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Kliknij <Edit2 className="h-3 w-3 inline" /> aby edytować cenę — zmiany zapisują się trwale.
                    Znaleziono: <strong>{filteredPricelist.length}</strong> pozycji
                  </div>
                  {pricelistLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Pobieranie cennika...
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-accent/30 text-muted-foreground text-xs">
                            <th className="text-left py-2 px-3 font-medium">Usługa</th>
                            <th className="text-center py-2 px-2 font-medium">Kat.</th>
                            <th className="text-center py-2 px-2 font-medium">Jedn.</th>
                            <th className="text-right py-2 px-2 font-medium">Cena netto</th>
                            <th className="text-center py-2 px-2 font-medium">VAT</th>
                            <th className="text-center py-2 px-2 font-medium">Czas</th>
                            <th className="py-2 px-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPricelist.map((item) => (
                            <PricelistRow key={item.id} item={item} onEdit={handleEditPrice} onAdd={addFromPricelist} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── AI Sugestie ── */}
              <TabsContent value="ai">
                <CardContent className="pt-4 space-y-4">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                    <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                    Opisz zakres prac — AI dobierze pozycje z cennika elektrycznego automatycznie.
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Opis zakresu prac</Label>
                    <Textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="np. wymiana instalacji elektrycznej w mieszkaniu 60m², montaż rozdzielnicy, gniazdka, oświetlenie LED..."
                      rows={3} className="mt-1" />
                  </div>
                  <Button className="btn-switch w-full" onClick={handleAiSuggest} disabled={aiLoading || !aiDescription.trim()}>
                    {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                    Generuj pozycje AI
                  </Button>
                  {aiResult && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Sugerowane pozycje ({aiResult.items.length})</div>
                        <Badge className={`text-xs ${aiResult.confidence >= 70 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          Pewność: {aiResult.confidence}%
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {aiResult.items.map((ai: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-accent/50 border border-border/50 text-sm">
                            <span className="font-medium">{ai.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{ai.qty} {ai.unit}</span>
                          </div>
                        ))}
                      </div>
                      {aiResult.notes && (
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 text-xs text-blue-800 dark:text-blue-200">
                          <Info className="h-3 w-3 inline mr-1" />{aiResult.notes}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button className="flex-1 btn-switch" onClick={applyAiResult}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Dodaj do wyceny
                        </Button>
                        <Button variant="outline" onClick={() => setAiResult(null)}>Odrzuć</Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </TabsContent>

              {/* ── Kalkulator Kabla ── */}
              <TabsContent value="kabel">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600">
                      <Cable className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Kalkulator przekroju kabla</div>
                      <div className="text-xs text-muted-foreground">Dobór wg PN-HD 60364-5-52 · Obciążalność + Spadek napięcia</div>
                    </div>
                  </div>
                  <CableCalculator onAddToQuote={addFromCalculator} />
                </CardContent>
              </TabsContent>

              {/* ── Kalkulator Bezpiecznika ── */}
              <TabsContent value="bezpiecznik">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">Kalkulator zabezpieczeń</div>
                      <div className="text-xs text-muted-foreground">Dobór wyłącznika wg PN-EN 60898-1 · Char. B/C/D · Koordynacja z kablem</div>
                    </div>
                  </div>
                  <BreakerCalculator onAddToQuote={addFromCalculator} />
                </CardContent>
              </TabsContent>

              {/* ── Koszty dodatkowe ── */}
              <TabsContent value="koszty">
                <CardContent className="pt-4 space-y-3">
                  <Button variant="outline" size="sm" onClick={() => setAdditionalCosts((p) => [...p, makeCost()])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Dodaj koszt
                  </Button>
                  {additionalCosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Brak kosztów dodatkowych</div>
                  ) : (
                    <div className="space-y-2">
                      {additionalCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
                          <Input value={cost.name} onChange={(e) => updateCost(cost.id, { name: e.target.value })}
                            placeholder="Nazwa kosztu" className="h-8 flex-1" />
                          <Select value={cost.category} onValueChange={(v) => updateCost(cost.id, { category: v as QuoteAdditionalCost["category"] })}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dojazd">Dojazd</SelectItem>
                              <SelectItem value="materialy">Materiały</SelectItem>
                              <SelectItem value="sprzet">Sprzęt</SelectItem>
                              <SelectItem value="inne">Inne</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" min="0" step="0.01" value={cost.amount}
                            onChange={(e) => updateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-28 text-right" />
                          <Select value={String(cost.vatRate)} onValueChange={(v) => updateCost(cost.id, { vatRate: parseInt(v ?? "23") as VatRate })}>
                            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(VAT_RATE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeCost(cost.id)}>
                            <Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </StaggerItem>

        {/* Uwagi + Ważność */}
        <StaggerItem>
          <Card className="card-electrical">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Uwagi do wyceny</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zakres prac, warunki, uwagi..." rows={3} className="mt-1" />
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Ważność wyceny</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Rabat globalny (%)</Label>
                  <Input type="number" min="0" max="50" step="1" value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} className="mt-1 h-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Podsumowanie + Zapis */}
        <StaggerItem>
          <Card className="card-electrical">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <ScrewRow>Podsumowanie</ScrewRow>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div><div className="text-xs text-muted-foreground">Netto</div>
                      <div className="font-bold">{formatCurrency(totals.totalNetto)}</div></div>
                    <div><div className="text-xs text-muted-foreground">VAT</div>
                      <div className="font-bold">{formatCurrency(totals.totalVat)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Brutto</div>
                      <div className="font-black text-lg" style={{ color: "oklch(0.72 0.18 60)" }}>{formatCurrency(totals.totalBrutto)}</div></div>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="text-xs text-green-600 mt-1">Rabat: -{formatCurrency(totals.discountAmount)}</div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => handleSave("szkic")}>
                    <FileText className="h-4 w-4 mr-1" /> Zapisz szkic
                  </Button>
                  <Button className="btn-switch" onClick={() => handleSave("wyslana")}>
                    <Zap className="h-4 w-4 mr-1" /> Utwórz wycenę
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem><CurrentIndicator active /></StaggerItem>
      </StaggerContainer>

      {/* Sticky Bottom Bar na telefonach (elektryk widzi sumę na bieżąco podczas dodawania punktów) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-amber-500/20 p-3 shadow-xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Razem brutto:</div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
            {formatCurrency(totals.totalBrutto)}
          </div>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 h-11 px-5 shadow-sm active:scale-95 transition-transform"
          onClick={() => handleSave("wyslana")}
          disabled={totals.totalNetto === 0}
        >
          <Zap className="h-4 w-4" />
          Utwórz wycenę
        </Button>
      </div>
    </PageTransition>
  );
}
