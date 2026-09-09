'use client';
import {
  advanceRound,
  applyAction,
  createRound,
  pauseRound,
  publicRound,
  resumeRound,
  turnKey,
} from '@/game/engine';
import { CommandGate, commandSchema } from '@/game/protocol';
import { GAMES, TEAMS, type Round } from '@/game/types';
import { getRoom, isDemo, roomAction } from '@/lib/rooms';
import type { ControlAction, LiveState, Room } from '@/lib/room-types';
import { Bus } from './bus';
export class Host {
  private room!: Room;
  private bus!: Bus;
  private round: Round | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private gate = new CommandGate();
  private lastSeen = new Map<string, { at: number; ready: boolean }>();
  private subscribed = new Set<string>();
  private version = 0;
  private lastPublish = 0;
  private leaseAt = 0;
  private saving = false;
  private busy = false;
  private stopped = false;
  private networkLost = false;
  private notice = '';
  private recorded = new Set<string>();
  constructor(
    private code: string,
    private onState: (s: LiveState) => void,
    private onError: (error: string) => void,
    private instance = crypto.randomUUID(),
  ) {}
  async start() {
    this.room = await roomAction(this.code, { action: 'claim', instance: this.instance });
    if (this.stopped) return;
    if (!this.room.isOwner) throw new Error('Esta cuenta no es la operadora de la sala.');
    this.leaseAt = Date.now();
    this.bus = new Bus(this.room.id, isDemo(this.code), () => this.lost());
    await this.bus.listen('control', (p) => {
      const m = p as { kind?: string; action?: ControlAction };
      if (m.kind === 'control' && m.action)
        void this.control(m.action).catch((e) => {
          this.notice = e.message;
          this.publish();
        });
    });
    await this.refreshMembers();
    if (this.stopped) return;
    this.publish();
    this.timer = setInterval(() => this.tick(), 50);
    this.pingTimer = setInterval(() => void this.heartbeat(), 2000);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('offline', this.offline);
  }
  private visibility = () => {
    if (document.hidden && this.round && this.round.phase !== 'finished') {
      this.round = pauseRound(this.round, Date.now());
      this.notice = 'El proyector quedó en segundo plano. Vuelve a mostrarlo y reanuda.';
      this.publish();
    }
  };
  private offline = () => this.lost();
  private lost() {
    this.networkLost = true;
    if (this.round && this.round.phase !== 'finished')
      this.round = pauseRound(this.round, Date.now());
    this.notice =
      'Se perdió la conexión. Cancela esta ronda y vuelve a iniciarla cuando la red se estabilice.';
    this.publish();
  }
  private async heartbeat() {
    if (this.stopped) return;
    try {
      this.room = await roomAction(this.code, {
        action: 'heartbeat',
        instance: this.instance,
        epoch: this.room.hostEpoch,
      });
      this.leaseAt = Date.now();
      await this.refreshMembers();
      this.publish();
    } catch (e) {
      this.lost();
      this.onError(e instanceof Error ? e.message : 'No se pudo renovar la sala.');
    }
  }
  private async refreshMembers() {
    const active = new Set(this.room.members.map((m) => m.id));
    for (const id of this.subscribed) {
      if (!active.has(id)) {
        this.bus.remove(`in:${id}`);
        this.bus.remove(`out:${id}`);
        this.subscribed.delete(id);
        this.lastSeen.delete(id);
      }
    }
    for (const m of this.room.members) {
      if (this.subscribed.has(m.id)) continue;
      this.subscribed.add(m.id);
      await this.bus.listen(`in:${m.id}`, (payload) => this.receive(m.id, payload));
    }
  }
  private receive(id: string, payload: unknown) {
    if (this.stopped || !this.room.members.some((m) => m.id === id)) return;
    const now = Date.now();
    const p = payload as { kind?: string; at?: number; ready?: boolean; memberId?: string };
    if (
      p.kind === 'ping' &&
      p.memberId === id &&
      typeof p.at === 'number' &&
      Number.isFinite(p.at)
    ) {
      this.lastSeen.set(id, { at: now, ready: !!p.ready });
      void this.bus
        .send(`out:${id}`, { kind: 'pong', at: p.at, hostAt: now, lastSeq: this.gate.sequence(id) })
        .catch(() => {});
      return;
    }
    const parsed = commandSchema.safeParse(payload);
    if (!parsed.success) return;
    const c = parsed.data;
    if (c.memberId !== id) return;
    const status = this.gate.check(id, c.seq, now);
    if (status === 'gap') return;
    let accepted = false;
    let reason: string = status;
    if (
      status === 'ok' &&
      now - this.leaseAt < 5000 &&
      !this.networkLost &&
      this.round &&
      c.hostEpoch === this.room.hostEpoch &&
      c.roundId === this.round.id &&
      c.turnId === turnKey(this.round)
    ) {
      const member = this.room.members.find((m) => m.id === id)!;
      const result = applyAction(this.round, member.team, c.action, now);
      this.round = result.round;
      accepted = result.accepted;
      reason = accepted ? 'ok' : 'turn';
      if (accepted) this.publish();
    }
    void this.bus.send(`out:${id}`, { kind: 'ack', seq: c.seq, accepted, reason }).catch(() => {});
  }
  private tick() {
    if (this.stopped) return;
    const now = Date.now();
    if (now - this.leaseAt >= 5000 && !this.networkLost) this.lost();
    if (this.round && !this.networkLost) {
      const playing = this.round.phase !== 'finished' && this.round.pausedAt === null;
      if (playing && this.round.phase === 'playing') {
        const missing = this.room.members.some(
          (m) => now - (this.lastSeen.get(m.id)?.at ?? 0) > 4000,
        );
        if (missing) {
          this.round = pauseRound(this.round, now);
          this.notice = 'Un control dejó de responder. Reconéctalo y reanuda la partida.';
        }
      }
      this.round = advanceRound(this.round, now);
      if (this.round.phase === 'finished' && !this.recorded.has(this.round.id) && !this.saving)
        void this.save();
    }
    if (now - this.lastPublish >= 100) this.publish();
  }
  async control(action: ControlAction) {
    if (this.busy || this.stopped) return;
    const now = Date.now();
    if (now - this.leaseAt >= 5000) throw new Error('La conexión del proyector no está lista.');
    if (action.type === 'start') {
      if (!GAMES.includes(action.game)) return;
      if (this.round && this.round.phase !== 'finished')
        throw new Error('Cancela o termina la ronda actual.');
      if (this.saving) throw new Error('Espera a que se confirme el resultado.');
      if (
        !TEAMS.every((t) =>
          this.room.members.some(
            (m) =>
              m.team === t &&
              this.lastSeen.get(m.id)?.ready &&
              now - (this.lastSeen.get(m.id)?.at ?? 0) < 4000,
          ),
        )
      )
        throw new Error('Los cuatro equipos deben estar conectados y listos.');
      this.busy = true;
      try {
        const id = crypto.randomUUID();
        this.room = await roomAction(this.code, {
          action: 'begin',
          instance: this.instance,
          epoch: this.room.hostEpoch,
          roundId: id,
          game: action.game,
          practice: action.practice,
        });
        this.networkLost = false;
        this.round = createRound(
          action.game,
          Date.now(),
          id,
          crypto.getRandomValues(new Uint32Array(1))[0],
          action.practice,
        );
        this.notice = '';
      } finally {
        this.busy = false;
      }
    } else if (action.type === 'pause' && this.round) {
      this.round = pauseRound(this.round, now);
      this.notice = 'Partida pausada por el operador.';
    } else if (action.type === 'resume' && this.round) {
      if (this.networkLost)
        throw new Error('Esta ronda perdió conexión. Cancélala y vuelve a comenzar.');
      if (this.room.members.some((m) => now - (this.lastSeen.get(m.id)?.at ?? 0) > 4000))
        throw new Error('Espera a que vuelvan los cuatro controles.');
      this.round = resumeRound(this.round, now);
      this.notice = '';
    } else if (action.type === 'abort') {
      this.busy = true;
      try {
        this.room = await roomAction(this.code, {
          action: 'abort',
          instance: this.instance,
          epoch: this.room.hostEpoch,
        });
        this.round = null;
        this.networkLost = false;
        this.notice = 'Ronda cancelada. El campeonato conserva sus resultados confirmados.';
      } finally {
        this.busy = false;
      }
    }
    this.publish();
  }
  private async save() {
    const r = this.round;
    if (!r || this.saving) return;
    this.saving = true;
    this.publish();
    try {
      const result = {
        id: r.id,
        game: r.game,
        placements: r.placements,
        createdAt: new Date().toISOString(),
      };
      this.room = await roomAction(this.code, {
        action: 'finish',
        instance: this.instance,
        epoch: this.room.hostEpoch,
        roundId: r.id,
        placements: r.placements,
        result: r.practice ? undefined : result,
      });
      this.recorded.add(r.id);
      this.notice = r.practice
        ? 'Ensayo terminado. No suma puntos.'
        : 'Resultado confirmado en el campeonato.';
    } catch (e) {
      this.notice = e instanceof Error ? e.message : 'No se pudo guardar. Reintentando…';
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } finally {
      this.saving = false;
      this.publish();
    }
  }
  private publish() {
    if (this.stopped || !this.room) return;
    const now = Date.now();
    this.lastPublish = now;
    const state: LiveState = {
      hostEpoch: this.room.hostEpoch,
      version: ++this.version,
      sentAt: now,
      round: this.round ? publicRound(this.round) : null,
      members: this.room.members.map((m) => ({
        ...m,
        online: now - (this.lastSeen.get(m.id)?.at ?? 0) < 4000,
        ready: this.lastSeen.get(m.id)?.ready ?? false,
      })),
      results: this.room.results,
      saving: this.saving,
      notice: this.notice,
    };
    this.onState(state);
    if (this.bus) void this.bus.send('state', state).catch(() => {});
  }
  async refresh() {
    this.room = await getRoom(this.code);
    await this.refreshMembers();
    this.publish();
  }
  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    clearInterval(this.pingTimer);
    this.bus?.close();
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('offline', this.offline);
  }
}
