import type { NextRequest } from "next/server";

/**
 * API Route — AI features (sugestie cen, kategoryzacja, predykcja, opisy).
 * Wszystko działa lokalnie bez zewnętrznego API (heurystyki + dane historyczne).
 * W produkcji można podpiąć OpenAI/Claude.
 */

const HEADERS = { "Content-Type": "application/json" };

// ─── Kategorie i słowa kluczowe ──────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  montaz: ["montaż", "instalacja", "podłączenie", "zamontowanie", "montowanie", "wpięcie", "zabudowa"],
  naprawa: ["naprawa", "uszczelnienie", "udrożnienie", "wymiana uszczelki", "reperacja", "fix", "awaria"],
  wymiana: ["wymiana", "zamiana", "podmiana", "modernizacja"],
  czyszczenie: ["czyszczenie", "mycie", "płukanie", "dezynfekcja", "udrożnienie"],
  diagnoza: ["diagnoza", "przegląd", "inspekcja", "kontrola", "sprawdzenie", "lokalizacja"],
  materialy: ["materiał", "rura", "zawór", "złączka", "uszczelka", "syfon", "bateria", "kolanko"],
  inne: [],
};

// ─── SEKOCENBUD mock data ────────────────────────────────────────────────────

const SEKOCENBUD_DATA = [
  { name: "Montaż rurociągu z rur stalowych DN15", unit: "m", priceNetto: 45, vatRate: 8, category: "montaz", norm: "KNR 2-15 0101-01" },
  { name: "Montaż rurociągu z rur stalowych DN20", unit: "m", priceNetto: 52, vatRate: 8, category: "montaz", norm: "KNR 2-15 0101-02" },
  { name: "Montaż rurociągu z rur miedzianych DN15", unit: "m", priceNetto: 68, vatRate: 8, category: "montaz", norm: "KNR 2-15 0201-01" },
  { name: "Montaż rurociągu z rur PEX DN16", unit: "m", priceNetto: 38, vatRate: 8, category: "montaz", norm: "KNR 2-15 0301-01" },
  { name: "Montaż baterii umywalkowej", unit: "szt", priceNetto: 95, vatRate: 8, category: "montaz", norm: "KNR 2-15 0501-01" },
  { name: "Montaż baterii wannowej", unit: "szt", priceNetto: 120, vatRate: 8, category: "montaz", norm: "KNR 2-15 0501-03" },
  { name: "Montaż umywalki z syfonem", unit: "szt", priceNetto: 145, vatRate: 8, category: "montaz", norm: "KNR 2-15 0601-01" },
  { name: "Montaż WC kompakt", unit: "szt", priceNetto: 180, vatRate: 8, category: "montaz", norm: "KNR 2-15 0601-05" },
  { name: "Montaż WC podwieszanego ze stelażem", unit: "szt", priceNetto: 320, vatRate: 8, category: "montaz", norm: "KNR 2-15 0601-07" },
  { name: "Montaż kabiny prysznicowej", unit: "szt", priceNetto: 280, vatRate: 8, category: "montaz", norm: "KNR 2-15 0601-10" },
  { name: "Montaż grzejnika stalowego", unit: "szt", priceNetto: 160, vatRate: 8, category: "montaz", norm: "KNR 2-15 0801-01" },
  { name: "Montaż zaworu odcinającego DN15", unit: "szt", priceNetto: 35, vatRate: 23, category: "montaz", norm: "KNR 2-15 0401-01" },
  { name: "Montaż wodomierza DN15", unit: "szt", priceNetto: 85, vatRate: 8, category: "montaz", norm: "KNR 2-15 0401-05" },
  { name: "Próba szczelności instalacji wodociągowej", unit: "m", priceNetto: 12, vatRate: 23, category: "diagnoza", norm: "KNR 2-15 0901-01" },
  { name: "Udrożnienie kanalizacji spiralą do DN100", unit: "szt", priceNetto: 150, vatRate: 8, category: "czyszczenie", norm: "KNR 2-15 1001-01" },
  { name: "Wymiana odcinka rury kanalizacyjnej PVC DN110", unit: "m", priceNetto: 85, vatRate: 8, category: "wymiana", norm: "KNR 2-15 0701-03" },
  { name: "Izolacja rurociągu otuliną DN15", unit: "m", priceNetto: 18, vatRate: 23, category: "montaz", norm: "KNR 2-15 1101-01" },
  { name: "Roboty demontażowe — rurociąg stalowy", unit: "m", priceNetto: 25, vatRate: 23, category: "inne", norm: "KNR 2-15 1201-01" },
  { name: "Przebicie otworu w ścianie do DN50", unit: "szt", priceNetto: 45, vatRate: 23, category: "inne", norm: "KNR 4-01 0101-01" },
  { name: "Przebicie otworu w stropie do DN100", unit: "szt", priceNetto: 75, vatRate: 23, category: "inne", norm: "KNR 4-01 0101-03" },
];

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "suggest_price":
      return handleSuggestPrice(body);
    case "categorize":
      return handleCategorize(body);
    case "predict_conversion":
      return handlePredictConversion(body);
    case "generate_description":
      return handleGenerateDescription(body);
    case "sekocenbud":
      return handleSekocenbud(body);
    case "electrical_suggest":
      return handleElectricalSuggest(body);
    case "electrical_power_calc":
      return handleElectricalPowerCalc(body);
    default:
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: HEADERS });
  }
}

