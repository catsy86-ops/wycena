import { test, expect } from '@playwright/test';

test.describe('Invoices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faktury');
  });

  test('should display invoices page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Faktury/i })).toBeVisible();
    await expect(page.getByText('Fakturowanie i śledzenie płatności')).toBeVisible();
  });

  test('should have new invoice button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Nowa faktura/i })).toBeVisible();
  });

  test('should open new invoice dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Nowa faktura/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowa faktura z wyceny/i })).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.getByLabel('Wszystkie statusy').click();
    await expect(page.getByRole('option', { name: 'Nieopłacona' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Częściowo opłacona' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Opłacona' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Anulowana' })).toBeVisible();
  });

  test('should search for invoices', async ({ page }) => {
    await page.getByPlaceholder('Szukaj faktur...').fill('test');
    await expect(page.getByPlaceholder('Szukaj faktur...')).toHaveValue('test');
  });

  test('should create invoice from accepted quote', async ({ page }) => {
    // First create an accepted quote
    await page.goto('/wyceny/nowa');
    await page.getByPlaceholder('Nazwa usługi').fill('Usługa do faktury');
    await page.getByLabel('Cena netto').first().fill('500');
    await page.getByLabel('Nazwa klienta').fill('Klient do faktury');
    await page.getByRole('button', { name: /Zapisz jako szkic/i }).click();
    await page.waitForURL(/\/wyceny\/\d+/);
    
    // Change status to accepted
    await page.getByLabel('Szkic').click();
    await page.getByRole('option', { name: 'Zaakceptowana' }).click();
    await expect(page.getByText('Status zmieniony na: Zaakceptowana')).toBeVisible();
    
    // Go to invoices and create from quote
    await page.goto('/faktury');
    await page.getByRole('button', { name: /Nowa faktura/i }).click();
    
    await expect(page.getByText('Wybierz wycenę')).toBeVisible();
  });

  test('should add payment to invoice', async ({ page }) => {
    // Create a quote first
    await page.goto('/wyceny/nowa');
    await page.getByPlaceholder('Nazwa usługi').fill('Usługa płatność');
    await page.getByLabel('Cena netto').first().fill('1000');
    await page.getByLabel('Nazwa klienta').fill('Klient płatność');
    await page.getByRole('button', { name: /Zapisz jako szkic/i }).click();
    await page.waitForURL(/\/wyceny\/\d+/);
    
    await page.getByLabel('Szkic').click();
    await page.getByRole('option', { name: 'Zaakceptowana' }).click();
    
    // Create invoice
    await page.goto('/faktury');
    await page.getByRole('button', { name: /Nowa faktura/i }).click();
    await page.getByLabel('Wybierz wycenę').click();
    await page.getByRole('option', { name: /Klient płatność/i }).click();
    await page.getByRole('button', { name: /Utwórz fakturę/i }).click();
    await expect(page.getByText('Faktura utworzona')).toBeVisible();

    // Add payment
    await page.getByText('Klient płatność').hover();
    await page.getByRole('button', { name: '', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: /Dodaj płatność/i })).toBeVisible();
    
    await page.getByLabel('Kwota (PLN)').fill('500');
    await page.getByLabel('Metoda płatności').click();
    await page.getByRole('option', { name: 'Przelew' }).click();
    await page.getByRole('button', { name: /Dodaj płatność/i }).click();
    
    await expect(page.getByText('Płatność dodana')).toBeVisible();
  });
});
