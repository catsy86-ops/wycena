# Czas Pracy - 5 Zaawansowanych Funkcji

## Podsumowanie
Moduł Czas Pracy został rozszerzony o 5 zaawansowanych funkcji, które znacznie zwiększają produktywność i analitykę.

---

## 1. ⏸️ Pauza Timera (Timer Pause/Resume)

### Funkcjonalność
- **Wstrzymanie timera** - Przycisk "Pauza" wstrzymuje licznik bez zatrzymywania
- **Wznowienie timera** - Przycisk "Wznów" kontynuuje liczenie
- **Dokładny czas** - Czas wstrzymania nie jest liczony do całkowitego czasu
- **Skrót klawiszowy** - `Ctrl+P` (lub `Cmd+P` na Mac)

### Implementacja
- Dodano pole `pausedAt` w `activeTimer`
- Dodano pole `totalPausedMs` do śledzenia całkowitego czasu wstrzymania
- Metody: `pauseTimer()`, `resumeTimer()`
- Obliczanie czasu: `totalMs = endTime - startTime - totalPausedMs`

### UI
- Przycisk zmienia się między "Pauza" i "Wznów" w zależności od stanu
- Ikony: `Pause` (wstrzymany), `PlayIcon` (wznowiony)
- Wyświetlane obok przycisków "Szablon" i "Stop"

### Przypadek użycia
- Przerwy na kawę/lunch bez zatrzymywania timera
- Przerwanie pracy na spotkanie
- Dokładne śledzenie czasu pracy

---

## 2. 💾 Szybkie Szablony z Timera (Save Timer as Template)

### Funkcjonalność
- **Przycisk "Szablon"** - Zapisz bieżący timer jako szablon
- **Automatyczne dane** - Nazwa, klient, stawka, szacunkowy czas
- **Jedno kliknięcie** - Szybkie zapisanie bez dialogu
- **Licznik użyć** - Szablon automatycznie dodawany do listy

### Implementacja
- Nowa metoda: `handleSaveTimerAsTemplate()`
- Pobiera dane z aktywnego timera
- Szacunkowy czas = `elapsed / 60` (w minutach)
- Automatycznie dodaje do `timeTemplates`

### UI
- Przycisk "Szablon" z ikoną `Save`
- Wyświetlany obok przycisków "Pauza" i "Stop"
- Toast: "Szablon zapisany"

### Workflow
1. Uruchom timer
2. Pracuj przez jakiś czas
3. Kliknij "Szablon"
4. Szablon pojawia się w sekcji "Szablony czasu"
5. Następnym razem możesz szybko uruchomić ten sam timer

### Przypadek użycia
- Powtarzające się prace (montaż, naprawa, itp.)
- Szybkie tworzenie szablonów bez ręcznego wpisywania
- Zwiększenie użycia szablonów

---

## 3. 📊 Szacunkowy vs Rzeczywisty Czas (Estimated vs Actual)

### Funkcjonalność
- **Kolumna "Szacunek"** - Wyświetla szacunkowy czas z szablonu
- **Porównanie** - Pokazuje różnicę między szacunkiem a rzeczywistością
- **Kolor wskaźnika** - Zielony (szybciej), Czerwony (wolniej)
- **Różnica w minutach** - Dokładna liczba minut różnicy

### Implementacja
- Dodano pole `estimatedMinutes` w `TimeEntry`
- Porównanie: `durationMinutes - estimatedMinutes`
- Kolor: `text-green-600` (szybciej), `text-red-600` (wolniej)
- Wyświetlanie: `+/-Xmin`

### UI
- Nowa kolumna w tabeli między "Czas" a "Koszt"
- Wyświetla szacunek i różnicę
- Jeśli brak szablonu: "-"

### Dane
```
Szacunek: 60 min
Rzeczywisty: 75 min
Wyświetlenie: 60 min (szacunek)
             +15 min (różnica)
```

### Przypadek użycia
- Analiza dokładności szacunków
- Poprawa planowania przyszłych prac
- Identyfikacja prac, które zawsze trwają dłużej
- Wyceny bardziej dokładne

---

## 4. ⌨️ Skróty Klawiszowe (Keyboard Shortcuts)

### Dostępne Skróty

| Skrót | Akcja | Opis |
|-------|-------|------|
| `Ctrl+T` / `Cmd+T` | Start Timer | Uruchomia timer (jeśli wypełniony klient i opis) |
| `Ctrl+S` / `Cmd+S` | Stop Timer | Zatrzymuje aktywny timer |
| `Ctrl+P` / `Cmd+P` | Pause/Resume | Wstrzymuje/wznawia timer |

### Implementacja
- Event listeners: `keydown`, `keyup`
- Ref: `keyboardRef` do śledzenia stanu klawiszy
- Walidacja: Sprawdzenie czy timer jest aktywny
- Toast: Potwierdzenie akcji z wyświetleniem skrótu

### UI
- Brak widocznych wskaźników na ekranie
- Toast pokazuje skrót: "Timer uruchomiony (Ctrl+T)"
- Działa globalnie na całej stronie

### Przypadek użycia
- Szybkie uruchomienie/zatrzymanie timera
- Zwiększenie produktywności
- Minimalna interakcja z myszką

---

## 5. 📈 Raport Tygodniowy/Miesięczny (Weekly/Monthly Reports)

### Nowa Zakładka: "Raporty"

#### Raport Tygodniowy
- **Godziny** - Łączne godziny w tym tygodniu
- **Zarobek** - Łączny zarobek w tym tygodniu
- **Średnia/h** - Efektywna stawka godzinowa
- **Wpisy** - Liczba wpisów
- **Rozkład kategorii** - Godziny i zarobki per kategoria

