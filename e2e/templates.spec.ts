import { test, expect } from '@playwright/test';

test.describe('Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/szablony');
  });

  test('should display templates page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Szablony wycen/i })).toBeVisible();
    await expect(page.getByText('Predefiniowane zestawy usług do szybkiego tworzenia wycen')).toBeVisible();
  });

  test('should have new template button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Nowy szablon/i })).toBeVisible();
  });

  test('should open add template dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowy szablon/i })).toBeVisible();
  });

  test('should add a new template', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    
    await page.getByLabel('Nazwa szablonu').fill('Standardowa łazienka');
    await page.getByLabel('Kategoria').fill('Łazienka');
    await page.getByLabel('Opis').fill('Kompletna instalacja łazienki');
    await page.getByLabel('Domyślny rabat (%)').fill('5');
    
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();
    
    await expect(page.getByText('Szablon dodany')).toBeVisible();
    await expect(page.getByText('Standardowa łazienka')).toBeVisible();
  });

  test('should edit an existing template', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Szablon do edycji');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();
    await expect(page.getByText('Szablon dodany')).toBeVisible();

    await page.getByText('Szablon do edycji').hover();
    await page.getByRole('button', { name: '', exact: true }).first().click();
    
    await expect(page.getByRole('heading', { name: /Edytuj szablon/i })).toBeVisible();
    await page.getByLabel('Nazwa szablonu').fill('Edytowany szablon');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Szablon zaktualizowany')).toBeVisible();
    await expect(page.getByText('Edytowany szablon')).toBeVisible();
  });

  test('should delete a template', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Szablon do usunięcia');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();
    await expect(page.getByText('Szablon dodany')).toBeVisible();

    await page.getByText('Szablon do usunięcia').hover();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Szablon usunięty')).toBeVisible();
  });

  test('should search for templates', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Unikalny Szablon ABC');
    await page.getByLabel('Kategoria').fill('Unikalna');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();

    await page.getByPlaceholder('Szukaj szablonów...').fill('Unikalny');
    await expect(page.getByText('Unikalny Szablon ABC')).toBeVisible();
    
    await page.getByPlaceholder('Szukaj szablonów...').fill('Nie istnieje');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Szablon kuchenny');
    await page.getByLabel('Kategoria').fill('Kuchnia');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();

    await page.getByLabel('Wszystkie kategorie').click();
    await page.getByRole('option', { name: 'Kuchnia' }).click();
    await expect(page.getByText('Szablon kuchenny')).toBeVisible();
  });

  test('should use template', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Szablon do użycia');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();
    await expect(page.getByText('Szablon dodany')).toBeVisible();

    await page.getByRole('button', { name: /Użyj/i }).click();
    await expect(page.getByText('Szablon użyty')).toBeVisible();
    await expect(page).toHaveURL('/wyceny/nowa');
  });

  test('should display template usage count', async ({ page }) => {
    await page.getByRole('button', { name: /Nowy szablon/i }).click();
    await page.getByLabel('Nazwa szablonu').fill('Szablon licznik');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByRole('button', { name: /Dodaj szablon/i }).click();

    await expect(page.getByText('Użyć: 0')).toBeVisible();
  });
});
