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
  montaz: "Montaż",
  naprawa: "Naprawa",
  wymiana: "Wymiana",
  czyszczenie: "Czyszczenie",
  diagnoza: "Diagnoza",
  materialy: "Materiały",
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
  m2: "m²",
  godz: "godz.",
  kpl: "kpl.",
  mb: "mb",
  komplet: "komplet",
};

export interface ServiceVariant {
  id: string;
  name: string;
  priceNetto: number;
  description?: string;
}

export interface ServicePriceHistory {
  date: string; // ISO date
  priceNetto: number;
  reason?: string;
}

export interface ServicePackage {
  id?: number;
  name: string;
  description?: string;
  category: string;
  serviceIds: number[];
  materialIds?: number[];
  discountPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id?: number;
  name: string;
  category: ServiceCategory;
  subcategory?: string;
  unit: Unit;
  priceNetto: number;
  priceMin?: number;
  priceMax?: number;
  vatRate: VatRate;
  description?: string;
  /** Szacowany czas wykonania w minutach */
  estimatedMinutes?: number;
  /** Notatki wewnętrzne (nie widoczne dla klienta) */
  internalNotes?: string;
  /** Warianty cenowe */
  variants?: ServiceVariant[];
  /** Historia zmian cen */
  priceHistory?: ServicePriceHistory[];
  /** Powiązane materiały (ID z tabeli materials) */
  relatedMaterialIds?: number[];
  /** Koszt własny (materiały + czas) */
  costPrice?: number;
  /** Czy aktywna (widoczna w katalogu) */
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientContactEntry {
  id: string;
  date: string; // ISO date
  type: "telefon" | "email" | "wizyta" | "sms" | "inne";
  summary: string;
  outcome?: string;
}

export interface ClientVisitNote {
  id: string;
  date: string; // ISO date
  title: string;
  content: string;
  photos?: string[]; // base64
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
  /** Historia kontaktów */
  contactHistory?: ClientContactEntry[];
  /** Notatki z wizyt */
  visitNotes?: ClientVisitNote[];
  createdAt: Date;
  updatedAt: Date;
}

export type QuoteStatus = "szkic" | "wyslana" | "zaakceptowana" | "odrzucona";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  szkic: "Szkic",
  wyslana: "Wysłana",
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
  /** Cena z zewnętrznego API (do porównania) */
  externalPrice?: number;
  /** Źródło ceny zewnętrznej */
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
  /** Warianty wyceny (ekonomiczny / standard / premium) */
  variants?: QuoteVariant[];
  /** Wybrany wariant przez klienta */
  selectedVariantId?: string;
  /** Galeria zdjęć (base64) */
  photos?: QuotePhoto[];
  /** Predykcja konwersji (0-100%) */
  conversionPrediction?: number;
}

/** Wariant wyceny */
export interface QuoteVariant {
  id: string;
  name: string; // np. "Ekonomiczny", "Standard", "Premium"
  description?: string;
  items: QuoteItem[];
  additionalCosts: QuoteAdditionalCost[];
  globalDiscountPercent: number;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
}

/** Zdjęcie w wycenie */
export interface QuotePhoto {
  id: string;
  dataUrl: string; // base64
  caption?: string;
  type: "before" | "after" | "other";
  createdAt: Date;
}

/** Snapshot wyników zaawansowanego modelu wyceny zapisywany razem z wyceną */
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
  /** Konfiguracja zewnętrznych API cenowych */
  externalPricingApis?: ExternalPricingApiConfig[];
}

/** Konfiguracja jednego zewnętrznego API cenowego */
export interface ExternalPricingApiConfig {
  id: string;
  name: string;
  /** URL endpointu (może być własny serwer lub proxy) */
  url: string;
  /** Klucz API (opcjonalny) */
  apiKey?: string;
  /** Czy aktywne */
  enabled: boolean;
  /** Typ API */
  type: "custom" | "builtin_mock" | "cennik_gus";
}

/** Wynik zapytania do zewnętrznego API cenowego */
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
  /** Identyfikator w zewnętrznym systemie */
  externalId?: string;
}

export interface Material {
  id?: number;
  name: string;
  category: string;
  trade?: "hydraulika" | "elektryka" | "ogolne";
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
  niezaplacona: "Nieopłacona",
  czesciowo: "Częściowo opłacona",
  zaplacona: "Opłacona",
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
  gotowka: "Gotówka",
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
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeTemplate {
  id?: number;
  name: string;
  description?: string;
  clientName: string;
  category: "robocizna" | "dojazd" | "inne";
  hourlyRate: number;
  estimatedMinutes: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringTimeEntry {
  id?: number;
  templateId: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  nextDueDate: Date;
  lastGeneratedDate?: Date;
  isActive: boolean;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecurrencePattern = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

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
  /** Powtarzanie zdarzenia */
  recurrence?: RecurrencePattern;
  /** Data końca powtarzania (jeśli brak, powtarza się w nieskończoność) */
  recurrenceEndDate?: Date;
  /** ID zdarzenia głównego (jeśli to instancja powtarzającego się) */
  parentEventId?: number;
  /** Przypomnienia (minuty przed zdarzeniem) */
  reminders?: number[]; // np. [30, 60] = 30 min i 1h przed
  /** Czy przypomnienia są włączone */
  remindersEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleStatus = "zaplanowane" | "w_trakcie" | "zakonczone" | "anulowane";

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  zaplanowane: "Zaplanowane",
  w_trakcie: "W trakcie",
  zakonczone: "Zakończone",
  anulowane: "Anulowane",
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleEvent["type"], string> = {
  wycena: "Wycena",
  realizacja: "Realizacja",
  przeglad: "Przegląd",
  awaria: "Awaria",
  inne: "Inne",
};

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  none: "Brak",
  daily: "Codziennie",
  weekly: "Co tydzień",
  biweekly: "Co dwa tygodnie",
  monthly: "Co miesiąc",
  yearly: "Co rok",
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
  miesiecznie: "Miesięcznie",
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

