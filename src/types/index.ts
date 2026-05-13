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
  globalDiscountPercent: number;
  notes?: string;
  status: QuoteStatus;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
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