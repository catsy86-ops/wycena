/**
 * Kalkulator doboru naczyń wzbiorczych przeponowych (wzrost objętości zładu wody)
 * w oparciu o wytyczne normy PN-EN 12828 oraz normy branżowe instalacji grzewczych.
 *
 * Wzory:
 * Vn = (Ve + Vdf) / D
 * gdzie:
 * Ve = V_zlad * e(T_max)  [przyrost objętości wody przy nagrzewie]
 * Vdf = rezerwa eksploatacyjna wody w naczyniu (min. 0.5% zładu lub min. 3 litry)
 * p_wst = ciśnienie wstępne poduszki gazowej = p_stat + 0.2..0.3 bar
 * p_stat = h_stat / 10.2 bar (wysokość słupa cieczy od naczynia do najwyższego punktu instalacji)
 * p_max = ciśnienie końcowe instalacji = p_zaworu_bezp - 0.5 bar
 * D = (p_max - p_wst) / (p_max + 1) [współczynnik ciśnieniowy wykorzystania objętości naczynia]
 */

export interface SystemWaterVolumeParams {
  inputMode: "direct" | "estimated";
  directVolumeLiters: number;
  heatingPowerKw: number;
  emitterType: "underfloor" | "radiators_steel" | "radiators_cast_iron" | "fancoils" | "mixed";
  bufferTankVolumeLiters: number;
  dhwTankCoilVolumeLiters: number;
  pipeworkEstimatePercent: number;
}

export interface ExpansionVesselParams {
  staticHeightMeters: number;
  maxDesignTempC: number;
  safetyValvePressureBar: number;
  glycolPercentage: number;
}

export interface ExpansionVesselResult {
  totalWaterVolumeLiters: number;
  expansionCoefficientPercent: number;
  expansionVolumeLiters: number;
  reserveVolumeLiters: number;
  staticPressureBar: number;
  prechargePressureBar: number;
  maxFinalPressureBar: number;
  pressureUtilizationRatio: number;
  minimumVesselVolumeLiters: number;
  recommendedStandardVesselLiters: number;
  warnings: string[];
  recommendations: string[];
}

export function getWaterExpansionCoeff(tempC: number, glycolPercent: number = 0): number {
  const t = Math.max(10, Math.min(110, tempC));
  let eWater = 0.006;
  if (t <= 35) eWater = 0.006;
  else if (t <= 50) eWater = 0.012;
  else if (t <= 55) eWater = 0.0145;
  else if (t <= 70) eWater = 0.0227;
  else if (t <= 75) eWater = 0.0258;
  else if (t <= 80) eWater = 0.029;
  else if (t <= 90) eWater = 0.0359;
  else eWater = 0.043;

  const glycolFactor = 1 + (glycolPercent / 100) * 0.3;
  return eWater * glycolFactor;
}

export const EMITTER_LITERS_PER_KW: Record<SystemWaterVolumeParams["emitterType"], { label: string; lPerKw: number; desc: string }> = {
  underfloor: {
    label: "Ogrzewanie podłogowe (PEX 16)",
    lPerKw: 22,
    desc: "Instalacja płaszczyznowa niskotemperaturowa (~20-25 l/kW)",
  },
  fancoils: {
    label: "Klimakonwektory (fancoile)",
    lPerKw: 10,
    desc: "Bardzo mała pojemność wymienników Cu/Al (~8-12 l/kW)",
  },
  radiators_steel: {
    label: "Grzejniki płytowe stalowe",
    lPerKw: 11,
    desc: "Nowoczesne grzejniki płytowe (~10-12 l/kW)",
  },
  radiators_cast_iron: {
    label: "Grzejniki żeliwne / stare instalacje",
    lPerKw: 25,
    desc: "Wysoka pojemność starych instalacji żebrowych (~20-30 l/kW)",
  },
  mixed: {
    label: "Mieszana (podłogówka + grzejniki)",
    lPerKw: 16,
    desc: "Układ hybrydowy parter/piętro (~15-18 l/kW)",
  },
};

export const STANDARD_VESSEL_SIZES = [8, 12, 18, 24, 35, 50, 80, 100, 140, 200, 250, 300, 400, 500, 600, 800, 1000];

