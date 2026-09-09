import { expect, test } from '@playwright/test';

test('one screen supports keyboard penalties, memory and CPU rayuela turns without a backend', async ({
  page,
}) => {
  const errors: string[] = [];
  const backendRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/rooms|supabase\.(co|in)/.test(request.url())) backendRequests.push(request.url());
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Jugar contra la CPU' }).click();
  await expect(page).toHaveURL(/\/solo$/);
  await expect(page.getByRole('heading', { name: 'Tú contra la CPU.' })).toBeVisible();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  const pad = page.getByRole('complementary', { name: 'Tu control' });
  await expect(pad.getByRole('button', { name: 'Arriba izquierda' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/solo-desktop.png', fullPage: true });
  await page.keyboard.press('1');
  await expect(pad.getByText(/Elección confirmada/)).toBeVisible();
  await expect(pad.getByRole('button', { name: 'Arriba izquierda' })).toBeDisabled();
  await expect(pad.getByText('Te toca atajar')).toBeVisible();

  await page.getByRole('button', { name: 'Elegir otro juego' }).click();
  await page.getByRole('button', { name: /04 Memorice/ }).click();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await expect(pad.getByRole('button', { name: 'Voltear' })).toBeEnabled();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(pad.locator('.memory-selection')).toContainText('CARTA 02');

  await page.getByRole('button', { name: 'Elegir otro juego' }).click();
  await page.getByRole('button', { name: /02 Rayuela/ }).click();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await expect(pad.getByRole('button', { name: 'Lanzar' })).toBeEnabled();
  await page.keyboard.press('Space');
  await expect(pad.getByRole('button', { name: 'Lanzar' })).toBeDisabled();
  await expect(pad.getByText('Lanza Lab')).toBeVisible();
  // Lab makes its throw and Sports gets the next turn without another browser.
  await expect(pad.getByText('Lanza Sports')).toBeVisible();
  await page.getByRole('button', { name: 'Elegir otro juego' }).click();
  await expect(page.getByRole('region', { name: 'Marcador de práctica' })).toHaveCount(0);
  expect(backendRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('mobile race finishes against three CPUs, scores once, pauses and allows a fresh rematch', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/solo');
  await page.getByRole('button', { name: 'Jugar con Media' }).click();
  await page.getByLabel('Dificultad de la CPU').selectOption('easy');
  await page.getByRole('button', { name: /01 Carrera de sacos/ }).click();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await page.clock.install();
  await page.clock.runFor(3500);
  const pad = page.getByRole('complementary', { name: 'Tu control' });
  await expect(pad.getByRole('heading', { name: 'Media' })).toBeVisible();
  await expect(page.locator('.solo-roster small', { hasText: 'CPU' })).toHaveCount(3);
  await pad.getByRole('button', { name: 'Izquierda', exact: true }).click();
  await pad.getByRole('button', { name: 'Derecha', exact: true }).click();
  await expect(pad.locator('.race-progress')).toContainText('1/30 pasos');
  await expect(page.getByRole('img', { name: 'Escenario de sack-race' })).toBeInViewport({
    ratio: 1,
  });
  await expect(pad.getByRole('button', { name: 'Derecha', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: 'test-results/solo-mobile.png', fullPage: true });
  await pad.getByRole('button', { name: 'Pausar', exact: true }).click();
  const timer = await pad.locator('.solo-timer').textContent();
  await page.clock.runFor(5000);
  await expect(pad.locator('.solo-timer')).toHaveText(timer!);
  await expect(pad.getByRole('button', { name: 'Izquierda', exact: true })).toBeDisabled();
  await pad.getByRole('button', { name: 'Reanudar', exact: true }).click();
  for (let i = 1; i < 30; i++) {
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
  }
  await expect(pad.getByText('¡Llegaste a la meta!')).toBeVisible();
  await page.clock.runFor(45000);
  const result = page.getByRole('complementary', { name: 'Resultado de la partida' });
  await expect(result.getByText('Media: puesto 1.')).toBeVisible();
  await expect(page.getByText('1 partida terminada · se reinicia al recargar')).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByText('1 partida terminada · se reinicia al recargar')).toBeVisible();
  await page.getByRole('button', { name: 'Volver a jugar' }).click();
  await expect(pad.locator('.race-progress')).toContainText('0/30 pasos');
  await expect(page.getByRole('button', { name: 'Jugar con Media' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Elegir otro juego' }).click();
  await page.getByRole('button', { name: 'Jugar con Creative' }).click();
  await page.getByRole('button', { name: /04 Memorice/ }).click();
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await page.clock.runFor(3500);
  await expect(pad.getByRole('button', { name: 'Voltear' })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Escenario de memory' })).toBeInViewport({ ratio: 1 });
  await expect(pad.getByRole('button', { name: 'Voltear' })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: 'test-results/solo-memory-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('hiding a solo tab pauses the round until the player resumes', async ({ page }) => {
  await page.goto('/solo');
  await page.getByRole('button', { name: 'Jugar contra la CPU' }).click();
  await expect(page.getByRole('button', { name: 'Centro', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Partida en pausa', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Centro', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reanudar partida' }).click();
  await expect(page.getByRole('button', { name: 'Centro', exact: true })).toBeEnabled();
});
