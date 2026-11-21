import { test, expect } from '@playwright/test';

const template = {
  name: 'Study crew', description: 'A synthetic template for browser tests.',
  serialized_source_guild: {
    roles: [{ id: 0, name: '@everyone' }, { id: 1, name: 'Tutor' }],
    channels: [
      { id: 1, type: 4, name: 'Study rooms', position: 0, parent_id: null },
      { id: 2, type: 0, name: '<img src=x onerror=alert(1)>', position: 0, parent_id: 1 },
      { id: 3, type: 2, name: 'Quiet room', position: 1, parent_id: 1 },
    ],
  },
};
const endpoint = '**/api/v1/guilds/templates/**';
const response = { status: 200, contentType: 'application/json', body: JSON.stringify(template), headers: { 'access-control-allow-origin': '*' } };

test('public preview displays the saved structure and an explicit app link', async ({ page }, info) => {
  let calls = 0;
  await page.route(endpoint, async (route) => {
    calls++;
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill(response);
  });
  await page.goto('/template.html?code=shared-123');
  await expect(page.getByRole('heading', { name: 'Study crew' })).toBeVisible();
  await expect(page.getByText('2 channels · 1 role')).toBeVisible();
  await expect(page.getByText('Tutor', { exact: true })).toBeVisible();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: false })).toBeVisible();
  await expect(page.locator('#template-channels img')).toHaveCount(0);
  await expect(page.locator('#template-open')).toHaveAttribute('href', 'voics://template/shared-123');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(calls).toBe(1);
  await page.screenshot({ path: info.outputPath('template-preview.png'), fullPage: true });
});

test('invalid and deleted links cannot launch the app', async ({ page }) => {
  let calls = 0;
  await page.route(endpoint, async (route) => { calls++; await route.fulfill({ ...response, status: 404, body: '{}' }); });
  await page.goto('/template.html?code=bad%2Fcode');
  await expect(page.getByRole('status')).toContainText('not valid');
  expect(calls).toBe(0);
  await page.goto('/template.html?code=deleted-123');
  await expect(page.getByRole('heading', { name: 'Template unavailable' })).toBeVisible();
  await expect(page.locator('#template-open')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeHidden();
});

test('network failures offer a working retry', async ({ page }) => {
  let calls = 0;
  await page.route(endpoint, async (route) => {
    calls++;
    await route.fulfill(calls === 1 ? { ...response, status: 503, body: '{}' } : response);
  });
  await page.goto('/template.html?code=shared-123');
  await expect(page.getByRole('status')).toContainText('Could not load');
  await expect(page.locator('#template-open')).toBeHidden();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Study crew' })).toBeVisible();
  expect(calls).toBe(2);
});
