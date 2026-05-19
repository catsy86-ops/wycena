# 📊 Zaawansowane Funkcje Analityczne - GK-System

## ✅ Dodane Funkcje (Maj 2026)

### 1. **Analiza Rentowności per Usługa** 📈
**Lokalizacja:** Raporty → Usługi

**Funkcjonalność:**
- Segmentacja przychodu, kosztów i marż po każdej usłudze
- Porównanie trendu (vs poprzedni okres)
- Automatyczne rekomendacje cenowe:
  - ✓ Marża ≥ 35%: "Utrzymaj cenę — doskonała marża"
  - ⚠ Marża 20-35%: "Dobra rentowność — monitoruj koszty"
  - ⚠ Marża 10-20%: "Rozważ podwyżkę ceny o 5-10%"
  - 🔴 Marża < 10%: "Pilnie: podnieś cenę lub zmniejsz koszty"

**Metryki:**
- Ilość sprzedanych usług
- Przychód brutto
- Szacunkowy koszt
- Zysk netto
- Marża procentowa
- Trend wzrostu/spadku

---

### 2. **Metryki Zaawansowane** 📊
**Lokalizacja:** Raporty → Metryki

**Metryki Biznesowe:**

#### CAC (Customer Acquisition Cost)
- Średni koszt pozyskania jednego nowego klienta
- Obliczany z kosztów czasu sprzedaży
- Niższy = lepiej

#### LTV (Lifetime Value)
- Średnia wartość klienta w całym cyklu
- Annualizowana na podstawie okresu
- Wskazuje na potencjał długoterminowy

#### LTV/CAC Ratio
- Powinno być > 3 (ideał: 5-7)
- Wskazuje na zdrowość modelu biznesu
- Poniżej 3 = model niezrównoważony

#### Churn Rate
- % klientów którzy nie wrócili
- Cel: < 5%
- Wysoki churn = problem z retencją

#### Retention Rate
- % klientów utrzymanych
- Cel: > 95%
- Wskazuje na zadowolenie klientów

#### Repeat Rate
- % klientów powracających
- Wyższy = lepsze relacje

---

### 3. **Raport Czasu Pracy (Rozszerzony)** ⏱️
**Lokalizacja:** Raporty → Czas

**Analiza Dokładności Szacunków:**
- Porównanie szacunków vs rzeczywistego czasu
- Procent przekroczeń (overrun)
- Procent niedoestymacji (underrun)
- Średnia dokładność per wpis
- Produktywność Score (0-100)

**Rekomendacje:**
- Score ≥ 90: "Doskonała dokładność — utrzymaj tempo"
- Score 75-90: "Dobra dokładność — drobne ulepszenia"
- Score 60-75: "Średnia dokładność — pracuj nad szacunkami"
- Score < 60: "Niska dokładność — przeanalizuj przyczyny opóźnień"

**Produktywność:**
- Identyfikacja projektów z największymi opóźnieniami
- Wskazówki do poprawy szacunków
- Tracking trendu dokładności w czasie

---

### 4. **Analiza Klientów (Segmentacja + Churn Prediction)** 👥
**Lokalizacja:** Raporty → Klienci

**Segmentacja Klientów:**

#### VIP
- Przychód > 50,000 PLN
- Priorytet: utrzymaj relację, oferuj specjalne warunki
- Dedykowana obsługa

#### Regular
- Stabilni klienci
- Utrzymuj kontakt, monitoruj zaangażowanie

#### At-Risk
- Brak kontaktu > 90 dni
- Churn Risk > 50%
- Akcja: skontaktuj się, zaproponuj nową usługę

#### Churned
- Klienci którzy nie wrócili
- Analiza przyczyn

**Metryki per Klient:**
- Całkowity przychód
- Liczba wycen
- Średnia wartość wyceny
- Data ostatniej wyceny
- Dni od ostatniego kontaktu
- Częstotliwość (wyceny/rok)
- Trend (% zmiana vs poprzedni okres)
- Churn Risk (0-100%)

**Rekomendacje Automatyczne:**
- VIP: "Priorytet: utrzymaj relację, oferuj specjalne warunki"
- At-Risk: "Pilnie: skontaktuj się, zaproponuj nową usługę"
- Rosnący: "Rosnący klient — rozważ upsell"
- Spadający: "Spadek zainteresowania — zbadaj przyczyny"
- Stabilny: "Stabilny klient — utrzymuj kontakt"

---

### 5. **Dashboard Operacyjny (Alerty i Akcje)** 🚨
**Lokalizacja:** Raporty → Alerty

**Typy Alertów:**

#### 🔴 Krytyczne (Priority 8-10)
- Faktury przeterminowane > 30 dni
- Projekty z marżą < 10%
- Klienci At-Risk

