import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, email: string) {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
}

test('executor lands on «Мои задачи» and sees only his tasks', async ({ page }) => {
  await login(page, 'ivan@example.com');
  await expect(page).toHaveURL(/my-tasks/);
  await expect(page.getByText('Подготовить площадку')).toBeVisible();
  await expect(page.getByText('Электропроводка')).toHaveCount(0);
});

test('executor sees only «Взять в работу» on a new task', async ({ page }) => {
  await login(page, 'ivan@example.com');
  await page.getByText('Подготовить площадку').click();
  await expect(page.getByRole('button', { name: 'Взять в работу' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Принять' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Редактировать' })).toHaveCount(0);
});

test('manager lands on «Объекты» and sees accept/rework on reviewed task', async ({ page }) => {
  await login(page, 'manager@example.com');
  await expect(page).toHaveURL(/objects/);
  await page.getByText('Склад на Промышленной').click();
  await page.getByText('Монтаж каркаса').click();
  await expect(page.getByRole('button', { name: 'Принять' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Вернуть на доработку' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Взять в работу' })).toHaveCount(0);
});

test('direct API attack from the browser is rejected by the database', async ({ page }) => {
  await login(page, 'ivan@example.com');
  await expect(page).toHaveURL(/my-tasks/);
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  const result = await page.evaluate(async (anon) => {
    const key = Object.keys(localStorage).find((k) => k.includes('auth-token'));
    const token = (JSON.parse(localStorage.getItem(key ?? '') ?? '{}') as { access_token?: string })
      .access_token;
    const base = 'http://127.0.0.1:54321/rest/v1';
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
    };
    const res = await fetch(`${base}/tasks?id=eq.bbbbbbbb-0000-0000-0000-000000000001`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'accepted' }),
    });
    return res.status;
  }, anonKey);
  expect([401, 403]).toContain(result);
});
