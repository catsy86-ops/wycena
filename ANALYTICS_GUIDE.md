# 📚 Przewodnik Użytkownika - Zaawansowane Analizy

## 🎯 Szybki Start

### 1. Przejdź do Raporty
```
Sidebar → Raporty i analityka
```

### 2. Wybierz Zakładkę
- **Przegląd** - Ogólne statystyki
- **Rentowność** - Analiza zysku per wycena
- **Usługi** ⭐ - Rentowność per usługa
- **Okresy** - Porównanie MoM/YoY
- **Czas** ⭐ - Dokładność szacunków
- **Klienci** ⭐ - Segmentacja klientów
- **Metryki** ⭐ - CAC, LTV, Churn
- **Cashflow** - Aging report
- **Alerty** ⭐ - Dashboard operacyjny
- **Cele** - KPI Targets
- **Prognoza** - Predykcje
- **Sezonowość** - Heatmap

---

## 📊 Szczegółowy Przewodnik po Każdej Zakładce

### 🔹 Zakładka: USŁUGI

**Co to jest?**
Analiza rentowności każdej usługi/produktu, którą oferujesz.

**Jak czytać?**
```
Usługa: "Konsultacja IT"
├─ Ilość: 15 (sprzedano 15 razy)
├─ Przychód: 45,000 PLN
├─ Koszt: 15,000 PLN
├─ Zysk: 30,000 PLN
├─ Marża: 66.7% ✓ Doskonała
└─ Trend: +25% (wzrost vs poprzedni okres)
```

**Rekomendacje:**
- ✓ Marża ≥ 35%: Utrzymaj cenę
- ⚠ Marża 20-35%: Monitoruj koszty
- ⚠ Marża 10-20%: Podnieś cenę o 5-10%
- 🔴 Marża < 10%: Pilnie zmień strategię

**Akcje:**
1. Zidentyfikuj usługi z niską marżą
2. Przeanalizuj przyczyny (koszty vs cena)
3. Podnieś cenę lub zmniejsz koszty
4. Monitoruj trend w następnych miesiącach

---

### 🔹 Zakładka: KLIENCI

**Co to jest?**
Segmentacja klientów na grupy i prognoza ryzyka utraty.

**Segmenty:**

#### VIP (Fioletowy)
- Przychód > 50,000 PLN
- Najcenniejsi klienci
- **Akcja:** Oferuj specjalne warunki, dedykowana obsługa

#### Regular (Niebieski)
- Stabilni klienci
- Średni przychód
- **Akcja:** Utrzymuj kontakt, monitoruj zaangażowanie

#### At-Risk (Pomarańczowy)
- Brak kontaktu > 90 dni
- Churn Risk > 50%
- **Akcja:** Skontaktuj się, zaproponuj nową usługę

#### Churned (Czerwony)
- Klienci którzy nie wrócili
- **Akcja:** Analiza przyczyn, próba powrotu

**Jak czytać tabelę?**
```
Klient: "ABC Sp. z o.o."
├─ Segment: VIP
├─ Przychód: 120,000 PLN
├─ Wyceny: 8
├─ Trend: +15% (wzrost)
├─ Dni od ostatniego kontaktu: 12
└─ Churn Risk: 5% (niski)
```

**Metryka: Churn Risk**
- 0-20%: Bezpieczny
- 20-50%: Monitoruj
- 50-80%: At-Risk
- 80-100%: Krytyczny

**Akcje:**
1. Przejrzyj VIP klientów — zaplanuj spotkanie
2. Sprawdź At-Risk — wyślij wiadomość
3. Analizuj Churned — dowiedz się dlaczego odeszli
4. Identyfikuj Rosnących — zaproponuj upsell

---

### 🔹 Zakładka: METRYKI

**Co to jest?**
Zaawansowane metryki biznesowe do oceny zdrowia biznesu.

#### CAC (Customer Acquisition Cost)
**Definicja:** Średni koszt pozyskania jednego nowego klienta

**Jak obliczane:**
```
CAC = Koszty sprzedaży / Liczba nowych klientów
```

