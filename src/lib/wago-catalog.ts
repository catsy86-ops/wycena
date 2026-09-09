export interface ModularComponent {
  id: string;
  brand: "WAGO" | "Legrand" | "Hager" | "Schneider";
  series: string;
  name: string;
  sku: string;
  category: "złączki" | "wyłączniki_nadprądowe" | "różnicowoprądowe" | "rozdzielnice" | "listwy" | "akcesoria";
  poles?: string; // 1P, 2P, 3P, 4P, 1P+N, 3P+N
  ratedCurrentA?: number; // In [A]
  ratedVoltageV?: number; // 230, 400
  char?: "B" | "C" | "D";
  wireCrossSectionMaxMm2?: number; // np. 4 mm2, 6 mm2, 16 mm2
  moduleWidth?: number; // szerokość w modułach DIN (np. 1, 2, 4)
  catalogPriceNetto: number;
  marketPriceNetto: number;
  vatRate: number;
  desc: string;
  standards?: string[];
}

export const WAGO_LEGRAND_COMPONENTS: ModularComponent[] = [
  // ── WAGO Złączki COMPACT Seria 221 ──
  {
    id: "wago-221-412",
    brand: "WAGO",
    series: "221 COMPACT",
    name: "Złączka instalacyjna 2x4mm² z dźwigniami (przezroczysta)",
    sku: "221-412",
    category: "złączki",
    wireCrossSectionMaxMm2: 4,
    ratedCurrentA: 32,
    ratedVoltageV: 450,
    catalogPriceNetto: 1.45,
    marketPriceNetto: 1.80,
    vatRate: 23,
    desc: "Uniwersalna złączka do wszystkich rodzajów przewodów (drut/linka) 0.2 - 4 mm²",
    standards: ["PN-EN 60998-1", "PN-EN 60998-2-2"]
  },
  {
    id: "wago-221-413",
    brand: "WAGO",
    series: "221 COMPACT",
    name: "Złączka instalacyjna 3x4mm² z dźwigniami (przezroczysta)",
    sku: "221-413",
    category: "złączki",
    wireCrossSectionMaxMm2: 4,
    ratedCurrentA: 32,
    ratedVoltageV: 450,
    catalogPriceNetto: 1.85,
    marketPriceNetto: 2.30,
    vatRate: 23,
    desc: "Złączka 3-przewodowa do puszek łączeniowych i rozdzielczych",
    standards: ["PN-EN 60998-1"]
  },
  {
    id: "wago-221-415",
    brand: "WAGO",
    series: "221 COMPACT",
    name: "Złączka instalacyjna 5x4mm² z dźwigniami (przezroczysta)",
    sku: "221-415",
    category: "złączki",
    wireCrossSectionMaxMm2: 4,
    ratedCurrentA: 32,
    ratedVoltageV: 450,
    catalogPriceNetto: 2.80,
    marketPriceNetto: 3.50,
    vatRate: 23,
    desc: "Złączka 5-przewodowa, idealna do obwodów 3-fazowych i punktów neutralnych",
    standards: ["PN-EN 60998-1"]
  },
  {
    id: "wago-221-612",
    brand: "WAGO",
    series: "221 COMPACT 6mm²",
    name: "Złączka instalacyjna 2x6mm² z dźwigniami",
    sku: "221-612",
    category: "złączki",
    wireCrossSectionMaxMm2: 6,
    ratedCurrentA: 41,
    ratedVoltageV: 450,
    catalogPriceNetto: 2.60,
    marketPriceNetto: 3.40,
    vatRate: 23,
    desc: "Do większych przekrojów (zasilanie płyt indukcyjnych, klimatyzacji, pomp)",
    standards: ["PN-EN 60998-1"]
  },
  {
    id: "wago-221-613",
    brand: "WAGO",
    series: "221 COMPACT 6mm²",
    name: "Złączka instalacyjna 3x6mm² z dźwigniami",
    sku: "221-613",
    category: "złączki",
    wireCrossSectionMaxMm2: 6,
    ratedCurrentA: 41,
    ratedVoltageV: 450,
    catalogPriceNetto: 3.20,
    marketPriceNetto: 4.20,
    vatRate: 23,
    desc: "Do łączenia przewodów 6 mm² w puszkach i szafach",
    standards: ["PN-EN 60998-1"]
  },
  {
    id: "wago-221-500",
    brand: "WAGO",
    series: "221 Akcesoria",
    name: "Adapter montażowy WAGO na szynę DIN TS-35",
    sku: "221-500",
    category: "akcesoria",
    moduleWidth: 1,
    catalogPriceNetto: 4.80,
    marketPriceNetto: 6.50,
    vatRate: 23,
    desc: "Uchwyt mocujący złączki WAGO 221-412/413/415 na szynie DIN w rozdzielnicy",
  },
  // ── Legrand Aparatura Modułowa TX³ ──
  {
    id: "leg-tx3-b10-1p",
    brand: "Legrand",
    series: "TX³ 6kA",
    name: "Wyłącznik nadprądowy 1P B 10A 6kA TX³",
    sku: "403355",
    category: "wyłączniki_nadprądowe",
    poles: "1P",
    ratedCurrentA: 10,
    ratedVoltageV: 230,
    char: "B",
    moduleWidth: 1,
    catalogPriceNetto: 18.50,
    marketPriceNetto: 24.00,
    vatRate: 23,
    desc: "Zabezpieczenie obwodów oświetleniowych w instalacjach mieszkaniowych",
    standards: ["PN-EN 60898-1"]
  },
  {
    id: "leg-tx3-b16-1p",
    brand: "Legrand",
    series: "TX³ 6kA",
    name: "Wyłącznik nadprądowy 1P B 16A 6kA TX³",
    sku: "403357",
    category: "wyłączniki_nadprądowe",
    poles: "1P",
    ratedCurrentA: 16,
    ratedVoltageV: 230,
    char: "B",
    moduleWidth: 1,
    catalogPriceNetto: 18.50,
    marketPriceNetto: 24.00,
    vatRate: 23,
    desc: "Standardowe zabezpieczenie obwodów gniazd wtykowych 230V",
    standards: ["PN-EN 60898-1"]
  },
  {
    id: "leg-tx3-c16-1p",
    brand: "Legrand",
    series: "TX³ 6kA",
    name: "Wyłącznik nadprądowy 1P C 16A 6kA TX³",
    sku: "403507",
    category: "wyłączniki_nadprądowe",
    poles: "1P",
    ratedCurrentA: 16,
    ratedVoltageV: 230,
    char: "C",
    moduleWidth: 1,
    catalogPriceNetto: 22.00,
    marketPriceNetto: 28.50,
    vatRate: 23,
    desc: "Do obwodów z prądami udarowymi (narzędzia warsztatowe, lodówki, małe silniki)",
    standards: ["PN-EN 60898-1"]
  },
  {
    id: "leg-tx3-b16-3p",
    brand: "Legrand",
    series: "TX³ 6kA",
    name: "Wyłącznik nadprądowy 3P B 16A 6kA TX³",
    sku: "403383",
    category: "wyłączniki_nadprądowe",
    poles: "3P",
    ratedCurrentA: 16,
    ratedVoltageV: 400,
    char: "B",
    moduleWidth: 3,
    catalogPriceNetto: 65.00,
    marketPriceNetto: 84.00,
    vatRate: 23,
    desc: "Zabezpieczenie 3-fazowe do płyty indukcyjnej lub podgrzewacza",
    standards: ["PN-EN 60898-1"]
  },
  {
    id: "leg-tx3-rcd-25-30-2p",
    brand: "Legrand",
    series: "TX³ RCD",
    name: "Wyłącznik różnicowoprądowy 2P 25A 30mA typ A TX³",
    sku: "411505",
    category: "różnicowoprądowe",
    poles: "2P",
    ratedCurrentA: 25,
    ratedVoltageV: 230,
    moduleWidth: 2,
    catalogPriceNetto: 135.00,
    marketPriceNetto: 175.00,
    vatRate: 23,
    desc: "Czuły na prądy przemienne i pulsujące stałe (typ A) - wymagany dla nowoczesnego AGD/RTV",
    standards: ["PN-EN 61008-1", "PN-HD 60364-4-41"]
  },
  {
    id: "leg-tx3-rcd-40-30-4p",
    brand: "Legrand",
    series: "TX³ RCD",
    name: "Wyłącznik różnicowoprądowy 4P 40A 30mA typ A TX³",
    sku: "411525",
    category: "różnicowoprądowe",
    poles: "4P",
    ratedCurrentA: 40,
    ratedVoltageV: 400,
    moduleWidth: 4,
    catalogPriceNetto: 195.00,
    marketPriceNetto: 255.00,
    vatRate: 23,
    desc: "RCD 3-fazowy chroniący obwody siłowe oraz sekcje rozdzielnicy",
    standards: ["PN-EN 61008-1"]
  },
  {
    id: "leg-distri-4p-100a",
    brand: "Legrand",
    series: "Rozdział energii",
    name: "Blok rozdzielczy modułowy 4P 100A (szyna DIN)",
    sku: "004884",
    category: "listwy",
    moduleWidth: 4,
    catalogPriceNetto: 55.00,
    marketPriceNetto: 78.00,
    vatRate: 23,
    desc: "Uporządkowany rozdział faz L1, L2, L3 i N w rozdzielnicy głównej",
    standards: ["PN-EN 60947-7-1"]
  },
  {
    id: "leg-practibox-36",
    brand: "Legrand",
    series: "Practibox S",
    name: "Rozdzielnica podtynkowa 36M (3x12) z drzwiami białymi",
    sku: "134013",
    category: "rozdzielnice",
    moduleWidth: 36,
    catalogPriceNetto: 175.00,
    marketPriceNetto: 230.00,
    vatRate: 23,
    desc: "Pojemna i estetyczna rozdzielnica do mieszkań i domów jednorodzinnych",
    standards: ["PN-EN 62208", "PN-EN 61439-3"]
  }
];

