import { expect, test } from '@playwright/test';
import { MEMORY_ICONS } from '../../src/game/memory-icons';

test('6x5 memory reaches the final card, shows its object name and fits a mobile screen', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/solo');
  await page.getByRole('button', { name: /04 Memorice/ }).click();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await page.clock.install();
  await page.clock.runFor(3500);
  const pad = page.getByRole('complementary', { name: 'Tu control' });
  await expect(pad.getByRole('button', { name: 'Voltear' })).toBeEnabled();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  const selection = pad.locator('.memory-selection');
  await expect(selection).toContainText('CARTA 30');
  await expect(selection).toContainText('5ª FILA · 6ª COLUMNA');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(selection).toContainText('CARTA 30');
  await page.keyboard.press('Space');
  await expect(selection.locator('span')).toHaveText(new RegExp(MEMORY_ICONS.join('|')));
  await page.clock.runFor(100);
  await page.locator('canvas').screenshot({ path: 'test-results/memory-6x5-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(100);
  await expect(page.getByRole('img', { name: 'Escenario de memory' })).toBeInViewport({ ratio: 1 });
  await expect(pad.getByRole('button', { name: 'Voltear' })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: 'test-results/memory-6x5-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
