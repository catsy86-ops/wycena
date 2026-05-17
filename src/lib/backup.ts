import { db } from "@/lib/db";

export interface BackupData {
  version: number;
  exportedAt: string;
  tables: {
    services: unknown[];
    clients: unknown[];
    quotes: unknown[];
    settings: unknown[];
    materials: unknown[];
    invoices: unknown[];
    payments: unknown[];
    quoteTemplates: unknown[];
    timeEntries: unknown[];
    scheduleEvents: unknown[];
    recurringQuotes: unknown[];
  };
}

/**
 * Eksportuje całą bazę IndexedDB do obiektu JSON.
 */
export async function exportDatabase(): Promise<BackupData> {
  const [
    services, clients, quotes, settings, materials,
    invoices, payments, quoteTemplates, timeEntries,
    scheduleEvents, recurringQuotes,
  ] = await Promise.all([
    db.services.toArray(),
    db.clients.toArray(),
    db.quotes.toArray(),
    db.settings.toArray(),
    db.materials.toArray(),
    db.invoices.toArray(),
    db.payments.toArray(),
    db.quoteTemplates.toArray(),
    db.timeEntries.toArray(),
    db.scheduleEvents.toArray(),
    db.recurringQuotes.toArray(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: {
      services, clients, quotes, settings, materials,
      invoices, payments, quoteTemplates, timeEntries,
      scheduleEvents, recurringQuotes,
    },
  };
}

/**
 * Importuje dane z backupu do bazy. UWAGA: nadpisuje istniejące dane!
 */
export async function importDatabase(data: BackupData): Promise<{ imported: number }> {
  let total = 0;

  await db.transaction("rw",
    [db.services, db.clients, db.quotes, db.settings,
    db.materials, db.invoices, db.payments, db.quoteTemplates,
    db.timeEntries, db.scheduleEvents, db.recurringQuotes],
    async () => {
      // Czyść wszystkie tabele
      await Promise.all([
        db.services.clear(), db.clients.clear(), db.quotes.clear(),
        db.settings.clear(), db.materials.clear(), db.invoices.clear(),
        db.payments.clear(), db.quoteTemplates.clear(), db.timeEntries.clear(),
        db.scheduleEvents.clear(), db.recurringQuotes.clear(),
      ]);

      // Importuj dane
      const t = data.tables;
      if (t.services?.length) { await db.services.bulkAdd(t.services as any); total += t.services.length; }
      if (t.clients?.length) { await db.clients.bulkAdd(t.clients as any); total += t.clients.length; }
      if (t.quotes?.length) { await db.quotes.bulkAdd(t.quotes as any); total += t.quotes.length; }
      if (t.settings?.length) { await db.settings.bulkAdd(t.settings as any); total += t.settings.length; }
      if (t.materials?.length) { await db.materials.bulkAdd(t.materials as any); total += t.materials.length; }
      if (t.invoices?.length) { await db.invoices.bulkAdd(t.invoices as any); total += t.invoices.length; }
      if (t.payments?.length) { await db.payments.bulkAdd(t.payments as any); total += t.payments.length; }
      if (t.quoteTemplates?.length) { await db.quoteTemplates.bulkAdd(t.quoteTemplates as any); total += t.quoteTemplates.length; }
      if (t.timeEntries?.length) { await db.timeEntries.bulkAdd(t.timeEntries as any); total += t.timeEntries.length; }
      if (t.scheduleEvents?.length) { await db.scheduleEvents.bulkAdd(t.scheduleEvents as any); total += t.scheduleEvents.length; }
      if (t.recurringQuotes?.length) { await db.recurringQuotes.bulkAdd(t.recurringQuotes as any); total += t.recurringQuotes.length; }
    }
  );

  return { imported: total };
}

/**
 * Pobiera backup jako plik JSON.
 */
export async function downloadBackup(): Promise<void> {
  const data = await exportDatabase();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wycenka-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Eksportuje dane klienta do JSON (RODO — prawo do przenoszenia danych).
 */
export async function exportClientData(clientId: number): Promise<string> {
  const client = await db.clients.get(clientId);
  const quotes = await db.quotes.where("clientId").equals(clientId).toArray();
  const invoices = await db.invoices.toArray();
  const clientInvoices = invoices.filter((i) => quotes.some((q) => q.id === i.quoteId));
  const timeEntries = await db.timeEntries.where("clientId").equals(clientId).toArray();
  const scheduleEvents = await db.scheduleEvents.where("clientId").equals(clientId).toArray();

  const data = {
    exportedAt: new Date().toISOString(),
    purpose: "RODO — eksport danych klienta",
    client,
    quotes,
    invoices: clientInvoices,
    timeEntries,
    scheduleEvents,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Usuwa wszystkie dane klienta kaskadowo (RODO — prawo do usunięcia).
 */
export async function deleteClientData(clientId: number): Promise<{ deleted: number }> {
  let deleted = 0;

  await db.transaction("rw",
    [db.clients, db.quotes, db.invoices, db.timeEntries, db.scheduleEvents],
    async () => {
      // Usuń klienta
      await db.clients.delete(clientId);
      deleted += 1;

      // Usuń wyceny klienta
      const clientQuotes = await db.quotes.where("clientId").equals(clientId).toArray();
      const quoteIds = clientQuotes.map((q) => q.id!);
      await db.quotes.where("clientId").equals(clientId).delete();
      deleted += clientQuotes.length;

      // Usuń faktury powiązane z wycenami klienta
      if (quoteIds.length > 0) {
        const allInvoices = await db.invoices.toArray();
        const clientInvoiceIds = allInvoices.filter((i) => i.quoteId && quoteIds.includes(i.quoteId)).map((i) => i.id!);
        for (const iid of clientInvoiceIds) {
          await db.invoices.delete(iid);
          deleted += 1;
        }
      }

      // Usuń wpisy czasu
      const timeCount = await db.timeEntries.where("clientId").equals(clientId).delete();
      deleted += timeCount;

      // Usuń wydarzenia
      const eventCount = await db.scheduleEvents.where("clientId").equals(clientId).delete();
      deleted += eventCount;
    }
  );

  return { deleted };
}
