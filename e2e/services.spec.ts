import { test, expect } from '@playwright/test';

test.describe('Services Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/uslugi');
  });

  test('should display services page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Katalog usług/i })).toBeVisible();
    await expect(page.getByText('Zarządzaj usługami i cenami')).toBeVisible();
  });

  test('should have add service button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Dodaj usługę/i })).toBeVisible();
  });

  test('should open add service dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowa usługa/i })).toBeVisible();
  });

  test('should add a new service', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    
    await page.getByLabel('Nazwa usługi').fill('Testowa usługa');
    await page.getByLabel('Kategoria').click();
    await page.getByRole('option', { name: 'Montaż' }).click();
    await page.getByLabel('Jednostka').click();
    await page.getByRole('option', { name: 'szt.' }).click();
    await page.getByLabel('Cena netto (PLN)').fill('100');
    await page.getByLabel('Stawka VAT').click();
    await page.getByRole('option', { name: '23%' }).click();
    
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    
    await expect(page.getByText('Usługa dodana')).toBeVisible();
    await expect(page.getByText('Testowa usługa')).toBeVisible();
  });

  test('should edit an existing service', async ({ page }) => {
    // First add a service
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await page.getByLabel('Nazwa usługi').fill('Usługa do edycji');
    await page.getByLabel('Cena netto (PLN)').fill('50');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await expect(page.getByText('Usługa dodana')).toBeVisible();

    // Edit the service
    await page.getByText('Usługa do edycji').hover();
    await page.getByRole('button', { name: '', exact: true }).first().click();
    
    await expect(page.getByRole('heading', { name: /Edytuj usługę/i })).toBeVisible();
    await page.getByLabel('Nazwa usługi').fill('Edytowana usługa');
    await page.getByLabel('Cena netto (PLN)').fill('75');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Usługa zaktualizowana')).toBeVisible();
    await expect(page.getByText('Edytowana usługa')).toBeVisible();
  });

  test('should delete a service', async ({ page }) => {
    // First add a service
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await page.getByLabel('Nazwa usługi').fill('Usługa do usunięcia');
    await page.getByLabel('Cena netto (PLN)').fill('30');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await expect(page.getByText('Usługa dodana')).toBeVisible();

    // Delete the service
    await page.getByText('Usługa do usunięcia').hover();
    await page.getByRole('button', { name: '', exact: true }).last().click();
    await page.getByRole('button', { name: /Usuń/i }).click();
    
    await expect(page.getByText('Usługa usunięta')).toBeVisible();
    await expect(page.getByText('Usługa do usunięcia')).not.toBeVisible();
  });

  test('should search for services', async ({ page }) => {
    // Add a service first
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await page.getByLabel('Nazwa usługi').fill('Unikalna nazwa usługi');
    await page.getByLabel('Cena netto (PLN)').fill('100');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();

    // Search for it
    await page.getByPlaceholder('Szukaj usług...').fill('Unikalna');
    await expect(page.getByText('Unikalna nazwa usługi')).toBeVisible();
    
    // Search for non-existent
    await page.getByPlaceholder('Szukaj usług...').fill('Nie istnieje');
    await expect(page.getByText('Brak wyników')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();
    await page.getByLabel('Nazwa usługi').fill('Usługa montażowa');
    await page.getByLabel('Kategoria').click();
    await page.getByRole('option', { name: 'Montaż' }).click();
    await page.getByLabel('Cena netto (PLN)').fill('100');
    await page.getByRole('button', { name: /Dodaj usługę/i }).click();

    await page.getByLabel('Wszystkie kategorie').click();
    await page.getByRole('option', { name: 'Montaż' }).click();
    await expect(page.getByText('Usługa montażowa')).toBeVisible();
  });
});
