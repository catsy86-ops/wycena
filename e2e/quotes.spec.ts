import { test, expect } from '@playwright/test';

test.describe('Quotes Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wyceny');
  });

  test('should display quotes page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Wyceny/i })).toBeVisible();
    await expect(page.getByText('Zarządzaj wycenami i ofertami')).toBeVisible();
  });

  test('should have new quote button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Nowa wycena/i })).toBeVisible();
  });

  test('should navigate to new quote page', async ({ page }) => {
    await page.getByRole('button', { name: /Nowa wycena/i }).click();
    await expect(page).toHaveURL('/wyceny/nowa');
  });

  test('should search for quotes', async ({ page }) => {
    await page.getByPlaceholder('Szukaj wycen...').fill('test');
    // Should not error even if no quotes exist
    await expect(page.getByPlaceholder('Szukaj wycen...')).toHaveValue('test');
  });

  test('should filter by status', async ({ page }) => {
    await page.getByLabel('Wszystkie statusy').click();
    await expect(page.getByRole('option', { name: 'Szkic' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Wysłana' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Zaakceptowana' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Odrzucona' })).toBeVisible();
  });
});

test.describe('New Quote Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wyceny/nowa');
  });

  test('should display new quote form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Nowa wycena/i })).toBeVisible();
    await expect(page.getByText('Dane klienta')).toBeVisible();
    await expect(page.getByText('Pozycje wyceny')).toBeVisible();
  });

  test('should add client information', async ({ page }) => {
    await page.getByLabel('Nazwa klienta').fill('Test Client');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Adres klienta').fill('ul. Testowa 1');
    await page.getByLabel('NIP').fill('123-456-78-90');
    
    await expect(page.getByLabel('Nazwa klienta')).toHaveValue('Test Client');
  });

  test('should add quote item', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj pozycję/i }).click();
    
    // Fill in the first item
    const nameInput = page.getByPlaceholder('Nazwa usługi').first();
    await nameInput.fill('Testowa usługa');
    
    const quantityInput = page.getByLabel('Ilość').first();
    await quantityInput.fill('2');
    
    const priceInput = page.getByLabel('Cena netto').first();
    await priceInput.fill('100');
    
    // Verify calculations are displayed
    await expect(page.getByText('200,00 zł')).toBeVisible();
  });

  test('should remove quote item', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj pozycję/i }).click();
    
    // Should have 2 items now
    const nameInputs = page.getByPlaceholder('Nazwa usługi');
    await expect(nameInputs).toHaveCount(2);
    
    // Remove the second item
    await page.getByRole('button', { name: '', exact: true }).last().click();
    
    await expect(nameInputs).toHaveCount(1);
  });

  test('should display summary with totals', async ({ page }) => {
    await expect(page.getByText('Suma netto:')).toBeVisible();
    await expect(page.getByText('Suma VAT:')).toBeVisible();
    await expect(page.getByText('Suma brutto:')).toBeVisible();
    await expect(page.getByText('Do zapłaty:')).toBeVisible();
  });

  test('should apply global discount', async ({ page }) => {
    await page.getByLabel('Rabat globalny (%)').fill('10');
    await expect(page.getByText('Rabat globalny (10%):')).toBeVisible();
  });

  test('should set validity date', async ({ page }) => {
    await page.getByLabel('Ważna do').fill('2025-12-31');
    await expect(page.getByLabel('Ważna do')).toHaveValue('2025-12-31');
  });

  test('should add notes', async ({ page }) => {
    await page.getByPlaceholder('Dodatkowe informacje do wyceny...').fill('Testowe uwagi');
    await expect(page.getByPlaceholder('Dodatkowe informacje do wyceny...')).toHaveValue('Testowe uwagi');
  });

  test('should save quote as draft', async ({ page }) => {
    // Add a quote item
    await page.getByPlaceholder('Nazwa usługi').fill('Usługa testowa');
    await page.getByLabel('Cena netto').first().fill('100');
    
    await page.getByRole('button', { name: /Zapisz jako szkic/i }).click();
    
    await expect(page.getByText('Wycena zapisana jako szkic')).toBeVisible();
  });

  test('should save and send quote', async ({ page }) => {
    // Add a quote item
    await page.getByPlaceholder('Nazwa usługi').fill('Usługa testowa');
    await page.getByLabel('Cena netto').first().fill('100');
    
    await page.getByRole('button', { name: /Zapisz i wyślij/i }).click();
    
    await expect(page.getByText('Wycena utworzona')).toBeVisible();
  });

  test('should select client from database', async ({ page }) => {
    // First add a client
    await page.goto('/klienci');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Klient z bazy');
    await page.getByLabel('Telefon').fill('+48 111 222 333');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    
    // Go back to new quote
    await page.goto('/wyceny/nowa');
    
    // Try to select client (may not appear if no clients exist)
    await page.getByLabel('Wybierz z bazy (opcjonalnie)').click();
    // The dropdown should be visible even if empty
    await expect(page.getByText('Nowy klient')).toBeVisible();
  });
});

test.describe('Quote Detail Page', () => {
  test('should display quote details after creation', async ({ page }) => {
    // Create a quote first
    await page.goto('/wyceny/nowa');
    await page.getByPlaceholder('Nazwa usługi').fill('Usługa szczegółowa');
    await page.getByLabel('Cena netto').first().fill('150');
    await page.getByLabel('Nazwa klienta').fill('Klient szczegółowy');
    await page.getByRole('button', { name: /Zapisz i wyślij/i }).click();
    
    // Should navigate to quote detail
    await expect(page.getByRole('heading', { name: /WYC/i })).toBeVisible();
    await expect(page.getByText('Klient szczegółowy')).toBeVisible();
    await expect(page.getByText('Usługa szczegółowa')).toBeVisible();
  });
});
