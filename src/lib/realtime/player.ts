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
    this.bus = new Bus(room.id, isDemo(room.code), () => this.onConnection(false, 0));
  }
  async start() {
    const m = this.room.member;
    if (!m) throw new Error('Elige tu equipo.');
    await this.bus.listen('state', (p) => {
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
    await this.bus.listen(`out:${m.id}`, (p) => {
      const data = p as { kind: string; at?: number; lastSeq?: number; seq?: number };
      if (data.kind === 'pong' && typeof data.at === 'number') {
        this.lastPong = Date.now();
        if (!this.initialized) {
          this.sequence = data.lastSeq ?? 0;
          this.initialized = true;
        }
        this.onConnection(Date.now() - this.lastState < 4000, Math.max(0, Date.now() - data.at));
      }
      if (data.kind === 'ack' && this.queue[0]?.seq === data.seq) {
        this.queue.shift();
        void this.transmit();
      }
    });
    if (this.closed) return;
    const ping = () => {
      void this.bus
        .send(`in:${m.id}`, { kind: 'ping', at: Date.now(), ready: this.ready, memberId: m.id })
        .catch(() => this.onConnection(false, 0));
      if (Date.now() - this.lastPong > 4000 || Date.now() - this.lastState > 4000)
        this.onConnection(false, 0);
    };
    this.timer = setInterval(ping, 1000);
    this.resend = setInterval(() => void this.transmit(), 350);
    ping();
  }
  setReady(value: boolean) {
    this.ready = value;
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