**Interpretacja:**
- Niższy CAC = lepiej
- Porównaj z LTV (powinno być LTV > 3 × CAC)

**Przykład:**
```
CAC = 500 PLN
Oznacza: Każdy nowy klient kosztuje Cię 500 PLN
```

#### LTV (Lifetime Value)
**Definicja:** Średnia wartość klienta w całym cyklu

**Jak obliczane:**
```
LTV = Średni przychód per klient × Okres (annualizowany)
```

**Interpretacja:**
- Wyższy LTV = lepiej
- Wskazuje na potencjał długoterminowy

**Przykład:**
```
LTV = 5,000 PLN
Oznacza: Średni klient przynosi 5,000 PLN przychodu
```

#### LTV/CAC Ratio
**Definicja:** Stosunek wartości klienta do kosztu pozyskania

**Benchmark:**
- ✓ > 3: Zdrowy model biznesu
- ⚠ 1.5-3: Poniżej normy
- 🔴 < 1.5: Model niezrównoważony

**Przykład:**
```
LTV/CAC = 5,000 / 500 = 10x
Oznacza: Każdy wydany złoty na pozyskanie zwraca 10 złotych
```

#### Churn Rate
**Definicja:** % klientów którzy nie wrócili

**Benchmark:**
- ✓ < 5%: Doskonały
- ⚠ 5-10%: Akceptowalny
- 🔴 > 10%: Krytyczny

**Akcja:**
- Wysoki churn? Przeanalizuj przyczyny
- Skontaktuj się z odchodzącymi klientami
- Popraw jakość usług

#### Retention Rate
**Definicja:** % klientów utrzymanych

**Benchmark:**
- ✓ > 95%: Doskonały
- ⚠ 80-95%: Akceptowalny
- 🔴 < 80%: Krytyczny

---

### 🔹 Zakładka: CZAS

**Co to jest?**
Analiza dokładności szacunków czasu i produktywności.

**Metryki:**

#### Dokładność Szacunków
```
Szacunki: 100 godzin
Rzeczywisty: 110 godzin
Dokładność: 91% (blisko!)
```

#### Produktywność Score (0-100)
- 90-100: Doskonała ✓
- 75-90: Dobra
- 60-75: Średnia
- < 60: Niska

**Interpretacja:**
- Score = jak blisko szacunków
- Wyższy = lepsze planowanie

#### Przekroczenia vs Niedoestymacja
```
Przekroczenia: +15% (prace trwały dłużej)
Niedoestymacja: -5% (prace były szybsze)
```

**Akcje:**
1. Przeanalizuj projekty z największymi odchyleniami
2. Identyfikuj przyczyny (niedoświadczenie, złożoność)
3. Popraw szacunki dla przyszłych projektów
4. Monitoruj trend dokładności

---

### 🔹 Zakładka: ALERTY

**Co to jest?**
Dashboard operacyjny z alertami wymagającymi działania.

**Typy Alertów:**

#### 🔴 Krytyczne (Priority 8-10)
- Faktury przeterminowane > 30 dni
- Projekty z marżą < 10%
- Klienci At-Risk

**Akcja:** Rozwiąż natychmiast

#### 🟡 Ostrzeżenia (Priority 6-7)
- Wyceny oczekujące > 14 dni
- Faktury przeterminowane 1-30 dni

**Akcja:** Rozwiąż w ciągu kilku dni

#### 🔵 Informacyjne (Priority 3-4)
- Brak szacunków czasu
- Wyceny bez czasu pracy

**Akcja:** Rozważ w przyszłości

**Jak działać:**
1. Przejrzyj alerty od góry (najwyższy priorytet)
2. Kliknij "Wyślij przypomnienie" lub "Przejrzyj"
3. Rozwiąż problem
4. Alert zniknie automatycznie

---

## 🎯 Scenariusze Użycia

### Scenariusz 1: Optymalizacja Cen

**Problem:** Marża na usługach jest niska

**Rozwiązanie:**
1. Przejdź do Raporty → Usługi
2. Zidentyfikuj usługi z marżą < 20%
3. Przeczytaj rekomendacje
4. Podnieś cenę o 5-10%
5. Monitoruj wpływ na sprzedaż