export interface ConsumerCircuitProfile {
  id: string;
  name: string;
  category: "lighting" | "sockets" | "appliance" | "heavy";
  estimatedPowerW: number;
  voltageV: 230 | 400;
  phases: 1 | 3;
  recommendedBreaker: string; // sku or name
  recommendedWire: string; // YDYp 3x1.5, YDYp 3x2.5 etc
  wagoConnectorsNeeded: number;
}

export const TYPICAL_CIRCUITS: ConsumerCircuitProfile[] = [
  {
    id: "c-light",
    name: "Obwód oświetleniowy (pokoje/korytarz)",
    category: "lighting",
    estimatedPowerW: 800,
    voltageV: 230,
    phases: 1,
    recommendedBreaker: "Wyłącznik 1P B 10A",
    recommendedWire: "YDYp 3x1.5 mm²",
    wagoConnectorsNeeded: 8
  },
  {
    id: "c-sock-room",
    name: "Obwód gniazd ogólnych (sypialnia/salon)",
    category: "sockets",
    estimatedPowerW: 2500,
    voltageV: 230,
    phases: 1,
    recommendedBreaker: "Wyłącznik 1P B 16A",
    recommendedWire: "YDYp 3x2.5 mm²",
    wagoConnectorsNeeded: 6
  },
  {
    id: "c-kitchen-ind",
    name: "Płyta indukcyjna 3-fazowa (kuchnia)",
    category: "heavy",
    estimatedPowerW: 7400,
    voltageV: 400,
    phases: 3,
    recommendedBreaker: "Wyłącznik 3P B 16A",
    recommendedWire: "YDY 5x2.5 mm² (lub 5x4 mm²)",
    wagoConnectorsNeeded: 5
  },
  {
    id: "c-oven",
    name: "Piekarnik / Zmywarka (obwód dedykowany)",
    category: "appliance",
    estimatedPowerW: 2800,
    voltageV: 230,
    phases: 1,
    recommendedBreaker: "Wyłącznik 1P B 16A",
    recommendedWire: "YDYp 3x2.5 mm²",
    wagoConnectorsNeeded: 3
  },
  {
    id: "c-wash",
    name: "Pralka / Suszarka (łazienka)",
    category: "appliance",
    estimatedPowerW: 2300,
    voltageV: 230,
    phases: 1,
    recommendedBreaker: "Wyłącznik 1P B 16A + RCD typ A",
    recommendedWire: "YDYp 3x2.5 mm²",
    wagoConnectorsNeeded: 3
  },
  {
    id: "c-ac",
    name: "Klimatyzator / Pompa ciepła",
    category: "heavy",
    estimatedPowerW: 3200,
    voltageV: 230,
    phases: 1,
    recommendedBreaker: "Wyłącznik 1P C 16A",
    recommendedWire: "YDYp 3x2.5 mm²",
    wagoConnectorsNeeded: 3
  }
];

