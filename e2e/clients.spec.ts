import { test, expect } from '@playwright/test';

test.describe('Clients Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/klienci');
  });

  test('should display clients page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Klienci/i })).toBeVisible();
    await expect(page.getByText('Baza Twoich klientów')).toBeVisible();
  });

  test('should have add client button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Dodaj klienta/i })).toBeVisible();
  });

  test('should open add client dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowy klient/i })).toBeVisible();
  });

  test('should add a new client', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Jan Kowalski');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByLabel('Email').fill('jan@example.com');
    await page.getByLabel('Adres').fill('ul. Przykładowa 1, 00-000 Warszawa');
    await page.getByLabel('NIP').fill('123-456-78-90');
    
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    
    await expect(page.getByText('Klient dodany')).toBeVisible();
    await expect(page.getByText('Jan Kowalski')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    // First add a client
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Anna Nowak');
    await page.getByLabel('Telefon').fill('+48 987 654 321');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await expect(page.getByText('Klient dodany')).toBeVisible();

    // Edit the client
    await page.getByText('Anna Nowak').hover();
    await page.getByRole('button', { name: '', exact: true }).first().click();
    
    await expect(page.getByRole('heading', { name: /Edytuj klienta/i })).toBeVisible();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Anna Kowalska');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Klient zaktualizowany')).toBeVisible();
    await expect(page.getByText('Anna Kowalska')).toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    // First add a client
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Do usunięcia');
    await page.getByLabel('Telefon').fill('+48 111 222 333');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await expect(page.getByText('Klient dodany')).toBeVisible();

    // Delete the client
    await page.getByText('Do usunięcia').hover();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Klient usunięty')).toBeVisible();
    await expect(page.getByText('Do usunięcia')).not.toBeVisible();
  });

  test('should search for clients', async ({ page }) => {
    // Add a client first
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Unikalny Klient');
    await page.getByLabel('Telefon').fill('+48 555 666 777');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();

    // Search for it
    await page.getByPlaceholder('Szukaj klientów...').fill('Unikalny');
    await expect(page.getByText('Unikalny Klient')).toBeVisible();
    
    // Search for non-existent
    await page.getByPlaceholder('Szukaj klientów...').fill('Nie istnieje');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should display client phone with icon', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('Test Phone');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();

    await expect(page.getByText('+48 123 456 789')).toBeVisible();
  });
});