// ─── Sugestia ceny ───────────────────────────────────────────────────────────

function handleSuggestPrice(body: { serviceName: string; history: { name: string; price: number }[] }): Response {
  const { serviceName, history } = body;
  const name = (serviceName || "").toLowerCase();

  // Znajdź podobne usługi w historii
  const similar = (history || []).filter((h) =>
    h.name.toLowerCase().includes(name) || name.includes(h.name.toLowerCase())
  );

  let suggestedPrice = 0;
  let confidence = 0;
  let source = "";

  if (similar.length >= 3) {
    // Średnia z historii
    suggestedPrice = Math.round(similar.reduce((s, h) => s + h.price, 0) / similar.length);
    confidence = Math.min(95, 60 + similar.length * 5);
    source = `Średnia z ${similar.length} podobnych usług`;
  } else if (similar.length > 0) {
    suggestedPrice = similar[0].price;
    confidence = 40 + similar.length * 10;
    source = "Na podstawie podobnej usługi";
  } else {
    // Sprawdź SEKOCENBUD
    const sekMatch = SEKOCENBUD_DATA.find((s) =>
      s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase().slice(0, 15))
    );
    if (sekMatch) {
      suggestedPrice = sekMatch.priceNetto;
      confidence = 50;
      source = `Norma ${sekMatch.norm}`;
    } else {
      suggestedPrice = 150; // domyślna
      confidence = 10;
      source = "Brak danych — wartość domyślna";
    }
  }

  return new Response(JSON.stringify({ suggestedPrice, confidence, source }), { headers: HEADERS });
}

// ─── Kategoryzacja ───────────────────────────────────────────────────────────

function handleCategorize(body: { serviceName: string }): Response {
  const name = (body.serviceName || "").toLowerCase();

  let bestCategory = "inne";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => name.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return new Response(JSON.stringify({ category: bestCategory, confidence: bestScore > 0 ? Math.min(95, bestScore * 30 + 40) : 20 }), { headers: HEADERS });
}

// ─── Predykcja konwersji ─────────────────────────────────────────────────────

