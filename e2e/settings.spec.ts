import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ustawienia');
  });

  test('should display settings page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Ustawienia/i })).toBeVisible();
    await expect(page.getByText('Dane firmy i konfiguracja aplikacji')).toBeVisible();
  });

  test('should display company settings section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Dane firmy/i })).toBeVisible();
    await expect(page.getByText('Informacje sprzedawcy wyświetlane na wycenach i w PDF')).toBeVisible();
  });

  test('should display bank settings section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Dane bankowe/i })).toBeVisible();
    await expect(page.getByText('Informacje o koncie bankowym do płatności')).toBeVisible();
  });

  test('should display default quote settings section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Domyślne ustawienia wyceny/i })).toBeVisible();
    await expect(page.getByText('Domyślne wartości dla nowych wycen')).toBeVisible();
  });

  test('should fill and save company settings', async ({ page }) => {
    await page.getByLabel('Nazwa firmy').fill('Testowa Firma Sp. z o.o.');
    await page.getByLabel('Adres').fill('ul. Biznesowa 10, 00-001 Warszawa');
    await page.getByLabel('Telefon').fill('+48 222 333 444');
    await page.getByLabel('Email').fill('firma@test.pl');
    await page.getByLabel('NIP').fill('111-222-33-44');
    
    await page.getByRole('button', { name: /Zapisz ustawienia/i }).click();
    
    await expect(page.getByText('Ustawienia zapisane')).toBeVisible();
  });

  test('should fill and save bank settings', async ({ page }) => {
    await page.getByLabel('Nazwa banku').fill('Bank Testowy S.A.');
    await page.getByLabel('Numer konta bankowego').fill('PL 12 3456 7890 1234 5678 9012 3456');
    
    await page.getByRole('button', { name: /Zapisz ustawienia/i }).click();
    
    await expect(page.getByText('Ustawienia zapisane')).toBeVisible();
  });

  test('should set default VAT rate', async ({ page }) => {
    await page.getByLabel('Domyślna stawka VAT').click();
    await page.getByRole('option', { name: '23%' }).click();
    
    await page.getByRole('button', { name: /Zapisz ustawienia/i }).click();
    await expect(page.getByText('Ustawienia zapisane')).toBeVisible();
  });

  test('should set default validity days', async ({ page }) => {
    await page.getByLabel('Ważność wyceny (dni)').fill('14');
    
    await page.getByRole('button', { name: /Zapisz ustawienia/i }).click();
    await expect(page.getByText('Ustawienia zapisane')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Clear all fields
    await page.getByLabel('Nazwa firmy').fill('');
    await page.getByLabel('Adres').fill('');
    await page.getByLabel('Telefon').fill('');
    
    await page.getByRole('button', { name: /Zapisz ustawienia/i }).click();
    
    // Should show validation errors
    await expect(page.getByText('Ustawienia zapisane')).not.toBeVisible();
  });
});
