# 🔌 Nowe Funkcje Elektryczne - Przewodnik Użytkownika

## 📋 Spis Treści

1. [Przegląd Funkcji](#przegląd-funkcji)
2. [Protokoły Pomiarowe](#protokoły-pomiarowe)
3. [Normy Elektryczne](#normy-elektryczne)
4. [Szablony Protokołów](#szablony-protokołów)
5. [Generowanie PDF](#generowanie-pdf)
6. [Integracja z Wycenami](#integracja-z-wycenami)
7. [FAQ](#faq)

---

## Przegląd Funkcji

### ✨ Co Nowego?

Dział elektryczny został rozszerzony o zaawansowane narzędzia do zarządzania protokołami pomiarowymi:

| Funkcja | Opis | Dostęp |
|---------|------|--------|
| **Protokoły Pomiarowe** | Tworzenie i zarządzanie protokołami pomiarów elektrycznych | `/elektryka/protokoly` |
| **Normy SEP** | Baza 10+ głównych norm elektrycznych | Wbudowana w aplikację |
| **Szablony** | 4 gotowe szablony protokołów | Formularz protokołu |
| **PDF** | Generowanie profesjonalnych PDF | Przycisk "Pobierz PDF" |
| **Walidacja** | Automatyczna walidacja pomiarów | Formularz protokołu |

---

## Protokoły Pomiarowe

### Dostęp

1. Przejdź do **Dział Elektryczny** → **Protokoły**
2. Lub kliknij przycisk **Protokoły** na stronie głównej elektryki

### Tworzenie Nowego Protokołu

#### Metoda 1: Ręczne Tworzenie

```
1. Kliknij "Nowy protokół"
2. Wypełnij dane ogólne:
   - Typ instalacji (nowa/modernizacja/naprawa/przegląd)
   - Data
   - Lokalizacja
   - Dane klienta
   - Dane elektryka
3. Dodaj pomiary ręcznie
4. Zapisz protokół
```

#### Metoda 2: Użycie Szablonu

```
1. Kliknij "Nowy protokół"
2. Przejdź do zakładki "Szablony"
3. Wybierz odpowiedni szablon:
   - Nowa instalacja
   - Modernizacja
   - Przegląd okresowy
   - Naprawa
4. Kliknij "Załaduj"
5. Uzupełnij dane i pomiary
6. Zapisz
```

### Struktura Protokołu

```
PROTOKÓŁ POMIAROWY
├── Informacje Ogólne
│   ├── Typ instalacji
│   ├── Data
│   ├── Lokalizacja
│   ├── Dane klienta
│   └── Dane elektryka
├── Pomiary
│   ├── Napięcie zasilające
│   ├── Rezystancja izolacji
│   ├── Ciągłość przewodów
│   ├── Rezystancja uziemienia
│   ├── Test RCD
│   └── Test wyłącznika
├── Normy
│   └── Automatycznie przypisane
├── Uwagi
└── Podpisy
```

### Typy Pomiarów

| Typ | Jednostka | Norma | Kryteria |
|-----|-----------|-------|----------|
| **Napięcie** | V | PN-EN 50160 | 207–253 V (1-faz) |
| **Prąd** | A | PN-HD 60364 | Zależy od obwodu |
| **Rezystancja** | Ω | PN-HD 60364-5-52 | Zależy od typu |
| **Ciągłość** | Ω | PN-HD 60364-6-61 | < 0.1 Ω |
| **Uziemienie** | Ω | PN-HD 60364-5-54 | < 10 Ω |
| **Izolacja** | MΩ | PN-HD 60364-6-61 | > 1 MΩ |
| **RCD** | mA | PN-EN 61008-1 | < 30 mA |
| **Wyłącznik** | - | PN-EN 60898-1 | Prawidłowe działanie |

### Walidacja Pomiarów

Aplikacja automatycznie sprawdza:

✓ Wszystkie wymagane pola są wypełnione
✓ Wartości pomiarów są w normie
✓ Dane klienta i elektryka są kompletne
✓ Pomiary mają przypisane normy

**Ostrzeżenia**:
- ⚠ Wartości bliskie granicom normy
- ⚠ Brakujące dane opcjonalne

**Błędy**:
- ✗ Wartości poza normą
- ✗ Brakujące dane obowiązkowe

---

## Normy Elektryczne

### Dostępne Normy

#### 1. PN-HD 60364 - Instalacje elektryczne niskiego napięcia
- **Główna norma** dla instalacji elektrycznych
- Obejmuje wszystkie aspekty bezpieczeństwa
- Obowiązkowa dla wszystkich instalacji

#### 2. PN-HD 60364-5-52 - Dobór przewodów
- Obciążalność prądowa
- Spadek napięcia (max 3% oświetlenie, max 5% siła)
- Metody montażu

#### 3. PN-EN 60898-1 - Wyłączniki automatyczne
- Charakterystyki: B, C, D
- Prądy znamionowe: 6–63 A
- Zdolność wyłączająca

#### 4. PN-EN 61008-1 - Wyłączniki RCD
- Prąd różnicowoprądowy: 30 mA
- Czas wyzwalania: < 300 ms
- Ochrona przed porażeniem

#### 5. PN-EN 61009-1 - Wyłączniki RCBO
- Kombinacja RCD + wyłącznik automatyczny
- Ochrona przed porażeniem i przetężeniami

#### 6. PN-EN 60950-1 - Bezpieczeństwo urządzeń
- Ochrona przed porażeniem
- Ochrona przed przegrzaniem
- Ochrona przed pożarem

#### 7. PN-EN 61557 - Urządzenia pomiarowe
- Dokładność pomiarów
- Procedury pomiarowe
- Kalibracja

#### 8. PN-EN 50160 - Charakterystyka napięcia
- Napięcie: 230V ±10% (1-faz), 400V ±10% (3-faz)
- Częstotliwość: 50 Hz ±0,5%
- Odkształcenia harmoniczne

#### 9. PN-EN 60364-4-41 - Ochrona przed porażeniem
- Ochrona bezpośrednia
- Ochrona pośrednia
- Uziemienie i zerowanie

#### 10. PN-EN 60364-4-43 - Ochrona przed przetężeniami
- Dobór bezpieczników
- Dobór wyłączników
- Selektywność

### Powiązane Normy

Każda norma zawiera listę norm powiązanych:

```
PN-HD 60364
├── PN-HD 60364-5-52 (Przewody)
├── PN-EN 60898-1 (Wyłączniki)
├── PN-EN 61008-1 (RCD)
└── PN-EN 60364-4-41 (Ochrona)
```

---

## Szablony Protokołów

### 1. Nowa Instalacja

**Zastosowanie**: Nowe instalacje elektryczne

**Zawiera pomiary**:
- Napięcie zasilające
- Rezystancja izolacji
- Ciągłość przewodów ochronnych
- Rezystancja uziemienia
- Test RCD
- Test wyłącznika automatycznego

**Normy**: PN-HD 60364, PN-HD 60364-6-61, PN-EN 61008-1

### 2. Modernizacja

**Zastosowanie**: Modernizacja istniejącej instalacji

**Zawiera pomiary**:
- Napięcie zasilające
- Rezystancja izolacji (zmodernizowane obwody)
- Ciągłość przewodów ochronnych

**Normy**: PN-HD 60364, PN-HD 60364-6-61

### 3. Przegląd Okresowy

**Zastosowanie**: Przeglądy okresowe

**Zawiera pomiary**:
- Napięcie zasilające
- Rezystancja izolacji
- Test RCD

**Normy**: PN-HD 60364, PN-EN 61008-1

### 4. Naprawa

**Zastosowanie**: Naprawa instalacji

**Zawiera pomiary**:
- Napięcie zasilające
- Ciągłość przewodów ochronnych (naprawione obwody)

**Normy**: PN-HD 60364

---

## Generowanie PDF

### Pobieranie Protokołu

```
1. Otwórz protokół
2. Kliknij przycisk "PDF"
3. Plik zostanie pobrany automatycznie
```

### Zawartość PDF

- ✓ Nagłówek z danymi firmy
- ✓ Numer i data protokołu
- ✓ Dane ogólne (lokalizacja, klient, elektryk)
- ✓ Tabela pomiarów
- ✓ Normy zastosowane
- ✓ Uwagi
- ✓ Pola do podpisów
- ✓ Stopka z numeracją stron

### Opcje Generowania

```typescript
downloadProtocolPDF(protocol, {
  companyName: "Elektryk",
  companyAddress: "ul. Główna 10, Warszawa",
  companyPhone: "+48 12 345 67 89",
  companyEmail: "info@elektryk.pl",
  companyTaxId: "123-456-78-90",
  includeSignatures: true,  // Pola do podpisów
  includeNotes: true,       // Uwagi
});
```

### Porównanie Pomiarów

Generowanie PDF z porównaniem pomiarów z wielu protokołów:

```
1. Zaznacz wiele protokołów
2. Kliknij "Porównaj"
3. Pobierz PDF
```

### Raport Protokołów

Generowanie raportu podsumowującego:

```
1. Zaznacz wiele protokołów
2. Kliknij "Raport"
3. Pobierz PDF
```

---

## Integracja z Wycenami

### Dodawanie Protokołu do Wyceny

```
1. Otwórz formularz wyceny elektrycznej
2. Przejdź do zakładki "Pomiary"
3. Kliknij "Dodaj protokół"
4. Wybierz istniejący protokół lub utwórz nowy
5. Pomiary zostaną dodane do wyceny
```

### Generowanie Faktury z Protokołem

```
1. Utwórz wycenę z pomiarami
2. Zaakceptuj wycenę
3. Wygeneruj fakturę
4. Protokół zostanie załączony do faktury
```

### Eksport do Kosztorysu

```
1. Otwórz wycenę
2. Kliknij "Eksport"
3. Wybierz format:
   - NORMA/Zuzia
   - Excel
   - PDF
4. Pobierz plik
```

---

## FAQ

### P: Jak dodać nowy pomiar do protokołu?

**O**: 
1. Otwórz protokół
2. Przejdź do zakładki "Pomiary"
3. Kliknij "Dodaj pomiar"
4. Wypełnij dane pomiaru
5. Kliknij "Gotowe"

### P: Czy mogę edytować istniejący protokół?

**O**: Tak, kliknij ikonę edycji obok protokołu na liście.

### P: Jak sprawdzić czy pomiary są w normie?

**O**: Aplikacja automatycznie sprawdza normy i wyświetla:
- ✓ Zielony - prawidłowy
- ⚠ Żółty - ostrzeżenie
- ✗ Czerwony - błąd

### P: Czy mogę duplikować protokół?

**O**: Tak, kliknij "Duplikuj" w formularzu protokołu.

### P: Jak usunąć protokół?

**O**: Kliknij ikonę kosza obok protokołu na liście.

### P: Czy mogę drukować protokół?

**O**: Tak, pobierz PDF i wydrukuj z przeglądarki.

### P: Jakie normy są obowiązkowe?

**O**: Główna norma to **PN-HD 60364**. Pozostałe normy zależą od typu instalacji.

### P: Czy mogę zmienić dane firmy w PDF?

**O**: Tak, podczas pobierania PDF możesz podać dane firmy.

### P: Jak długo przechowywać protokoły?

**O**: Minimum 10 lat (zgodnie z PN-HD 60364).

### P: Czy mogę eksportować protokoły?

**O**: Tak, jako PDF, Excel lub inne formaty.

---

## Wskazówki i Triki

### 💡 Szybkie Tworzenie Protokołu

1. Użyj szablonu zamiast ręcznego tworzenia
2. Skopiuj dane z poprzedniego protokołu
3. Zmień tylko niezbędne pola

### 💡 Walidacja Pomiarów

1. Sprawdzaj normy podczas pomiaru
2. Zanotuj wartości dokładnie
3. Dodaj uwagi jeśli wartości są bliskie granicom

### 💡 Organizacja Protokołów

1. Używaj spójnych nazw lokalizacji
2. Grupuj protokoły po klientach
3. Archiwizuj stare protokoły

### 💡 Generowanie PDF

1. Zawsze sprawdź dane firmy
2. Dodaj uwagi przed pobraniem
3. Wydrukuj i podpisz oryginał

---

## Kontakt i Wsparcie

Dla pytań dotyczących:
- **Norm elektrycznych**: www.sep.org.pl
- **Procedur pomiarowych**: Dokumentacja PN-HD 60364
- **Aplikacji**: Skontaktuj się z administratorem

---

**Ostatnia aktualizacja**: 2024-12-19
**Wersja**: 1.0
**Status**: ✓ Gotowe do użytku
