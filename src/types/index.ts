export type VatRate = 0 | 8 | 23;

export type ServiceCategory =
  | "montaz"
  | "naprawa"
  | "wymiana"
  | "czyszczenie"
  | "diagnoza"
  | "materialy"
  | "inne";

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  montaz: "MontaĹĽ",
  naprawa: "Naprawa",
  wymiana: "Wymiana",
  czyszczenie: "Czyszczenie",
  diagnoza: "Diagnoza",
  materialy: "MateriaĹ‚y",
  inne: "Inne",
};

export const VAT_RATE_LABELS: Record<VatRate, string> = {
  0: "0% (zw.)",
  8: "8%",
  23: "23%",
};

export type Unit = "szt" | "kg" | "m" | "m2" | "godz" | "kpl" | "mb" | "komplet";

export const UNIT_LABELS: Record<Unit, string> = {
  szt: "szt.",
  kg: "kg",
  m: "m",
  m2: "mÂ˛",
  godz: "godz.",
  kpl: "kpl.",
  mb: "mb",
  komplet: "komplet",
};

export interface Service {
  id?: number;
  name: string;
  category: ServiceCategory;
  unit: Unit;
  priceNetto: number;
  vatRate: VatRate;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nip?: string;
  notes?: string;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuoteStatus = "szkic" | "wyslana" | "zaakceptowana" | "odrzucona";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  szkic: "Szkic",
  wyslana: "WysĹ‚ana",
  zaakceptowana: "Zaakceptowana",
  odrzucona: "Odrzucona",
};

export interface QuoteItem {
  id: string;
  serviceId?: number;
  name: string;
  quantity: number;
  unit: Unit;
  priceNettoPerUnit: number;
  vatRate: VatRate;
  discountPercent: number;
  nettotal: number;
  vatAmount: number;
  bruttoTotal: number;
  /** Cena z zewnÄ™trznego API (do porĂłwnania) */
  externalPrice?: number;
  /** ĹąrĂłdĹ‚o ceny zewnÄ™trznej */
  externalPriceSource?: string;
}

export interface QuoteAdditionalCost {
  id: string;
  name: string;
  amount: number;
  vatRate: VatRate;
  category: "dojazd" | "materialy" | "sprzet" | "inne";
}

export interface QuoteVersion {
  id: string;
  versionNumber: number;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  globalDiscountPercent: number;
  notes?: string;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  createdAt: Date;
  createdBy?: string;
  changeDescription?: string;
}

export interface Quote {
  id?: number;
  number: string;
  clientId?: number;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientNip?: string;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  globalDiscountPercent: number;
  progressiveDiscounts: ProgressiveDiscount[];
  notes?: string;
  status: QuoteStatus;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  versions: QuoteVersion[];
  templateId?: number;
  recurringId?: number;
  /** Wynik zaawansowanego modelu wyceny (snapshot) */
  pricingSnapshot?: PricingSnapshot;
}

/** Snapshot wynikĂłw zaawansowanego modelu wyceny zapisywany razem z wycena */
export interface PricingSnapshot {
  model: PricingModelConfig;
  result: {
    baseNetto: number;
    finalNetto: number;
    finalBrutto: number;
    marginPercent: number;
    breakdown: Record<string, number>;
  };
  generatedAt: Date;
}

export interface ProgressiveDiscount {
  minQuantity: number;
  discountPercent: number;
}

export interface CompanySettings {
  id?: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  nip: string;
  bankAccount: string;
  bankName: string;
  defaultVatRate: VatRate;
  defaultValidityDays: number;
  logoDataUrl?: string;
  /** Konfiguracja zewnÄ™trznych API cenowych */
  externalPricingApis?: ExternalPricingApiConfig[];
}

/** Konfiguracja jednego zewnÄ™trznego API cenowego */
export interface ExternalPricingApiConfig {
  id: string;
  name: string;
  /** URL endpointu (moĹĽe byÄ‡ wĹ‚asny serwer lub proxy) */
  url: string;
  /** Klucz API (opcjonalny) */
  apiKey?: string;
  /** Czy aktywne */
  enabled: boolean;
  /** Typ API */
  type: "custom" | "builtin_mock" | "cennik_gus";
}

/** Wynik zapytania do zewnÄ™trznego API cenowego */
export interface ExternalPricingResult {
  source: string;
  items: ExternalPricingItem[];
  fetchedAt: Date;
  error?: string;
}

export interface ExternalPricingItem {
  name: string;
  unit: string;
  priceNetto: number;
  vatRate: number;
  category?: string;
  description?: string;
  /** Identyfikator w zewnÄ™trznym systemie */
  externalId?: string;
}

export interface Material {
  id?: number;
  name: string;
  category: string;
  unit: Unit;
  purchasePrice: number;
  salePrice: number;
  vatRate: VatRate;
  stockQuantity: number;
  minStockLevel: number;
  supplier?: string;
  sku?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id?: number;
  number: string;
  quoteId?: number;
  clientName: string;
  clientAddress?: string;
  clientNip?: string;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = "niezaplacona" | "czesciowo" | "zaplacona" | "anulowana";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  niezaplacona: "NieopĹ‚acona",
  czesciowo: "CzÄ™Ĺ›ciowo opĹ‚acona",
  zaplacona: "OpĹ‚acona",
  anulowana: "Anulowana",
};