function handlePredictConversion(body: {
  clientHistory: { total: number; accepted: number };
  quoteValue: number;
  avgQuoteValue: number;
}): Response {
  const { clientHistory, quoteValue, avgQuoteValue } = body;

  let probability = 50; // bazowa

  // Historia klienta
  if (clientHistory && clientHistory.total > 0) {
    const clientRate = (clientHistory.accepted / clientHistory.total) * 100;
    probability = clientRate * 0.6 + probability * 0.4;
  }

  // Wartość wyceny vs średnia
  if (avgQuoteValue > 0 && quoteValue > 0) {
    const ratio = quoteValue / avgQuoteValue;
    if (ratio < 0.5) probability += 15; // tania = łatwiej zaakceptować
    else if (ratio > 2) probability -= 20; // droga = trudniej
    else if (ratio > 1.5) probability -= 10;
  }

  // Clamp
  probability = Math.max(5, Math.min(95, Math.round(probability)));

  let label: string;
  if (probability >= 75) label = "Wysoka szansa";
  else if (probability >= 50) label = "Średnia szansa";
  else if (probability >= 30) label = "Niska szansa";
  else label = "Bardzo niska szansa";

  return new Response(JSON.stringify({ probability, label }), { headers: HEADERS });
}

// ─── Generowanie opisu ───────────────────────────────────────────────────────

function handleGenerateDescription(body: { serviceName: string; category?: string }): Response {
  const { serviceName, category } = body;
  const name = serviceName || "";

  // Proste generowanie opisu na podstawie nazwy i kategorii
  const templates: Record<string, string> = {
    montaz: `Profesjonalny montaż: ${name}. Obejmuje przygotowanie miejsca, instalację zgodnie z normami, podłączenie i próbę szczelności. Gwarancja na wykonanie.`,
    naprawa: `Naprawa: ${name}. Diagnostyka usterki, wymiana uszkodzonych elementów, przywrócenie pełnej sprawności. Gwarancja na naprawę.`,
    wymiana: `Wymiana: ${name}. Demontaż starego elementu, montaż nowego, sprawdzenie poprawności działania. Materiały w cenie lub wg uzgodnienia.`,
    czyszczenie: `Czyszczenie: ${name}. Profesjonalne czyszczenie z użyciem specjalistycznego sprzętu. Przywrócenie pełnej drożności/sprawności.`,
    diagnoza: `Diagnostyka: ${name}. Szczegółowa inspekcja, lokalizacja problemu, raport z zaleceniami naprawy.`,
    materialy: `Materiał: ${name}. Dostawa i ewentualny montaż. Cena obejmuje materiał z dostawą na miejsce.`,
    inne: `Usługa: ${name}. Wykonanie zgodnie z ustaleniami i standardami branżowymi.`,
  };

  const description = templates[category || "inne"] || templates.inne;

  return new Response(JSON.stringify({ description }), { headers: HEADERS });
}

// ─── SEKOCENBUD ──────────────────────────────────────────────────────────────

function handleSekocenbud(body: { query?: string }): Response {
  const query = (body.query || "").toLowerCase();

  let results = SEKOCENBUD_DATA;
  if (query) {
    results = SEKOCENBUD_DATA.filter((s) =>
      s.name.toLowerCase().includes(query) || s.norm.toLowerCase().includes(query)
    );
  }

  return new Response(JSON.stringify({ items: results, total: results.length }), { headers: HEADERS });
}

// ─── AI Sugestie Elektryczne ─────────────────────────────────────────────────

