import { test, expect, type Page } from '@playwright/test';
import type { LiveState } from '../../src/lib/room-types';

type ObservedWindow = Window & { latestState?: LiveState };

test('shared projector with one phone + three CPUs, then two phones + two CPUs', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar la demo' }).click();
  await expect(page).toHaveURL(/control\/DEMO\d{2}/);
  const code = page.url().split('/').at(-1)!;
  const watcher = await context.newPage();
  // A spectator's computer can have a different system clock.
  await watcher.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + 3600000;
  });
  await watcher.goto(`/watch/${code}`);
  await expect(watcher.getByText('VISTA COMPARTIDA · SOLO LECTURA')).toBeVisible();
  await expect(page.getByText('Sala conectada', { exact: true })).toBeVisible();
  await watcher.evaluate((roomCode) => {
    const room = JSON.parse(localStorage.getItem(`fonda:${roomCode}`)!);
    const channel = new BroadcastChannel(`fonda:${room.id}:state`);
    channel.onmessage = (event) => {
      (window as ObservedWindow).latestState = event.data;
    };
  }, code);
  const snapshot = () => watcher.evaluate(() => (window as ObservedWindow).latestState);
  const host = await context.newPage();
  await host.goto(`/host/${code}`);
  await expect(watcher.getByRole('heading', { name: 'Esperando a la sala.' })).toBeHidden();
  await page.getByRole('checkbox', { name: 'Completar equipos libres con CPU' }).check();
  await page.getByLabel('Dificultad de la CPU').selectOption('hard');
  await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeDisabled();
  const phone = async (team: string) => {
    const p = await context.newPage();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`/play/${code}?team=${team}`);
    await p.getByLabel('Tu nombre').fill(`${team} humano`);
    await p.getByRole('button', { name: 'Entrar a la cancha' }).click();
    await p.getByRole('button', { name: 'Estoy listo' }).click();
    return p;
  };
  const creative = await phone('creative');
  await expect(page.getByText('1 persona + 3 CPU', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Completar equipos libres con CPU' }).uncheck();
  await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Completar equipos libres con CPU' }).check();
  await expect(page.getByRole('checkbox', { name: 'Ensayo sin puntos' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Ensayo sin puntos' })).toBeDisabled();
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  for (const screen of [host, watcher]) {
    await expect(screen.locator('.host-teams').getByText('CPU', { exact: true })).toHaveCount(3);
    await expect(screen.locator('.host-game-title')).toHaveText('Penales dieciocheros');
  }
  await expect(creative.getByRole('button', { name: 'Arriba izquierda' })).toBeEnabled();
  await creative.getByRole('button', { name: 'Arriba izquierda' }).click();
  // The CPU goalkeeper makes its own selection and the match advances.
  await expect(creative.getByText('Te toca atajar', { exact: true })).toBeVisible();
  const epoch = (await snapshot())!.hostEpoch;
  const roundId = (await snapshot())!.round!.id;
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  for (const screen of [host, watcher])
    await expect(screen.getByRole('heading', { name: 'Hacemos una pausa.' })).toBeVisible();
  await expect(creative.getByRole('button', { name: 'Arriba izquierda' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  // Closing/reopening a read-only view cannot acquire or replace the host lease.
  await watcher.reload();
  await expect(watcher.locator('.host-game-title')).toHaveText('Penales dieciocheros');
  await expect(host.getByRole('heading', { name: 'Hacemos una pausa.' })).toBeHidden();
  const lease = await page.evaluate(
    (roomCode) => JSON.parse(localStorage.getItem(`fonda:${roomCode}`)!).hostEpoch,
    code,
  );
  expect(lease).toBe(epoch);
  await watcher.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  const cancel = async () => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar ronda' }).click();
    await expect(page.getByRole('button', { name: 'Iniciar juego' })).toBeVisible();
  };
  await cancel();
  const lab = await phone('lab');
  await expect(page.getByText('2 personas + 2 CPU', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /01 Carrera de sacos/ }).click();
  await page.screenshot({ path: 'test-results/cpu-operator.png', fullPage: true });
  await page.getByRole('button', { name: 'Iniciar juego' }).click();
  for (const p of [creative, lab]) {
    await expect(p.getByRole('button', { name: 'Izquierda', exact: true })).toBeEnabled();
    await p.getByRole('button', { name: 'Izquierda', exact: true }).click();
    await p.getByRole('button', { name: 'Derecha', exact: true }).click();
    await expect(p.locator('.race-progress')).toContainText('1/30 pasos');
  }
  for (const screen of [host, watcher]) {
    await expect(screen.locator('.host-teams').getByText('CPU', { exact: true })).toHaveCount(2);
    await expect(screen.locator('.host-game-title')).toHaveText('Carrera de sacos');
  }
  // Check a running timer (paused timers already use the host's pausedAt).
  // The spectator computer is one hour ahead, but must show the same time left.
  expect(parseInt(await host.locator('.timer').innerText())).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const values = await Promise.all([host, watcher].map((p) => p.locator('.timer').innerText()));
      return Math.abs(parseInt(values[0]) - parseInt(values[1]));
    })
    .toBeLessThanOrEqual(1);
  await watcher.screenshot({ path: 'test-results/cpu-shared-screen.png', fullPage: true });
  await creative.screenshot({ path: 'test-results/cpu-mobile.png', fullPage: true });
  await watcher.evaluate((roomCode) => {
    const room = JSON.parse(localStorage.getItem(`fonda:${roomCode}`)!);
    const channel = new BroadcastChannel(`fonda:${room.id}:state`);
    channel.onmessage = (event) => {
      (window as ObservedWindow).latestState = event.data;
    };
  }, code);
  await expect
    .poll(async () => {
      const state = await snapshot();
      const data = state?.round?.data;
      return data?.kind === 'sack-race' && data.steps.sports > 0 && data.steps.media > 0;
    })
    .toBe(true);
  const state = (await snapshot())!;
  expect(state.round!.id).not.toBe(roundId);
  expect(state.hostEpoch).toBe(epoch);
  expect(state.members).toHaveLength(2);
  expect(state.cpuTeams).toEqual(['sports', 'media']);
  expect(state.round!.data).toMatchObject({ steps: { creative: 1, lab: 1 } });
  await cancel();
  await expect(page.getByText('0 RONDAS CONFIRMADAS')).toBeVisible();
  await expect(watcher.locator('.host-game-title')).toHaveText('Bienvenidos a la FondaVS');
  for (const p of [creative, lab] as Page[])
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
