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
  TimeTemplate,
  RecurringTimeEntry,
  ScheduleEvent,
  RecurringQuote,
} from "@/types";
import type { MeasurementProtocol } from "@/lib/electrical-protocols";
import type { PlumbingPressureProtocol } from "@/lib/plumbing-protocols";

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
  timeTemplates: EntityTable<TimeTemplate, "id">;
  recurringTimeEntries: EntityTable<RecurringTimeEntry, "id">;
  scheduleEvents: EntityTable<ScheduleEvent, "id">;
  recurringQuotes: EntityTable<RecurringQuote, "id">;
  protocols: EntityTable<MeasurementProtocol, "id">;
  plumbingProtocols: EntityTable<PlumbingPressureProtocol, "id">;
};

db.version(1).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, createdAt",
  quotes: "++id, number, status, clientId, createdAt",
  settings: "++id",
});

db.version(2).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, email, nip, createdAt",
  quotes: "++id, number, status, clientId, clientName, createdAt",
  settings: "++id",
  materials: "++id, name, category, supplier, sku, createdAt",
  invoices: "++id, number, status, quoteId, issueDate, dueDate",
  payments: "++id, invoiceId, date, method",
  quoteTemplates: "++id, name, category, createdAt",
  timeEntries: "++id, quoteId, clientId, category, startTime",
  scheduleEvents: "++id, quoteId, clientId, type, status, startTime, endTime",
  recurringQuotes: "++id, name, clientId, frequency, isActive, nextDueDate",
});

db.version(3).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, email, nip, createdAt",
  quotes: "++id, number, status, clientId, clientName, createdAt",
  settings: "++id",
  materials: "++id, name, category, supplier, sku, createdAt",
  invoices: "++id, number, status, quoteId, issueDate, dueDate",
  payments: "++id, invoiceId, date, method",
  quoteTemplates: "++id, name, category, createdAt",
  timeEntries: "++id, quoteId, clientId, category, startTime",
  timeTemplates: "++id, name, clientName, category, createdAt",
  recurringTimeEntries: "++id, templateId, isActive, nextDueDate",
  scheduleEvents: "++id, quoteId, clientId, type, status, startTime, endTime",
  recurringQuotes: "++id, name, clientId, frequency, isActive, nextDueDate",
});

db.version(4).stores({
  services: "++id, name, category, createdAt",
  clients: "++id, name, phone, email, nip, createdAt",
  quotes: "++id, number, status, clientId, clientName, createdAt",
  settings: "++id",
  materials: "++id, name, category, supplier, sku, createdAt",
  invoices: "++id, number, status, quoteId, issueDate, dueDate",
  payments: "++id, invoiceId, date, method",
  quoteTemplates: "++id, name, category, createdAt",
  timeEntries: "++id, quoteId, clientId, category, startTime",
  timeTemplates: "++id, name, clientName, category, createdAt",
  recurringTimeEntries: "++id, templateId, isActive, nextDueDate",
  scheduleEvents: "++id, quoteId, clientId, type, status, startTime, endTime",
  recurringQuotes: "++id, name, clientId, frequency, isActive, nextDueDate",
  protocols: "id, number, clientName, status, date",
  plumbingProtocols: "id, number, clientName, status, date, installationType",
});

export { db };
