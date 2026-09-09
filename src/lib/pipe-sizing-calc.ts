/**
 * Kalkulator doboru średnic rurociągów instalacji grzewczych i wody (C.O., C.W.U., Pompy Ciepła)
 * W oparciu o wytyczne przepływów laminarnych / cichobieżnych:
 * v <= 0.5 m/s (podejścia do grzejników, sypialnie - cicha praca)
 * v <= 0.8 m/s (piony, rozdzielacze, magistrale mieszkaniowe)
 * v <= 1.2 m/s (kotłownie, maszynownie pomp ciepła)
 *
 * Wzory hydrauliczne:
 * Strumień masy: m_dot = Q / (cp * delta_T) [kg/s]
 * Strumień objętościowy: V_dot = m_dot / rho [m³/s] lub l/h
 * Średnica wewnętrzna: d_wew = sqrt( 4 * V_dot / (pi * v) ) [m]
 * Liniowy spadek ciśnienia (Colebrook-White / Darcy-Weisbach):
 * R = lambda * (rho * v^2) / (2 * d_wew) [Pa/m]
 */

export type PipeMaterial = "pex" | "copper" | "steel" | "pp_stabi";

export interface StandardPipeSize {
  material: PipeMaterial;
  commercialName: string; // np. "PEX 16x2.0", "Cu 22x1.0", "Stal DN25"
  outerDiameterMm: number;
  wallThicknessMm: number;
  innerDiameterMm: number;
  roughnessMm: number; // Chropowatość bezwzględna k (mm)
  maxFlowLitersPerHour: Record<"quiet" | "normal" | "boiler_room", number>; // maks. przepływ przy danych prędkościach
}

export const STANDARD_PIPES: Record<PipeMaterial, StandardPipeSize[]> = {
  pex: [
    { material: "pex", commercialName: "PEX 16×2.0", outerDiameterMm: 16, wallThicknessMm: 2.0, innerDiameterMm: 12.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 203, normal: 325, boiler_room: 488 } },
    { material: "pex", commercialName: "PEX 20×2.0", outerDiameterMm: 20, wallThicknessMm: 2.0, innerDiameterMm: 16.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 362, normal: 579, boiler_room: 868 } },
    { material: "pex", commercialName: "PEX 26×3.0", outerDiameterMm: 26, wallThicknessMm: 3.0, innerDiameterMm: 20.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 565, normal: 904, boiler_room: 1357 } },
    { material: "pex", commercialName: "PEX 32×3.0", outerDiameterMm: 32, wallThicknessMm: 3.0, innerDiameterMm: 26.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 955, normal: 1528, boiler_room: 2292 } },
    { material: "pex", commercialName: "PEX 40×3.5", outerDiameterMm: 40, wallThicknessMm: 3.5, innerDiameterMm: 33.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 1539, normal: 2463, boiler_room: 3694 } },
  ],
  copper: [
    { material: "copper", commercialName: "Miedź 15×1.0", outerDiameterMm: 15, wallThicknessMm: 1.0, innerDiameterMm: 13.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 238, normal: 382, boiler_room: 573 } },
    { material: "copper", commercialName: "Miedź 18×1.0", outerDiameterMm: 18, wallThicknessMm: 1.0, innerDiameterMm: 16.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 362, normal: 579, boiler_room: 868 } },
    { material: "copper", commercialName: "Miedź 22×1.0", outerDiameterMm: 22, wallThicknessMm: 1.0, innerDiameterMm: 20.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 565, normal: 904, boiler_room: 1357 } },
    { material: "copper", commercialName: "Miedź 28×1.5", outerDiameterMm: 28, wallThicknessMm: 1.5, innerDiameterMm: 25.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 883, normal: 1413, boiler_room: 2120 } },
    { material: "copper", commercialName: "Miedź 35×1.5", outerDiameterMm: 35, wallThicknessMm: 1.5, innerDiameterMm: 32.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 1447, normal: 2316, boiler_room: 3474 } },
    { material: "copper", commercialName: "Miedź 42×1.5", outerDiameterMm: 42, wallThicknessMm: 1.5, innerDiameterMm: 39.0, roughnessMm: 0.0015, maxFlowLitersPerHour: { quiet: 2150, normal: 3440, boiler_room: 5160 } },
  ],
  steel: [
    { material: "steel", commercialName: "Stal DN15 (1/2\")", outerDiameterMm: 21.3, wallThicknessMm: 2.6, innerDiameterMm: 16.1, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 366, normal: 586, boiler_room: 879 } },
    { material: "steel", commercialName: "Stal DN20 (3/4\")", outerDiameterMm: 26.9, wallThicknessMm: 2.6, innerDiameterMm: 21.7, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 665, normal: 1065, boiler_room: 1598 } },
    { material: "steel", commercialName: "Stal DN25 (1\")", outerDiameterMm: 33.7, wallThicknessMm: 3.2, innerDiameterMm: 27.3, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 1053, normal: 1685, boiler_room: 2528 } },
    { material: "steel", commercialName: "Stal DN32 (5/4\")", outerDiameterMm: 42.4, wallThicknessMm: 3.2, innerDiameterMm: 36.0, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 1832, normal: 2931, boiler_room: 4397 } },
    { material: "steel", commercialName: "Stal DN40 (6/4\")", outerDiameterMm: 48.3, wallThicknessMm: 3.2, innerDiameterMm: 41.9, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 2482, normal: 3971, boiler_room: 5957 } },
    { material: "steel", commercialName: "Stal DN50 (2\")", outerDiameterMm: 60.3, wallThicknessMm: 3.6, innerDiameterMm: 53.1, roughnessMm: 0.045, maxFlowLitersPerHour: { quiet: 3986, normal: 6378, boiler_room: 9568 } },
  ],
  pp_stabi: [
    { material: "pp_stabi", commercialName: "PP-R Stabi 20×2.8", outerDiameterMm: 20, wallThicknessMm: 2.8, innerDiameterMm: 14.4, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 293, normal: 469, boiler_room: 704 } },
    { material: "pp_stabi", commercialName: "PP-R Stabi 25×3.5", outerDiameterMm: 25, wallThicknessMm: 3.5, innerDiameterMm: 18.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 458, normal: 733, boiler_room: 1099 } },
    { material: "pp_stabi", commercialName: "PP-R Stabi 32×4.4", outerDiameterMm: 32, wallThicknessMm: 4.4, innerDiameterMm: 23.2, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 760, normal: 1217, boiler_room: 1825 } },
    { material: "pp_stabi", commercialName: "PP-R Stabi 40×5.5", outerDiameterMm: 40, wallThicknessMm: 5.5, innerDiameterMm: 29.0, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 1189, normal: 1902, boiler_room: 2854 } },
    { material: "pp_stabi", commercialName: "PP-R Stabi 50×6.9", outerDiameterMm: 50, wallThicknessMm: 6.9, innerDiameterMm: 36.2, roughnessMm: 0.007, maxFlowLitersPerHour: { quiet: 1852, normal: 2964, boiler_room: 4446 } },
  ],
};

