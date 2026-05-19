# Przewodnik Norm Elektrycznych i Protokołów Pomiarowych

## 📋 Spis Treści

1. [Normy SEP](#normy-sep)
2. [Protokoły Pomiarowe](#protokoły-pomiarowe)
3. [Szablony Protokołów](#szablony-protokołów)
4. [Procedury Pomiarowe](#procedury-pomiarowe)
5. [Generowanie PDF](#generowanie-pdf)

---

## Normy SEP

### Główne Normy Instalacji Elektrycznych

#### PN-HD 60364 - Instalacje elektryczne niskiego napięcia
- **Rok**: 2016
- **Zakres**: Główna norma dla instalacji elektrycznych w budynkach
- **Zastosowanie**: Instalacje mieszkalne, użyteczności publicznej, przemysłowe
- **Wymagania**:
  - Ochrona przed porażeniem prądem
  - Ochrona przed przegrzaniem
  - Ochrona przed przetężeniami
  - Uziemienie i zerowanie
  - Selektywność zabezpieczeń

#### PN-HD 60364-5-52 - Dobór i montaż urządzeń elektrycznych - Przewody
- **Rok**: 2016
- **Zakres**: Dobór przekrojów przewodów
- **Wymagania**:
  - Obciążalność prądowa przewodów
  - Spadek napięcia (max 3% dla oświetlenia, max 5% dla siły)
  - Ochrona przed przegrzaniem
  - Metody montażu
  - Warunki otoczenia

#### PN-EN 60898-1 - Wyłączniki automatyczne
- **Rok**: 2016
- **Zakres**: Wyłączniki automatyczne do ochrony instalacji
- **Charakterystyki**:
  - **B**: 3–5×In (oświetlenie, gniazda, obwody rezystancyjne)
  - **C**: 5–10×In (silniki, transformatory, obwody indukcyjne)
  - **D**: 10–20×In (duże silniki, spawarki)

#### PN-EN 61008-1 - Wyłączniki różnicowoprądowe (RCD)
- **Rok**: 2012
- **Zakres**: Wyłączniki RCD do ochrony przed porażeniem
- **Wymagania**:
  - Prąd różnicowoprądowy znamionowy: 30 mA (ochrona osobista)
  - Czas wyzwalania: < 300 ms
  - Selektywność

#### PN-EN 61009-1 - Wyłączniki RCBO
- **Rok**: 2012
- **Zakres**: Wyłączniki z wbudowaną ochroną
- **Zastosowanie**: Ochrona przed porażeniem i przetężeniami

#### PN-EN 60950-1 - Bezpieczeństwo urządzeń elektrycznych
- **Rok**: 2005
- **Zakres**: Bezpieczeństwo urządzeń elektrycznych
- **Wymagania**:
  - Ochrona przed porażeniem
  - Ochrona przed przegrzaniem
  - Ochrona przed pożarem
  - Ochrona mechaniczna

#### PN-EN 61557 - Urządzenia pomiarowe
- **Rok**: 2007
- **Zakres**: Urządzenia do badania i pomiaru
- **Wymagania**:
  - Dokładność pomiarów
  - Bezpieczeństwo operatora
  - Kalibracja
  - Procedury pomiarowe

#### PN-EN 50160 - Charakterystyka napięcia zasilającego
- **Rok**: 2010
- **Zakres**: Jakość napięcia w sieciach publicznych
- **Parametry**:
  - Częstotliwość: 50 Hz ±0,5%
  - Napięcie: 230V ±10% (1-faz), 400V ±10% (3-faz)
  - Odkształcenia harmoniczne
  - Fluktuacje napięcia

---

## Protokoły Pomiarowe

### Typy Protokołów

#### 1. Protokół Nowej Instalacji
**Zastosowanie**: Nowe instalacje elektryczne

**Pomiary obowiązkowe**:
- Napięcie zasilające (PN-EN 50160)
- Ciągłość przewodów ochronnych (< 0,1 Ω)
- Rezystancja izolacji (> 1 MΩ)
- Rezystancja uziemienia (< 10 Ω)
- Test wyłącznika RCD (< 30 mA)
- Test wyłącznika automatycznego

**Normy**: PN-HD 60364, PN-HD 60364-6-61, PN-EN 61008-1

#### 2. Protokół Modernizacji
**Zastosowanie**: Modernizacja istniejącej instalacji

**Pomiary obowiązkowe**:
- Napięcie zasilające
- Rezystancja izolacji (zmodernizowane obwody)
- Ciągłość przewodów ochronnych
- Test RCD (jeśli zainstalowany)

**Normy**: PN-HD 60364, PN-HD 60364-6-61

#### 3. Protokół Przeglądu Okresowego
**Zastosowanie**: Przeglądy okresowe instalacji

**Częstotliwość**:
- Instalacje mieszkalne: co 10 lat
- Instalacje użyteczności publicznej: co 5 lat
- Instalacje przemysłowe: co 3 lata

**Pomiary obowiązkowe**:
- Napięcie zasilające
- Rezystancja izolacji
- Test RCD
- Wizualna kontrola stanu

**Normy**: PN-HD 60364, PN-EN 61008-1

#### 4. Protokół Naprawy
**Zastosowanie**: Naprawa instalacji

**Pomiary obowiązkowe**:
- Napięcie zasilające
- Ciągłość przewodów ochronnych (naprawione obwody)
- Rezystancja izolacji (naprawione obwody)

**Normy**: PN-HD 60364

---

## Szablony Protokołów

### Szablon: Nowa Instalacja

```
PROTOKÓŁ POMIAROWY - NOWA INSTALACJA
Numer: PROTO/2024/12/0001
Data: 15.12.2024

INFORMACJE OGÓLNE
- Lokalizacja: ul. Główna 10, Warszawa
- Klient: Jan Kowalski
- Elektryk: Piotr Nowak
- Licencja: SEP/2024/12345

WYNIKI POMIARÓW
┌─────────────────────────────────────────────────────────────┐
│ Pomiar                  │ Wartość    │ Norma      │ Status  │
├─────────────────────────────────────────────────────────────┤
│ Napięcie zasilające     │ 230.5 V    │ 230±10%    │ ✓ OK    │
│ Rezystancja izolacji    │ 2.5 MΩ     │ > 1 MΩ     │ ✓ OK    │
│ Ciągłość przewodów      │ 0.05 Ω     │ < 0.1 Ω    │ ✓ OK    │
│ Rezystancja uziemienia  │ 5.2 Ω      │ < 10 Ω     │ ✓ OK    │
│ Test RCD                │ 25 mA      │ < 30 mA    │ ✓ OK    │
│ Test wyłącznika         │ Prawidłowy │ -          │ ✓ OK    │
└─────────────────────────────────────────────────────────────┘

NORMY ZASTOSOWANE
- PN-HD 60364 - Instalacje elektryczne niskiego napięcia
- PN-HD 60364-6-61 - Badania i pomiary
- PN-EN 61008-1 - Wyłączniki RCD
- PN-EN 60898-1 - Wyłączniki automatyczne

UWAGI
Instalacja przebiegła prawidłowo. Wszystkie pomiary w normie.

PODPISY
Elektryk: _________________ Data: _________
Klient:   _________________ Data: _________
```

---

## Procedury Pomiarowe

### 1. Pomiar Napięcia Zasilającego

**Norma**: PN-EN 50160

**Procedura**:
1. Ustawić multimetr na pomiar napięcia AC
2. Zmierzyć napięcie między fazą a neutralnym (230V)
3. Zmierzyć napięcie między fazami (400V dla 3-faz)
4. Zanotować wartości

**Kryteria akceptacji**:
- 1-faz: 207–253 V (230V ±10%)
- 3-faz: 346–440 V (400V ±10%)

### 2. Pomiar Rezystancji Izolacji

**Norma**: PN-HD 60364-6-61

**Procedura**:
1. Wyłączyć zasilanie
2. Ustawić megaohmmierz na 500V DC
3. Zmierzyć rezystancję między fazą a neutralnym
4. Zmierzyć rezystancję między fazą a uziemieniem
5. Zanotować wartości

**Kryteria akceptacji**:
- Nowa instalacja: > 1 MΩ
- Istniejąca instalacja: > 0.5 MΩ

### 3. Pomiar Ciągłości Przewodów Ochronnych

**Norma**: PN-HD 60364-6-61

**Procedura**:
1. Wyłączyć zasilanie
2. Ustawić multimetr na pomiar rezystancji (Ω)
3. Zmierzyć rezystancję przewodu ochronnego
4. Zanotować wartość

**Kryteria akceptacji**:
- < 0.1 Ω dla przewodów miedzianych
- < 0.2 Ω dla przewodów aluminiowych

### 4. Pomiar Rezystancji Uziemienia

**Norma**: PN-HD 60364-5-54

**Procedura**:
1. Użyć miernika rezystancji uziemienia
2. Umieścić sondy pomiarowe w ziemi
3. Zanotować wartość rezystancji

**Kryteria akceptacji**:
- < 10 Ω (ogólnie)
- < 5 Ω (dla instalacji z RCD)
- < 1 Ω (dla piorunochronu)

### 5. Test Wyłącznika RCD

**Norma**: PN-EN 61008-1

**Procedura**:
1. Nacisnąć przycisk TEST na wyłączniku RCD
2. Wyłącznik powinien się wyłączyć
3. Nacisnąć przycisk ON aby włączyć
4. Zanotować wynik

**Kryteria akceptacji**:
- Wyłącznik musi się wyłączyć w ciągu 300 ms
- Prąd testowy: 30 mA (dla RCD 30 mA)

### 6. Test Wyłącznika Automatycznego

**Norma**: PN-EN 60898-1

**Procedura**:
1. Włączyć wyłącznik
2. Zaobserwować prawidłowe działanie
3. Wyłączyć ręcznie
4. Zanotować wynik

**Kryteria akceptacji**:
- Wyłącznik musi się włączać i wyłączać płynnie
- Brak oznak uszkodzenia

---

## Generowanie PDF

### Funkcje Dostępne

#### 1. Generowanie Pojedynczego Protokołu

```typescript
import { generateProtocolPDF, downloadProtocolPDF } from "@/lib/protocol-pdf";
import { MeasurementProtocol } from "@/lib/electrical-protocols";

const protocol: MeasurementProtocol = {
  // ... dane protokołu
};

// Pobranie PDF
downloadProtocolPDF(protocol, {
  companyName: "Elektryk",
  companyAddress: "ul. Główna 10, Warszawa",
  companyPhone: "+48 12 345 67 89",
  companyEmail: "info@elektryk.pl",
  companyTaxId: "123-456-78-90",
  includeSignatures: true,
  includeNotes: true,
});
```

#### 2. Generowanie Porównania Pomiarów

```typescript
import { generateComparisonPDF } from "@/lib/protocol-pdf";

const protocols: MeasurementProtocol[] = [
  // ... lista protokołów
];

const doc = generateComparisonPDF(protocols);
doc.save("porownanie-pomiarow.pdf");
```

#### 3. Generowanie Raportu

```typescript
import { generateProtocolReportPDF } from "@/lib/protocol-pdf";

const protocols: MeasurementProtocol[] = [
  // ... lista protokołów
];

const doc = generateProtocolReportPDF(protocols);
doc.save("raport-protokolow.pdf");
```

---

## Integracja z Wycenami

### Dodawanie Protokołu do Wyceny

```typescript
// W formularzu wyceny elektrycznej
const handleAddProtocol = (protocol: MeasurementProtocol) => {
  // Dodaj pomiary z protokołu do wyceny
  const items = protocol.measurements.map((m) => ({
    name: `Pomiar: ${m.description}`,
    quantity: 1,
    unit: "szt",
    priceNettoPerUnit: 0, // Pomiary są bezpłatne
    vatRate: 0,
  }));

  // Dodaj do wyceny
  addItemsToQuote(items);
};
```

### Generowanie Faktury z Protokołem

```typescript
// Załączenie protokołu do faktury
const handleGenerateInvoice = (quote: Quote, protocol: MeasurementProtocol) => {
  // Utwórz fakturę
  const invoice = createInvoice(quote);

  // Załącz protokół
  invoice.attachments = [
    {
      type: "protocol",
      protocolId: protocol.id,
      fileName: `Protokol_${protocol.number}.pdf`,
    },
  ];

  return invoice;
};
```

---

## Checklist Elektryka

### Przed Pomiarem
- [ ] Sprawdzić urządzenia pomiarowe (kalibracja)
- [ ] Przygotować formularz protokołu
- [ ] Zapoznać się z planem instalacji
- [ ] Sprawdzić bezpieczeństwo (wyłączniki, uziemienie)

### Podczas Pomiaru
- [ ] Zmierzyć napięcie zasilające
- [ ] Zmierzyć rezystancję izolacji
- [ ] Zmierzyć ciągłość przewodów ochronnych
- [ ] Zmierzyć rezystancję uziemienia
- [ ] Przetestować wyłączniki RCD
- [ ] Przetestować wyłączniki automatyczne
- [ ] Zanotować wszystkie wartości
- [ ] Dodać uwagi i obserwacje

### Po Pomiarze
- [ ] Sprawdzić kompletność danych
- [ ] Porównać z normami
- [ ] Wygenerować PDF
- [ ] Podpisać protokół
- [ ] Dostarczyć kopię klientowi
- [ ] Archiwizować oryginał

---

## Kontakt i Wsparcie

Dla pytań dotyczących norm elektrycznych:
- **SEP** (Stowarzyszenie Elektryków Polskich): www.sep.org.pl
- **PKN** (Polski Komitet Normalizacyjny): www.pkn.pl
- **PZWN** (Polska Zjednoczona Norma): www.pzwn.pl

---

**Ostatnia aktualizacja**: 2024-12-19
**Wersja**: 1.0