// Baza wiedzy: typowe zestawy pozycji dla opisów prac elektrycznych
const ELECTRICAL_WORK_PATTERNS: Array<{
  keywords: string[];
  items: Array<{ name: string; qty: number; unit: string; priceId: string }>;
  notes: string;
}> = [
  {
    keywords: ["wymiana instalacji", "nowa instalacja", "remont instalacji", "przeróbka instalacji"],
    items: [
      { name: "Prowadzenie przewodów w bruździe", qty: 0, unit: "mb", priceId: "EL-IN-001" },
      { name: "Montaż puszki instalacyjnej", qty: 0, unit: "szt", priceId: "EL-IN-004" },
      { name: "Montaż gniazdka elektrycznego pojedynczego", qty: 0, unit: "szt", priceId: "EL-GN-001" },
      { name: "Montaż wyłącznika światła pojedynczego", qty: 0, unit: "szt", priceId: "EL-GN-004" },
      { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001" },
      { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: 0, unit: "szt", priceId: "EL-RZ-002" },
      { name: "Montaż wyłącznika różnicowoprądowego (RCD)", qty: 2, unit: "szt", priceId: "EL-RZ-003" },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004" },
    ],
    notes: "Kompleksowa wymiana instalacji. Ilości zależą od metrażu — uzupełnij wg kalkulatora mocy.",
  },
  {
    keywords: ["gniazdka", "gniazda", "montaż gniazdek", "dodatkowe gniazdka"],
    items: [
      { name: "Montaż gniazdka elektrycznego pojedynczego", qty: 0, unit: "szt", priceId: "EL-GN-001" },
      { name: "Prowadzenie przewodów w bruździe", qty: 0, unit: "mb", priceId: "EL-IN-001" },
      { name: "Montaż puszki instalacyjnej", qty: 0, unit: "szt", priceId: "EL-IN-004" },
    ],
    notes: "Montaż gniazdek elektrycznych. Uzupełnij ilości.",
  },
  {
    keywords: ["oświetlenie", "lampy", "led", "światło", "oprawy"],
    items: [
      { name: "Montaż lampy sufitowej (plafon)", qty: 0, unit: "szt", priceId: "EL-OS-001" },
      { name: "Montaż oprawy podtynkowej (downlight)", qty: 0, unit: "szt", priceId: "EL-OS-003" },
      { name: "Montaż wyłącznika światła pojedynczego", qty: 0, unit: "szt", priceId: "EL-GN-004" },
      { name: "Prowadzenie przewodów w bruździe", qty: 0, unit: "mb", priceId: "EL-IN-001" },
    ],
    notes: "Montaż oświetlenia. Uzupełnij ilości lamp i metraż przewodów.",
  },
  {
    keywords: ["rozdzielnica", "tablica", "skrzynka elektryczna", "bezpieczniki", "rozdzielnia"],
    items: [
      { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001" },
      { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: 0, unit: "szt", priceId: "EL-RZ-002" },
      { name: "Montaż wyłącznika różnicowoprądowego (RCD)", qty: 2, unit: "szt", priceId: "EL-RZ-003" },
      { name: "Montaż ochronnika przepięć (SPD)", qty: 1, unit: "szt", priceId: "EL-RZ-004" },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 0, unit: "obwód", priceId: "EL-PM-002" },
    ],
    notes: "Montaż/wymiana rozdzielnicy. Uzupełnij liczbę bezpieczników wg liczby obwodów.",
  },
  {
    keywords: ["pomiary", "odbiór", "protokół", "przegląd instalacji", "certyfikat"],
    items: [
      { name: "Pomiar rezystancji izolacji", qty: 0, unit: "obwód", priceId: "EL-PM-001" },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 0, unit: "obwód", priceId: "EL-PM-002" },
      { name: "Pomiar wyłącznika różnicowoprądowego", qty: 0, unit: "szt", priceId: "EL-PM-003" },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004" },
    ],
    notes: "Pomiary elektryczne z protokołem. Uzupełnij liczbę obwodów.",
  },
  {
    keywords: ["fotowoltaika", "pv", "panele słoneczne", "solar", "instalacja pv"],
    items: [
      { name: "Montaż instalacji fotowoltaicznej (kWp)", qty: 0, unit: "kWp", priceId: "EL-IN-010" },
      { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001" },
      { name: "Montaż ochronnika przepięć (SPD)", qty: 1, unit: "szt", priceId: "EL-RZ-004" },
      { name: "Prowadzenie przewodów w rurce ochronnej (mb)", qty: 0, unit: "mb", priceId: "EL-IN-003" },
      { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004" },
    ],
    notes: "Instalacja fotowoltaiczna. Uzupełnij moc [kWp] i długość tras kablowych.",
  },
  {
    keywords: ["ładowarka ev", "ładowarka samochód", "wallbox", "auto elektryczne", "punkt ładowania"],
    items: [
      { name: "Montaż ładowarki EV (wallbox)", qty: 1, unit: "szt", priceId: "EL-IN-009" },
      { name: "Prowadzenie przewodów w rurce ochronnej (mb)", qty: 0, unit: "mb", priceId: "EL-IN-003" },
      { name: "Rozbudowa rozdzielnicy (dodanie obwodu)", qty: 1, unit: "szt", priceId: "EL-RZ-006" },
      { name: "Pomiar skuteczności ochrony (zerowanie)", qty: 1, unit: "obwód", priceId: "EL-PM-002" },
    ],
    notes: "Montaż ładowarki EV. Uzupełnij długość trasy kablowej.",
  },
  {
    keywords: ["alarm", "system alarmowy", "czujniki", "sygnalizator"],
    items: [
      { name: "Montaż systemu alarmowego (podstawowy)", qty: 1, unit: "kpl", priceId: "EL-IN-008" },
      { name: "Prowadzenie przewodów natynkowo (mb)", qty: 0, unit: "mb", priceId: "EL-IN-002" },
    ],
    notes: "Montaż systemu alarmowego. Uzupełnij długość tras kablowych.",
  },
  {
    keywords: ["domofon", "wideofon", "wideodomofon", "interkom"],
    items: [
      { name: "Montaż domofonu/wideodomofonu", qty: 1, unit: "szt", priceId: "EL-IN-007" },
      { name: "Prowadzenie przewodów natynkowo (mb)", qty: 0, unit: "mb", priceId: "EL-IN-002" },
    ],
    notes: "Montaż domofonu/wideodomofonu.",
  },
  {
    keywords: ["awaria", "naprawa", "nie działa", "brak prądu", "zwarcie", "przepalony"],
    items: [
      { name: "Lokalizacja i usunięcie awarii elektrycznej", qty: 1, unit: "kpl", priceId: "EL-NA-001" },
      { name: "Naprawa instalacji elektrycznej (godz)", qty: 0, unit: "godz", priceId: "EL-NA-002" },
    ],
    notes: "Naprawa awarii elektrycznej. Czas pracy zależy od zakresu.",
  },
];

interface ElectricalSuggestBody {
  description: string;
  area?: number; // m² mieszkania
  rooms?: number;
  standard?: "ekonomiczny" | "standard" | "premium";
}

function handleElectricalSuggest(body: ElectricalSuggestBody): Response {
  const desc = (body.description || "").toLowerCase();
  const area = body.area || 0;
  const rooms = body.rooms || 0;
  const standard = body.standard || "standard";

  // Znajdź pasujące wzorce
  const matched = ELECTRICAL_WORK_PATTERNS.filter((p) =>
    p.keywords.some((kw) => desc.includes(kw))
  );

  if (matched.length === 0) {
    // Fallback — ogólna wycena
    return new Response(JSON.stringify({
      items: [
        { name: "Robocizna elektryczna — stawka godzinowa", qty: 4, unit: "godz", priceId: "EL-ROB-001" },
        { name: "Dojazd do klienta", qty: 1, unit: "kpl", priceId: "EL-ROB-003" },
      ],
      notes: "Nie rozpoznano zakresu prac. Uzupełnij pozycje ręcznie lub użyj kalkulatora mocy.",
      confidence: 20,
      matchedPattern: null,
    }), { headers: HEADERS });
  }

  // Użyj pierwszego pasującego wzorca (najlepsze dopasowanie)
  const best = matched[0];

  // Automatyczne ilości na podstawie metrażu
  const multiplier = standard === "premium" ? 1.3 : standard === "ekonomiczny" ? 0.8 : 1.0;

  const items = best.items.map((item) => {
    let qty = item.qty;

    // Automatyczne obliczanie ilości na podstawie metrażu
    if (qty === 0 && area > 0) {
      if (item.priceId === "EL-IN-001" || item.priceId === "EL-IN-002" || item.priceId === "EL-IN-003") {
        // Przewody: ~3 mb/m² dla pełnej instalacji
        qty = Math.round(area * 3 * multiplier);
      } else if (item.priceId === "EL-GN-001" || item.priceId === "EL-GN-002") {
        // Gniazdka: ~3-4 na pokój
        qty = Math.round((rooms || Math.ceil(area / 20)) * 3.5 * multiplier);
      } else if (item.priceId === "EL-GN-004" || item.priceId === "EL-GN-005") {
        // Wyłączniki: ~1-2 na pokój
        qty = Math.round((rooms || Math.ceil(area / 20)) * 1.5 * multiplier);
      } else if (item.priceId === "EL-IN-004") {
        // Puszki: ~1 na 5 mb przewodów
        qty = Math.round((area * 3 * multiplier) / 5);
      } else if (item.priceId === "EL-RZ-002") {
        // Bezpieczniki: ~1 na 20m² + 2 zapasowe
        qty = Math.round(area / 20 + 2);
      } else if (item.priceId === "EL-PM-001" || item.priceId === "EL-PM-002") {
        // Pomiary: liczba obwodów = liczba bezpieczników
        qty = Math.round(area / 20 + 2);
      } else if (item.priceId === "EL-PM-003") {
        // RCD: 2 szt standardowo
        qty = 2;
      } else if (item.priceId === "EL-OS-001" || item.priceId === "EL-OS-003") {
        // Lampy: ~1 na pokój
        qty = rooms || Math.ceil(area / 20);
      } else {
        qty = 1;
      }
    } else if (qty === 0) {
      qty = 1;
    }

    return { ...item, qty: Math.max(1, qty) };
  });

  const confidence = matched.length > 1 ? 75 : 85;

  return new Response(JSON.stringify({
    items,
    notes: best.notes,
    confidence,
    matchedPattern: best.keywords[0],
    allMatched: matched.map((m) => m.keywords[0]),
  }), { headers: HEADERS });
}

// ─── Kalkulator Mocy / Mieszkania ────────────────────────────────────────────

interface PowerCalcBody {
  area: number;          // m²
  rooms: number;         // liczba pokoi
  standard: "ekonomiczny" | "standard" | "premium";
  hasGarage?: boolean;
  hasEV?: boolean;
  hasPV?: boolean;
  laborRate?: number;    // PLN/godz
}

interface PowerCalcResult {
  // Instalacja
  circuitsCount: number;
  socketsCount: number;
  switchesCount: number;
  cableMeters: number;
  junctionBoxes: number;
  breakersCount: number;
  rcdCount: number;
  // Rozdzielnica
  panelModules: number;
  // Czas pracy
  laborHours: number;
  // Koszty
  laborCost: number;
  materialEstimate: number;
  totalNetto: number;
  totalBrutto: number;
  // Techniczne
  mainFuseA: number;       // główny bezpiecznik [A]
  cableCrossSection: string; // przekrój główny
  // Pozycje do wyceny
  suggestedItems: Array<{
    name: string; qty: number; unit: string; priceId: string; priceNetto: number;
  }>;
  warnings: string[];
}

// Ceny z cennika elektrycznego (uproszczone)
const PRICE_MAP: Record<string, number> = {
  "EL-GN-001": 80, "EL-GN-004": 70, "EL-IN-001": 55, "EL-IN-004": 50,
  "EL-RZ-001": 600, "EL-RZ-002": 60, "EL-RZ-003": 120, "EL-RZ-004": 200,
  "EL-PM-001": 80, "EL-PM-002": 70, "EL-PM-003": 50, "EL-PM-004": 400,
  "EL-IN-009": 800, "EL-IN-010": 1800, "EL-ROB-003": 80,
};

function handleElectricalPowerCalc(body: PowerCalcBody): Response {
  const { area, rooms, standard, hasGarage = false, hasEV = false, hasPV = false, laborRate = 130 } = body;

  if (!area || area <= 0) {
    return new Response(JSON.stringify({ error: "Podaj metraż mieszkania" }), { status: 400, headers: HEADERS });
  }

  const warnings: string[] = [];

  // Mnożniki standardu
  const mult = standard === "premium" ? 1.4 : standard === "ekonomiczny" ? 0.75 : 1.0;

  // ── Obliczenia wg normy PN-HD 60364 ──────────────────────────────────────

  // Liczba pokoi (jeśli nie podano)
  const roomCount = rooms || Math.max(1, Math.round(area / 20));

  // Obwody elektryczne
  // Norma: min 1 obwód oświetleniowy na 50m², 1 obwód gniazdkowy na 20m²
  const lightingCircuits = Math.max(1, Math.ceil(area / 50));
  const socketCircuits = Math.max(2, Math.ceil(area / 20));
  const kitchenCircuits = 3; // kuchenka, zmywarka, lodówka
  const bathroomCircuits = 2; // grzejnik, pralka
  const garageCircuits = hasGarage ? 2 : 0;
  const evCircuit = hasEV ? 1 : 0;
  const pvCircuit = hasPV ? 1 : 0;
  const spareCircuits = Math.ceil((lightingCircuits + socketCircuits) * 0.2); // 20% zapas

  const circuitsCount = lightingCircuits + socketCircuits + kitchenCircuits + bathroomCircuits + garageCircuits + evCircuit + pvCircuit + spareCircuits;

  // Gniazdka: min 1 na 4m² w pokojach, 4 w kuchni, 2 w łazience
  const socketsPerRoom = Math.round(4 * mult);
  const socketsCount = Math.round((roomCount * socketsPerRoom + 4 + 2 + (hasGarage ? 4 : 0)) * mult);

  // Wyłączniki: ~1.5 na pokój
  const switchesCount = Math.round(roomCount * 1.5 * mult);

  // Przewody: ~3 mb/m² dla pełnej instalacji
  const cableMeters = Math.round(area * 3 * mult);

  // Puszki: ~1 na 5 mb przewodów
  const junctionBoxes = Math.round(cableMeters / 5);

  // Bezpieczniki = liczba obwodów
  const breakersCount = circuitsCount;

  // RCD: min 2 (norma), + 1 na każde 10 obwodów
  const rcdCount = Math.max(2, Math.ceil(circuitsCount / 10) + 1);

  // Moduły rozdzielnicy: bezpieczniki + RCD + SPD (2 mod) + zapas 20%
  const panelModules = Math.ceil((breakersCount + rcdCount * 2 + 2) * 1.2);

  // Główny bezpiecznik
  const estimatedPower = area * 50; // ~50W/m² szacunkowe
  const mainFuseA = estimatedPower <= 7000 ? 25 : estimatedPower <= 11000 ? 40 : 63;
  const cableCrossSection = mainFuseA <= 25 ? "4 mm²" : mainFuseA <= 40 ? "6 mm²" : "10 mm²";

  // Czas pracy: ~0.5 godz/m² dla pełnej instalacji
  const laborHours = Math.round(area * 0.5 * mult + (hasEV ? 3 : 0) + (hasPV ? 8 : 0));

  // Koszty
  const laborCost = Math.round(laborHours * laborRate);
  const materialEstimate = Math.round(laborCost * 0.6); // materiały ~60% robocizny
  const totalNetto = laborCost + materialEstimate;
  const totalBrutto = Math.round(totalNetto * 1.08);

  // Ostrzeżenia
  if (area > 150) warnings.push("Duże mieszkanie — rozważ 3-fazowe zasilanie");
  if (hasEV && !hasGarage) warnings.push("Ładowarka EV bez garażu — sprawdź możliwość montażu zewnętrznego");
  if (hasPV) warnings.push("Instalacja PV wymaga zgłoszenia do zakładu energetycznego");
  if (circuitsCount > 20) warnings.push("Duża liczba obwodów — rozważ rozdzielnicę 3-rzędową");

  // Pozycje do wyceny
  const suggestedItems = [
    { name: "Prowadzenie przewodów w bruździe", qty: cableMeters, unit: "mb", priceId: "EL-IN-001", priceNetto: PRICE_MAP["EL-IN-001"] },
    { name: "Montaż puszki instalacyjnej", qty: junctionBoxes, unit: "szt", priceId: "EL-IN-004", priceNetto: PRICE_MAP["EL-IN-004"] },
    { name: "Montaż gniazdka elektrycznego pojedynczego", qty: socketsCount, unit: "szt", priceId: "EL-GN-001", priceNetto: PRICE_MAP["EL-GN-001"] },
    { name: "Montaż wyłącznika światła pojedynczego", qty: switchesCount, unit: "szt", priceId: "EL-GN-004", priceNetto: PRICE_MAP["EL-GN-004"] },
    { name: "Montaż rozdzielnicy mieszkaniowej", qty: 1, unit: "szt", priceId: "EL-RZ-001", priceNetto: PRICE_MAP["EL-RZ-001"] },
    { name: "Montaż wyłącznika nadprądowego (bezpiecznik)", qty: breakersCount, unit: "szt", priceId: "EL-RZ-002", priceNetto: PRICE_MAP["EL-RZ-002"] },
    { name: "Montaż wyłącznika różnicowoprądowego (RCD)", qty: rcdCount, unit: "szt", priceId: "EL-RZ-003", priceNetto: PRICE_MAP["EL-RZ-003"] },
    { name: "Montaż ochronnika przepięć (SPD)", qty: 1, unit: "szt", priceId: "EL-RZ-004", priceNetto: PRICE_MAP["EL-RZ-004"] },
    { name: "Pomiar rezystancji izolacji", qty: circuitsCount, unit: "obwód", priceId: "EL-PM-001", priceNetto: PRICE_MAP["EL-PM-001"] },
    { name: "Pomiar skuteczności ochrony (zerowanie)", qty: circuitsCount, unit: "obwód", priceId: "EL-PM-002", priceNetto: PRICE_MAP["EL-PM-002"] },
    { name: "Pomiar wyłącznika różnicowoprądowego", qty: rcdCount, unit: "szt", priceId: "EL-PM-003", priceNetto: PRICE_MAP["EL-PM-003"] },
    { name: "Odbiór instalacji elektrycznej — protokół", qty: 1, unit: "kpl", priceId: "EL-PM-004", priceNetto: PRICE_MAP["EL-PM-004"] },
    ...(hasEV ? [{ name: "Montaż ładowarki EV (wallbox)", qty: 1, unit: "szt", priceId: "EL-IN-009", priceNetto: PRICE_MAP["EL-IN-009"] }] : []),
    ...(hasPV ? [{ name: "Montaż instalacji fotowoltaicznej (kWp)", qty: Math.round(area / 10), unit: "kWp", priceId: "EL-IN-010", priceNetto: PRICE_MAP["EL-IN-010"] }] : []),
    { name: "Opłata za dojazd (ryczałt)", qty: 1, unit: "kpl", priceId: "EL-ROB-003", priceNetto: PRICE_MAP["EL-ROB-003"] },
  ];

  const result: PowerCalcResult = {
    circuitsCount, socketsCount, switchesCount, cableMeters, junctionBoxes,
    breakersCount, rcdCount, panelModules, laborHours, laborCost,
    materialEstimate, totalNetto, totalBrutto, mainFuseA, cableCrossSection,
    suggestedItems, warnings,
  };

  return new Response(JSON.stringify(result), { headers: HEADERS });
}
