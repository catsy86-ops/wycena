import Dexie, { type EntityTable } from "dexie";
import type {
  Service,
  Client,
  Quote,
  CompanySettings,
  Material,
  Invoice,
  Payment,
  QuoteTemplate,
  TimeEntry,
  ScheduleEvent,
  RecurringQuote,
} from "@/types";

const db = new Dexie("WycenaDB") as Dexie & {
  services: EntityTable<Service, "id">;
  clients: EntityTable<Client, "id">;
  quotes: EntityTable<Quote, "id">;
  settings: EntityTable<CompanySettings, "id">;
  materials: EntityTable<Material, "id">;
  invoices: EntityTable<Invoice, "id">;
  payments: EntityTable<Payment, "id">;
  quoteTemplates: EntityTable<QuoteTemplate, "id">;
  timeEntries: EntityTable<TimeEntry, "id">;
  scheduleEvents: EntityTable<ScheduleEvent, "id">;
  recurringQuotes: EntityTable<RecurringQuote, "id">;
};

db.version(1).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, createdAt",
  quotes: "++id, number, status, clientId, createdAt",
  settings: "++id",
});

db.version(2).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, createdAt",
  quotes: "++id, number, status, clientId, createdAt",
  settings: "++id",
  materials: "++id, name, category, supplier, createdAt",
  invoices: "++id, number, status, quoteId, issueDate, dueDate",
  payments: "++id, invoiceId, date, method",
  quoteTemplates: "++id, name, category, createdAt",
  timeEntries: "++id, quoteId, clientId, category, startTime",
  scheduleEvents: "++id, quoteId, clientId, type, status, startTime, endTime",
  recurringQuotes: "++id, name, clientId, frequency, isActive, nextDueDate",
});

export { db };
