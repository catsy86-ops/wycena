import type { NextRequest } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExternalPricingItem {
  name: string;
  unit: string;
  priceNetto: number;
  vatRate: number;
  category?: string;
  description?: string;
  externalId?: string;
}

interface ExternalPricingResult {
  source: string;
  items: ExternalPricingItem[];
  fetchedAt: string;
  error?: string;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
  "Content-Type": "application/json",
};

// ─── Rate limiting hint ───────────────────────────────────────────────────────
// In production, implement rate limiting here using e.g. Upstash Redis or
// a middleware-level token bucket.
// Example: await rateLimit(request.ip ?? "anonymous", { limit: 30, window: "1m" })

// ─── Mock data — realistyczne polskie ceny hydrauliczne 2024/2025 ─────────────

const BUILTIN_MOCK_ITEMS: ExternalPricingItem[] = [
  // Robocizna
  { name: "Robocizna hydrauliczna — stawka godzinowa", unit: "godz", priceNetto: 120, vatRate: 23, category: "robocizna", description: "Standardowa stawka robocizny hydraulika", externalId: "ROB-001" },
  { name: "Robocizna — dojazd do klienta", unit: "godz", priceNetto: 80, vatRate: 23, category: "robocizna", description: "Czas dojazdu i powrotu", externalId: "ROB-002" },
  { name: "Robocizna — prace wykończeniowe po montażu", unit: "godz", priceNetto: 100, vatRate: 23, category: "robocizna", description: "Uszczelnianie, tynkowanie po pracach hydraulicznych", externalId: "ROB-003" },
  // Montaż
  { name: "Montaż baterii umywalkowej", unit: "szt", priceNetto: 180, vatRate: 8, category: "montaz", description: "Montaż baterii jednouchwytowej lub dwuuchwytowej", externalId: "MON-001" },
  { name: "Montaż baterii wannowej", unit: "szt", priceNetto: 220, vatRate: 8, category: "montaz", description: "Montaż baterii wannowej z zestawem prysznicowym", externalId: "MON-002" },
  { name: "Montaż baterii kuchennej", unit: "szt", priceNetto: 160, vatRate: 8, category: "montaz", description: "Montaż baterii kuchennej stojącej lub ściennej", externalId: "MON-003" },
  { name: "Montaż WC kompakt", unit: "szt", priceNetto: 350, vatRate: 8, category: "montaz", description: "Montaż muszli WC z zbiornikiem kompaktowym", externalId: "MON-004" },
  { name: "Montaż WC podwieszanego", unit: "szt", priceNetto: 480, vatRate: 8, category: "montaz", description: "Montaż muszli WC podwieszanej z stelażem", externalId: "MON-005" },
  { name: "Montaż umywalki", unit: "szt", priceNetto: 280, vatRate: 8, category: "montaz", description: "Montaż umywalki z syfonem i podłączeniem", externalId: "MON-006" },
  { name: "Montaż kabiny prysznicowej", unit: "szt", priceNetto: 650, vatRate: 8, category: "montaz", description: "Montaż kabiny prysznicowej z brodzikiem", externalId: "MON-007" },
  { name: "Montaż grzejnika łazienkowego", unit: "szt", priceNetto: 320, vatRate: 8, category: "montaz", description: "Montaż grzejnika drabinkowego lub panelowego", externalId: "MON-008" },
  { name: "Montaż wodomierza", unit: "szt", priceNetto: 250, vatRate: 8, category: "montaz", description: "Montaż wodomierza z zaworem odcinającym", externalId: "MON-009" },
  { name: "Montaż zaworu kulowego DN15", unit: "szt", priceNetto: 90, vatRate: 23, category: "montaz", description: "Montaż zaworu kulowego na rurze 1/2\"", externalId: "MON-010" },
  // Wymiana rur
  { name: "Wymiana rur miedzianych — instalacja wodna", unit: "mb", priceNetto: 85, vatRate: 8, category: "montaz", description: "Wymiana rur miedzianych Ø15 wraz z materiałem", externalId: "WYM-001" },
  { name: "Wymiana rur PEX — instalacja wodna", unit: "mb", priceNetto: 65, vatRate: 8, category: "montaz", description: "Wymiana rur PEX Ø16 wraz z materiałem", externalId: "WYM-002" },
  { name: "Wymiana rur kanalizacyjnych PVC", unit: "mb", priceNetto: 110, vatRate: 8, category: "montaz", description: "Wymiana rur kanalizacyjnych PVC Ø110 wraz z materiałem", externalId: "WYM-003" },
  // Naprawa
  { name: "Uszczelnienie złącza rury", unit: "szt", priceNetto: 120, vatRate: 8, category: "naprawa", description: "Uszczelnienie nieszczelnego złącza lub połączenia", externalId: "NAP-001" },
  { name: "Naprawa wycieku — lokalizacja i usunięcie", unit: "kpl", priceNetto: 350, vatRate: 8, category: "naprawa", description: "Lokalizacja wycieku i naprawa — do 1 godziny pracy", externalId: "NAP-002" },
  { name: "Udrożnienie odpływu — syfon", unit: "szt", priceNetto: 150, vatRate: 8, category: "naprawa", description: "Udrożnienie zatkniętego syfonu umywalki lub wanny", externalId: "NAP-003" },
  { name: "Udrożnienie kanalizacji — spiralą", unit: "kpl", priceNetto: 280, vatRate: 8, category: "naprawa", description: "Udrożnienie kanalizacji spiralą elektryczną", externalId: "NAP-004" },
  { name: "Wymiana uszczelki w baterii", unit: "szt", priceNetto: 100, vatRate: 8, category: "naprawa", description: "Wymiana uszczelki lub wkładki ceramicznej", externalId: "NAP-005" },
  // Materiały
  { name: "Rura miedziana Ø15 — materiał", unit: "mb", priceNetto: 18, vatRate: 23, category: "materialy", description: "Rura miedziana twarda Ø15×1 mm", externalId: "MAT-001" },
  { name: "Rura PEX Ø16 — materiał", unit: "mb", priceNetto: 8, vatRate: 23, category: "materialy", description: "Rura wielowarstwowa PEX-AL-PEX Ø16", externalId: "MAT-002" },
  { name: "Rura PVC kanalizacyjna Ø110 — materiał", unit: "mb", priceNetto: 22, vatRate: 23, category: "materialy", description: "Rura kanalizacyjna PVC-U Ø110 mm", externalId: "MAT-003" },
  { name: "Zawór kulowy DN15 — materiał", unit: "szt", priceNetto: 35, vatRate: 23, category: "materialy", description: "Zawór kulowy mosiężny DN15 (1/2\")", externalId: "MAT-004" },
  { name: "Złączka zaciskowa PEX Ø16 — materiał", unit: "szt", priceNetto: 12, vatRate: 23, category: "materialy", description: "Złączka zaciskowa do rur PEX Ø16", externalId: "MAT-005" },
  { name: "Uszczelka gumowa — komplet", unit: "kpl", priceNetto: 8, vatRate: 23, category: "materialy", description: "Komplet uszczelek gumowych do baterii", externalId: "MAT-006" },
  { name: "Taśma teflonowa PTFE — rolka", unit: "szt", priceNetto: 4, vatRate: 23, category: "materialy", description: "Taśma uszczelniająca PTFE 12mm×10m", externalId: "MAT-007" },
  { name: "Syfon umywalkowy — materiał", unit: "szt", priceNetto: 28, vatRate: 23, category: "materialy", description: "Syfon butelkowy do umywalki z rurką odpływową", externalId: "MAT-008" },
  { name: "Pasta uszczelniająca Unipak — tuba", unit: "szt", priceNetto: 22, vatRate: 23, category: "materialy", description: "Pasta uszczelniająca do gwintów 180g", externalId: "MAT-009" },
];

