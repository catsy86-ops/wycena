import { test, expect } from '@playwright/test';

test.describe('Command Palette (Ctrl+K)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open command palette with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).toBeVisible();
  });

  test('should open command palette with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).toBeVisible();
  });

  test('should close command palette with Escape', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).not.toBeVisible();
  });

  test('should close command palette by clicking backdrop', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).toBeVisible();
    await page.mouse.click(0, 0);
    await expect(page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...')).not.toBeVisible();
  });

  test('should display navigation commands', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByText('Nawigacja')).toBeVisible();
    await expect(page.getByText('Pulpit')).toBeVisible();
    await expect(page.getByText('Usługi')).toBeVisible();
    await expect(page.getByText('Klienci')).toBeVisible();
    await expect(page.getByText('Wyceny')).toBeVisible();
    await expect(page.getByText('Ustawienia')).toBeVisible();
  });

  test('should display action commands', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByText('Akcje')).toBeVisible();
    await expect(page.getByText('Nowa wycena')).toBeVisible();
  });

  test('should display new page navigation commands', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByText('Materiały')).toBeVisible();
    await expect(page.getByText('Harmonogram')).toBeVisible();
    await expect(page.getByText('Czas pracy')).toBeVisible();
    await expect(page.getByText('Faktury')).toBeVisible();
    await expect(page.getByText('Raporty')).toBeVisible();
    await expect(page.getByText('Szablony')).toBeVisible();
  });

  test('should navigate to page when selecting command', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Usługi').click();
    await expect(page).toHaveURL('/uslugi');
  });

  test('should navigate to clients page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Klienci').click();
    await expect(page).toHaveURL('/klienci');
  });

  test('should navigate to new quote page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Nowa wycena').click();
    await expect(page).toHaveURL('/wyceny/nowa');
  });

  test('should navigate to materials page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Materiały').click();
    await expect(page).toHaveURL('/materialy');
  });

  test('should navigate to schedule page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Harmonogram').click();
    await expect(page).toHaveURL('/harmonogram');
  });

  test('should navigate to time tracking page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Czas pracy').click();
    await expect(page).toHaveURL('/czas');
  });

  test('should navigate to invoices page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Faktury').click();
    await expect(page).toHaveURL('/faktury');
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Raporty').click();
    await expect(page).toHaveURL('/raporty');
  });

  test('should navigate to templates page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByText('Szablony').click();
    await expect(page).toHaveURL('/szablony');
  });

  test('should filter commands by search', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...').fill('usługi');
    await expect(page.getByText('Usługi')).toBeVisible();
    await expect(page.getByText('Nawigacja')).toBeVisible();
  });

  test('should show no results for non-matching search', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...').fill('nieistniejacytekst');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should search services by name', async ({ page }) => {
    // Add a service first
    await page.goto('/uslugi');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await page.getByLabel('Nazwa usługi').fill('UnikalnaUsługaDoWyszukania');
    await page.getByLabel('Cena netto (PLN)').fill('100');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();

    // Search in command palette
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...').fill('UnikalnaUsługaDoWyszukania');
    await expect(page.getByText('UnikalnaUsługaDoWyszukania')).toBeVisible();
    await expect(page.getByText('Usługi')).toBeVisible();
  });

  test('should search clients by name', async ({ page }) => {
    // Add a client first
    await page.goto('/klienci');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();
    await page.getByLabel('Nazwa / Imię i nazwisko').fill('UnikalnyKlientDoWyszukania');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByRole('button', { name: /Dodaj klienta/i }).click();

    // Search in command palette
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Szukaj komend, usług, klientów, wycen...').fill('UnikalnyKlientDoWyszukania');
    await expect(page.getByText('UnikalnyKlientDoWyszukania')).toBeVisible();
    await expect(page.getByText('Klienci')).toBeVisible();
  });

  test('should display keyboard shortcuts help', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByText('Nawigacja')).toBeVisible();
    await expect(page.getByText('Wybierz')).toBeVisible();
    await expect(page.getByText('Zamknij')).toBeVisible();
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // Should navigate to the selected item
    await expect(page).not.toHaveURL('/');
  });
});
