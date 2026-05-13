import { test, expect } from '@playwright/test';

test.describe('Materials Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/materialy');
  });

  test('should display materials page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Materiały/i })).toBeVisible();
    await expect(page.getByText('Magazyn, stany i ceny materiałów')).toBeVisible();
  });

  test('should have add material button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Dodaj materiał/i })).toBeVisible();
  });

  test('should open add material dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowy materiał/i })).toBeVisible();
  });

  test('should add a new material', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    
    await page.getByLabel('Nazwa materiału').fill('Rura PCV 100mm');
    await page.getByLabel('Kategoria').fill('Rury');
    await page.getByLabel('Jednostka').click();
    await page.getByRole('option', { name: 'm' }).click();
    await page.getByLabel('Cena zakupu (PLN)').fill('15');
    await page.getByLabel('Cena sprzedaży (PLN)').fill('25');
    await page.getByLabel('Stan magazynowy').fill('50');
    await page.getByLabel('Minimalny stan').fill('10');
    
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    
    await expect(page.getByText('Materiał dodany')).toBeVisible();
    await expect(page.getByText('Rura PCV 100mm')).toBeVisible();
  });

  test('should edit an existing material', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await page.getByLabel('Nazwa materiału').fill('Materiał do edycji');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByLabel('Cena sprzedaży (PLN)').fill('100');
    await page.getByLabel('Stan magazynowy').fill('20');
    await page.getByLabel('Minimalny stan').fill('5');
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await expect(page.getByText('Materiał dodany')).toBeVisible();

    await page.getByText('Materiał do edycji').hover();
    await page.getByRole('button', { name: '', exact: true }).first().click();
    
    await expect(page.getByRole('heading', { name: /Edytuj materiał/i })).toBeVisible();
    await page.getByLabel('Nazwa materiału').fill('Edytowany materiał');
    await page.getByLabel('Cena sprzedaży (PLN)').fill('150');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Materiał zaktualizowany')).toBeVisible();
    await expect(page.getByText('Edytowany materiał')).toBeVisible();
  });

  test('should delete a material', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await page.getByLabel('Nazwa materiału').fill('Materiał do usunięcia');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByLabel('Stan magazynowy').fill('10');
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await expect(page.getByText('Materiał dodany')).toBeVisible();

    await page.getByText('Materiał do usunięcia').hover();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Materiał usunięty')).toBeVisible();
    await expect(page.getByText('Materiał do usunięcia')).not.toBeVisible();
  });

  test('should search for materials', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await page.getByLabel('Nazwa materiału').fill('Unikalny materiał XYZ');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByLabel('Stan magazynowy').fill('5');
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();

    await page.getByPlaceholder('Szukaj materiałów...').fill('Unikalny');
    await expect(page.getByText('Unikalny materiał XYZ')).toBeVisible();
    
    await page.getByPlaceholder('Szukaj materiałów...').fill('Nie istnieje');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await page.getByLabel('Nazwa materiału').fill('Rura testowa');
    await page.getByLabel('Kategoria').fill('Rury');
    await page.getByLabel('Stan magazynowy').fill('10');
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();

    await page.getByLabel('Wszystkie kategorie').click();
    await page.getByRole('option', { name: 'Rury' }).click();
    await expect(page.getByText('Rura testowa')).toBeVisible();
  });

  test('should export CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should show low stock warning when applicable', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();
    await page.getByLabel('Nazwa materiału').fill('Niski stan test');
    await page.getByLabel('Kategoria').fill('Test');
    await page.getByLabel('Stan magazynowy').fill('2');
    await page.getByLabel('Minimalny stan').fill('5');
    await page.getByRole('button', { name: /Dodaj materiał/i }).click();

    await expect(page.getByText('Niski stan magazynowy')).toBeVisible();
    await expect(page.getByText('Niski stan test')).toBeVisible();
  });
});