// ─── GUS-style mock — wskaźniki kosztów budowlanych ──────────────────────────

const GUS_MOCK_ITEMS: ExternalPricingItem[] = [
  { name: "Robocizna budowlana — wskaźnik GUS Q3/2024", unit: "godz", priceNetto: 118.5, vatRate: 23, category: "robocizna", description: "Przeciętne wynagrodzenie w budownictwie wg GUS — III kw. 2024", externalId: "GUS-ROB-2024Q3" },
  { name: "Instalacje sanitarne — robocizna (GUS)", unit: "godz", priceNetto: 125.0, vatRate: 23, category: "robocizna", description: "Stawka robocizny dla instalacji sanitarnych wg wskaźników GUS", externalId: "GUS-SAN-2024" },
  { name: "Materiały instalacyjne — indeks cen GUS 2024", unit: "kpl", priceNetto: 1850.0, vatRate: 23, category: "materialy", description: "Indeks cen materiałów instalacyjnych wg GUS (baza 2020=100, wartość 118,4)", externalId: "GUS-MAT-IDX-2024" },
  { name: "Montaż instalacji wodociągowej — norma GUS", unit: "m", priceNetto: 92.0, vatRate: 8, category: "montaz", description: "Koszt montażu instalacji wodociągowej wg norm GUS/SEKOCENBUD", externalId: "GUS-WOD-2024" },
  { name: "Montaż instalacji kanalizacyjnej — norma GUS", unit: "m", priceNetto: 105.0, vatRate: 8, category: "montaz", description: "Koszt montażu instalacji kanalizacyjnej wg norm GUS/SEKOCENBUD", externalId: "GUS-KAN-2024" },
  { name: "Roboty remontowe — instalacje (GUS)", unit: "m2", priceNetto: 280.0, vatRate: 8, category: "naprawa", description: "Koszt robót remontowych instalacji sanitarnych na m² wg GUS", externalId: "GUS-REM-2024" },
  { name: "Wskaźnik kosztów ogólnych budowy (GUS 2024)", unit: "kpl", priceNetto: 15.5, vatRate: 23, category: "robocizna", description: "Procentowy wskaźnik kosztów ogólnych wg GUS — 15,5% od kosztów bezpośrednich", externalId: "GUS-KO-2024" },
  { name: "Zysk kalkulacyjny — budownictwo (GUS 2024)", unit: "kpl", priceNetto: 8.2, vatRate: 23, category: "robocizna", description: "Wskaźnik zysku kalkulacyjnego wg GUS — 8,2% od kosztów bezpośrednich i ogólnych", externalId: "GUS-ZYS-2024" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByQuery(items: ExternalPricingItem[], query: string): ExternalPricingItem[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
  );
}

function jsonResponse(data: ExternalPricingResult, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;

  const source = searchParams.get("source") ?? "";
  const query = searchParams.get("query") ?? "";
  const apiKey = searchParams.get("apiKey") ?? "";
  const customUrl = searchParams.get("url") ?? "";
  const fetchedAt = new Date().toISOString();

  // ── builtin_mock ──────────────────────────────────────────────────────────
  if (source === "builtin_mock") {
    return jsonResponse({ source: "builtin_mock", items: filterByQuery(BUILTIN_MOCK_ITEMS, query), fetchedAt });
  }

  // ── cennik_gus ────────────────────────────────────────────────────────────
  if (source === "cennik_gus") {
    // GUS nie udostępnia bezpośredniego API cenowego. Symulujemy dane
    // w stylu GUS z realistycznymi wskaźnikami kosztów budowlanych 2024.
    return jsonResponse({ source: "cennik_gus", items: filterByQuery(GUS_MOCK_ITEMS, query), fetchedAt });
  }

  // ── custom ────────────────────────────────────────────────────────────────
  if (source === "custom") {
    if (!customUrl) {
      return jsonResponse({ source: "custom", items: [], fetchedAt, error: "Brak parametru 'url' dla źródła custom." });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(customUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Niedozwolony protokół");
      }
      
      const host = parsedUrl.hostname.toLowerCase();
      // Ochrona przed SSRF (loopback, sieć lokalna, cloud metadata)
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host === "0.0.0.0" ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        host.endsWith(".localhost")
      ) {
        return jsonResponse({ source: "custom", items: [], fetchedAt, error: "Niedozwolony adres docelowy (host lokalny)." });
      }

      const parts = host.split(".").map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        if (
          parts[0] === 10 ||
          parts[0] === 127 ||
          parts[0] === 0 ||
          (parts[0] === 169 && parts[1] === 254) ||
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168)
        ) {
          return jsonResponse({ source: "custom", items: [], fetchedAt, error: "Niedozwolony prywatny adres IP." });
        }
      }
    } catch {
      return jsonResponse({ source: "custom", items: [], fetchedAt, error: "Nieprawidłowy URL. Dozwolone protokoły: http, https." });
    }

    if (query) parsedUrl.searchParams.set("query", query);

    try {
      const fetchHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (apiKey) {
        fetchHeaders["X-Api-Key"] = apiKey;
        fetchHeaders["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(parsedUrl.toString(), {
        method: "GET",
        headers: fetchHeaders,
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        return jsonResponse({ source: "custom", items: [], fetchedAt, error: `Zewnętrzne API zwróciło błąd: ${res.status} ${res.statusText}` });
      }

      const data = await res.json();

      let rawItems: unknown[] = [];
      if (Array.isArray(data)) {
        rawItems = data;
      } else if (data && Array.isArray(data.items)) {
        rawItems = data.items;
      } else {
        return jsonResponse({ source: "custom", items: [], fetchedAt, error: "Zewnętrzne API zwróciło nieoczekiwany format (oczekiwano tablicy lub { items: [] })." });
      }

      const items: ExternalPricingItem[] = rawItems
        .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
        .map((i) => ({
          name: String(i.name ?? i.nazwa ?? ""),
          unit: String(i.unit ?? i.jednostka ?? "szt"),
          priceNetto: Number(i.priceNetto ?? i.cena_netto ?? i.price ?? 0),
          vatRate: Number(i.vatRate ?? i.vat ?? i.stawka_vat ?? 23),
          category: i.category != null ? String(i.category) : undefined,
          description: i.description != null ? String(i.description) : undefined,
          externalId: i.externalId != null ? String(i.externalId) : undefined,
        }))
        .filter((i) => i.name.length > 0);

      return jsonResponse({ source: "custom", items, fetchedAt });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nieznany błąd";
      return jsonResponse({ source: "custom", items: [], fetchedAt, error: `Błąd połączenia z zewnętrznym API: ${message}` });
    }
  }

  return jsonResponse({ source: source || "unknown", items: [], fetchedAt, error: `Nieznane źródło: "${source}". Dozwolone: builtin_mock, cennik_gus, custom.` });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
