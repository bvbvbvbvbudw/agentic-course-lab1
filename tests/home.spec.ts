import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('головна сторінка показує назву курсу та завдання студента', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Агентна інженерія' })).toBeVisible();
  await expect(page.getByText('Стартовий шаблон')).toBeVisible();
  await expect(page.getByText('Ваше завдання: додати ендпоінт /api/health')).toBeVisible();

  // Скріншот як доказ: зберігаємо в docs/lab1/e2e-home.png для пакета доказів
  mkdirSync('docs/lab1', { recursive: true });
  await page.screenshot({ path: 'docs/lab1/e2e-home.png', fullPage: true });

  // Скріншот як доказ: лишається артефактом у test-results/.
  const screenshotPath = testInfo.outputPath('home.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach('home', { path: screenshotPath, contentType: 'image/png' });
});
