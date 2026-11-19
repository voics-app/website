import { test, expect } from '@playwright/test';

test('personal invite passes the fragment only to the app link', async ({ page }, info) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  const token = 'abc_DEF-0123456789';
  await page.goto(`/friend-invite/index.html#${token}`);
  await expect(page.getByRole('heading', { name: 'Friend invite' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open app' })).toHaveAttribute('href', `voics://friend-invite/${token}`);
  expect(requests.every((url) => !url.includes(token))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('friend-invite.png'), fullPage: true });
});

test('invalid personal invite cannot launch the app', async ({ page }) => {
  await page.goto('/friend-invite/index.html#bad');
  await expect(page.getByText('This link is invalid.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open app' })).toBeHidden();
});