export interface SwitchboardBOM {
  components: Array<{
    item: ModularComponent;
    quantity: number;
    subtotalNetto: number;
  }>;
  totalModulesUsed: number;
  suggestedEnclosureModules: number;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
}

export function calculateSwitchboardBOM(circuitCounts: Record<string, number>): SwitchboardBOM {
  let totalCircuits1P = 0;
  let totalCircuits3P = 0;
  let totalWagoConnectors = 0;

  Object.entries(circuitCounts).forEach(([circuitId, count]) => {
    if (count <= 0) return;
    const profile = TYPICAL_CIRCUITS.find(c => c.id === circuitId);
    if (!profile) return;

    if (profile.phases === 3) {
      totalCircuits3P += count;
    } else {
      totalCircuits1P += count;
    }
    totalWagoConnectors += profile.wagoConnectorsNeeded * count;
  });

  const bomItems: Array<{ item: ModularComponent; quantity: number; subtotalNetto: number }> = [];

  // Wyłączniki 1P B16
  const b16Component = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "403357")!;
  const b10Component = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "403355")!;
  const b16_3pComponent = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "403383")!;
  const rcd2pComponent = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "411505")!;
  const rcd4pComponent = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "411525")!;
  const distriComponent = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "004884")!;
  const wago412 = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "221-412")!;
  const wago413 = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "221-413")!;
  const wago415 = WAGO_LEGRAND_COMPONENTS.find(c => c.sku === "221-415")!;

  const lightCount = circuitCounts["c-light"] || 0;
  const socketsCount = (circuitCounts["c-sock-room"] || 0) + (circuitCounts["c-oven"] || 0) + (circuitCounts["c-wash"] || 0) + (circuitCounts["c-ac"] || 0);

  if (lightCount > 0) {
    bomItems.push({
      item: b10Component,
      quantity: lightCount,
      subtotalNetto: lightCount * b10Component.marketPriceNetto
    });
  }

  if (socketsCount > 0) {
    bomItems.push({
      item: b16Component,
      quantity: socketsCount,
      subtotalNetto: socketsCount * b16Component.marketPriceNetto
    });
  }

  if (totalCircuits3P > 0) {
    bomItems.push({
      item: b16_3pComponent,
      quantity: totalCircuits3P,
      subtotalNetto: totalCircuits3P * b16_3pComponent.marketPriceNetto
    });
  }

  // RCD dobrane: 1 RCD na max 5-6 obwodów 1P
  const neededRCD2P = Math.max(1, Math.ceil(totalCircuits1P / 5));
  bomItems.push({
    item: rcd2pComponent,
    quantity: neededRCD2P,
    subtotalNetto: neededRCD2P * rcd2pComponent.marketPriceNetto
  });

  if (totalCircuits3P > 0) {
    bomItems.push({
      item: rcd4pComponent,
      quantity: 1,
      subtotalNetto: rcd4pComponent.marketPriceNetto
    });
  }

  // Blok rozdzielczy
  bomItems.push({
    item: distriComponent,
    quantity: 1,
    subtotalNetto: distriComponent.marketPriceNetto
  });

  // WAGO proporcjonalnie
  const qty412 = Math.ceil(totalWagoConnectors * 0.35);
  const qty413 = Math.ceil(totalWagoConnectors * 0.45);
  const qty415 = Math.ceil(totalWagoConnectors * 0.20);

  if (qty412 > 0) {
    bomItems.push({ item: wago412, quantity: qty412, subtotalNetto: qty412 * wago412.marketPriceNetto });
  }
  if (qty413 > 0) {
    bomItems.push({ item: wago413, quantity: qty413, subtotalNetto: qty413 * wago413.marketPriceNetto });
  }
  if (qty415 > 0) {
    bomItems.push({ item: wago415, quantity: qty415, subtotalNetto: qty415 * wago415.marketPriceNetto });
  }

  // Suma modułów
  let totalModules = 0;
  bomItems.forEach(b => {
    if (b.item.moduleWidth) {
      totalModules += b.item.moduleWidth * b.quantity;
    }
  });

  // Zalecana wielkość rozdzielnicy z 25-30% zapasem na przyszłość
  let suggestedEnclosure = 24;
  if (totalModules > 36) suggestedEnclosure = 48;
  else if (totalModules > 24) suggestedEnclosure = 36;
  else if (totalModules > 12) suggestedEnclosure = 24;

  const totalNetto = bomItems.reduce((acc, curr) => acc + curr.subtotalNetto, 0);
  const totalVat = totalNetto * 0.23;
  const totalBrutto = totalNetto + totalVat;

  return {
    components: bomItems,
    totalModulesUsed: totalModules,
    suggestedEnclosureModules: suggestedEnclosure,
    totalNetto,
    totalVat,
    totalBrutto
  };
}
