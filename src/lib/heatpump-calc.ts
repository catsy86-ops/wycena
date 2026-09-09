/**
 * Inżynieryjny silnik doboru pomp ciepła i obciążenia cieplnego budynku (OZC)
 * Zgodny z PN-EN 12831 oraz Warunkami Technicznymi WT 2021
 */

export type ClimateZone = "I" | "II" | "III" | "IV" | "V";

export interface ClimateZoneInfo {
  zone: ClimateZone;
  designOutdoorTemp: number; // °C
  averageAnnualTemp: number; // °C
  regionDescription: string;
}

export const CLIMATE_ZONES_PL: Record<ClimateZone, ClimateZoneInfo> = {
  I: { zone: "I", designOutdoorTemp: -16, averageAnnualTemp: 8.5, regionDescription: "Wybrzeże, pas nadmorski (Gdańsk, Koszalin, Szczecin)" },
  II: { zone: "II", designOutdoorTemp: -18, averageAnnualTemp: 8.0, regionDescription: "Wielkopolska, Dolny Śląsk, Ziemia Lubuska (Poznań, Wrocław)" },
  III: { zone: "III", designOutdoorTemp: -20, averageAnnualTemp: 7.5, regionDescription: "Polska centralna i południowa (Warszawa, Łódź, Kraków)" },
  IV: { zone: "IV", designOutdoorTemp: -22, averageAnnualTemp: 7.0, regionDescription: "Białystok, Olsztyn, Podkarpacie" },
  V: { zone: "V", designOutdoorTemp: -24, averageAnnualTemp: 6.5, regionDescription: "Suwałki oraz tereny górskie (Zakopane, Nowy Sącz)" },
};

export type InsulationStandard = "wt2021" | "wt2017" | "insulated_10cm" | "poor_isolation" | "uninsulated_old";

export interface InsulationStandardInfo {
  id: InsulationStandard;
  label: string;
  description: string;
  specificHeatLossWperM2: number; // W/m² przy standardowej wysokości h=2.6m
}

export const INSULATION_STANDARDS: Record<InsulationStandard, InsulationStandardInfo> = {
  wt2021: {
    id: "wt2021",
    label: "Standard WT 2021 / Dom Pasywny",
    description: "Styropian 20cm, okna 3-szybowe, rekuperacja (35-45 W/m²)",
    specificHeatLossWperM2: 38,
  },
  wt2017: {
    id: "wt2017",
    label: "Standard WT 2014 / WT 2017",
    description: "Styropian 15cm, dach wełna 25-30cm (50-65 W/m²)",
    specificHeatLossWperM2: 55,
  },
  insulated_10cm: {
    id: "insulated_10cm",
    label: "Dom docieplony (lata 90. - 2010)",
    description: "Styropian 8-10cm, okna 2-szybowe zespolone (70-85 W/m²)",
    specificHeatLossWperM2: 75,
  },
  poor_isolation: {
    id: "poor_isolation",
    label: "Słaba izolacja (starszy dom)",
    description: "Cegła/pustak, styropian 3-5cm lub pustka powietrzna (95-120 W/m²)",
    specificHeatLossWperM2: 105,
  },
  uninsulated_old: {
    id: "uninsulated_old",
    label: "Dom nieocieplony (stara kostka / brak izolacji)",
    description: "Brak docieplenia ścian zewnętrznych, stare okna (130-160 W/m²)",
    specificHeatLossWperM2: 140,
  },
};

export interface HeatPumpCalcInput {
  heatedAreaM2: number;
  ceilingHeightM?: number;
  climateZone: ClimateZone;
  insulation: InsulationStandard;
  occupantsCount: number;
  heatingSystemType: "floor_only" | "radiators_low_temp" | "radiators_high_temp" | "mixed";
  indoorDesignTemp?: number;
  hotWaterComfort: "eco" | "standard" | "high";
}

export interface HeatPumpCalcResult {
  buildingTransmissionLossKW: number;
  hotWaterDemandKW: number;
  totalDesignHeatLoadKW: number;
  recommendedPumpPowerKW: number;
  suggestedPumpModel: string;
  bufferTankVolumeLiters: number;
  dhwTankVolumeLiters: number;
  estimatedYearlyHeatKWh: number;
  copEstimate: number;
  scopEstimate: number;
  bivalentPointTempC: number;
  summaryText: string;
  norm: string;
  recommendedPackage: {
    pumpPriceNetto: number;
    bufferPriceNetto: number;
    dhwPriceNetto: number;
    hydraulicAccessoriesPriceNetto: number;
    laborPriceNetto: number;
    totalNetto: number;
  };
}

/**
 * Oblicza moc szczytową i parametry doboru pompy ciepła
 */
