import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Player } from '@/lib/realtime/player';
import type { LiveState, Room } from '@/lib/room-types';

const transport = vi.hoisted(() => ({
  listeners: new Map<string, (payload: unknown) => void>(),
  failState: true,
  send: vi.fn(async () => {}),
}));
vi.mock('@/lib/rooms', () => ({ isDemo: () => false }));
vi.mock('@/lib/realtime/bus', () => ({
  Bus: class {
    async listen(topic: string, callback: (payload: unknown) => void) {
      transport.listeners.set(topic, callback);
      if (topic === 'state' && transport.failState) throw new Error('initial subscription failure');
    }
    send = transport.send;
    close() {}
  },
}));

const member = { id: 'member', team: 'creative' as const, nickname: 'Humano' };
const room: Room = {
  id: 'room',
  code: 'ABC234',
  phase: 'waiting',
  hostEpoch: 1,
  isOwner: false,
  members: [member],
  member,
  results: [],
};
let player: Player;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  transport.listeners.clear();
  transport.send.mockClear();
  transport.failState = true;
});
afterEach(() => {
  player?.close();
  vi.useRealTimers();
});

it('keeps both listeners and ready heartbeats alive after an initial channel failure', async () => {
  const onState = vi.fn(),
    onConnection = vi.fn();
  player = new Player(room, onState, onConnection, vi.fn());
  player.setReady(true); // Human can prepare before a projector or connection exists.
  await expect(player.start()).rejects.toThrow('initial subscription failure');
  expect(transport.listeners.has('out:member')).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(transport.send).toHaveBeenCalledWith(
    'in:member',
    expect.objectContaining({ kind: 'ping', ready: true }),
  );
  const state: LiveState = {
    hostEpoch: 1,
    version: 1,
    sentAt: Date.now(),
    round: null,
    members: [{ ...member, online: true, ready: true }],
    cpuTeams: [],
    cpuDifficulty: null,
    results: [],
    saving: false,
    notice: '',
  };
  transport.listeners.get('state')!(state);
  transport.listeners.get('out:member')!({ kind: 'pong', at: Date.now() - 20, lastSeq: 0 });
  expect(onState).toHaveBeenCalledWith(state);
  expect(onConnection).toHaveBeenLastCalledWith(true, 20);
  player.close();
  const count = transport.send.mock.calls.length;
  await vi.advanceTimersByTimeAsync(2000);
  expect(transport.send).toHaveBeenCalledTimes(count);
});
