# Raport Audytu Systemu GK SYSTEM & Plan Ulepszeń (Roadmapa)

> **Data audytu:** 2026-09-09  
> **Aplikacja:** GK SYSTEM (Wycenka / Kosztorysy / Pomiary i Protokoły)  
> **Stos technologiczny:** Next.js 16.2 (Turbopack, App Router), React 19, TypeScript, Tailwind CSS, Zustand v5, Dexie (IndexedDB), PWA  
> **Status:** Wersja produkcyjna z działającymi modułami branżowymi (Elektryka, Hydraulika, Wyceny, Faktury, Klienci, Harmonogram)

---

## 1. Streszczenie i Kluczowe Wnioski

GK SYSTEM to zaawansowany system dla firm instalacyjnych i wykonawców budowlanych. Wyróżnia się wbudowaną bazą wiedzy inżynieryjnej, generowaniem profesjonalnych dokumentów PDF dla inwestora oraz pełnym wsparciem trybu offline na budowie (PWA + Dexie IndexedDB).

Podczas audytu przeprowadzonego przez wyspecjalizowanych agentów zidentyfikowano kluczowe kierunki rozwoju w 4 obszarach:
1. **Inżynieria i kalkulatory wykonawcze** (uzupełnienie brakujących modułów i norm PN/EN).
2. **Ergonomia pracy montera w terenie (Mobile-First)** (podpisy cyfrowe, wprowadzanie pomiarów).
3. **Wyceny i integracja z hurtowniami** (rozdzielenie robocizny od materiału, eksport XLSX, koszyki zakupowe).
4. **Architektura kodu i stabilność** (refaktoryzacja widoków monolitycznych, optymalizacja PWA).

---

## 2. Diagnoza Modułów Branżowych i Luki Funkcjonalne

### 2.1. Moduł Hydrauliczny (`/hydraulika`)
* **Stan obecny:** Szybki kalkulator punktów wod-kan, pętle podłogówki PEX, nowy inżynieryjny kalkulator OZC i pomp ciepła (PN-EN 12831 / WT 2021) oraz protokoły prób ciśnieniowych (PN-EN 806-4).
* **Zalecane ulepszenia:**
  1. **Dobór naczyń wzbiorczych i zładu (PN-EN 12828):** Obliczanie pojemności użytkowej i nominalnej naczynia przeponowego $V_n$ na podstawie zładu instalacji (grzejniki, podłogówka, bufor) i ciśnień zaworów bezpieczeństwa (2.5 / 3.0 bar).
  2. **Protokół wygrzewania jastrychu (PN-EN 1264-4):** Wymóg gwarancyjny przed układaniem posadzek. Generowanie harmonogramu 21-dniowego podnoszenia i opuszczania temperatury zasilania z podpisami kierownika budowy.
  3. **Podział podłogówki na pokoje + nastawy rotametrów:** Automatyczny podział na pętle z uwzględnieniem stref brzegowych (10 cm przy oknach) i obliczanie przepływów $l/min$ dla rozdzielacza.
  4. **Protokół głównej próby szczelności instalacji gazowej (PN-EN 1775):** Formularz badania manometrem U-rurkowym.

### 2.2. Moduł Elektryczny (`/elektryka`)
* **Stan obecny:** Dobór przekroju kabli (spadek napięcia, obciążalność), konfigurator rozdzielnic, protokoły pomiarów okresowych i odbiorczych (RCD, rezystancja izolacji, pętla zwarcia).
* **Zalecane ulepszenia:**
  1. **Automatyczna walidacja Samoczynnego Wyłączenia Zasilania (SWZ wg PN-HD 60364-4-41):** Zamiast manualnego zaznaczania „pozytywny/negatywny”, system powinien automatycznie weryfikować warunek:
     $$Z_s \le \frac{U_0}{I_a}$$
     dla bezpieczników B/C/D (np. B16 $\to I_a = 80\text{A}, Z_{s,max} = 2.87\,\Omega$; C16 $\to I_a = 160\text{A}, Z_{s,max} = 1.44\,\Omega$).
  2. **Kalkulator rezystancji uziemienia (PN-HD 60364-5-54):** Obliczanie uziomów pionowych (szpilkowych) i otokowych w zależności od rezystywności gruntu ($\rho$ w $\Omega\cdot m$) z dążeniem do $R_A \le 10\,\Omega$.
  3. **Metrologia w protokołach SEP:** Dedykowane pola dla miernika (typ, nr fabryczny, nr świadectwa wzorcowania i data ważności kalibracji) z automatycznym ostrzeżeniem o przeterminowaniu.

