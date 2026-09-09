'use client';
import type { Action, PublicRound } from '@/game/types';
import { turnKey } from '@/game/engine';
import type { Command } from '@/game/protocol';
import type { LiveState, Room } from '@/lib/room-types';
import { isDemo } from '@/lib/rooms';
import { Bus } from './bus';
export class Player {
  private bus: Bus;
  private round: PublicRound | null = null;
  private epoch = 0;
  private sequence = 0;
  private initialized = false;
  private queue: Command[] = [];
  private ready = false;
  private lastPong = 0;
  private lastState = 0;
  private version = 0;
  private closed = false;
  private memberAcknowledged = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private resend: ReturnType<typeof setInterval> | undefined;
  constructor(
    private room: Room,
    private onState: (s: LiveState) => void,
    private onConnection: (online: boolean, ping: number) => void,
    private onError: (s: string) => void,
  ) {
    this.bus = new Bus(room.id, isDemo(room.code), (message) => {
      this.onConnection(false, 0);
      if (message) this.onError(message);
    });
  }
  async start() {
    const m = this.room.member;
    if (!m) throw new Error('Elige tu equipo.');
    const stateSubscription = this.bus.listen('state', (p) => {
      if (this.closed) return;
      const s = p as LiveState;
      if (
        typeof s.version !== 'number' ||
        s.hostEpoch < this.epoch ||
        (s.hostEpoch === this.epoch && s.version <= this.version)
      )
        return;
      if (s.hostEpoch !== this.epoch) {
        this.epoch = s.hostEpoch;
        this.queue = [];
        this.initialized = false;
        this.sequence = 0;
      }
      this.version = s.version;
      this.lastState = Date.now();
      this.round = s.round;
      if (!s.members.some((x) => x.id === m.id)) {
        // The host refreshes its roster asynchronously after an atomic join.
        // Only treat absence as revocation after it has acknowledged this member once.
        if (this.memberAcknowledged) {
          this.onError('El operador liberó tu plaza. Vuelve a elegir equipo.');
          this.close();
        }
        return;
      }
      this.memberAcknowledged = true;
      this.onState(s);
    });
    const outputSubscription = this.bus.listen(`out:${m.id}`, (p) => {
      if (this.closed) return;
      const data = p as { kind: string; at?: number; lastSeq?: number; seq?: number };
      if (data.kind === 'pong' && typeof data.at === 'number') {
        this.lastPong = Date.now();
        if (!this.initialized) {
          this.sequence = data.lastSeq ?? 0;
          this.initialized = true;
        }
        this.onConnection(
          this.memberAcknowledged && Date.now() - this.lastState < 4000,
          Math.max(0, Date.now() - data.at),
        );
      }
      if (data.kind === 'ack' && this.queue[0]?.seq === data.seq) {
        this.queue.shift();
        void this.transmit();
      }
    });
    if (this.closed) return;
    // Keep heartbeats and both listeners alive if one subscription initially
    // fails, so the SDK can recover without leaving the controller half-started.
    this.timer = setInterval(() => this.ping(), 1000);
    this.resend = setInterval(() => void this.transmit(), 350);
    this.ping();
    await Promise.all([stateSubscription, outputSubscription]);
  }
  private ping() {
    if (this.closed || !this.room.member) return;
    const id = this.room.member.id;
    void this.bus
      .send(`in:${id}`, { kind: 'ping', at: Date.now(), ready: this.ready, memberId: id })
      .catch((e) => {
        if (this.closed) return;
        this.onConnection(false, 0);
        this.onError(e instanceof Error ? e.message : 'No se pudo conectar el control.');
      });
    if (Date.now() - this.lastPong > 4000 || Date.now() - this.lastState > 4000)
      this.onConnection(false, 0);
  }
  setReady(value: boolean) {
    this.ready = value;
    if (this.timer) this.ping();
  }
  action(action: Action) {
    if (
      !this.room.member ||
      !this.round ||
      !this.initialized ||
      Date.now() - this.lastPong > 4000 ||
      Date.now() - this.lastState > 4000 ||
      this.queue.length >= 12
    )
      return;
    this.queue.push({
      version: 1,
      memberId: this.room.member.id,
      hostEpoch: this.epoch,
      roundId: this.round.id,
      turnId: turnKey(this.round),
      seq: ++this.sequence,
      action,
    });
    if (this.queue.length === 1) void this.transmit();
  }
  private async transmit() {
    if (this.closed || !this.queue.length) return;
    try {
      await this.bus.send(`in:${this.room.member!.id}`, this.queue[0]);
    } catch {
      this.onConnection(false, 0);
    }
  }
  close() {
    this.closed = true;
    this.onConnection(false, 0);
    clearInterval(this.timer);
    clearInterval(this.resend);
    this.bus.close();
  }
}