#### 🟡 Ostrzeżenia (Priority 6-7)
- Wyceny oczekujące > 14 dni
- Faktury przeterminowane 1-30 dni
- Brak szacunków czasu

#### 🔵 Informacyjne (Priority 3-4)
- Wyceny bez przypisanego czasu pracy
- Brak szacunków czasu

**Funkcjonalność:**
- Sortowanie po priorytecie
- Bezpośrednie linki do akcji
- Automatyczne generowanie na podstawie danych
- Aktualizacja w real-time

**Akcje Dostępne:**
- "Wyślij przypomnienie" → Link do wyceny/faktury
- "Przejrzyj projekty" → Link do raportu rentowności
- "Przejrzyj klientów" → Link do segmentacji
- "Dodaj czas" → Link do time tracking

---

## 🔧 Implementacja Techniczna

### Nowe Funkcje w `calculations.ts`:

```typescript
// Analiza rentowności per usługa
analyzeServiceProfitability(items, services, previousItems)

// Metryki zaawansowane
calculateAdvancedMetrics(quotes, clients, timeEntries, period)

// Analiza czasu pracy
analyzeTimeAccuracy(timeEntries)

// Segmentacja klientów
analyzeClientSegmentation(quotes, period)

// Dashboard operacyjny
generateOperationalAlerts(quotes, invoices, timeEntries, getTotalPaidForInvoice)
```

### Nowe Taby w Raporty:
1. **Przegląd** - Ogólne statystyki
2. **Rentowność** - Analiza zysku per wycena
3. **Usługi** ⭐ - Rentowność per usługa + rekomendacje
4. **Okresy** - Porównanie MoM/YoY
5. **Czas** ⭐ - Dokładność szacunków + produktywność
6. **Klienci** ⭐ - Segmentacja + churn prediction
7. **Metryki** ⭐ - CAC, LTV, Churn Rate
8. **Cashflow** - Aging report, DSO, Collection rate
9. **Alerty** ⭐ - Dashboard operacyjny
10. **Cele** - KPI Targets
11. **Prognoza** - Linear regression
12. **Sezonowość** - Heatmap

---

## 📈 Przypadki Użycia

### Dla Właściciela Biznesu:
1. **Monitorowanie zdrowia biznesu** → Metryki (CAC, LTV, Churn)
2. **Identyfikacja VIP klientów** → Klienci (Segmentacja)
3. **Optymalizacja cen** → Usługi (Rekomendacje)
4. **Zarządzanie ryzykiem** → Alerty (Dashboard)

### Dla Menedżera Projektów:
1. **Śledzenie rentowności** → Rentowność (per wycena)
2. **Identyfikacja problemów** → Alerty (Wyceny oczekujące)
3. **Planowanie zasobów** → Czas (Dokładność szacunków)

### Dla Zespołu Sprzedaży:
1. **Identyfikacja szans** → Klienci (Rosnący, Upsell)
2. **Zarządzanie relacjami** → Klienci (At-Risk, VIP)
3. **Follow-up** → Alerty (Wyceny oczekujące)

---

## 🎯 Rekomendacje Działań

### Natychmiast:
- [ ] Przejrzyj Alerty — rozwiąż krytyczne problemy
- [ ] Sprawdź Klientów At-Risk — skontaktuj się
- [ ] Przeanalizuj Usługi z marżą < 10% — podnieś ceny

### Tygodniowo:
- [ ] Monitoruj Metryki (CAC, LTV, Churn)
- [ ] Sprawdzaj Dokładność Szacunków
- [ ] Przegląd Rentowności per Wycena

### Miesięcznie:
- [ ] Analiza Segmentacji Klientów
- [ ] Przegląd Trendów per Usługa
- [ ] Planowanie Strategii Cenowej

---

## 📊 Benchmarki Branżowe

| Metryka | Cel | Krytyczne |
|---------|-----|-----------|
| LTV/CAC Ratio | > 3 | < 1.5 |
| Churn Rate | < 5% | > 15% |
| Retention Rate | > 95% | < 80% |
| Marża Brutto | > 30% | < 10% |
| Dokładność Szacunków | > 90% | < 60% |

---

## 🚀 Przyszłe Rozszerzenia

- [ ] Eksport raportów do Google Sheets
- [ ] Webhook do Slack/Teams (cotygodniowy raport)
- [ ] Scheduled email reports
- [ ] API endpoint dla raportów
- [ ] Prognozowanie churn z ML
- [ ] Rekomendacje cenowe z AI
- [ ] Integracja z systemami księgowości
- [ ] Porównanie z benchmarkami branżowymi

---

**Ostatnia aktualizacja:** Maj 2026
**Wersja:** 2.0
**Status:** ✅ Produkcja