export function calcHeatPumpDemand(input: HeatPumpCalcInput): HeatPumpCalcResult {
  const area = Math.max(10, input.heatedAreaM2);
  const height = input.ceilingHeightM || 2.6;
  const heightFactor = height / 2.6;
  const zoneInfo = CLIMATE_ZONES_PL[input.climateZone] || CLIMATE_ZONES_PL["III"];
  const insulationInfo = INSULATION_STANDARDS[input.insulation] || INSULATION_STANDARDS["wt2021"];

  // 1. Zapotrzebowanie budynku na c.o. (przenikanie + wentylacja)
  const indoorTemp = input.indoorDesignTemp || 21;
  const baseDeltaT = 41; // 21 - (-20) dla III strefy
  const actualDeltaT = indoorTemp - zoneInfo.designOutdoorTemp;
  const zoneCorrectionFactor = actualDeltaT / baseDeltaT;

  const rawHeatLossWatts = area * insulationInfo.specificHeatLossWperM2 * heightFactor * zoneCorrectionFactor;
  const buildingTransmissionLossKW = Math.round((rawHeatLossWatts / 1000) * 100) / 100;

  // 2. Zapotrzebowanie na c.w.u.
  const occupants = Math.max(1, input.occupantsCount || 1);
  let dwhKwPerPerson = 0.25;
  let dailyLitersPerPerson = 45;
  if (input.hotWaterComfort === "eco") {
    dwhKwPerPerson = 0.18;
    dailyLitersPerPerson = 30;
  } else if (input.hotWaterComfort === "high") {
    dwhKwPerPerson = 0.35;
    dailyLitersPerPerson = 60;
  }

  const hotWaterDemandKW = Math.round((occupants * dwhKwPerPerson) * 100) / 100;
  const totalDesignHeatLoadKW = Math.round((buildingTransmissionLossKW + hotWaterDemandKW) * 10) / 10;

  // 3. Dobór mocy nominalnej pompy ciepła (typoszereg inwerterowy: 4, 6, 8, 10, 12, 16, 20 kW)
  const availablePowers = [4, 6, 8, 10, 12, 14, 16, 20];
  let recommendedPumpPowerKW = availablePowers[availablePowers.length - 1];
  for (const p of availablePowers) {
    if (p >= totalDesignHeatLoadKW * 0.95) {
      recommendedPumpPowerKW = p;
      break;
    }
  }

  // 4. Dobór zbiornika buforowego c.o.
  let bufferPerKw = 15;
  if (input.heatingSystemType === "floor_only") bufferPerKw = 10;
  else if (input.heatingSystemType === "radiators_high_temp") bufferPerKw = 25;
  const rawBuffer = recommendedPumpPowerKW * bufferPerKw;
  const bufferTankVolumeLiters = rawBuffer <= 60 ? 60 : rawBuffer <= 100 ? 100 : rawBuffer <= 200 ? 200 : 300;

  // 5. Dobór zasobnika c.w.u. ze specjalną wężownicą do pompy ciepła
  const totalDailyDhwLiters = occupants * dailyLitersPerPerson;
  let dhwTankVolumeLiters = 200;
  if (totalDailyDhwLiters > 180) dhwTankVolumeLiters = 250;
  if (totalDailyDhwLiters > 240) dhwTankVolumeLiters = 300;

  // 6. SCOP i szacunkowa roczna produkcja ciepła
  let scopEstimate = 4.2;
  if (input.heatingSystemType === "radiators_low_temp") scopEstimate = 3.6;
  if (input.heatingSystemType === "radiators_high_temp") scopEstimate = 3.1;
  if (input.heatingSystemType === "mixed") scopEstimate = 3.8;

  const estimatedYearlyHeatKWh = Math.round(totalDesignHeatLoadKW * 1900);
  const copEstimate = Math.round((scopEstimate + 0.5) * 10) / 10;
  const bivalentPointTempC = -7;

  let suggestedPumpModel = `Pompa ciepła ${recommendedPumpPowerKW} kW A+++`;
  if (input.heatingSystemType === "floor_only") suggestedPumpModel += " (Split/Monoblok 35°C podłogowa)";
  else suggestedPumpModel += " (Średniotemperaturowa 55°C grzejnikowa)";

  // 7. Szacunek cenowy kompletnego zestawu kotłowni
  const basePumpPricePerKW = recommendedPumpPowerKW <= 8 ? 2900 : 2500;
  const pumpPriceNetto = Math.round(recommendedPumpPowerKW * basePumpPricePerKW);
  const bufferPriceNetto = bufferTankVolumeLiters <= 100 ? 1200 : bufferTankVolumeLiters <= 200 ? 1800 : 2400;
  const dhwPriceNetto = dhwTankVolumeLiters <= 200 ? 3200 : 4200;
  const hydraulicAccessoriesPriceNetto = 3400; // grupa bezpieczeństwa, naczynia, separator magnetyczny, rury miedziane/stal zaciskana, zawór 3-drogowy
  const laborPriceNetto = 5500; // montaż jednostki wewn + zewn, próba szczelności azotem, napełnienie glikolem/wodą, uruchomienie

  const totalNetto = pumpPriceNetto + bufferPriceNetto + dhwPriceNetto + hydraulicAccessoriesPriceNetto + laborPriceNetto;

  const summaryText = `Projektowe obciążenie budynku wynosi ${totalDesignHeatLoadKW} kW (${buildingTransmissionLossKW} kW c.o. + ${hotWaterDemandKW} kW c.w.u.). Rekomendowana moc pompy to ${recommendedPumpPowerKW} kW z buforem ${bufferTankVolumeLiters}L i zasobnikiem c.w.u. ${dhwTankVolumeLiters}L.`;

  return {
    buildingTransmissionLossKW,
    hotWaterDemandKW,
    totalDesignHeatLoadKW,
    recommendedPumpPowerKW,
    suggestedPumpModel,
    bufferTankVolumeLiters,
    dhwTankVolumeLiters,
    estimatedYearlyHeatKWh,
    copEstimate,
    scopEstimate,
    bivalentPointTempC,
    summaryText,
    norm: "PN-EN 12831 / WT 2021",
    recommendedPackage: {
      pumpPriceNetto,
      bufferPriceNetto,
      dhwPriceNetto,
      hydraulicAccessoriesPriceNetto,
      laborPriceNetto,
      totalNetto,
    },
  };
}
