import { test, expect, Page } from '@playwright/test';
test('one projector, four exclusive controllers, and all four minigames', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Que gane la mejor área.' })).toBeVisible();
  await page.getByRole('button', { name: 'Explorar la demo' }).click();
  await expect(page).toHaveURL(/control\/DEMO\d{2}/);
  const code = page.url().split('/').at(-1)!;
  const host = await context.newPage();
  await host.goto(`/host/${code}`);
  await expect(page.getByText('Proyector conectado', { exact: true })).toBeVisible();
  const players: Page[] = [];
  const teams = ['Creative', 'Lab', 'Sports', 'Media'];
  for (const team of teams) {
    const p = await context.newPage();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`/play/${code}?team=${team.toLowerCase()}`);
    await p.getByLabel('Tu nombre').fill(team + ' Test');
    await p.getByRole('button', { name: 'Entrar a la cancha' }).click();
    await p.getByRole('button', { name: 'Estoy listo' }).click();
    players.push(p);
  }
  await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeEnabled();
  const duplicate = await context.newPage();
  await duplicate.goto(`/play/${code}`);
  await expect(duplicate.getByRole('button', { name: 'CR Creative Ocupado' })).toBeDisabled();
  await duplicate.close();
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  await expect(players[0].getByRole('button', { name: 'Arriba izquierda' })).toBeEnabled();
  await expect(players[2].getByRole('button', { name: 'Arriba izquierda' })).toBeDisabled();
  await players[0].getByRole('button', { name: 'Arriba izquierda' }).click();
  await expect(players[0].getByText('Elección confirmada. Mira el proyector ✓')).toBeVisible();
  await players[1].getByRole('button', { name: 'Centro', exact: true }).click();
  await expect(players[1].getByText('Te toca chutar')).toBeVisible();
  // Canceling an unfinished practice round must never add a championship result.
  const cancel = async () => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar ronda' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeVisible();
  };
  await cancel();
  await page.getByRole('button', { name: /01 Carrera de sacos/ }).click();
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  await expect(players[0].getByRole('button', { name: 'Izquierda', exact: true })).toBeEnabled();
  await players[0].getByRole('button', { name: 'Izquierda', exact: true }).click();
  await players[0].getByRole('button', { name: 'Derecha', exact: true }).click();
  await expect(players[0].locator('.race-progress')).toContainText('1/30 pasos');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(players[0].getByText('Ⅱ Pausa')).toBeVisible();
  await expect(players[0].getByRole('button', { name: 'Izquierda', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await expect(players[0].getByRole('button', { name: 'Izquierda', exact: true })).toBeEnabled();
  await cancel();
  await page.getByRole('button', { name: /04 Memorice/ }).click();
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  await expect(players[0].getByRole('button', { name: 'Voltear', exact: true })).toBeEnabled();
  await players[0].getByRole('button', { name: 'Voltear', exact: true }).click();
  await players[0].getByRole('button', { name: 'Derecha', exact: true }).click();
  await expect(players[0].locator('.memory-selection')).toContainText('CARTA 02');
  await cancel();
  await page.getByRole('button', { name: /02 Rayuela/ }).click();
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  await expect(players[0].getByRole('button', { name: 'Lanzar', exact: true })).toBeEnabled();
  await expect(players[1].getByRole('button', { name: 'Lanzar', exact: true })).toBeDisabled();
  await players[0].getByRole('button', { name: 'Lanzar', exact: true }).click();
  await expect(players[1].getByRole('button', { name: 'Lanzar', exact: true })).toBeEnabled();
  await cancel();
  await expect(page.getByText('0 RONDAS CONFIRMADAS')).toBeVisible();
  expect(
    await players[0].evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('unconfigured online mode stays explicit and API requires server configuration', async ({
  page,
  request,
}) => {
  await page.goto('/operator');
  await expect(page.getByText(/La sala online está pendiente de configuración/)).toBeVisible();
  const response = await request.post('/api/rooms', { data: {} });
  expect(response.status()).toBe(401);
});