export function calculateExpansionVessel(
  volParams: SystemWaterVolumeParams,
  vesselParams: ExpansionVesselParams
): ExpansionVesselResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let totalVolume = 0;
  if (volParams.inputMode === "direct") {
    totalVolume = Math.max(10, volParams.directVolumeLiters);
  } else {
    const emitterSpec = EMITTER_LITERS_PER_KW[volParams.emitterType];
    const emitterWater = (volParams.heatingPowerKw || 0) * emitterSpec.lPerKw;
    const bufferWater = volParams.bufferTankVolumeLiters || 0;
    const coilWater = volParams.dhwTankCoilVolumeLiters || 0;
    const subtotal = emitterWater + bufferWater + coilWater;
    const pipeworkExtra = subtotal * ((volParams.pipeworkEstimatePercent || 10) / 100);
    totalVolume = Math.round(subtotal + pipeworkExtra);
  }

  const e = getWaterExpansionCoeff(vesselParams.maxDesignTempC, vesselParams.glycolPercentage);
  const expansionCoefficientPercent = Number((e * 100).toFixed(2));
  const expansionVolumeLiters = totalVolume * e;
  const reserveVolumeLiters = Math.max(3, totalVolume * 0.005);

  const staticPressureBar = Number((vesselParams.staticHeightMeters / 10.2).toFixed(2));
  const prechargePressureBar = Math.max(1.0, Number((staticPressureBar + 0.3).toFixed(2)));
  const maxFinalPressureBar = Number((vesselParams.safetyValvePressureBar - 0.5).toFixed(2));

  if (maxFinalPressureBar <= prechargePressureBar) {
    warnings.push(
      `Zbyt mała różnica między ciśnieniem wstępnym (${prechargePressureBar} bar) a ciśnieniem zaworu bezpieczeństwa (${vesselParams.safetyValvePressureBar} bar). Sprawdź nastawy zaworu.`
    );
  }

  const pDiff = Math.max(0.1, maxFinalPressureBar - prechargePressureBar);
  const pAbsMax = maxFinalPressureBar + 1.0;
  const pressureUtilizationRatio = Number((pDiff / pAbsMax).toFixed(3));

  const calculatedVn = (expansionVolumeLiters + reserveVolumeLiters) / (pressureUtilizationRatio || 0.2);
  const minimumVesselVolumeLiters = Number(calculatedVn.toFixed(1));

  let recommendedSize = STANDARD_VESSEL_SIZES.find((s) => s >= minimumVesselVolumeLiters);
  if (!recommendedSize) {
    recommendedSize = Math.ceil(minimumVesselVolumeLiters / 100) * 100;
  }

  recommendations.push(
    `Ustaw ciśnienie wstępne w poduszce gazowej naczynia na ${prechargePressureBar} bar (przed zalaniem i podłączeniem do zładu).`
  );
  recommendations.push(
    `Zalecane ciśnienie napełnienia instalacji na zimno (10-15°C): ${Number((prechargePressureBar + 0.2).toFixed(2))} bar.`
  );

  if (vesselParams.glycolPercentage > 0) {
    recommendations.push(
      `Uwzględniono ${vesselParams.glycolPercentage}% stężenie glikolu (zwiększona rozszerzalność cieplna mieszaniny).`
    );
  }

  if (vesselParams.maxDesignTempC <= 45) {
    recommendations.push(
      "Niska temperatura zasilania (układ podłogowy/pompa ciepła) pozwala na zastosowanie naczynia o mniejszej kubaturze."
    );
  } else if (vesselParams.maxDesignTempC >= 75) {
    warnings.push(
      "Wysoka temperatura robocza (powyżej 75°C) wymaga naczynia z membraną odporną na podwyższoną temperaturę ciągłą."
    );
  }

  return {
    totalWaterVolumeLiters: totalVolume,
    expansionCoefficientPercent,
    expansionVolumeLiters: Number(expansionVolumeLiters.toFixed(2)),
    reserveVolumeLiters: Number(reserveVolumeLiters.toFixed(2)),
    staticPressureBar,
    prechargePressureBar,
    maxFinalPressureBar,
    pressureUtilizationRatio,
    minimumVesselVolumeLiters,
    recommendedStandardVesselLiters: recommendedSize,
    warnings,
    recommendations,
  };
}
