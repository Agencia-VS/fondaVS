import { test, expect } from '@playwright/test';

test('a phone can prepare before the operator arrives, then play in the operator window', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  context.on('page', (p) => p.on('pageerror', (error) => errors.push(error.message)));
  await page.goto('/');
  // Existing room with no operator window: reproduces the reported stuck flow.
  await page.evaluate(() =>
    localStorage.setItem(
      'fonda:DEMO99',
      JSON.stringify({
        id: crypto.randomUUID(),
        code: 'DEMO99',
        phase: 'waiting',
        hostEpoch: 0,
        isOwner: true,
        member: null,
        members: [],
        results: [],
        players: {},
      }),
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/play/DEMO99?team=creative');
  await page.getByLabel('Tu nombre').fill('Jugador');
  await page.getByRole('button', { name: 'Entrar a la cancha' }).click();
  await expect(page.getByRole('button', { name: 'Estoy listo' })).toBeEnabled();
  await page.getByRole('button', { name: 'Estoy listo' }).click();
  await expect(page.getByRole('button', { name: 'Listo · esperando confirmación' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listo confirmado' })).toBeHidden();
  await page.getByRole('button', { name: 'Reconectar control' }).click();
  await expect(page.getByRole('button', { name: 'Listo · esperando confirmación' })).toBeVisible();
  const spectator = await context.newPage();
  await spectator.goto('/watch/DEMO99');
  await expect(spectator.getByRole('heading', { name: 'Esperando a la sala.' })).toBeVisible();
  expect(
    await spectator.evaluate(() => JSON.parse(localStorage.getItem('fonda:DEMO99')!).hostEpoch),
  ).toBe(0);
  const operator = await context.newPage();
  await operator.goto('/control/DEMO99');
  await expect(operator.getByText('Sala conectada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listo confirmado' })).toBeVisible();
  await expect(operator.getByRole('button', { name: 'Iniciar juego' })).toBeEnabled();
  await operator.screenshot({ path: 'test-results/room-flow-panel.png', fullPage: true });
  await page.screenshot({ path: 'test-results/room-flow-mobile.png', fullPage: true });
  await operator.getByRole('button', { name: /01 Carrera de sacos/ }).click();
  await operator.getByRole('button', { name: 'Iniciar juego' }).click();
  await expect(operator.locator('.host-game-title')).toHaveText('Carrera de sacos');
  await expect(page.getByRole('button', { name: 'Izquierda', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Izquierda', exact: true }).click();
  await page.getByRole('button', { name: 'Derecha', exact: true }).click();
  await expect(page.locator('.race-progress')).toContainText('1/30 pasos');
  await operator.getByRole('button', { name: 'Volver al panel' }).click();
  await expect(operator.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await operator.getByRole('button', { name: 'Ver cancha en esta pantalla' }).click();
  await expect(page.locator('.race-progress')).toContainText('1/30 pasos');
  expect(
    await operator.evaluate(() => JSON.parse(localStorage.getItem('fonda:DEMO99')!).hostEpoch),
  ).toBe(1);
  await operator.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Ⅱ Pausa')).toBeVisible();
  await operator.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await operator.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Izquierda', exact: true })).toBeEnabled();
  await operator.screenshot({ path: 'test-results/room-flow-game.png', fullPage: true });
  await operator.close();
  await expect(spectator.getByRole('heading', { name: 'Esperando a la sala.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Izquierda', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