### 2.3. Moduł Klimatyzacji i Wentylacji HVAC (`/klimatyzacja`) — **Nowy Moduł**
* **Stan obecny:** Brak dedykowanej trasy i kalkulatorów HVAC.
* **Zalecane udrożnienie:**
  1. **Kalkulator doboru klimatyzacji (Split / Multi-Split):** Bilans zysków ciepła (kubatura, okna, ekspozycja płd/zach, zyski od ludzi i sprzętu).
  2. **Kalkulator dopełnienia czynnikiem F-Gaz (R32 / R410A):**
     * Odcinki ponadstandardowe (powyżej 5-7.5 m) z dopełnieniem w $g/m$.
     * Przelicznik na **ekwiwalent $t\text{ }CO_2\text{eq}$** z automatyczną informacją o obowiązku rejestracji w Centralnym Rejestrze Operatorów (CRO).
  3. **Protokoły F-Gaz:** Protokół próby ciśnieniowej azotem OFN (40-42 bar) oraz protokół próżniowania układu ($< 270\text{ Pa} / 500\text{ mikronów}$).

---

## 3. Ergonomia Pracy w Terenie i Dokumentacja (PDF & Excel)

1. **Podpis cyfrowy odręczny na telefonie (E-Podpis):**
   * Dodanie komponentu `SignaturePad` bezpośrednio w protokołach odbiorczych (podpis instalatora z numerem uprawnień oraz podpis klienta/inwestora) i osadzanie wektorowe w wygenerowanym PDF.
2. **Eksport do Excela (`.xlsx`):**
   * Wykorzystanie obecnej już biblioteki `xlsx` do wieloarkuszowych eksportów:
     * *Arkusz 1: Kosztorys inwestorski (dla klienta)*
     * *Arkusz 2: Zestawienie materiałowe BOM (dla hurtowni z kodami i ilościami)*
     * *Arkusz 3: Zapotrzebowanie roboczogodzin montażu*
3. **Znak wodny i metadane na zdjęciach z budowy:**
   * Nakładanie na zdjęcia w galerii daty, godziny i numeru protokołu (kluczowe przy odbiorach ciśnieniowych i zakrywaniu rur w bruzdach).

---

## 4. Architektura i Jakość Kodu

1. **Dekompozycja dużych plików:**
   * `src/app/elektryka/page.tsx` (76 kB) oraz `src/app/hydraulika/page.tsx` (58 kB) warto podzielić na mniejsze komponenty w dedykowanych folderach `src/components/hydraulika/` oraz `src/components/elektryka/`.
2. **Walidacja stawek VAT w budownictwie:**
   * Zgodnie z art. 41 ust. 12 ustawy o VAT: automatyczna weryfikacja limitów powierzchni dla stawki 8% (mieszkania do 150 m², domy do 300 m²; powyżej – proporcjonalny podział na 8% i 23%).
3. **KSeF (Krajowy System e-Faktur):**
   * Przygotowanie modułu faktur do eksportu schematu XML FA(2) / FA(3).

---

## 5. Macierz Priorytetów Wdrożeniowych

| Priorytet | Zadanie | Moduł | Szacowany czas |
| :--- | :--- | :--- | :--- |
| **P1** | Podpisy cyfrowe (E-Podpis na ekranie) w protokołach PDF | Hydraulika / Elektryka | 1-2 godz. |
| **P1** | Kalkulator naczyń wzbiorczych i zładu (PN-EN 12828) | Hydraulika | 1 godz. |
| **P1** | Eksport kosztorysów i zestawień materiałowych do Excel (.xlsx) | Wyceny / Materiały | 1-2 godz. |
| **P2** | Nowy moduł `/klimatyzacja` (bilans kW, dopełnienie R32, F-Gaz) | HVAC | 2-3 godz. |
| **P2** | Auto-walidacja SWZ pętli zwarcia ($Z_s$) wg PN-HD 60364-4-41 | Elektryka | 1 godz. |
| **P2** | Protokół wygrzewania posadzki (PN-EN 1264-4) | Hydraulika | 1 godz. |
| **P3** | Refaktoryzacja widoków monolitycznych na podkomponenty | Architektura | 2 godz. |
| **P3** | Przygotowanie eksportu do KSeF XML FA(2) | Faktury | 2 godz. |

---

*Raport sporządzony automatycznie w ramach sesji udoskonalania GK SYSTEM.*
