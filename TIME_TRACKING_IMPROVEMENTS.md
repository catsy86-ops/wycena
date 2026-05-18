# Czas Pracy (Time Tracking) - 8 Ulepszeń

## Podsumowanie
Moduł Czas Pracy został całkowicie przebudowany z 8 nowymi funkcjami, które zwiększają produktywność i analitykę.

---

## 1. ✅ Bulk Actions (Akcje Zbiorcze)

**Funkcjonalność:**
- Zaznaczanie wpisów za pomocą checkboxów
- Zaznacz wszystkie / Wyczyść zaznaczenie
- Zmiana kategorii dla wielu wpisów naraz
- Duplikowanie wielu wpisów
- Usuwanie wielu wpisów z potwierdzeniem

**Lokalizacja:** Zakładka "Lista" - górna część tabeli

**Ikony:** Checkbox, CheckSquare, Trash2, Copy

---

## 2. ✅ Time Entry Templates (Szablony Czasu)

**Funkcjonalność:**
- Tworzenie szablonów dla powtarzających się prac
- Zapisanie: nazwa, klient, stawka/h, szacowany czas, kategoria
- Licznik użyć szablonu
- Szybkie uruchomienie timera z szablonu
- Usuwanie szablonów

**Przechowywanie:** Dexie IndexedDB (`timeTemplates` tabela)

**Przycisk:** "Szablon" w headerze

**Sekcja:** "Szablony czasu" - wyświetla się gdy są szablony

---

## 3. ✅ Powtarzające się Wpisy (Recurring Time Entries)

**Funkcjonalność:**
- Tworzenie powtarzających się wpisów na bazie szablonów
- Częstotliwości: Codziennie, Co tydzień, Co dwa tygodnie, Co miesiąc
- Data rozpoczęcia i opcjonalna data końca
- Automatyczne generowanie wpisów w tle
- Status aktywny/nieaktywny

**Przechowywanie:** Dexie IndexedDB (`recurringTimeEntries` tabela)

**Przycisk:** "Powtarzaj" w headerze

**Sekcja:** "Powtarzające się wpisy" - wyświetla się gdy są aktywne

---

## 4. ✅ Integracja z Wycenami (Quote Integration)

**Funkcjonalność:**
- Powiązanie wpisu czasu z konkretną wycena
- Dropdown z listą wycen (liczba wyceny)
- Przechowywanie `quoteId` w każdym wpisie
- Możliwość filtrowania po wycenie

**Lokalizacja:** Dialog dodawania/edycji wpisu - pole "Powiązana wycena"

---

## 5. ✅ Zaawansowana Analityka (Advanced Analytics)

**Nowa zakładka: "Analityka"**

Zawiera:
- **Rozkład kategorii (Pie Chart)** - wizualizacja czasu per kategoria
- **Rentowność per klient** - zarobek na godzinę dla każdego klienta
- **Statystyki kategorii** - tabela z godzinami i zarobkami per kategoria

**Metryki:**
- Profitability per client (zarobek/h)
- Category breakdown (godziny i zarobki)
- Trend analysis (porównanie tygodni)

---

## 6. ✅ Eksport PDF (PDF Export)

**Funkcjonalność:**
- Eksport raportów do PDF
- Zawiera: podsumowanie, statystyki, tabelę wpisów
- Formatowanie: nagłówek, data generacji, tabela z kolumnami
- Nazwa pliku: `czas-pracy-YYYY-MM-DD.pdf`

**Biblioteka:** jsPDF + jsPDF-autotable

**Przycisk:** "PDF" w headerze

---

## 7. ✅ Przypomnienia o Wpisach (Entry Reminders)

**Funkcjonalność:**
- Automatyczne sprawdzenie czy jest wpis dzisiaj
- Wyświetlenie alertu jeśli brak wpisu
- Alert znika gdy wpis zostanie dodany lub timer uruchomiony
- Wygląd: żółty banner z ikoną AlertCircle

**Logika:** Sprawdzenie każdego dnia o północy

