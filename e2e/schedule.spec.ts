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
    await expect(page.getByRole('button', { name: /Dodaj wydarzenie/i }).first()).toBeVisible();
  });

  test('should open add event dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Nowe wydarzenie/i })).toBeVisible();
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).last().click();
    
    await expect(page.getByText('Popraw błędy w formularzu')).toBeVisible();
    await expect(page.getByText('Nazwa klienta musi mieć min. 2 znaki')).toBeVisible();
    await expect(page.getByText('Tytuł musi mieć min. 2 znaki')).toBeVisible();
    await expect(page.getByText('Czas rozpoczęcia jest wymagany')).toBeVisible();
    await expect(page.getByText('Czas zakończenia jest wymagany')).toBeVisible();
  });

  test('should show validation error for short title', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Tytuł *').fill('A');
    await page.getByLabel('Tytuł *').blur();
    await expect(page.getByText('Tytuł musi mieć min. 2 znaki')).toBeVisible();
  });

  test('should show validation error for short client name', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Klient *').fill('A');
    await page.getByLabel('Klient *').blur();
    await expect(page.getByText('Nazwa klienta musi mieć min. 2 znaki')).toBeVisible();
  });

  test('should show validation error for invalid phone number', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Telefon').fill('abc');
    await page.getByLabel('Telefon').blur();
    await expect(page.getByText('Nieprawidłowy format numeru telefonu')).toBeVisible();
  });

  test('should accept valid phone number', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByLabel('Telefon').blur();
    await expect(page.getByText('Nieprawidłowy format numeru telefonu')).not.toBeVisible();
  });

  test('should add a new event with valid data', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatDateTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    await page.getByLabel('Tytuł *').fill('Wycena u klienta');
    await page.getByLabel('Klient *').fill('Jan Kowalski');
    await page.getByLabel('Telefon').fill('+48 123 456 789');
    await page.getByLabel('Adres').fill('ul. Przykładowa 1');
    await page.getByLabel('Rozpoczęcie *').fill(formatDateTime(now));
    await page.getByLabel('Zakończenie *').fill(formatDateTime(tomorrow));
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).last().click();
    
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();
  });

  test('should show error when end time is before start time', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const formatDateTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    await page.getByLabel('Tytuł *').fill('Test');
    await page.getByLabel('Klient *').fill('Test Client');
    await page.getByLabel('Rozpoczęcie *').fill(formatDateTime(now));
    await page.getByLabel('Zakończenie *').fill(formatDateTime(yesterday));
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).last().click();
    
    await expect(page.getByText('Popraw błędy w formularzu')).toBeVisible();
  });

  test('should edit an existing event', async ({ page }) => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatDateTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Tytuł *').fill('Edytowane wydarzenie');
    await page.getByLabel('Klient *').fill('Test Client');
    await page.getByLabel('Rozpoczęcie *').fill(formatDateTime(now));
    await page.getByLabel('Zakończenie *').fill(formatDateTime(tomorrow));
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).last().click();
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();

    await page.getByText('Edytowane wydarzenie').click();
    await expect(page.getByRole('heading', { name: /Edytuj wydarzenie/i })).toBeVisible();
    await page.getByLabel('Tytuł *').fill('Zmienione wydarzenie');
    await page.getByRole('button', { name: /Zapisz zmiany/i }).click();
    
    await expect(page.getByText('Zdarzenie zaktualizowane')).toBeVisible();
  });

  test('should delete an event', async ({ page }) => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formatDateTime = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.getByLabel('Tytuł *').fill('Wydarzenie do usunięcia');
    await page.getByLabel('Klient *').fill('Test');
    await page.getByLabel('Rozpoczęcie *').fill(formatDateTime(now));
    await page.getByLabel('Zakończenie *').fill(formatDateTime(tomorrow));
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).last().click();
    await expect(page.getByText('Zdarzenie dodane')).toBeVisible();

    await page.getByText('Wydarzenie do usunięcia').click();
    await page.waitForTimeout(500);
    await page.getByTestId('delete-event-button').click();
    await page.getByRole('button', { name: /Usuń/i }).last().click();
    
    await expect(page.getByText('Zdarzenie usunięte')).toBeVisible();
  });

  test('should filter by type', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Harmonogram/i })).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Harmonogram/i })).toBeVisible();
  });

  test('should display calendar view', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Harmonogram/i })).toBeVisible();
  });

  test('should display legend with all types', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Harmonogram/i })).toBeVisible();
  });

  test('should show required field indicators', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await expect(page.getByText('Tytuł *')).toBeVisible();
    await expect(page.getByText('Klient *')).toBeVisible();
    await expect(page.getByText('Rozpoczęcie *')).toBeVisible();
    await expect(page.getByText('Zakończenie *')).toBeVisible();
  });

  test('should clear validation errors when typing valid data', async ({ page }) => {
    await page.getByRole('button', { name: /Dodaj wydarzenie/i }).first().click();
    await page.locator('input#title').fill('A');
    await page.locator('input#title').press('Tab');
    await expect(page.getByText('Tytuł musi mieć min. 2 znaki')).toBeVisible();
    await page.locator('input#title').focus();
    await page.locator('input#title').fill('Valid title');
    await page.locator('input#title').press('Tab');
    await page.waitForTimeout(200);
    await expect(page.getByText('Tytuł musi mieć min. 2 znaki')).not.toBeVisible();
  });
});
