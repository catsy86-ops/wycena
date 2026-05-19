/**
 * Prosty system internacjonalizacji (i18n).
 * Przygotowany pod rozszerzenie o kolejne języki.
 */

export type Locale = "pl" | "en" | "uk";

export const LOCALE_LABELS: Record<Locale, string> = {
  pl: "Polski",
  en: "English",
  uk: "Українська",
};

// Typ klucza tłumaczenia
type TranslationKeys = keyof typeof translations.pl;

const translations = {
  pl: {
    // Nawigacja
    "nav.dashboard": "Pulpit",
    "nav.quotes": "Wyceny",
    "nav.clients": "Klienci",
    "nav.services": "Usługi",
    "nav.materials": "Materiały",
    "nav.templates": "Szablony",
    "nav.schedule": "Harmonogram",
    "nav.time": "Czas pracy",
    "nav.invoices": "Faktury",
    "nav.reports": "Raporty",
    "nav.settings": "Ustawienia",

    // Ogólne
    "common.save": "Zapisz",
    "common.cancel": "Anuluj",
    "common.delete": "Usuń",
    "common.edit": "Edytuj",
    "common.add": "Dodaj",
    "common.search": "Szukaj",
    "common.export": "Eksportuj",
    "common.import": "Importuj",
    "common.loading": "Ładowanie...",
    "common.noData": "Brak danych",
    "common.confirm": "Potwierdź",
    "common.back": "Wróć",
    "common.next": "Dalej",
    "common.previous": "Poprzednia",
    "common.close": "Zamknij",
    "common.duplicate": "Duplikuj",
    "common.print": "Drukuj",

    // Wyceny
    "quote.new": "Nowa wycena",
    "quote.edit": "Edytuj wycenę",
    "quote.number": "Numer wyceny",
    "quote.client": "Klient",
    "quote.items": "Pozycje",
    "quote.additionalCosts": "Koszty dodatkowe",
    "quote.discount": "Rabat",
    "quote.notes": "Uwagi",
    "quote.validUntil": "Ważna do",
    "quote.totalNetto": "Suma netto",
    "quote.totalVat": "Suma VAT",
    "quote.totalBrutto": "Do zapłaty",
    "quote.status.draft": "Szkic",
    "quote.status.sent": "Wysłana",
    "quote.status.accepted": "Zaakceptowana",
    "quote.status.rejected": "Odrzucona",
    "quote.expired": "Wycena wygasła",
    "quote.convertToInvoice": "Utwórz fakturę",

    // Klienci
    "client.name": "Nazwa / Imię i nazwisko",
    "client.phone": "Telefon",
    "client.email": "Email",
    "client.address": "Adres",
    "client.nip": "NIP",
    "client.deleteData": "Usuń dane klienta (RODO)",
    "client.exportData": "Eksportuj dane klienta",

    // Raporty
    "reports.title": "Raporty i analityka",
    "reports.revenue": "Przychód",
    "reports.conversion": "Konwersja",
    "reports.avgValue": "Średnia wartość",
    "reports.topServices": "Top usługi",
    "reports.topClients": "Top klienci",
    "reports.compare": "Porównaj wyceny",
    "reports.exportXlsx": "Eksport XLSX",

    // Ustawienia
    "settings.backup": "Kopia zapasowa",
    "settings.backupExport": "Eksportuj kopię zapasową",
    "settings.backupImport": "Importuj kopię zapasową",
    "settings.encryption": "Szyfrowanie danych",
    "settings.language": "Język",
    "settings.auditLog": "Dziennik zmian",
  },

  en: {
    "nav.dashboard": "Dashboard",
    "nav.quotes": "Quotes",
    "nav.clients": "Clients",
    "nav.services": "Services",
    "nav.materials": "Materials",
    "nav.templates": "Templates",
    "nav.schedule": "Schedule",
    "nav.time": "Time tracking",
    "nav.invoices": "Invoices",
    "nav.reports": "Reports",
    "nav.settings": "Settings",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.export": "Export",
    "common.import": "Import",
    "common.loading": "Loading...",
    "common.noData": "No data",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.close": "Close",
    "common.duplicate": "Duplicate",
    "common.print": "Print",

    "quote.new": "New quote",
    "quote.edit": "Edit quote",
    "quote.number": "Quote number",
    "quote.client": "Client",
    "quote.items": "Items",
    "quote.additionalCosts": "Additional costs",
    "quote.discount": "Discount",
    "quote.notes": "Notes",
    "quote.validUntil": "Valid until",
    "quote.totalNetto": "Total net",
    "quote.totalVat": "Total VAT",
    "quote.totalBrutto": "Total due",
    "quote.status.draft": "Draft",
    "quote.status.sent": "Sent",
    "quote.status.accepted": "Accepted",
    "quote.status.rejected": "Rejected",
    "quote.expired": "Quote expired",
    "quote.convertToInvoice": "Create invoice",

    "client.name": "Name",
    "client.phone": "Phone",
    "client.email": "Email",
    "client.address": "Address",
    "client.nip": "Tax ID",
    "client.deleteData": "Delete client data (GDPR)",
    "client.exportData": "Export client data",

    "reports.title": "Reports & Analytics",
    "reports.revenue": "Revenue",
    "reports.conversion": "Conversion",
    "reports.avgValue": "Average value",
    "reports.topServices": "Top services",
    "reports.topClients": "Top clients",
    "reports.compare": "Compare quotes",
    "reports.exportXlsx": "Export XLSX",

    "settings.backup": "Backup",
    "settings.backupExport": "Export backup",
    "settings.backupImport": "Import backup",
    "settings.encryption": "Data encryption",
    "settings.language": "Language",
    "settings.auditLog": "Audit log",
  },

  uk: {
    "nav.dashboard": "Панель",
    "nav.quotes": "Кошториси",
    "nav.clients": "Клієнти",
    "nav.services": "Послуги",
    "nav.materials": "Матеріали",
    "nav.templates": "Шаблони",
    "nav.schedule": "Розклад",
    "nav.time": "Облік часу",
    "nav.invoices": "Рахунки",
    "nav.reports": "Звіти",
    "nav.settings": "Налаштування",

    "common.save": "Зберегти",
    "common.cancel": "Скасувати",
    "common.delete": "Видалити",
    "common.edit": "Редагувати",
    "common.add": "Додати",
    "common.search": "Пошук",
    "common.export": "Експорт",
    "common.import": "Імпорт",
    "common.loading": "Завантаження...",
    "common.noData": "Немає даних",
    "common.confirm": "Підтвердити",
    "common.back": "Назад",
    "common.next": "Далі",
    "common.previous": "Попередня",
    "common.close": "Закрити",
    "common.duplicate": "Дублювати",
    "common.print": "Друк",

    "quote.new": "Новий кошторис",
    "quote.edit": "Редагувати кошторис",
    "quote.number": "Номер кошторису",
    "quote.client": "Клієнт",
    "quote.items": "Позиції",
    "quote.additionalCosts": "Додаткові витрати",
    "quote.discount": "Знижка",
    "quote.notes": "Примітки",
    "quote.validUntil": "Дійсний до",
    "quote.totalNetto": "Всього нетто",
    "quote.totalVat": "Всього ПДВ",
    "quote.totalBrutto": "До сплати",
    "quote.status.draft": "Чернетка",
    "quote.status.sent": "Відправлено",
    "quote.status.accepted": "Прийнято",
    "quote.status.rejected": "Відхилено",
    "quote.expired": "Кошторис прострочений",
    "quote.convertToInvoice": "Створити рахунок",

    "client.name": "Ім'я / Назва",
    "client.phone": "Телефон",
    "client.email": "Email",
    "client.address": "Адреса",
    "client.nip": "ІПН",
    "client.deleteData": "Видалити дані клієнта (GDPR)",
    "client.exportData": "Експорт даних клієнта",

    "reports.title": "Звіти та аналітика",
    "reports.revenue": "Дохід",
    "reports.conversion": "Конверсія",
    "reports.avgValue": "Середня вартість",
    "reports.topServices": "Топ послуги",
    "reports.topClients": "Топ клієнти",
    "reports.compare": "Порівняти кошториси",
    "reports.exportXlsx": "Експорт XLSX",

    "settings.backup": "Резервна копія",
    "settings.backupExport": "Експорт копії",
    "settings.backupImport": "Імпорт копії",
    "settings.encryption": "Шифрування даних",
    "settings.language": "Мова",
    "settings.auditLog": "Журнал змін",
  },
} as const;

// Aktualny język (domyślnie z localStorage lub pl)
let currentLocale: Locale = "pl";

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("gksystem_locale") as Locale | null;
    if (saved && saved in translations) {
      currentLocale = saved;
    }
  }
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("gksystem_locale", locale);
  }
}

/**
 * Tłumaczy klucz na aktualny język.
 */
export function t(key: TranslationKeys): string {
  const locale = getLocale();
  return translations[locale]?.[key] ?? translations.pl[key] ?? key;
}

/**
 * Hook-friendly — zwraca funkcję t() z aktualnym locale.
 */
export function useTranslations() {
  const locale = getLocale();
  return {
    t: (key: TranslationKeys) => translations[locale]?.[key] ?? translations.pl[key] ?? key,
    locale,
    setLocale,
  };
}
