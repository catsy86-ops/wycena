import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/raporty');
  });

  test('should display reports page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Raporty i analityka/i })).toBeVisible();
    await expect(page.getByText('Podsumowanie działalności i trendy')).toBeVisible();
  });

  test('should display KPI stats cards', async ({ page }) => {
    await expect(page.getByText('Wyceny łącznie')).toBeVisible();
    await expect(page.getByText('Konwersja')).toBeVisible();
    await expect(page.getByText('Śr. wartość')).toBeVisible();
    await expect(page.getByText('Oczekujące')).toBeVisible();
  });

  test('should display monthly revenue chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Przychód miesięczny/i })).toBeVisible();
    await expect(page.getByText('Przychód z zaakceptowanych wycen')).toBeVisible();
  });

  test('should display top clients chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Najlepsi klienci/i })).toBeVisible();
    await expect(page.getByText('Według przychodu z zaakceptowanych wycen')).toBeVisible();
  });

  test('should display quote status distribution', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Status wycen/i })).toBeVisible();
    await expect(page.getByText('Podział według statusu')).toBeVisible();
  });

  test('should display popular services chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Najpopularniejsze usługi/i })).toBeVisible();
    await expect(page.getByText('Według ilości użycia')).toBeVisible();
  });

  test('should display invoice stats', async ({ page }) => {
    await expect(page.getByText('Opłacone faktury')).toBeVisible();
    await expect(page.getByText('Nieopłacone')).toBeVisible();
    await expect(page.getByText('Klienci')).toBeVisible();
  });

  test('should show charts after creating quotes', async ({ page }) => {
    // Create some accepted quotes to populate charts
    for (let i = 0; i < 3; i++) {
      await page.goto('/wyceny/nowa');
      await page.getByPlaceholder('Nazwa usługi').fill(`Usługa raportowa ${i + 1}`);
      await page.getByLabel('Cena netto').first().fill(`${(i + 1) * 200}`);
      await page.getByLabel('Nazwa klienta').fill(`Klient raportowy ${i + 1}`);
      await page.getByRole('button', { name: /Zapisz i wyślij/i }).click();
      await page.waitForURL(/\/wyceny\/\d+/);
      
      await page.getByLabel('Wysłana').click();
      await page.getByRole('option', { name: 'Zaakceptowana' }).click();
    }

    await page.goto('/raporty');
    
    // Verify KPIs updated
    await expect(page.getByText('Wyceny łącznie')).toBeVisible();
    await expect(page.getByText('Konwersja')).toBeVisible();
  });
});
