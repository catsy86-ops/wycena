import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pulpit/i })).toBeVisible();
  });

  test('should display stat cards for services, clients, and quotes', async ({ page }) => {
    await expect(page.getByText('Usługi')).toBeVisible();
    await expect(page.getByText('Klienci')).toBeVisible();
    await expect(page.getByText('Wyceny')).toBeVisible();
  });

  test('should have navigation links on stat cards', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Zarządzaj usługami/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Zarządzaj klientami/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Przeglądaj wyceny/i })).toBeVisible();
  });

  test('should have new quote button', async ({ page }) => {
    const newQuoteButton = page.getByRole('button', { name: /Nowa wycena/i });
    await expect(newQuoteButton).toBeVisible();
    await newQuoteButton.click();
    await expect(page).toHaveURL('/wyceny/nowa');
  });

  test('should display accepted, pending, and revenue stats', async ({ page }) => {
    await expect(page.getByText('Zaakceptowane')).toBeVisible();
    await expect(page.getByText('Oczekujące')).toBeVisible();
    await expect(page.getByText('Przychód')).toBeVisible();
  });

  test('should navigate to services page when clicking services card', async ({ page }) => {
    await page.getByRole('link', { name: /Zarządzaj usługami/i }).click();
    await expect(page).toHaveURL('/uslugi');
  });

  test('should navigate to clients page when clicking clients card', async ({ page }) => {
    await page.getByRole('link', { name: /Zarządzaj klientami/i }).click();
    await expect(page).toHaveURL('/klienci');
  });

  test('should navigate to quotes page when clicking quotes card', async ({ page }) => {
    await page.getByRole('link', { name: /Przeglądaj wyceny/i }).click();
    await expect(page).toHaveURL('/wyceny');
  });
});
