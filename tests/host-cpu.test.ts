import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Host } from '@/lib/realtime/host';
import { TEAMS } from '@/game/types';
import type { LiveState, Room } from '@/lib/room-types';

const transport = vi.hoisted(() => ({
  listeners: new Map<string, (payload: unknown) => void>(),
  action: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@/lib/rooms', () => ({
  roomAction: transport.action,
  getRoom: transport.get,
  isDemo: () => true,
}));
vi.mock('@/lib/realtime/bus', () => ({
  Bus: class {
    async listen(topic: string, listener: (payload: unknown) => void) {
      transport.listeners.set(topic, listener);
    }
    async send() {}
    remove(topic: string) {
      transport.listeners.delete(topic);
    }
    close() {
      transport.listeners.clear();
    }
  },
}));

let room: Room;
let state: LiveState;
let host: Host;
let onBegin: (() => void) | undefined;
const online = new Set<string>();

function humanCount(count: number) {
  room.members = TEAMS.slice(0, count).map((team) => ({
    id: `human-${team}`,
    team,
    nickname: team,
  }));
}
function ping() {
  for (const member of room.members) {
    if (online.has(member.id))
      transport.listeners.get(`in:${member.id}`)?.({
        kind: 'ping',
        at: Date.now(),
        ready: true,
        memberId: member.id,
      });
  }
}
async function boot(count: number) {
  humanCount(count);
  await host.start();
  room.members.forEach((m) => online.add(m.id));
  ping();
  setInterval(ping, 1000);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(100000);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal('window', new EventTarget());
  online.clear();
  onBegin = undefined;
  transport.listeners.clear();
  transport.action.mockReset();
  room = {
    id: 'room',
    code: 'DEMO01',
    phase: 'waiting',
    hostEpoch: 1,
    isOwner: true,
    member: null,
    members: [],
    results: [],
  };
  transport.get.mockImplementation(async () => structuredClone(room));
  transport.action.mockImplementation(async (_code, body) => {
    if (body.action === 'begin') {
      onBegin?.();
      room.phase = 'playing';
    }
    if (body.action === 'abort' || body.action === 'finish') room.phase = 'waiting';
    return structuredClone(room);
  });
  host = new Host(
    'DEMO01',
    (value) => {
      state = value;
    },
    () => {},
    'host',
  );
});
afterEach(() => {
  host.stop();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('projector authority with human controls and CPU', () => {
  it.each([1, 2, 3])(
    'runs %i humans with only the vacant teams as CPUs and forces practice',
    async (count) => {
      await boot(count);
      await host.control({ type: 'start', game: 'sack-race', practice: false, cpu: 'normal' });
      expect(state.cpuTeams).toEqual(TEAMS.slice(count));
      expect(state.members).toHaveLength(count);
      expect(state.round?.practice).toBe(true);
      expect(transport.action).toHaveBeenCalledWith(
        'DEMO01',
        expect.objectContaining({ action: 'begin', practice: true }),
      );
      await vi.advanceTimersByTimeAsync(6000);
      const data = state.round!.data;
      if (data.kind !== 'sack-race') throw Error();
      for (const human of TEAMS.slice(0, count)) expect(data.steps[human]).toBe(0);
      for (const cpu of TEAMS.slice(count)) expect(data.steps[cpu]).toBeGreaterThan(0);
      await host.control({ type: 'pause' });
      const frozen = structuredClone(state.round!.data);
      await vi.advanceTimersByTimeAsync(3000);
      expect(state.round!.data).toEqual(frozen);
      await host.control({ type: 'resume' });
      await vi.advanceTimersByTimeAsync(2000);
      expect(state.round!.data).not.toEqual(frozen);
    },
  );

  it('rejects a start with no people, occupied unready teams, or invalid CPU difficulty', async () => {
    await boot(0);
    await expect(
      host.control({ type: 'start', game: 'memory', practice: true, cpu: 'normal' }),
    ).rejects.toThrow('al menos un celular');
    humanCount(2);
    await host.refresh();
    online.add(room.members[0].id);
    ping();
    await expect(
      host.control({ type: 'start', game: 'memory', practice: true, cpu: 'normal' }),
    ).rejects.toThrow('Todos los representantes');
    await expect(
      host.control({ type: 'start', game: 'memory', practice: true, cpu: 'invalid' as 'normal' }),
    ).rejects.toThrow('dificultad válida');
    expect(transport.action.mock.calls.some(([, body]) => body.action === 'begin')).toBe(false);
  });

  it('pauses on a disconnected human without replacing their team and resumes after reconnection', async () => {
    await boot(2);
    await host.control({ type: 'start', game: 'memory', practice: true, cpu: 'hard' });
    await vi.advanceTimersByTimeAsync(3500);
    online.delete('human-lab');
    await vi.advanceTimersByTimeAsync(5000);
    expect(state.round?.pausedAt).not.toBeNull();
    expect(state.cpuTeams).toEqual(['sports', 'media']);
    await expect(host.control({ type: 'resume' })).rejects.toThrow('controles de los jugadores');
    online.add('human-lab');
    ping();
    await host.control({ type: 'resume' });
    expect(state.round?.pausedAt).toBeNull();
  });

  it('removes CPUs on cancellation and supports a subsequent four-person round', async () => {
    await boot(1);
    await host.control({ type: 'start', game: 'penalties', practice: true, cpu: 'easy' });
    await host.control({ type: 'abort' });
    expect(state.cpuTeams).toEqual([]);
    expect(state.round).toBeNull();
    humanCount(4);
    await host.refresh();
    room.members.forEach((m) => online.add(m.id));
    ping();
    await host.control({ type: 'start', game: 'sack-race', practice: false });
    await vi.advanceTimersByTimeAsync(5000);
    expect(state.cpuTeams).toEqual([]);
    expect(state.round?.practice).toBe(false);
    expect(state.round?.data).toMatchObject({
      steps: { creative: 0, lab: 0, sports: 0, media: 0 },
    });
  });

  it('rechecks membership returned by begin so a joining human never shares a CPU team', async () => {
    await boot(1);
    onBegin = () => humanCount(2);
    await expect(
      host.control({ type: 'start', game: 'rayuela', practice: true, cpu: 'normal' }),
    ).rejects.toThrow('Cambió la lista');
    expect(room.phase).toBe('waiting');
    expect(state.cpuTeams).toEqual([]);
    expect(state.round).toBeNull();
  });

  it('confirms a completed CPU practice once without creating a championship result', async () => {
    await boot(1);
    await host.control({ type: 'start', game: 'sack-race', practice: false, cpu: 'hard' });
    await vi.advanceTimersByTimeAsync(95000);
    expect(state.round?.phase).toBe('finished');
    expect(state.results).toEqual([]);
    const finishes = transport.action.mock.calls.filter(([, body]) => body.action === 'finish');
    expect(finishes).toHaveLength(1);
    expect(finishes[0][1].result).toBeUndefined();
    expect(state.notice).toContain('Práctica con CPU terminada');
  });
});