#### Raport Miesięczny
- **Godziny** - Łączne godziny w tym miesiącu
- **Zarobek** - Łączny zarobek w tym miesiącu
- **Średnia/h** - Efektywna stawka godzinowa
- **Wpisy** - Liczba wpisów
- **Prognoza** - Szacunkowy zarobek na koniec miesiąca

#### Szczegółowy Rozkład Tygodnia
- **Per dzień** - Godziny i zarobki dla każdego dnia tygodnia
- **Nazwa dnia** - Poniedziałek, Wtorek, itp.
- **Data** - dd.MM.yyyy
- **Sortowanie** - Od poniedziałku do niedzieli

### Implementacja
- Nowa zakładka w `Tabs`
- Filtrowanie: `isThisWeek()`, `isThisMonth()`
- Prognoza: `(zarobek / dni_minęło) * dni_w_miesiącu`
- UseMemo: Optymalizacja obliczeń

### UI
- Karty z danymi (grid 2x2)
- Kolory: `bg-accent/50`, `text-primary`
- Rozkład kategorii: Lista z godzinami i zarobkami
- Szczegółowy rozkład: Tabela per dzień

### Dane Wyświetlane

**Raport Tygodniowy:**
```
Godziny: 40h
Zarobek: 4,800 zł
Średnia/h: 120 zł
Wpisy: 15

Rozkład kategorii:
- Robocizna: 35h (4,200 zł)
- Dojazd: 4h (480 zł)
- Inne: 1h (120 zł)
```

**Raport Miesięczny:**
```
Godziny: 160h
Zarobek: 19,200 zł
Średnia/h: 120 zł
Wpisy: 60

Prognoza na koniec miesiąca:
24,000 zł (dni: 18/31)
```

### Przypadek użycia
- Analiza wydajności tygodniowej
- Prognoza zarobków na koniec miesiąca
- Porównanie tygodni/miesięcy
- Raportowanie dla klientów
- Planowanie budżetu

---

## 🎯 Szybkie Filtry (Quick Filters)

### Funkcjonalność
- **Przyciski szybkiego filtrowania** - Nad tabelą wpisów
- **Opcje**: Wszystkie, Dzisiaj, Ten tydzień, Ten miesiąc
- **Aktywny przycisk** - Wyróżniony (variant="default")
- **Kombinacja z innymi filtrami** - Działa z wyszukiwaniem i kategorią

### Implementacja
- Nowe pole: `dateFilter` w store
- Metoda: `setDateFilter()`
- Filtrowanie: `isToday()`, `isThisWeek()`, `isThisMonth()`
- Kombinacja: `matchesSearch && matchesCategory && matchesDate`

### UI
- Przyciski w CardHeader
- Rozmiar: `size="sm"`
- Warianty: `default` (aktywny), `outline` (nieaktywny)
- Wyświetlane nad tabelą

### Przypadek użycia
- Szybkie przełączanie między okresami
- Analiza dzisiejszych wpisów
- Przegląd tygodniowy
- Raportowanie miesięczne

---

## 📋 Zmiany w Strukturze

### Store (`src/store/time-store.ts`)
```typescript
interface TimeState {
  dateFilter: "all" | "today" | "week" | "month";
  activeTimer: {
    ...
    pausedAt?: Date;
    totalPausedMs: number;
  };
  setDateFilter: (f: "all" | "today" | "week" | "month") => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
}
```

### Typy (`src/types/index.ts`)
```typescript
interface TimeEntry {
  ...
  estimatedMinutes?: number;
}
```

### Komponenty
- Nowe ikony: `Pause`, `PlayIcon`, `Save`
- Nowe przyciski: Pauza, Wznów, Szablon
- Nowa zakładka: Raporty

---

## 🎨 UI/UX Zmiany

### Timer Display
- Dodane przyciski: Pauza/Wznów, Szablon
- Lepszy layout z flex-wrap
- Wyraźne wskaźniki stanu

### Tabela Wpisów
- Nowa kolumna: Szacunek
- Szybkie filtry: Przyciski nad tabelą
- Lepsze porównanie czasów

### Nowa Zakładka
- "Raporty" - Pełna analityka tygodniowa/miesięczna
- Karty z danymi
- Szczegółowy rozkład

---

## ⌨️ Skróty Klawiszowe - Podsumowanie

```
Ctrl+T / Cmd+T  →  Uruchom timer
Ctrl+S / Cmd+S  →  Zatrzymaj timer
Ctrl+P / Cmd+P  →  Pauza/Wznów timer
```

---

## 🚀 Testowanie

Wszystkie funkcje zostały zbudowane i skompilowane bez błędów.

**Build status: ✅ SUCCESS**

---

## 📊 Podsumowanie Funkcji

| # | Funkcja | Priorytet | Wpływ | Status |
|---|---------|-----------|-------|--------|
| 1 | Pauza Timera | Wysoki | UX | ✅ |
| 2 | Szablony z Timera | Wysoki | Produktywność | ✅ |
| 3 | Szacunek vs Rzeczywisty | Średni | Analityka | ✅ |
| 4 | Skróty Klawiszowe | Wysoki | Produktywność | ✅ |
| 5 | Raporty Tygodniowe/Miesięczne | Wysoki | Analityka | ✅ |

---

## 🎯 Następne Kroki (Opcjonalne)

- Eksport raportów do PDF
- Powiadomienia o osiągnięciu celu tygodniowego
- Analiza trendów (porównanie tygodni)
- Integracja z systemem fakturowania
- Eksport do Google Sheets
