import { test, expect } from '@playwright/test';

test.describe('Schedule Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/harmonogram');
  });

  test('should display schedule page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Harmonogram/i })).toBeVisible();
    await expect(page.getByText('Kalendarz zleceń i wydarzeń')).toBeVisible();
  });

  test('should have add event button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Dodaj wydarzenie/i })).toBeVisible();
  });

  test('should open add event dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowe wydarzenie/i })).toBeVisible();
  });

  test('should add a new event', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    
    await page.getByLabel('Tytuł').fill('Wycena u klienta');
    await page.getByLabel('Klient').fill('Jan Kowalski');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByLabel('Adres').fill('ul. Przykładowa 1');
    
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();
  });

  test('should edit an existing event', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await page.getByLabel('Tytuł').fill('Edytowane wydarzenie');
    await page.getByLabel('Klient').fill('Test Client');
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();

    await page.getByText('Edytowane wydarzenie').click();
    await expect(page.getByRole('heading', { name: /Edytuj wydarzenie/i })).toBeVisible();
    await page.getByLabel('Tytuł').fill('Zmienione wydarzenie');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Zdarzenie zaktualizowane')).toBeVisible();
  });

  test('should delete an event', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await page.getByLabel('Tytuł').fill('Wydarzenie do usunięcia');
    await page.getByLabel('Klient').fill('Test');
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();

    await page.getByText('Wydarzenie do usunięcia').click();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Zdarzenie usunięte')).toBeVisible();
  });

  test('should filter by type', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();
    await page.getByLabel('Tytuł').fill('Wycena testowa');
    await page.getByLabel('Klient').fill('Test');
    await page.getByLabel('Typ').click();
    await page.getByRole('option', { name: 'Wycena' }).click();
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).click();

    await page.getByLabel('Wszystkie typy').click();
    await page.getByRole('option', { name: 'Wycena' }).click();
    await expect(page.getByText('Wycena testowa')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.getByLabel('Wszystkie statusy').click();
    await expect(page.getByRole('option', { name: 'Zaplanowane' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'W trakcie' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Zakończone' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Anulowane' })).toBeVisible();
  });

  test('should display calendar view', async ({ page }) => {
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dziś' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Miesiąc' })).toBeVisible();
  });

  test('should display legend', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Legenda' })).toBeVisible();
    await expect(page.getByText('Wycena')).toBeVisible();
    await expect(page.getByText('Realizacja')).toBeVisible();
    await expect(page.getByText('Przegląd')).toBeVisible();
    await expect(page.getByText('Awaria')).toBeVisible();
  });
});
