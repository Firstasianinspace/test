import { expect, test } from '@playwright/test';

// Runs against the production build (`pnpm e2e:prod`), because the dev server needs inline scripts.
test.skip(!process.env.E2E_PREVIEW, 'headers are only served by the production build / Vercel');

test('production build sends hardening headers and the whole app works under the CSP', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  page.on('pageerror', (e) => violations.push(e.message));

  const res = await page.goto('/');
  const h = res?.headers() ?? {};
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('no-referrer');

  // Exercise login, API calls and navigation under the policy.
  await page.getByPlaceholder('Email').fill('ivan@example.com');
  await page.getByPlaceholder('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/my-tasks/);
  await page.getByText('Подготовить площадку').click();
  await expect(page.getByRole('button', { name: 'Взять в работу' })).toBeVisible();

  expect(violations).toEqual([]);
});
