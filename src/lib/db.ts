import Dexie, { type EntityTable } from "dexie";
import type { Service, Client, Quote, CompanySettings } from "@/types";

const db = new Dexie("WycenaDB") as Dexie & {
  services: EntityTable<Service, "id">;
  clients: EntityTable<Client, "id">;
  quotes: EntityTable<Quote, "id">;
  settings: EntityTable<CompanySettings, "id">;
};

db.version(1).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, createdAt",
  quotes: "++id, number, status, createdAt",
  settings: "++id",
});

export { db };