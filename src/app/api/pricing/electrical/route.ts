import type { NextRequest } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ElectricalPricingItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  priceNetto: number;
  priceMin: number;
  priceMax: number;
  vatRate: number;
  description?: string;
  norm?: string; // norma SEP / KNR
  laborMinutes?: number; // szacowany czas pracy w minutach
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
  "Content-Type": "application/json",
};

// ─── Cennik elektryczny 2024/2025 ─────────────────────────────────────────────
// Ceny robocizny netto wg rynku polskiego (bez materiałów)

const ELECTRICAL_ITEMS: ElectricalPricingItem[] = [
  // ── Gniazda i wyłączniki ──────────────────────────────────────────────────
  {
    id: "EL-GN-001", name: "Montaż gniazdka elektrycznego pojedynczego", category: "gniazda",
    unit: "szt", priceNetto: 80, priceMin: 60, priceMax: 120, vatRate: 8,
    description: "Montaż gniazdka 230V w istniejącej puszce", norm: "KNR E-04 0201-01", laborMinutes: 30,
  },
  {
    id: "EL-GN-002", name: "Montaż gniazdka elektrycznego podwójnego", category: "gniazda",
    unit: "szt", priceNetto: 100, priceMin: 80, priceMax: 150, vatRate: 8,
    description: "Montaż gniazdka podwójnego 230V w istniejącej puszce", norm: "KNR E-04 0201-02", laborMinutes: 40,
  },
  {
    id: "EL-GN-003", name: "Montaż gniazdka z uziemieniem (schuko)", category: "gniazda",
    unit: "szt", priceNetto: 90, priceMin: 70, priceMax: 130, vatRate: 8,
    description: "Montaż gniazdka schuko z bolcem uziemiającym", norm: "KNR E-04 0201-03", laborMinutes: 35,
  },
  {
    id: "EL-GN-004", name: "Montaż wyłącznika światła pojedynczego", category: "gniazda",
    unit: "szt", priceNetto: 70, priceMin: 50, priceMax: 100, vatRate: 8,
    description: "Montaż wyłącznika jednobiegunowego", norm: "KNR E-04 0301-01", laborMinutes: 25,
  },
  {
    id: "EL-GN-005", name: "Montaż wyłącznika schodowego (świecznikowego)", category: "gniazda",
    unit: "szt", priceNetto: 90, priceMin: 70, priceMax: 130, vatRate: 8,
    description: "Montaż wyłącznika schodowego — para", norm: "KNR E-04 0301-03", laborMinutes: 40,
  },
  {
    id: "EL-GN-006", name: "Montaż ściemniacza (dimmer)", category: "gniazda",
    unit: "szt", priceNetto: 120, priceMin: 90, priceMax: 180, vatRate: 8,
    description: "Montaż ściemniacza LED/halogen", norm: "KNR E-04 0301-05", laborMinutes: 45,
  },
  {
    id: "EL-GN-007", name: "Montaż gniazdka USB", category: "gniazda",
    unit: "szt", priceNetto: 110, priceMin: 80, priceMax: 160, vatRate: 8,
    description: "Montaż gniazdka z ładowarką USB A+C", laborMinutes: 40,
  },
  {
    id: "EL-GN-008", name: "Montaż gniazdka hermetycznego (zewnętrznego)", category: "gniazda",
    unit: "szt", priceNetto: 130, priceMin: 100, priceMax: 200, vatRate: 8,
    description: "Montaż gniazdka IP44/IP65 na zewnątrz", laborMinutes: 50,
  },

  // ── Oświetlenie ───────────────────────────────────────────────────────────
  {
    id: "EL-OS-001", name: "Montaż lampy sufitowej (plafon)", category: "oswietlenie",
    unit: "szt", priceNetto: 120, priceMin: 80, priceMax: 200, vatRate: 8,
    description: "Montaż oprawy sufitowej do istniejącej puszki", norm: "KNR E-04 0401-01", laborMinutes: 45,
  },
  {
    id: "EL-OS-002", name: "Montaż lampy wiszącej (żyrandol)", category: "oswietlenie",
    unit: "szt", priceNetto: 150, priceMin: 100, priceMax: 250, vatRate: 8,
    description: "Montaż żyrandola z regulacją wysokości", norm: "KNR E-04 0401-02", laborMinutes: 60,
  },
  {
    id: "EL-OS-003", name: "Montaż oprawy podtynkowej (downlight)", category: "oswietlenie",
    unit: "szt", priceNetto: 80, priceMin: 60, priceMax: 130, vatRate: 8,
    description: "Montaż oprawy wpuszczanej w sufit podwieszany", norm: "KNR E-04 0401-05", laborMinutes: 30,
  },
  {
    id: "EL-OS-004", name: "Montaż taśmy LED (mb)", category: "oswietlenie",
    unit: "mb", priceNetto: 40, priceMin: 25, priceMax: 70, vatRate: 8,
    description: "Montaż taśmy LED z zasilaczem i sterownikiem", laborMinutes: 20,
  },
  {
    id: "EL-OS-005", name: "Montaż oprawy zewnętrznej (elewacja)", category: "oswietlenie",
    unit: "szt", priceNetto: 160, priceMin: 120, priceMax: 250, vatRate: 8,
    description: "Montaż lampy elewacyjnej IP44", laborMinutes: 60,
  },
  {
    id: "EL-OS-006", name: "Montaż czujnika ruchu/zmierzchu", category: "oswietlenie",
    unit: "szt", priceNetto: 130, priceMin: 100, priceMax: 200, vatRate: 8,
    description: "Montaż i konfiguracja czujnika PIR lub zmierzchu", laborMinutes: 50,
  },
  {
    id: "EL-OS-007", name: "Montaż oprawy awaryjnej (exit)", category: "oswietlenie",
    unit: "szt", priceNetto: 180, priceMin: 140, priceMax: 280, vatRate: 8,
    description: "Montaż oprawy awaryjnej z podświetleniem EXIT", laborMinutes: 70,
  },

  // ── Instalacja przewodów ──────────────────────────────────────────────────
  {
    id: "EL-IN-001", name: "Prowadzenie przewodów w bruździe (mb)", category: "instalacja",
    unit: "mb", priceNetto: 55, priceMin: 40, priceMax: 80, vatRate: 8,
    description: "Kucie bruzdy, ułożenie przewodu YDY 3×1.5, tynkowanie", norm: "KNR E-04 0101-01", laborMinutes: 25,
  },
  {
    id: "EL-IN-002", name: "Prowadzenie przewodów natynkowo (mb)", category: "instalacja",
    unit: "mb", priceNetto: 30, priceMin: 20, priceMax: 50, vatRate: 8,
    description: "Ułożenie przewodu w korytku lub listwie PCV", norm: "KNR E-04 0101-03", laborMinutes: 15,
  },
  {
    id: "EL-IN-003", name: "Prowadzenie przewodów w rurce ochronnej (mb)", category: "instalacja",
    unit: "mb", priceNetto: 45, priceMin: 30, priceMax: 65, vatRate: 8,
    description: "Ułożenie przewodu w rurce karbowanej lub sztywnej", norm: "KNR E-04 0101-05", laborMinutes: 20,
  },
  {
    id: "EL-IN-004", name: "Montaż puszki instalacyjnej", category: "instalacja",
    unit: "szt", priceNetto: 50, priceMin: 35, priceMax: 80, vatRate: 8,
    description: "Montaż puszki podtynkowej lub natynkowej", norm: "KNR E-04 0201-10", laborMinutes: 20,
  },
  {
    id: "EL-IN-005", name: "Wymiana instalacji elektrycznej w mieszkaniu (m2)", category: "instalacja",
    unit: "m2", priceNetto: 120, priceMin: 80, priceMax: 180, vatRate: 8,
    description: "Kompleksowa wymiana instalacji — robocizna za m² mieszkania", laborMinutes: 60,
  },
  {
    id: "EL-IN-006", name: "Montaż korytka kablowego (mb)", category: "instalacja",
    unit: "mb", priceNetto: 35, priceMin: 25, priceMax: 55, vatRate: 8,
    description: "Montaż korytka PCV lub metalowego z pokrywą", laborMinutes: 15,
  },
  {
    id: "EL-IN-007", name: "Montaż domofonu/wideodomofonu", category: "instalacja",
    unit: "szt", priceNetto: 350, priceMin: 250, priceMax: 600, vatRate: 8,
    description: "Montaż i konfiguracja domofonu lub wideodomofonu", laborMinutes: 120,
  },
  {
    id: "EL-IN-008", name: "Montaż systemu alarmowego (podstawowy)", category: "instalacja",
    unit: "kpl", priceNetto: 1200, priceMin: 800, priceMax: 2500, vatRate: 8,
    description: "Montaż centrali, czujników, sygnalizatora — do 5 stref", laborMinutes: 480,
  },
  {
    id: "EL-IN-009", name: "Montaż ładowarki EV (wallbox)", category: "instalacja",
    unit: "szt", priceNetto: 800, priceMin: 600, priceMax: 1500, vatRate: 8,
    description: "Montaż ładowarki do pojazdów elektrycznych 7.4-22kW", laborMinutes: 240,
  },
  {
    id: "EL-IN-010", name: "Montaż instalacji fotowoltaicznej (kWp)", category: "instalacja",
    unit: "kWp", priceNetto: 1800, priceMin: 1400, priceMax: 2500, vatRate: 8,
    description: "Montaż paneli PV, inwertera, okablowania — robocizna za kWp", laborMinutes: 480,
  },

  // ── Rozdzielnie i zabezpieczenia ──────────────────────────────────────────
  {
    id: "EL-RZ-001", name: "Montaż rozdzielnicy mieszkaniowej", category: "rozdzielnia",
    unit: "szt", priceNetto: 600, priceMin: 400, priceMax: 1200, vatRate: 8,
    description: "Montaż rozdzielnicy podtynkowej do 12 modułów", norm: "KNR E-04 0501-01", laborMinutes: 180,
  },
  {
    id: "EL-RZ-002", name: "Montaż wyłącznika nadprądowego (bezpiecznik)", category: "rozdzielnia",
    unit: "szt", priceNetto: 60, priceMin: 40, priceMax: 100, vatRate: 8,
    description: "Montaż wyłącznika B10-B32 w rozdzielnicy", norm: "KNR E-04 0501-05", laborMinutes: 20,
  },
  {
    id: "EL-RZ-003", name: "Montaż wyłącznika różnicowoprądowego (RCD)", category: "rozdzielnia",
    unit: "szt", priceNetto: 120, priceMin: 80, priceMax: 200, vatRate: 8,
    description: "Montaż wyłącznika różnicowoprądowego 30mA", norm: "KNR E-04 0501-07", laborMinutes: 35,
  },
  {
    id: "EL-RZ-004", name: "Montaż ochronnika przepięć (SPD)", category: "rozdzielnia",
    unit: "szt", priceNetto: 200, priceMin: 150, priceMax: 350, vatRate: 8,
    description: "Montaż ogranicznika przepięć klasy B+C lub C", laborMinutes: 60,
  },
  {
    id: "EL-RZ-005", name: "Montaż licznika energii elektrycznej", category: "rozdzielnia",
    unit: "szt", priceNetto: 250, priceMin: 180, priceMax: 400, vatRate: 8,
    description: "Montaż licznika 1-fazowego lub 3-fazowego", laborMinutes: 90,
  },
  {
    id: "EL-RZ-006", name: "Rozbudowa rozdzielnicy (dodanie obwodu)", category: "rozdzielnia",
    unit: "szt", priceNetto: 180, priceMin: 120, priceMax: 300, vatRate: 8,
    description: "Dodanie nowego obwodu do istniejącej rozdzielnicy", laborMinutes: 60,
  },

  // ── Pomiary i odbiory ─────────────────────────────────────────────────────
  {
    id: "EL-PM-001", name: "Pomiar rezystancji izolacji", category: "pomiar",
    unit: "obwód", priceNetto: 80, priceMin: 60, priceMax: 120, vatRate: 23,
    description: "Pomiar rezystancji izolacji przewodów — 1 obwód", norm: "PN-HD 60364-6", laborMinutes: 20,
  },
  {
    id: "EL-PM-002", name: "Pomiar skuteczności ochrony (zerowanie)", category: "pomiar",
    unit: "obwód", priceNetto: 70, priceMin: 50, priceMax: 110, vatRate: 23,
    description: "Pomiar impedancji pętli zwarcia — 1 obwód", norm: "PN-HD 60364-6", laborMinutes: 15,
  },
  {
    id: "EL-PM-003", name: "Pomiar wyłącznika różnicowoprądowego", category: "pomiar",
    unit: "szt", priceNetto: 50, priceMin: 35, priceMax: 80, vatRate: 23,
    description: "Sprawdzenie czasu i prądu zadziałania RCD", norm: "PN-HD 60364-6", laborMinutes: 10,
  },
  {
    id: "EL-PM-004", name: "Odbiór instalacji elektrycznej — protokół", category: "pomiar",
    unit: "kpl", priceNetto: 400, priceMin: 300, priceMax: 700, vatRate: 23,
    description: "Kompleksowy odbiór instalacji z protokołem pomiarowym", norm: "PN-HD 60364-6", laborMinutes: 180,
  },
  {
    id: "EL-PM-005", name: "Pomiar jakości energii elektrycznej", category: "pomiar",
    unit: "kpl", priceNetto: 600, priceMin: 400, priceMax: 1000, vatRate: 23,
    description: "Analiza harmonicznych, THD, asymetrii — 24h rejestracja", laborMinutes: 60,
  },

  // ── Naprawa i awarie ──────────────────────────────────────────────────────
  {
    id: "EL-NA-001", name: "Lokalizacja i usunięcie awarii elektrycznej", category: "naprawa",
    unit: "kpl", priceNetto: 250, priceMin: 150, priceMax: 500, vatRate: 8,
    description: "Diagnostyka, lokalizacja i naprawa awarii — do 2h", laborMinutes: 120,
  },
  {
    id: "EL-NA-002", name: "Naprawa instalacji elektrycznej (godz)", category: "naprawa",
    unit: "godz", priceNetto: 130, priceMin: 100, priceMax: 180, vatRate: 8,
    description: "Stawka godzinowa za naprawę instalacji elektrycznej", laborMinutes: 60,
  },
  {
    id: "EL-NA-003", name: "Wymiana uszkodzonego przewodu (mb)", category: "naprawa",
    unit: "mb", priceNetto: 60, priceMin: 40, priceMax: 90, vatRate: 8,
    description: "Wymiana uszkodzonego odcinka przewodu", laborMinutes: 30,
  },
  {
    id: "EL-NA-004", name: "Naprawa/wymiana gniazda lub wyłącznika", category: "naprawa",
    unit: "szt", priceNetto: 90, priceMin: 60, priceMax: 140, vatRate: 8,
    description: "Wymiana uszkodzonego gniazda lub wyłącznika", laborMinutes: 30,
  },

  // ── Robocizna ─────────────────────────────────────────────────────────────
  {
    id: "EL-ROB-001", name: "Robocizna elektryczna — stawka godzinowa", category: "robocizna",
    unit: "godz", priceNetto: 130, priceMin: 100, priceMax: 180, vatRate: 23,
    description: "Standardowa stawka robocizny elektryka", laborMinutes: 60,
  },
  {
    id: "EL-ROB-002", name: "Dojazd do klienta", category: "robocizna",
    unit: "km", priceNetto: 2.5, priceMin: 1.5, priceMax: 4, vatRate: 23,
    description: "Koszt dojazdu za km (w obie strony)", laborMinutes: 0,
  },
  {
    id: "EL-ROB-003", name: "Opłata za dojazd (ryczałt)", category: "robocizna",
    unit: "kpl", priceNetto: 80, priceMin: 50, priceMax: 150, vatRate: 23,
    description: "Ryczałt za dojazd do 20 km", laborMinutes: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterItems(items: ElectricalPricingItem[], query: string, category: string): ElectricalPricingItem[] {
  let result = items;
  if (category && category !== "all") {
    result = result.filter((i) => i.category === category);
  }
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q)
    );
  }
  return result;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category") ?? "all";
  const id = searchParams.get("id") ?? "";

  // Pobierz konkretną pozycję po ID
  if (id) {
    const item = ELECTRICAL_ITEMS.find((i) => i.id === id);
    if (!item) return jsonResponse({ error: "Nie znaleziono pozycji" }, 404);
    return jsonResponse(item);
  }

  const items = filterItems(ELECTRICAL_ITEMS, query, category);
  const categories = [...new Set(ELECTRICAL_ITEMS.map((i) => i.category))];

  return jsonResponse({
    source: "electrical_builtin",
    items,
    total: items.length,
    categories,
    fetchedAt: new Date().toISOString(),
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