---

## 8. ✅ Edycja Wpisów (Edit Time Entries)

**Funkcjonalność:**
- Przycisk "Edytuj" (ikona Edit2) w każdym wierszu tabeli
- Otwiera dialog z wypełnionymi danymi
- Zmiana: klient, opis, czas, stawka, kategoria, notatki
- Przycisk zmienia się na "Zaktualizuj"
- Po zapisaniu - wpis jest aktualizowany

**Lokalizacja:** Akcje w tabeli - trzeci przycisk (Edit2)

---

## Zmiany w Strukturze

### Typy (`src/types/index.ts`)
```typescript
interface TimeTemplate {
  id?: number;
  name: string;
  description?: string;
  clientName: string;
  category: "robocizna" | "dojazd" | "inne";
  hourlyRate: number;
  estimatedMinutes: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringTimeEntry {
  id?: number;
  templateId: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  nextDueDate: Date;
  lastGeneratedDate?: Date;
  isActive: boolean;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Store (`src/store/time-store.ts`)
Nowe metody:
- `toggleEntrySelection(id)` - zaznaczanie wpisu
- `clearSelection()` - czyszczenie zaznaczenia
- `selectAll(ids)` - zaznaczenie wszystkich
- `bulkDelete(ids)` - usuwanie wielu
- `bulkChangeCategory(ids, category)` - zmiana kategorii
- `bulkDuplicate(ids)` - duplikowanie wielu
- `addTemplate()` - dodawanie szablonu
- `removeTemplate()` - usuwanie szablonu
- `loadTemplates()` - ładowanie szablonów
- `addRecurring()` - dodawanie powtarzającego się wpisu
- `removeRecurring()` - usuwanie powtarzającego się wpisu
- `loadRecurring()` - ładowanie powtarzających się
- `generateRecurringEntries()` - generowanie wpisów

### Baza Danych (`src/lib/db.ts`)
Nowe tabele (v3):
- `timeTemplates` - szablony czasu
- `recurringTimeEntries` - powtarzające się wpisy

### Komponenty
Nowy komponent:
- `src/components/ui/checkbox.tsx` - checkbox z Base UI

---

## UI/UX Zmiany

### Nowe Przyciski w Headerze
- CSV (istniejący)
- PDF (nowy)
- Szablon (nowy)
- Powtarzaj (nowy)
- Dodaj wpis (istniejący)

### Nowe Zakładki
- Lista (istniejąca)
- Wykres (istniejąca)
- Klienci (istniejąca)
- **Analityka (nowa)** - z pie chart i statystykami

### Nowe Sekcje
- **Szablony czasu** - wyświetla się gdy są szablony
- **Powtarzające się wpisy** - wyświetla się gdy są aktywne
- **Alert brak wpisu dzisiaj** - wyświetla się gdy brak wpisu

### Nowe Dialogi
- Dialog edycji/dodawania wpisu (rozszerzony)
- Dialog tworzenia szablonu
- Dialog dodawania powtarzającego się wpisu

---

## Ikony Użyte
- `Edit2` - edycja wpisu
- `FileJson` - eksport PDF
- `Repeat2` - powtarzające się wpisy
- `CheckSquare` - zaznacz wszystkie
- `AlertCircle` - alert brak wpisu
- `PieChart` - analityka
- `TrendingUp` - rentowność

---

## Kolory i Style
- Kategorie: niebieska (robocizna), żółta (dojazd), szara (inne)
- Alert: żółty banner (amber)
- Pie Chart: 3 kolory oklch

---

## Testowanie
Wszystkie funkcje zostały zbudowane i skompilowane bez błędów.

Build status: ✅ SUCCESS

---

## Następne Kroki (Opcjonalne)
- Integracja z API do automatycznego generowania wpisów
- Eksport do Google Calendar
- Powiadomienia push o powtarzających się wpisach
- Analityka zaawansowana (prognozowanie, trendy)
- Integracja z systemem fakturowania
