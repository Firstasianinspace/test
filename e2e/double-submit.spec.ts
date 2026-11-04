import { expect, test, type Page } from '@playwright/test';

async function loginAsManager(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill('manager@example.com');
  await page.getByPlaceholder('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
}

test('double-clicking "create task" creates exactly one task', async ({ page }) => {
  const title = `Дубль ${String(Date.now())}`;
  await loginAsManager(page);
  await page.getByText('ЖК «Северный»').click();
  await expect(page.getByRole('heading', { name: 'Новая задача' })).toBeVisible();
  await page.getByPlaceholder('Название').fill(title);
  await page.getByRole('button', { name: 'Создать задачу' }).dblclick();
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(1);
  // give a possible second request time to land, then re-check from a fresh load
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(1);

  // cleanup
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByRole('button', { name: 'Удалить задачу' }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});
