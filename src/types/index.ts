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
}

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