export interface Payment {
  id?: number;
  invoiceId: number;
  amount: number;
  date: Date;
  method: "przelew" | "gotowka" | "karta" | "inny";
  notes?: string;
  createdAt: Date;
}

export const PAYMENT_METHOD_LABELS: Record<Payment["method"], string> = {
  przelew: "Przelew",
  gotowka: "GotĂłwka",
  karta: "Karta",
  inny: "Inny",
};

export interface QuoteTemplate {
  id?: number;
  name: string;
  description?: string;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  defaultDiscountPercent: number;
  category: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  pricingModel?: PricingModelConfig;
}

export interface PricingModelConfig {
  complexityFactor: number;       // 1.0 - 2.0 â€” zĹ‚oĹĽonoĹ›Ä‡ projektu
  riskMargin: number;             // 0 - 30% â€” margines ryzyka
  overheadPercent: number;        // 0 - 50% â€” koszty poĹ›rednie
  profitMarginPercent: number;    // 0 - 50% â€” marĹĽa zysku
  inflationAdjustment: number;    // 0 - 20% â€” waloryzacja
  urgencyMultiplier: number;      // 1.0 - 3.0 â€” pilnoĹ›Ä‡
  volumeDiscounts: ProgressiveDiscount[];
  minimumMarginPercent: number;   // 0 - 50% â€” minimalna marĹĽa
  laborCostMultiplier: number;    // 1.0 - 3.0 â€” mnoĹĽnik robocizny
  materialWastePercent: number;   // 0 - 30% â€” straty materiaĹ‚owe
  equipmentCostPercent: number;   // 0 - 20% â€” koszt sprzÄ™tu
  travelCostPerKm: number;        // PLN/km
  estimatedDistanceKm: number;    // km
  permitCosts: number;            // koszty staĹ‚e (pozwolenia)
  insuranceCostPercent: number;   // 0 - 10% â€” ubezpieczenie
  warrantyPeriodMonths: number;   // 0 - 60 â€” okres gwarancji
  warrantyReservePercent: number; // 0 - 10% â€” rezerwa gwarancyjna
  /** Korekta sezonowa â€” np. +15% w sezonie grzewczym */
  seasonalAdjustmentPercent: number; // -20 - 50%
  /** MarĹĽa na materiaĹ‚ach (narzut na ceny zakupu) */
  materialMarkupPercent: number;  // 0 - 100%
  /** Minimalna kwota wyceny */
  minimumQuoteAmount: number;     // PLN
}

export const DEFAULT_PRICING_MODEL: PricingModelConfig = {
  complexityFactor: 1.0,
  riskMargin: 0,
  overheadPercent: 0,
  profitMarginPercent: 20,
  inflationAdjustment: 0,
  urgencyMultiplier: 1.0,
  volumeDiscounts: [],
  minimumMarginPercent: 10,
  laborCostMultiplier: 1.0,
  materialWastePercent: 0,
  equipmentCostPercent: 0,
  travelCostPerKm: 0,
  estimatedDistanceKm: 0,
  permitCosts: 0,
  insuranceCostPercent: 0,
  warrantyPeriodMonths: 0,
  warrantyReservePercent: 0,
  seasonalAdjustmentPercent: 0,
  materialMarkupPercent: 0,
  minimumQuoteAmount: 0,
};

export interface TimeEntry {
  id?: number;
  quoteId?: number;
  clientId?: number;
  clientName: string;
  description: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  hourlyRate: number;
  totalCost: number;
  category: "robocizna" | "dojazd" | "inne";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleEvent {
  id?: number;
  quoteId?: number;
  clientId?: number;
  clientName: string;
  clientPhone?: string;
  title: string;
  description?: string;
  address?: string;
  startTime: Date;
  endTime: Date;
  type: "wycena" | "realizacja" | "przeglad" | "awaria" | "inne";
  status: ScheduleStatus;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleStatus = "zaplanowane" | "w_trakcie" | "zakonczone" | "anulowane";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  zaplanowane: "Zaplanowane",
  w_trakcie: "W trakcie",
  zakonczone: "ZakoĹ„czone",
  anulowane: "Anulowane",
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleEvent["type"], string> = {
  wycena: "Wycena",
  realizacja: "Realizacja",
  przeglad: "PrzeglÄ…d",
  awaria: "Awaria",
  inne: "Inne",
};

export interface RecurringQuote {
  id?: number;
  name: string;
  clientId?: number;
  clientName: string;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  frequency: "tygodniowo" | "miesiecznie" | "kwartalnie" | "rocznie";
  nextDueDate: Date;
  lastGeneratedDate?: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const RECURRING_FREQUENCY_LABELS: Record<RecurringQuote["frequency"], string> = {
  tygodniowo: "Tygodniowo",
  miesiecznie: "MiesiÄ™cznie",
  kwartalnie: "Kwartalnie",
  rocznie: "Rocznie",
};

export interface QuoteSuggestion {
  serviceId: number;
  name: string;
  frequency: number;
  lastUsed?: Date;
  avgQuantity: number;
}

