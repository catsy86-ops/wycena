import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki"),
  category: z.enum(["montaz", "naprawa", "wymiana", "czyszczenie", "diagnoza", "materialy", "inne"]),
  unit: z.enum(["szt", "kg", "m", "m2", "godz", "kpl", "mb", "komplet"]),
  priceNetto: z.coerce.number().min(0, "Cena musi być dodatnia"),
  vatRate: z.coerce.number().refine((v): v is 0 | 8 | 23 => [0, 8, 23].includes(v), "Nieprawidłowa stawka VAT"),
  description: z.string().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki"),
  phone: z.string().min(5, "Numer telefonu jest wymagany"),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  address: z.string().optional(),
  nip: z.string().optional(),
});

export const quoteItemSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  serviceId: z.number().optional(),
  quantity: z.coerce.number().min(0.01, "Ilość musi być > 0"),
  unit: z.enum(["szt", "kg", "m", "m2", "godz", "kpl", "mb", "komplet"]),
  priceNettoPerUnit: z.coerce.number().min(0, "Cena musi być >= 0"),
  vatRate: z.coerce.number().refine((v): v is 0 | 8 | 23 => [0, 8, 23].includes(v), "Nieprawidłowa stawka VAT"),
  discountPercent: z.coerce.number().min(0).max(100, "Rabat max 100%"),
});

export const companySettingsSchema = z.object({
  name: z.string().min(1, "Nazwa firmy jest wymagana"),
  address: z.string().min(1, "Adres jest wymagany"),
  phone: z.string().min(1, "Telefon jest wymagany"),
  email: z.string().email("Nieprawidłowy email"),
  nip: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  defaultVatRate: z.coerce.number().refine((v): v is 0 | 8 | 23 => [0, 8, 23].includes(v)),
  defaultValidityDays: z.coerce.number().min(1, "Min. 1 dzień"),
  logoDataUrl: z.string().optional(),
});

export const materialSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć min. 2 znaki"),
  category: z.string().min(1, "Kategoria jest wymagana"),
  unit: z.enum(["szt", "kg", "m", "m2", "godz", "kpl", "mb", "komplet"]),
  purchasePrice: z.coerce.number().min(0, "Cena zakupu musi być >= 0"),
  salePrice: z.coerce.number().min(0, "Cena sprzedaży musi być >= 0"),
  vatRate: z.coerce.number().refine((v): v is 0 | 8 | 23 => [0, 8, 23].includes(v), "Nieprawidłowa stawka VAT"),
  stockQuantity: z.coerce.number().min(0, "Stan magazynowy musi być >= 0"),
  minStockLevel: z.coerce.number().min(0, "Minimalny stan musi być >= 0"),
  supplier: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
});

export const invoiceSchema = z.object({
  clientName: z.string().min(2, "Nazwa klienta jest wymagana"),
  clientAddress: z.string().optional(),
  clientNip: z.string().optional(),
  issueDate: z.string().min(1, "Data wystawienia jest wymagana"),
  dueDate: z.string().min(1, "Data płatności jest wymagana"),
});

export const quoteTemplateSchema = z.object({
  name: z.string().min(2, "Nazwa szablonu jest wymagana"),
  description: z.string().optional(),
  category: z.string().min(1, "Kategoria jest wymagana"),
  defaultDiscountPercent: z.coerce.number().min(0).max(100),
});

export const timeEntrySchema = z.object({
  clientName: z.string().min(2, "Nazwa klienta jest wymagana"),
  description: z.string().min(1, "Opis jest wymagany"),
  startTime: z.string().min(1, "Czas rozpoczęcia jest wymagany"),
  endTime: z.string().min(1, "Czas zakończenia jest wymagany"),
  hourlyRate: z.coerce.number().min(0, "Stawka godzinowa musi być >= 0"),
  category: z.enum(["robocizna", "dojazd", "inne"]),
  notes: z.string().optional(),
});

export const scheduleEventSchema = z.object({
  clientName: z.string().min(2, "Nazwa klienta musi mieć min. 2 znaki"),
  clientPhone: z.string().optional().or(z.literal("")),
  title: z.string().min(2, "Tytuł musi mieć min. 2 znaki"),
  description: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  startTime: z.string().min(1, "Czas rozpoczęcia jest wymagany"),
  endTime: z.string().min(1, "Czas zakończenia jest wymagany"),
  type: z.enum(["wycena", "realizacja", "przeglad", "awaria", "inne"]),
  status: z.enum(["zaplanowane", "w_trakcie", "zakonczone", "anulowane"]),
  color: z.string().optional(),
});

export const recurringQuoteSchema = z.object({
  name: z.string().min(2, "Nazwa jest wymagana"),
  clientName: z.string().min(2, "Nazwa klienta jest wymagana"),
  frequency: z.enum(["tygodniowo", "miesiecznie", "kwartalnie", "rocznie"]),
  nextDueDate: z.string().min(1, "Data jest wymagana"),
  isActive: z.boolean(),
  notes: z.string().optional(),
});
