import type { Service, Client, CompanySettings, QuoteItem, QuoteAdditionalCost, Material, QuoteTemplate, PricingModelConfig } from "@/types";
import { db } from "./db";
import { DEFAULT_PRICING_MODEL } from "@/types";

function generateItemId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const STANDARD_LAZIENKA_ITEMS: Omit<QuoteItem, "nettotal" | "vatAmount" | "bruttoTotal">[] = [
  { id: generateItemId(), serviceId: 1, name: "Montaż umywalki", quantity: 1, unit: "szt", priceNettoPerUnit: 150, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 2, name: "Montaż wanny", quantity: 1, unit: "szt", priceNettoPerUnit: 350, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 4, name: "Montaż toalety", quantity: 1, unit: "szt", priceNettoPerUnit: 180, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 6, name: "Montaż baterii łazienkowej", quantity: 2, unit: "szt", priceNettoPerUnit: 80, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 11, name: "Montaż syfonu", quantity: 1, unit: "szt", priceNettoPerUnit: 60, vatRate: 8, discountPercent: 0 },
];

const STANDARD_LAZIENKA_COSTS: Omit<QuoteAdditionalCost, "id">[] = [
  { name: "Dojazd", amount: 50, vatRate: 8, category: "dojazd" },
  { name: "Materiały pomocnicze", amount: 100, vatRate: 23, category: "materialy" },
];

const KUCHNIA_BATERIA_ITEMS: Omit<QuoteItem, "nettotal" | "vatAmount" | "bruttoTotal">[] = [
  { id: generateItemId(), serviceId: 5, name: "Montaż baterii kuchennej", quantity: 1, unit: "szt", priceNettoPerUnit: 100, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 19, name: "Wymiana baterii", quantity: 1, unit: "szt", priceNettoPerUnit: 120, vatRate: 8, discountPercent: 0 },
];

const KUCHNIA_BATERIA_COSTS: Omit<QuoteAdditionalCost, "id">[] = [
  { name: "Dojazd", amount: 40, vatRate: 8, category: "dojazd" },
];

const PRZEGLAD_ITEMS: Omit<QuoteItem, "nettotal" | "vatAmount" | "bruttoTotal">[] = [
  { id: generateItemId(), serviceId: 25, name: "Diagnoza przecieku", quantity: 1, unit: "szt", priceNettoPerUnit: 100, vatRate: 8, discountPercent: 0 },
  { id: generateItemId(), serviceId: 27, name: "Inspekcja kamerą", quantity: 1, unit: "szt", priceNettoPerUnit: 200, vatRate: 8, discountPercent: 0 },
];

const STANDARD_LAZIENKA_PRICING: PricingModelConfig = {
  ...DEFAULT_PRICING_MODEL,
  complexityFactor: 1.3,
  riskMargin: 10,
  overheadPercent: 15,
  profitMarginPercent: 25,
  laborCostMultiplier: 1.2,
  materialWastePercent: 5,
  warrantyPeriodMonths: 24,
  warrantyReservePercent: 3,
};

const KUCHNIA_PRICING: PricingModelConfig = {
  ...DEFAULT_PRICING_MODEL,
  complexityFactor: 1.1,
  riskMargin: 5,
  profitMarginPercent: 20,
};

const PRZEGLAD_PRICING: PricingModelConfig = {
  ...DEFAULT_PRICING_MODEL,
  complexityFactor: 1.0,
  riskMargin: 0,
  profitMarginPercent: 15,
  travelCostPerKm: 1.5,
  estimatedDistanceKm: 20,
};

