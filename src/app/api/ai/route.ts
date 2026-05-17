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
