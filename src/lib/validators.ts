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