export interface PipeSizingInput {
  // Tryb wprowadzania: przez moc i deltę T lub bezpośrednio przepływ
  inputMode: "power" | "flow";
  thermalPowerKw: number; // Moc cieplna (kW)
  deltaTempC: number; // Różnica temperatur zasilanie - powrót (°C), np. 5°C (podłogówka/PC), 10-15°C (grzejniki), 20°C (kocioł gazowy)
  flowRateLitersPerHour: number; // Bezpośredni przepływ w l/h
  material: PipeMaterial;
  segmentLengthMeters: number; // Długość odcinka (m)
  applicationZone: "quiet" | "normal" | "boiler_room";
}

export interface PipeOptionEvaluation {
  pipe: StandardPipeSize;
  velocityMetersPerSecond: number;
  linearPressureDropPaPerM: number;
  totalPipePressureDropKPa: number;
  isAcceptable: boolean;
  status: "optimal" | "acceptable" | "velocity_too_high" | "diameter_oversized";
  statusText: string;
}

export interface PipeSizingResult {
  waterFlowLitersPerHour: number;
  waterFlowM3PerHour: number;
  waterFlowLitersPerMinute: number;
  recommendedPipe: StandardPipeSize;
  options: PipeOptionEvaluation[];
  warnings: string[];
  recommendations: string[];
}

