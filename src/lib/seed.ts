import type { Service, Client, CompanySettings, QuoteItem } from "@/types";
import { db } from "./db";

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
  { name: "Pomiery ciśnienia", category: "diagnoza", unit: "szt", priceNetto: 80, vatRate: 8 },
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

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS);
  }
}