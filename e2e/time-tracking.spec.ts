import { test, expect } from '@playwright/test';

test.describe('Time Tracking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/czas');
  });

  test('should display time tracking page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Śledzenie czasu/i })).toBeVisible();
    await expect(page.getByText('Logowanie godzin i czasu pracy')).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await expect(page.getByText('Łączny czas')).toBeVisible();
    await expect(page.getByText('Łączna wartość')).toBeVisible();
    await expect(page.getByText('Wpisy')).toBeVisible();
  });

  test('should have add entry button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Dodaj wpis/i })).toBeVisible();
  });

  test('should open add entry dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Dodaj wpis czasu/i })).toBeVisible();
  });

  test('should add a manual time entry', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    
    await page.getByLabel('Klient').fill('Jan Kowalski');
    await page.getByLabel('Opis').fill('Montaż umywalki');
    await page.getByLabel('Stawka godzinowa (PLN)').fill('100');
    
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    
    await expect(page.getByText('Czas dodany')).toBeVisible();
  });

  test('should start timer', async ({ page }) => {
    await page.getByPlaceholder('Klient').fill('Test Client');
    await page.getByPlaceholder('Opis').fill('Testowa praca');
    await page.getByRole('button', { name: /Start/i }).click();
    
    await expect(page.getByText('Timer uruchomiony')).toBeVisible();
    await expect(page.getByText('Testowa praca')).toBeVisible();
    await expect(page.getByText('Test Client')).toBeVisible();
  });

  test('should display active timer with elapsed time', async ({ page }) => {
    await page.getByPlaceholder('Klient').fill('Timer Test');
    await page.getByPlaceholder('Opis').fill('Timer praca');
    await page.getByRole('button', { name: /Start/i }).click();
    
    await expect(page.getByText('Zatrzymaj')).toBeVisible();
    await expect(page.locator('.font-mono.font-bold')).toBeVisible();
  });

  test('should stop timer', async ({ page }) => {
    await page.getByPlaceholder('Klient').fill('Stop Test');
    await page.getByPlaceholder('Opis').fill('Stop praca');
    await page.getByRole('button', { name: /Start/i }).click();
    
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /Zatrzymaj/i }).click();
    
    await expect(page.getByText('Czas zapisany')).toBeVisible();
  });

  test('should search for time entries', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    await page.getByLabel('Klient').fill('Unikalny Klient Czas');
    await page.getByLabel('Opis').fill('Unikalna praca');
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();

    await page.getByPlaceholder('Szukaj wpisów...').fill('Unikalny');
    await expect(page.getByText('Unikalny Klient Czas')).toBeVisible();
    
    await page.getByPlaceholder('Szukaj wpisów...').fill('Nie istnieje');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.getByLabel('Wszystkie kategorie').click();
    await expect(page.getByRole('option', { name: 'Robocizna' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Dojazd' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Inne' })).toBeVisible();
  });

  test('should delete a time entry', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    await page.getByLabel('Klient').fill('Do usunięcia czas');
    await page.getByLabel('Opis').fill('Do usunięcia opis');
    await page.getByRole('button', { name: /Dodaj wpis/i }).click();
    await expect(page.getByText('Czas dodany')).toBeVisible();

    await page.getByText('Do usunięcia czas').hover();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Wpis usunięty')).toBeVisible();
  });
});
