/**
 * Audit log — rejestruje operacje na danych.
 * Przechowywany w localStorage (lekki, nie wymaga dodatkowej tabeli w Dexie).
 * W przyszłości można przenieść do IndexedDB lub zewnętrznego serwera.
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: "create" | "update" | "delete" | "status_change" | "export" | "import" | "login";
  entity: "quote" | "client" | "invoice" | "material" | "service" | "template" | "settings" | "backup";
  entityId?: number | string;
  entityName?: string;
  details?: string;
  user?: string;
}

const STORAGE_KEY = "gksystem_audit_log";
const MAX_ENTRIES = 500;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/**
 * Dodaje wpis do audit logu.
 */
export function logAudit(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  try {
    const entries = getAuditLog();
    const newEntry: AuditEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    // Ogranicz do MAX_ENTRIES
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage może być pełny — ignoruj
  }
}

/**
 * Pobiera cały audit log.
 */
export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

/**
 * Czyści audit log.
 */
export function clearAuditLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Eksportuje audit log do JSON.
 */
export function exportAuditLog(): string {
  return JSON.stringify(getAuditLog(), null, 2);
}
