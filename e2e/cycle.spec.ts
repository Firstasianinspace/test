import { expect, test, type Browser, type Page } from '@playwright/test';

async function sessionFor(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Пароль').fill('password123');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
  return page;
}

test('full cycle with rework through the UI, history visible to both roles', async ({
  browser,
}) => {
  const title = `Цикл ${String(Date.now())}`;
  const manager = await sessionFor(browser, 'manager@example.com');
  const ivan = await sessionFor(browser, 'ivan@example.com');

  // manager creates a task assigned to Ivan
  await manager.getByText('ЖК «Северный»').click();
  await expect(manager.getByRole('heading', { name: 'Новая задача' })).toBeVisible();
  await manager.getByPlaceholder('Название').fill(title);
  await manager.getByLabel('Исполнитель').selectOption({ label: 'Иван Исполнитель' });
  await manager.getByRole('button', { name: 'Создать задачу' }).click();
  await manager.getByText(title).click();
  await expect(manager.getByRole('heading', { name: title })).toBeVisible();
  await expect(manager.getByTestId('status-badge')).toHaveText('Новая');
  // manager has no executor buttons on a new task
  await expect(manager.getByRole('button', { name: 'Взять в работу' })).toHaveCount(0);

  // executor takes it and submits for review
  await ivan.reload();
  await ivan.getByText(title).click();
  await expect(ivan.getByRole('heading', { name: title })).toBeVisible();
  await ivan.getByRole('button', { name: 'Взять в работу' }).click();
  await expect(ivan.getByTestId('status-badge')).toHaveText('В работе');
  await ivan.getByRole('button', { name: 'Отправить на проверку' }).click();
  await expect(ivan.getByTestId('status-badge')).toHaveText('На проверке');
  await expect(ivan.getByRole('button', { name: 'Принять' })).toHaveCount(0);

  // manager returns it: comment is mandatory in the UI
  await manager.reload();
  await manager.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await expect(manager.getByRole('button', { name: 'Подтвердить' })).toBeDisabled();
  await manager.getByLabel('Комментарий').fill('Переделать стык');
  await manager.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(manager.getByTestId('status-badge')).toHaveText('На доработке');

  // executor sees the comment in the history and continues
  await ivan.reload();
  await expect(ivan.getByTestId('history')).toContainText('Переделать стык');
  await ivan.getByRole('button', { name: 'Взять в работу' }).click();
  await expect(ivan.getByTestId('status-badge')).toHaveText('В работе');
  await ivan.getByRole('button', { name: 'Отправить на проверку' }).click();

  // manager accepts; no more actions
  await manager.reload();
  await manager.getByRole('button', { name: 'Принять' }).click();
  await expect(manager.getByTestId('status-badge')).toHaveText('Принята');
  await expect(manager.getByRole('button', { name: 'Вернуть на доработку' })).toHaveCount(0);
  await expect(manager.getByTestId('history').locator('li')).toHaveCount(7);

  // executor cannot open a foreign task by URL
  const foreign = 'bbbbbbbb-0000-0000-0000-000000000005';
  await ivan.goto(`/tasks/${foreign}`);
  await expect(ivan.getByRole('alert')).toBeVisible();
  await expect(ivan.getByText('Электропроводка')).toHaveCount(0);

  // cleanup: manager deletes the task
  await manager.getByRole('button', { name: 'Удалить задачу' }).click();
  await expect(manager.getByText(title)).toHaveCount(0);
});