export function calculatePipeSizing(input: PipeSizingInput): PipeSizingResult {
  // 1. Wyznaczenie przepływu objętościowego
  let flowLitersPerHour = 0;
  if (input.inputMode === "flow") {
    flowLitersPerHour = Math.max(1, input.flowRateLitersPerHour);
  } else {
    // V_dot [l/h] = (Q [kW] * 860) / deltaT [K] (przyjmując gęstość i ciepło właściwe wody)
    // Dokładny wzór: m = Q / (cp * dT) -> cp = 4.186 kJ/(kg*K), 1 kWh = 3600 kJ
    // V_dot [l/h] = (Q * 3600) / (4.186 * deltaT) = Q * 860.0 / deltaT
    const dT = Math.max(1, input.deltaTempC);
    flowLitersPerHour = Math.round((input.thermalPowerKw * 860) / dT);
  }

  const flowM3PerHour = Number((flowLitersPerHour / 1000).toFixed(3));
  const flowLitersPerMin = Number((flowLitersPerHour / 60).toFixed(1));
  const flowM3PerSec = flowLitersPerHour / (1000 * 3600);

  // Dopuszczalna prędkość wg strefy
  const maxVelocity = input.applicationZone === "quiet" ? 0.5 : input.applicationZone === "normal" ? 0.8 : 1.2;

  const pipeList = STANDARD_PIPES[input.material] || STANDARD_PIPES.pex;

  // 2. Ewaluacja każdego rozmiaru z typoszeregu
  const options: PipeOptionEvaluation[] = pipeList.map((pipe) => {
    const dMeters = pipe.innerDiameterMm / 1000;
    const areaM2 = (Math.PI * Math.pow(dMeters, 2)) / 4;
    const velocity = Number((flowM3PerSec / areaM2).toFixed(2));

    // Spadek ciśnienia: wzór Darcy-Weisbacha
    // Re = (v * d) / nu, przy 40°C lepkość kinematyczna wody nu = 0.658e-6 m²/s, gęstość rho = 992 kg/m³
    const nu = 0.658e-6;
    const re = (velocity * dMeters) / nu;
    
    // Współczynnik tarcia lambda (aproksymacja Swamee-Jain)
    const relRoughness = (pipe.roughnessMm / 1000) / dMeters;
    let lambda = 0.02;
    if (re > 2300) {
      lambda = 0.25 / Math.pow(Math.log10(relRoughness / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
    } else if (re > 0) {
      lambda = 64 / re;
    }

    const rho = 992; // kg/m³
    const linearPaPerM = Math.round(lambda * (rho * Math.pow(velocity, 2)) / (2 * dMeters));
    
    // Całkowity spadek na odcinku rury (uwzględniając naddatek 30% na opory miejscowe kształtek)
    const totalSegmentKPa = Number(((linearPaPerM * (input.segmentLengthMeters || 10) * 1.3) / 1000).toFixed(2));

    let status: PipeOptionEvaluation["status"] = "acceptable";
    let statusText = "Odpowiednia";
    let isAcceptable = true;

    if (velocity > maxVelocity * 1.25) {
      status = "velocity_too_high";
      statusText = `Zbyt duża prędkość (${velocity} m/s > ${maxVelocity} m/s) — szumy i duże opory`;
      isAcceptable = false;
    } else if (velocity < 0.2 && flowLitersPerHour > 200) {
      status = "diameter_oversized";
      statusText = `Przewymiarowana (niska prędkość ${velocity} m/s, ryzyko zamulania i wysoki koszt)`;
      isAcceptable = true;
    } else if (velocity <= maxVelocity && linearPaPerM <= 250) {
      status = "optimal";
      statusText = `Optymalna (v=${velocity} m/s, liniowy spadek ${linearPaPerM} Pa/m)`;
      isAcceptable = true;
    }

    return {
      pipe,
      velocityMetersPerSecond: velocity,
      linearPressureDropPaPerM: linearPaPerM,
      totalPipePressureDropKPa: totalSegmentKPa,
      isAcceptable,
      status,
      statusText,
    };
  });

  // Rekomendowany wybór: najmniejsza rura, która spełnia warunek prędkości optymalnej
  const suitable = options.filter((o) => o.velocityMetersPerSecond <= maxVelocity && o.linearPressureDropPaPerM <= 350);
  const recommendedOption = suitable.length > 0 ? suitable[0] : options.find((o) => o.isAcceptable) || options[options.length - 1];

  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (recommendedOption.velocityMetersPerSecond > maxVelocity) {
    warnings.push(
      `Wszystkie dostępne średnice w wybranym materiale przekraczają zalecaną prędkość ${maxVelocity} m/s dla strefy. Rozważ większą średnicę lub inny materiał (np. stal/miedź).`
    );
  }

  recommendations.push(
    `Zalecana średnica dla przepływu ${flowLitersPerHour} l/h to ${recommendedOption.pipe.commercialName} (prędkość: ${recommendedOption.velocityMetersPerSecond} m/s).`
  );
  recommendations.push(
    `Szacowany spadek ciśnienia na odcinku ${input.segmentLengthMeters}m (wraz z kształtkami): ${recommendedOption.totalPipePressureDropKPa} kPa (${Math.round(recommendedOption.totalPipePressureDropKPa * 10)} mbar).`
  );

  if (input.deltaTempC <= 5) {
    recommendations.push(
      "Niska delta T (np. 5°C dla pomp ciepła / podłogówki) wymusza znacznie większy przepływ masowy niż tradycyjne kotły gazowe (delta 15-20°C). Średnice zasilania maszynowni muszą być odpowiednio powiększone."
    );
  }

  return {
    waterFlowLitersPerHour: flowLitersPerHour,
    waterFlowM3PerHour: flowM3PerHour,
    waterFlowLitersPerMinute: flowLitersPerMin,
    recommendedPipe: recommendedOption.pipe,
    options,
    warnings,
    recommendations,
  };
}