function calcItem(item: Omit<QuoteItem, "nettotal" | "vatAmount" | "bruttoTotal">): QuoteItem {
  const nettotal = round(item.priceNettoPerUnit * item.quantity * (1 - item.discountPercent / 100));
  const vatAmount = round(nettotal * (item.vatRate / 100));
  const bruttoTotal = round(nettotal + vatAmount);
  return { ...item, nettotal, vatAmount, bruttoTotal };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

const DEFAULT_SERVICES: Omit<Service, "id" | "createdAt" | "updatedAt">[] = [
  { name: "Montaż umywalki", category: "montaz", unit: "szt", priceNetto: 150, vatRate: 8, description: "Montaż umywalki zintegrowanej lub nablatowej" },
  { name: "Montaż wanny", category: "montaz", unit: "szt", priceNetto: 350, vatRate: 8, description: "Montaż wanny wolnostojącej lub wbudowanej" },
  { name: "Montaż prysznica", category: "montaz", unit: "szt", priceNetto: 280, vatRate: 8, description: "Montaż kabiny prysznicowej / walk-in" },
  { name: "Montaż toalety", category: "montaz", unit: "szt", priceNetto: 180, vatRate: 8, description: "Montaż muszli WC i stelaża podtynkowego" },
  { name: "Montaż baterii kuchennej", category: "montaz", unit: "szt", priceNetto: 100, vatRate: 8, description: "Montaż baterii jednouchwytowej" },
  { name: "Montaż baterii łazienkowej", category: "montaz", unit: "szt", priceNetto: 80, vatRate: 8, description: "Montaż baterii umywalkowej/wannowej" },
  { name: "Montaż syfonu", category: "montaz", unit: "szt", priceNetto: 60, vatRate: 8 },
  { name: "Montaż odpływu liniowego", category: "montaz", unit: "szt", priceNetto: 200, vatRate: 8 },
  { name: "Montaż kolumny prysznicowej", category: "montaz", unit: "szt", priceNetto: 220, vatRate: 8 },
  { name: "Naprawa kapiącej baterii", category: "naprawa", unit: "szt", priceNetto: 80, vatRate: 8 },
  { name: "Naprawa spłuczki", category: "naprawa", unit: "szt", priceNetto: 120, vatRate: 8 },
  { name: "Naprawa przecieku rury", category: "naprawa", unit: "godz", priceNetto: 100, vatRate: 8 },
  { name: "Naprawa syfonu", category: "naprawa", unit: "szt", priceNetto: 70, vatRate: 8 },
  { name: "Uszczelnienie połączeń", category: "naprawa", unit: "godz", priceNetto: 90, vatRate: 8 },
  { name: "Wymiana baterii", category: "wymiana", unit: "szt", priceNetto: 120, vatRate: 8 },
  { name: "Wymiana syfonu", category: "wymiana", unit: "szt", priceNetto: 80, vatRate: 8 },
  { name: "Wymiana spłuczki", category: "wymiana", unit: "szt", priceNetto: 150, vatRate: 8 },
  { name: "Wymiana uszczelek", category: "wymiana", unit: "szt", priceNetto: 60, vatRate: 8 },
  { name: "Wymiana rury kanalizacyjnej", category: "wymiana", unit: "m", priceNetto: 110, vatRate: 8 },
  { name: "Wymiana odpływu", category: "wymiana", unit: "szt", priceNetto: 140, vatRate: 8 },
  { name: "Prześlizgowanie rur", category: "czyszczenie", unit: "godz", priceNetto: 130, vatRate: 8 },
  { name: "Czyszczenie syfonu", category: "czyszczenie", unit: "szt", priceNetto: 60, vatRate: 8 },
  { name: "Czyszczenie odpływu", category: "czyszczenie", unit: "szt", priceNetto: 80, vatRate: 8 },
  { name: "Czyszczenie kolumny prysznicowej", category: "czyszczenie", unit: "szt", priceNetto: 70, vatRate: 8 },
  { name: "Diagnoza przecieku", category: "diagnoza", unit: "szt", priceNetto: 100, vatRate: 8 },
  { name: "Diagnoza niedrożności", category: "diagnoza", unit: "szt", priceNetto: 80, vatRate: 8 },
  { name: "Inspekcja kamerą", category: "diagnoza", unit: "szt", priceNetto: 200, vatRate: 8 },
  { name: "Pomiary ciśnienia", category: "diagnoza", unit: "szt", priceNetto: 80, vatRate: 8 },
  { name: "Rura PCV 50mm", category: "materialy", unit: "m", priceNetto: 12, vatRate: 23 },
  { name: "Rura PCV 110mm", category: "materialy", unit: "m", priceNetto: 25, vatRate: 23 },
  { name: "Rura miedziana 15mm", category: "materialy", unit: "m", priceNetto: 35, vatRate: 23 },
  { name: "Rura PEX 16mm", category: "materialy", unit: "m", priceNetto: 8, vatRate: 23 },
  { name: "Uszczelka silikonowa", category: "materialy", unit: "szt", priceNetto: 5, vatRate: 23 },
  { name: "Fita uszczelniająca", category: "materialy", unit: "szt", priceNetto: 8, vatRate: 23 },
  { name: "Kolano 90° PCV 50mm", category: "materialy", unit: "szt", priceNetto: 4, vatRate: 23 },
  { name: "Kolano 90° PCV 110mm", category: "materialy", unit: "szt", priceNetto: 10, vatRate: 23 },
  { name: "Sypon butelkowy", category: "materialy", unit: "szt", priceNetto: 25, vatRate: 23 },
  { name: "Syfon płaski", category: "materialy", unit: "szt", priceNetto: 45, vatRate: 23 },
  { name: "Spłuczka podtynkowa", category: "materialy", unit: "szt", priceNetto: 350, vatRate: 23 },
  { name: "Bateria umywalkowa", category: "materialy", unit: "szt", priceNetto: 180, vatRate: 23 },
];

const DEFAULT_MATERIALS: Omit<Material, "id" | "createdAt" | "updatedAt">[] = [
  // ── Hydraulika ──
  { name: "Rura PCV 50mm / 2m kanalizacyjna", category: "Kanalizacja", trade: "hydraulika", unit: "m", purchasePrice: 8, salePrice: 12, vatRate: 23, stockQuantity: 100, minStockLevel: 20, supplier: "Hurtownia Sanitarna", sku: "PCV-50" },
  { name: "Rura PCV 110mm / 2m kanalizacyjna", category: "Kanalizacja", trade: "hydraulika", unit: "m", purchasePrice: 15, salePrice: 25, vatRate: 23, stockQuantity: 50, minStockLevel: 10, supplier: "Hurtownia Sanitarna", sku: "PCV-110" },
  { name: "Kolano kanalizacyjne PCV 50mm 45°/87°", category: "Kanalizacja", trade: "hydraulika", unit: "szt", purchasePrice: 2.2, salePrice: 4.5, vatRate: 23, stockQuantity: 80, minStockLevel: 20, supplier: "Hurtownia Sanitarna", sku: "KOL-PCV-50" },
  { name: "Kolano kanalizacyjne PCV 110mm 45°/87°", category: "Kanalizacja", trade: "hydraulika", unit: "szt", purchasePrice: 5.5, salePrice: 9.8, vatRate: 23, stockQuantity: 50, minStockLevel: 15, supplier: "Hurtownia Sanitarna", sku: "KOL-PCV-110" },
  { name: "Trójnik kanalizacyjny PCV 110/50 45°", category: "Kanalizacja", trade: "hydraulika", unit: "szt", purchasePrice: 7.5, salePrice: 14.0, vatRate: 23, stockQuantity: 30, minStockLevel: 10, supplier: "Hurtownia Sanitarna", sku: "TR-PCV-110-50" },
  { name: "Rura PEX-AL-PEX 16x2.0 mm (ogrzewanie / woda)", category: "Rury i PEX", trade: "hydraulika", unit: "m", purchasePrice: 3.8, salePrice: 6.5, vatRate: 23, stockQuantity: 400, minStockLevel: 100, supplier: "PEX-System", sku: "PEX-16-PERT" },
  { name: "Rura PEX-AL-PEX 20x2.0 mm (piony / rozdzielacze)", category: "Rury i PEX", trade: "hydraulika", unit: "m", purchasePrice: 5.8, salePrice: 9.5, vatRate: 23, stockQuantity: 150, minStockLevel: 40, supplier: "PEX-System", sku: "PEX-20-PERT" },
  { name: "Złączka prosta PEX 16x1/2\" GZ zaprasowywana / skręcana", category: "Kształtki PEX", trade: "hydraulika", unit: "szt", purchasePrice: 5.2, salePrice: 9.0, vatRate: 23, stockQuantity: 120, minStockLevel: 30, supplier: "PEX-System", sku: "ZL-PEX-16-12" },
  { name: "Kolano PEX 16 zaprasowywane / zaciskane", category: "Kształtki PEX", trade: "hydraulika", unit: "szt", purchasePrice: 6.5, salePrice: 11.5, vatRate: 23, stockQuantity: 100, minStockLevel: 25, supplier: "PEX-System", sku: "KOL-PEX-16" },
  { name: "Trójnik PEX 16x16x16 zaprasowywany", category: "Kształtki PEX", trade: "hydraulika", unit: "szt", purchasePrice: 9.0, salePrice: 15.5, vatRate: 23, stockQuantity: 70, minStockLevel: 20, supplier: "PEX-System", sku: "TR-PEX-16" },
  { name: "Rura miedziana 15x1.0 mm twarda", category: "Rury i PEX", trade: "hydraulika", unit: "m", purchasePrice: 22, salePrice: 35, vatRate: 23, stockQuantity: 40, minStockLevel: 15, supplier: "Metal-Plast", sku: "CU-15" },
  { name: "Kolano miedziane 15mm 90° do lutowania / zacisku", category: "Kształtki miedź", trade: "hydraulika", unit: "szt", purchasePrice: 3.5, salePrice: 6.5, vatRate: 23, stockQuantity: 60, minStockLevel: 20, supplier: "Metal-Plast", sku: "CU-KOL-15" },
  { name: "Zawór kulowy wodny 1/2\" ze śrubunkiem (motylek)", category: "Zawory i armatura", trade: "hydraulika", unit: "szt", purchasePrice: 18.0, salePrice: 29.0, vatRate: 23, stockQuantity: 40, minStockLevel: 10, supplier: "Armatura-Plus", sku: "ZAW-KUL-12-SR" },
  { name: "Zawór kulowy wodny 3/4\" ze śrubunkiem wzmocniony", category: "Zawory i armatura", trade: "hydraulika", unit: "szt", purchasePrice: 26.0, salePrice: 42.0, vatRate: 23, stockQuantity: 30, minStockLevel: 10, supplier: "Armatura-Plus", sku: "ZAW-KUL-34-SR" },
  { name: "Zawór kulowy kątowy 1/2\" x 3/8\" z filtrem (do baterii)", category: "Zawory i armatura", trade: "hydraulika", unit: "szt", purchasePrice: 12.0, salePrice: 21.0, vatRate: 23, stockQuantity: 50, minStockLevel: 15, supplier: "Armatura-Plus", sku: "ZAW-KAT-12-38" },
  { name: "Rozdzielacz C.O. / podłogówki 6-obwodowy z rotametrami", category: "Ogrzewanie i C.O.", trade: "hydraulika", unit: "kpl", purchasePrice: 380.0, salePrice: 560.0, vatRate: 23, stockQuantity: 4, minStockLevel: 2, supplier: "Inwest-Klimat", sku: "ROZDZ-CO-6OB" },
  { name: "Rozdzielacz C.O. / podłogówki 8-obwodowy z rotametrami", category: "Ogrzewanie i C.O.", trade: "hydraulika", unit: "kpl", purchasePrice: 490.0, salePrice: 720.0, vatRate: 23, stockQuantity: 3, minStockLevel: 1, supplier: "Inwest-Klimat", sku: "ROZDZ-CO-8OB" },
  { name: "Szafka do rozdzielacza podtynkowa / natynkowa", category: "Ogrzewanie i C.O.", trade: "hydraulika", unit: "szt", purchasePrice: 120.0, salePrice: 185.0, vatRate: 23, stockQuantity: 6, minStockLevel: 2, supplier: "Inwest-Klimat", sku: "SZAF-ROZDZ" },
  { name: "Separator zanieczyszczeń magnetyczny 3/4\" (filtr C.O.)", category: "Ogrzewanie i C.O.", trade: "hydraulika", unit: "szt", purchasePrice: 190.0, salePrice: 295.0, vatRate: 23, stockQuantity: 5, minStockLevel: 2, supplier: "Inwest-Klimat", sku: "FILTR-MAGN-34" },
  { name: "Naczynie wzbiorcze przeponowe C.O. 18L", category: "Ogrzewanie i C.O.", trade: "hydraulika", unit: "szt", purchasePrice: 135.0, salePrice: 210.0, vatRate: 23, stockQuantity: 4, minStockLevel: 2, supplier: "Inwest-Klimat", sku: "NACZ-WZBIOR-18L" },
  { name: "Otulina termoizolacyjna PE 18/9mm (na rury 16-18)", category: "Izolacja", trade: "hydraulika", unit: "m", purchasePrice: 1.8, salePrice: 3.5, vatRate: 23, stockQuantity: 200, minStockLevel: 50, supplier: "Hurtownia Sanitarna", sku: "OTUL-18-9" },
  { name: "Taśma teflonowa uszczelniająca profesjonalna", category: "Uszczelnienia", trade: "hydraulika", unit: "szt", purchasePrice: 4, salePrice: 8, vatRate: 23, stockQuantity: 150, minStockLevel: 30, supplier: "Uszczelki-PL", sku: "FITA-1" },
  { name: "Pakuły lniane czesane + pasta uszczelniająca", category: "Uszczelnienia", trade: "hydraulika", unit: "kpl", purchasePrice: 12, salePrice: 22, vatRate: 23, stockQuantity: 40, minStockLevel: 10, supplier: "Uszczelki-PL", sku: "PAK-PASTA" },
  { name: "Uszczelka silikonowa uniwersalna", category: "Uszczelnienia", trade: "hydraulika", unit: "szt", purchasePrice: 3, salePrice: 5, vatRate: 23, stockQuantity: 200, minStockLevel: 50, supplier: "Uszczelki-PL", sku: "USZ-SIL" },
  { name: "Syfon butelkowy umywalkowy z podejściem", category: "Syfony", trade: "hydraulika", unit: "szt", purchasePrice: 15, salePrice: 25, vatRate: 23, stockQuantity: 20, minStockLevel: 5, supplier: "Hurtownia Sanitarna", sku: "SYF-BUT" },
  { name: "Syfon płaski brodzikowy czyszczony od góry fi 90", category: "Syfony", trade: "hydraulika", unit: "szt", purchasePrice: 38, salePrice: 65, vatRate: 23, stockQuantity: 15, minStockLevel: 5, supplier: "Hurtownia Sanitarna", sku: "SYF-PL-90" },
  { name: "Stelaż podtynkowy do WC z przyciskiem (zestaw)", category: "Biały montaż i ceramika", trade: "hydraulika", unit: "kpl", purchasePrice: 420, salePrice: 650, vatRate: 23, stockQuantity: 6, minStockLevel: 2, supplier: "Sanit-Plus", sku: "SPL-PT-KPL" },
  { name: "Bateria umywalkowa stojąca jednouchwytowa chrom", category: "Baterie", trade: "hydraulika", unit: "szt", purchasePrice: 110, salePrice: 185, vatRate: 23, stockQuantity: 10, minStockLevel: 3, supplier: "Sanit-Plus", sku: "BAT-UM-CHR" },
  { name: "Bateria wannowo-prysznicowa ścienna z zestawem", category: "Baterie", trade: "hydraulika", unit: "szt", purchasePrice: 160, salePrice: 260, vatRate: 23, stockQuantity: 8, minStockLevel: 2, supplier: "Sanit-Plus", sku: "BAT-WAN-CHR" },

  // ── Elektryka ──
  { name: "Przewód YDYp 3x1.5 mm² 450/750V (oświetlenie)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 2.8, salePrice: 4.2, vatRate: 23, stockQuantity: 500, minStockLevel: 100, supplier: "Elektro-Hurt", sku: "YDYP-3X1.5" },
  { name: "Przewód YDYp 3x2.5 mm² 450/750V (gniazda 230V)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 4.2, salePrice: 6.5, vatRate: 23, stockQuantity: 400, minStockLevel: 100, supplier: "Elektro-Hurt", sku: "YDYP-3X2.5" },
  { name: "Przewód YDYp 5x2.5 mm² 450/750V (siła / płyta 400V)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 7.1, salePrice: 10.8, vatRate: 23, stockQuantity: 250, minStockLevel: 50, supplier: "Elektro-Hurt", sku: "YDYP-5X2.5" },
  { name: "Przewód YDYp 5x4.0 mm² (zasilanie rozdzielnicy / pompy)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 11.5, salePrice: 17.0, vatRate: 23, stockQuantity: 120, minStockLevel: 30, supplier: "Elektro-Hurt", sku: "YDYP-5X4.0" },
  { name: "Kabel ziemny YKY 5x10 mm² (WLZ przyłącze główne)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 28.0, salePrice: 42.0, vatRate: 23, stockQuantity: 80, minStockLevel: 25, supplier: "Elektro-Hurt", sku: "YKY-5X10" },
  { name: "Kabel ziemny YKY 5x6 mm² (zasilanie garażu / podrozdzielnicy)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 17.5, salePrice: 26.5, vatRate: 23, stockQuantity: 100, minStockLevel: 30, supplier: "Elektro-Hurt", sku: "YKY-5X6" },
  { name: "Kabel sieciowy UTP Kat. 6 LAN (skrętka miedziana)", category: "Teletechnika", trade: "elektryka", unit: "m", purchasePrice: 1.6, salePrice: 2.8, vatRate: 23, stockQuantity: 300, minStockLevel: 100, supplier: "Tele-Net", sku: "UTP-CAT6" },
  { name: "Przewód solarny KBE Solar DB+ 1x6 mm² (do PV)", category: "Kable i przewody", trade: "elektryka", unit: "m", purchasePrice: 3.9, salePrice: 6.2, vatRate: 23, stockQuantity: 200, minStockLevel: 50, supplier: "Elektro-Hurt", sku: "SOLAR-1X6" },
  { name: "Wyłącznik nadprądowy B16 1P 6kA (Hager/Eaton)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 14.5, salePrice: 24.0, vatRate: 23, stockQuantity: 60, minStockLevel: 15, supplier: "Aparatura-Pro", sku: "MCB-B16" },
  { name: "Wyłącznik nadprądowy B10 1P 6kA (Hager/Eaton)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 14.5, salePrice: 24.0, vatRate: 23, stockQuantity: 40, minStockLevel: 10, supplier: "Aparatura-Pro", sku: "MCB-B10" },
  { name: "Wyłącznik nadprądowy B16 3P 6kA (trójfazowy)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 52.0, salePrice: 78.0, vatRate: 23, stockQuantity: 20, minStockLevel: 5, supplier: "Aparatura-Pro", sku: "MCB-B16-3P" },
  { name: "Wyłącznik nadprądowy C16 3P 6kA (silniki / klimatyzacja)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 55.0, salePrice: 82.0, vatRate: 23, stockQuantity: 18, minStockLevel: 5, supplier: "Aparatura-Pro", sku: "MCB-C16-3P" },
  { name: "Wyłącznik nadprądowy C20 3P 6kA (płyta / pompa ciepła)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 58.0, salePrice: 86.0, vatRate: 23, stockQuantity: 15, minStockLevel: 4, supplier: "Aparatura-Pro", sku: "MCB-C20-3P" },
  { name: "Wyłącznik nadprądowy C25 3P 6kA", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 62.0, salePrice: 92.0, vatRate: 23, stockQuantity: 12, minStockLevel: 3, supplier: "Aparatura-Pro", sku: "MCB-C25-3P" },
  { name: "Wyłącznik różnicowoprądowy RCD 40A 30mA 4P typ A", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 130.0, salePrice: 195.0, vatRate: 23, stockQuantity: 12, minStockLevel: 3, supplier: "Aparatura-Pro", sku: "RCD-40-30-4P" },
  { name: "Wyłącznik różnicowoprądowy RCD 25A 30mA 2P typ A", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 95.0, salePrice: 145.0, vatRate: 23, stockQuantity: 15, minStockLevel: 4, supplier: "Aparatura-Pro", sku: "RCD-25-30-2P" },
  { name: "Wyłącznik różnicowoprądowy RCD 40A 30mA 4P typ B (EV / PV)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 580.0, salePrice: 790.0, vatRate: 23, stockQuantity: 4, minStockLevel: 1, supplier: "Aparatura-Pro", sku: "RCD-40-30-4P-B" },
  { name: "Ogranicznik przepięć SPD T1+T2 (B+C) 4P iskiernikowo-warystorowy", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 280.0, salePrice: 420.0, vatRate: 23, stockQuantity: 6, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "SPD-T1T2-4P" },
  { name: "Ogranicznik przepięć PV DC 1000V T2 2P (do stringów PV)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 110.0, salePrice: 165.0, vatRate: 23, stockQuantity: 8, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "SPD-PV-1000V" },
  { name: "Blok rozdzielczy modularny 4P 100A / 125A na szynę DIN", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 48.0, salePrice: 75.0, vatRate: 23, stockQuantity: 12, minStockLevel: 3, supplier: "Aparatura-Pro", sku: "BLOK-ROZDZ-4P" },
  { name: "Szyna łączeniowa grzebieniowa 3-fazowa 3F 12-modułowa (widełkowa)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 22.0, salePrice: 36.0, vatRate: 23, stockQuantity: 25, minStockLevel: 5, supplier: "Aparatura-Pro", sku: "SZYNA-3F-12M" },
  { name: "Licznik energii elektrycznej 3-fazowy MID z Modbus RTU / impuls", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 210.0, salePrice: 320.0, vatRate: 23, stockQuantity: 6, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "LICZNIK-3F-MID" },
  { name: "Przełącznik zasilania sieć-agregat I-0-II (SZR ręczny) 4P 63A", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 140.0, salePrice: 215.0, vatRate: 23, stockQuantity: 5, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "PRZEL-SZR-4P-63A" },
  { name: "Przekaźnik bistabilny 230V 16A z pamięcią (sterowanie oświetleniem)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 42.0, salePrice: 68.0, vatRate: 23, stockQuantity: 16, minStockLevel: 4, supplier: "Aparatura-Pro", sku: "PRZEK-BISTAB-16A" },
  { name: "Stycznik modułowy 25A 4P 230V cewka cicha (do grzałki / pompy)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 55.0, salePrice: 85.0, vatRate: 23, stockQuantity: 10, minStockLevel: 3, supplier: "Aparatura-Pro", sku: "STYCZNIK-25A-4P" },
  { name: "Moduł przekaźnikowy Smart Zigbee/Tuya na szynę DIN (2 kanały)", category: "Aparatura modułowa", trade: "elektryka", unit: "szt", purchasePrice: 65.0, salePrice: 99.0, vatRate: 23, stockQuantity: 8, minStockLevel: 2, supplier: "Smart-House", sku: "SMART-DIN-ZIGBEE" },
  { name: "Rozdzielnica podtynkowa 24M (2x12) z drzwiczkami białymi", category: "Rozdzielnice", trade: "elektryka", unit: "szt", purchasePrice: 110.0, salePrice: 175.0, vatRate: 23, stockQuantity: 8, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "ROZDZ-24M" },
  { name: "Rozdzielnica podtynkowa 36M (3x12) z drzwiczkami", category: "Rozdzielnice", trade: "elektryka", unit: "szt", purchasePrice: 165.0, salePrice: 245.0, vatRate: 23, stockQuantity: 5, minStockLevel: 2, supplier: "Aparatura-Pro", sku: "ROZDZ-36M" },
  { name: "Rozdzielnica podtynkowa 48M (4x12) multimedialno-elektryczna", category: "Rozdzielnice", trade: "elektryka", unit: "szt", purchasePrice: 230.0, salePrice: 340.0, vatRate: 23, stockQuantity: 4, minStockLevel: 1, supplier: "Aparatura-Pro", sku: "ROZDZ-48M" },
  { name: "Złączka WAGO 221-412 (2x4mm²)", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 1.1, salePrice: 1.8, vatRate: 23, stockQuantity: 500, minStockLevel: 100, supplier: "WAGO-Dystrybucja", sku: "WAGO-221-412" },
  { name: "Złączka WAGO 221-413 (3x4mm²)", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 1.4, salePrice: 2.2, vatRate: 23, stockQuantity: 400, minStockLevel: 100, supplier: "WAGO-Dystrybucja", sku: "WAGO-221-413" },
  { name: "Złączka WAGO 221-415 (5x4mm²)", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 2.1, salePrice: 3.4, vatRate: 23, stockQuantity: 250, minStockLevel: 50, supplier: "WAGO-Dystrybucja", sku: "WAGO-221-415" },
  { name: "Puszka podtynkowa fi 60 głęboka z wkrętami", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 1.8, salePrice: 3.2, vatRate: 23, stockQuantity: 300, minStockLevel: 60, supplier: "Elektro-Hurt", sku: "PUSZ-60-GL" },
  { name: "Puszka podtynkowa wielokrotna łączona 2-krotna", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 4.2, salePrice: 7.0, vatRate: 23, stockQuantity: 120, minStockLevel: 30, supplier: "Elektro-Hurt", sku: "PUSZ-60-2K" },
  { name: "Puszka podtynkowa z kieszenią na sterowniki (do Smart Home)", category: "Osprzęt i puszki", trade: "elektryka", unit: "szt", purchasePrice: 5.5, salePrice: 9.2, vatRate: 23, stockQuantity: 80, minStockLevel: 20, supplier: "Elektro-Hurt", sku: "PUSZ-60-KIESZEN" },
  { name: "Peszel karbowany z pilotem fi 20mm (samogasnący 750N)", category: "Prowadzenie kabli", trade: "elektryka", unit: "m", purchasePrice: 1.2, salePrice: 2.2, vatRate: 23, stockQuantity: 300, minStockLevel: 50, supplier: "Elektro-Hurt", sku: "PESZ-20" },
  { name: "Korytko kablowe natynkowe PCV 40x25 mm z pokrywą", category: "Prowadzenie kabli", trade: "elektryka", unit: "m", purchasePrice: 4.5, salePrice: 7.8, vatRate: 23, stockQuantity: 80, minStockLevel: 20, supplier: "Elektro-Hurt", sku: "KOR-40X25" },
  { name: "Taśma izolacyjna PVC elektroinstalacyjna (kpl 6 kolorów)", category: "Osprzęt i puszki", trade: "elektryka", unit: "kpl", purchasePrice: 12.0, salePrice: 20.0, vatRate: 23, stockQuantity: 50, minStockLevel: 10, supplier: "Elektro-Hurt", sku: "TASMA-PVC-KPL" },
];

const DEFAULT_TEMPLATES: Omit<QuoteTemplate, "id" | "createdAt" | "updatedAt" | "usageCount">[] = [
  {
    name: "Standardowa łazienka",
    description: "Kompletna instalacja łazienki - montaż umywalki, wanny, toalety i baterii",
    category: "Łazienka",
    defaultDiscountPercent: 5,
    items: STANDARD_LAZIENKA_ITEMS.map(calcItem),
    additionalCosts: STANDARD_LAZIENKA_COSTS.map((c) => ({ ...c, id: generateItemId() })),
    pricingModel: STANDARD_LAZIENKA_PRICING,
  },
  {
    name: "Kuchnia - wymiana baterii",
    description: "Wymiana baterii kuchennej z podłączeniem",
    category: "Kuchnia",
    defaultDiscountPercent: 0,
    items: KUCHNIA_BATERIA_ITEMS.map(calcItem),
    additionalCosts: KUCHNIA_BATERIA_COSTS.map((c) => ({ ...c, id: generateItemId() })),
    pricingModel: KUCHNIA_PRICING,
  },
  {
    name: "Przegląd instalacji",
    description: "Przegląd i diagnoza instalacji hydraulicznej",
    category: "Przegląd",
    defaultDiscountPercent: 0,
    items: PRZEGLAD_ITEMS.map(calcItem),
    additionalCosts: [],
    pricingModel: PRZEGLAD_PRICING,
  },
];

const DEFAULT_SETTINGS: Omit<CompanySettings, "id"> = {
  name: "",
  address: "",
  phone: "",
  email: "",
  nip: "",
  bankAccount: "",
  bankName: "",
  defaultVatRate: 8,
  defaultValidityDays: 30,
};

export async function seedDatabase() {
  const serviceCount = await db.services.count();
  if (serviceCount === 0) {
    const now = new Date();
    await db.services.bulkAdd(
      DEFAULT_SERVICES.map((s) => ({
        ...s,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const materialCount = await db.materials.count();
  const now = new Date();
  if (materialCount === 0) {
    await db.materials.bulkAdd(
      DEFAULT_MATERIALS.map((m) => ({
        ...m,
        createdAt: now,
        updatedAt: now,
      }))
    );
  } else {
    // Sprawdź czy baza zawiera już dedykowane materiały elektryczne i hydrauliczne
    const existing = await db.materials.toArray();
    const hasElectrical = existing.some((m) => m.trade === "elektryka");
    if (!hasElectrical) {
      const electricalSeeds = DEFAULT_MATERIALS.filter((m) => m.trade === "elektryka");
      await db.materials.bulkAdd(
        electricalSeeds.map((m) => ({
          ...m,
          createdAt: now,
          updatedAt: now,
        }))
      );
      // Oznacz dotychczasowe materiały hydrauliczne
      for (const item of existing) {
        if (!item.trade && item.id) {
          await db.materials.update(item.id, { trade: "hydraulika" });
        }
      }
    }

    // Upewnij się, że rozszerzony katalog hydrauliki jest załadowany
    const hasAdvancedPlumbing = existing.some((m) => m.sku === "ROZDZ-CO-6OB");
    if (!hasAdvancedPlumbing) {
      const plumbingSeeds = DEFAULT_MATERIALS.filter(
        (m) => m.trade === "hydraulika" && !existing.some((e) => e.sku === m.sku)
      );
      if (plumbingSeeds.length > 0) {
        await db.materials.bulkAdd(
          plumbingSeeds.map((m) => ({
            ...m,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }

    // Upewnij się, że rozszerzony katalog aparatury elektrycznej (Faza 1) jest załadowany
    const hasAdvancedElectrical = existing.some((m) => m.sku === "BLOK-ROZDZ-4P");
    if (!hasAdvancedElectrical) {
      const electricalSeeds = DEFAULT_MATERIALS.filter(
        (m) => m.trade === "elektryka" && !existing.some((e) => e.sku === m.sku)
      );
      if (electricalSeeds.length > 0) {
        await db.materials.bulkAdd(
          electricalSeeds.map((m) => ({
            ...m,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }
  }

  const templateCount = await db.quoteTemplates.count();
  if (templateCount === 0) {
    const now = new Date();
    await db.quoteTemplates.bulkAdd(
      DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS);
  }
}
