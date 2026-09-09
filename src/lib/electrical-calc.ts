import { round } from "@/lib/calculations";

// KALKULATOR PRZEKROJU KABLA
// Algorytm wg normy PN-HD 60364-5-52 i IEC 60364
// ═══════════════════════════════════════════════════════════════════════════════

// Rezystywność miedzi [Ω·mm²/m] w temp. 70°C
export const COPPER_RESISTIVITY = 0.0225;
// Rezystywność aluminium [Ω·mm²/m] w temp. 70°C
export const ALUMINUM_RESISTIVITY = 0.036;

// Dopuszczalne obciążalności prądowe [A] dla kabli YDY w instalacji podtynkowej
// wg PN-HD 60364-5-52, tabela B.52.2 (metoda B2 — w rurce w ścianie)
export const CABLE_AMPACITY: Record<number, { cu: number; al: number; name: string }> = {
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

export const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Maksymalny dopuszczalny spadek napięcia wg normy [%]
// PN-EN 50160: instalacje odbiorcze ≤ 4% dla oświetlenia, ≤ 5% dla siły
export const MAX_VOLTAGE_DROP_LIGHTING = 3; // % — oświetlenie (bardziej restrykcyjne)
export const MAX_VOLTAGE_DROP_POWER    = 5; // % — gniazda/siła

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

export const BREAKER_RATINGS: BreakerRating[] = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];

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
