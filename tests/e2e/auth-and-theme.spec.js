import { expect, test } from '@playwright/test';

const createAccount = async (request) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const account = {
    username: `e2e${suffix}`.slice(0, 20),
    email: `e2e-${suffix}@example.test`,
    password: 'ConnectTest!1',
    displayName: 'E2E Developer',
    skills: ['react'],
    specialization: 'frontend'
  };
  const response = await request.post('http://127.0.0.1:5001/api/auth/signup', { data: account });
  expect(response.status()).toBe(201);
  return account;
};

test('@smoke login has no first-party console errors', async ({ page, request }) => {
  const account = await createAccount(request);
  const firstPartyErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !/chrome-extension:|moz-extension:|content\.ts/i.test(message.text())) {
      firstPartyErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => firstPartyErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Connect.dev').first()).toBeVisible();
  expect(firstPartyErrors).toEqual([]);
});

test('@regression profile dialogs render in dark mode', async ({ page, request }, testInfo) => {
  const account = await createAccount(request);
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.goto(`/profile/${account.username}`);
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('button', { name: /edit profile/i }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Profile' });
  await expect(editDialog).toBeVisible();
  await editDialog.screenshot({ path: testInfo.outputPath('edit-profile-dark.png') });
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.getByRole('button', { name: /schedule live event/i }).click();
  const scheduleDialog = page.getByRole('dialog', { name: 'Schedule Developer Event' });
  await expect(scheduleDialog).toBeVisible();
  await scheduleDialog.screenshot({ path: testInfo.outputPath('schedule-event-dark.png') });
});