### Scenariusz 2: Zarządzanie Relacjami

**Problem:** Tracisz klientów

**Rozwiązanie:**
1. Przejdź do Raporty → Klienci
2. Przejrzyj At-Risk klientów
3. Skontaktuj się z nimi
4. Zaproponuj nową usługę
5. Monitoruj Churn Rate

### Scenariusz 3: Planowanie Zasobów

**Problem:** Szacunki czasu są niedokładne

**Rozwiązanie:**
1. Przejdź do Raporty → Czas
2. Sprawdź Produktywność Score
3. Przeanalizuj projekty z największymi odchyleniami
4. Popraw szacunki
5. Monitoruj trend

### Scenariusz 4: Zarządzanie Kryzysem

**Problem:** Wiele alertów krytycznych

**Rozwiązanie:**
1. Przejdź do Raporty → Alerty
2. Sortuj po priorytecie (najwyższy na górze)
3. Rozwiąż krytyczne problemy
4. Zaplanuj działania na ostrzeżenia
5. Monitoruj dashboard codziennie

---

## 📈 Rekomendacje Działań

### Codziennie:
- [ ] Przejrzyj Alerty (5 min)
- [ ] Sprawdź Wyceny Oczekujące

### Tygodniowo:
- [ ] Analiza Rentowności per Usługa
- [ ] Przegląd Klientów At-Risk
- [ ] Sprawdzenie Dokładności Szacunków

### Miesięcznie:
- [ ] Pełna Analiza Metryki (CAC, LTV, Churn)
- [ ] Przegląd Segmentacji Klientów
- [ ] Planowanie Strategii Cenowej
- [ ] Eksport Raportów

### Kwartalnie:
- [ ] Przegląd Trendów
- [ ] Benchmarking vs Cele
- [ ] Planowanie Działań Naprawczych

---

## 💡 Wskazówki i Triki

### Tip 1: Filtrowanie Okresu
```
Górny prawy róg → Wybierz okres
- 6 miesięcy: Szybkie trendy
- 12 miesięcy: Pełny obraz
- 24 miesiące: Długoterminowe trendy
```

### Tip 2: Eksport Raportów
```
Górny prawy róg → PDF lub XLSX
- PDF: Do wysyłania klientom
- XLSX: Do dalszej analizy w Excelu
```

### Tip 3: Porównanie Okresów
```
Raporty → Porównanie
- Porównaj ten miesiąc vs poprzedni
- Porównaj ten rok vs rok temu
```

### Tip 4: Ustawianie Celów
```
Raporty → Cele
- Ustaw cele dla zespołu
- Monitoruj postęp
- Motywuj zespół
```

---

## ❓ FAQ

**P: Jak często aktualizują się dane?**
O: W real-time. Dane aktualizują się natychmiast po dodaniu nowej wyceny/faktury.

**P: Czy mogę zmienić okres analizy?**
O: Tak, w górnym prawym rogu wybierz 6/12/24 miesiące.

**P: Jak obliczany jest CAC?**
O: CAC = Koszty czasu sprzedaży / Liczba nowych klientów w okresie.

**P: Co oznacza Churn Risk?**
O: Procent szansy że klient nie wróci. Wysoki = brak kontaktu > 90 dni.

**P: Czy mogę eksportować raporty?**
O: Tak, PDF i XLSX. Kliknij przycisk w górnym prawym rogu.

**P: Jak poprawić Produktywność Score?**
O: Dodaj szacunki czasu do wpisów i pracuj nad dokładnością.

---

## 🚀 Następne Kroki

1. **Przejrzyj Alerty** - Rozwiąż problemy
2. **Przeanalizuj Usługi** - Optymalizuj ceny
3. **Sprawdź Klientów** - Zarządzaj relacjami
4. **Monitoruj Metryki** - Śledź zdrowość biznesu
5. **Planuj Działania** - Wdrażaj ulepszenia

---

**Potrzebujesz pomocy?** Skontaktuj się z zespołem wsparcia.
**Ostatnia aktualizacja:** Maj 2026
