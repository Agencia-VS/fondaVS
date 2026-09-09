'use client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeSession, supabase } from '@/lib/supabase/browser';
type Listener = (payload: unknown) => void;
function topicLabel(topic: string) {
  if (topic === 'state') return 'estado';
  if (topic === 'control') return 'operador';
  if (topic.startsWith('in:')) return 'entrada del control';
  if (topic.startsWith('out:')) return 'respuesta al control';
  return 'sala';
}

function connectionMessage(topic: string, status: string, cause?: Error) {
  const detail = cause?.message.replace(/\s+/g, ' ').trim().slice(0, 180);
  return `No se pudo conectar el canal de ${topicLabel(topic)} (${status}).${
    detail ? ` Detalle de Supabase: ${detail}` : ''
  }`;
}
// Supabase reuses a channel object by topic until its asynchronous removal
// finishes. A new controller must not subscribe to the old, closing object.
const removals = new Map<string, Promise<void>>();
export class Bus {
  private channels = new Map<
    string,
    {
      local?: BroadcastChannel;
      remote?: RealtimeChannel;
      ready: Promise<void>;
      listeners: Set<Listener>;
      failure?: Error;
      cancel?: () => void;
    }
  >();
  private closed = false;
  private authReady: Promise<void> | undefined;
  constructor(
    private roomId: string,
    private demo: boolean,
    private onDisconnect: (message?: string) => void = () => {},
  ) {}
  private authenticate() {
    if (this.demo) return Promise.resolve();
    if (this.authReady) return this.authReady;
    const pending = realtimeSession().catch((error) => {
      if (this.authReady === pending) this.authReady = undefined;
      throw error;
    });
    this.authReady = pending;
    return pending;
  }
  private ensure(topic: string) {
    let entry = this.channels.get(topic);
    if (entry) return entry;
    const listeners = new Set<Listener>();
    if (this.demo) {
      const local = new BroadcastChannel(`fonda:${this.roomId}:${topic}`);
      local.onmessage = (e) => listeners.forEach((fn) => fn(e.data));
      entry = { local, listeners, ready: Promise.resolve() };
    } else {
      const remote = supabase().channel(`fonda:${this.roomId}:${topic}`, {
        config: { private: true, broadcast: { ack: true, self: false } },
      });
      remote.on('broadcast', { event: 'msg' }, ({ payload }) =>
        listeners.forEach((fn) => fn(payload)),
      );
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const connection = {
        remote,
        listeners,
        ready,
        failure: undefined as Error | undefined,
        cancel: () => {},
      };
      entry = connection;
      this.channels.set(topic, connection);
      const fail = (status: string, cause?: Error) => {
        if (this.closed || this.channels.get(topic) !== connection) return;
        clearTimeout(timeout);
        const error = new Error(connectionMessage(topic, status, cause));
        connection.failure = error;
        rejectReady(error);
        this.onDisconnect(error.message);
      };
      const timeout = setTimeout(() => fail('TIMED_OUT'), 12000);
      connection.cancel = () => {
        clearTimeout(timeout);
        rejectReady(new Error('Conexión cerrada.'));
      };
      remote.subscribe((status, error) => {
        if (this.closed || this.channels.get(topic) !== connection) return;
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          connection.failure = undefined;
          // A rejected initial promise cannot be resolved again. Subsequent
          // sends must use the recovered subscription, not that old promise.
          connection.ready = Promise.resolve();
          resolveReady();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          fail(status, error);
        }
      });
    }
    this.channels.set(topic, entry);
    return entry;
  }
  async listen(topic: string, fn: Listener) {
    const removing = removals.get(`fonda:${this.roomId}:${topic}`);
    if (!this.demo && removing) await removing;
    await this.authenticate();
    if (this.closed) return;
    const e = this.ensure(topic);
    e.listeners.add(fn);
    if (e.failure) throw e.failure;
    await e.ready;
  }
  async send(topic: string, payload: unknown) {
    const removing = removals.get(`fonda:${this.roomId}:${topic}`);
    if (!this.demo && removing) await removing;
    await this.authenticate();
    if (this.closed) throw new Error('Conexión cerrada.');
    const e = this.ensure(topic);
    if (e.failure) throw e.failure;
    await e.ready;
    if (this.closed) return;
    if (e.local) e.local.postMessage(payload);
    else {
      const result = await e.remote!.send({ type: 'broadcast', event: 'msg', payload });
      if (result !== 'ok') throw new Error('No se pudo enviar la acción.');
    }
  }
  remove(topic: string) {
    const e = this.channels.get(topic);
    if (!e) return;
    this.channels.delete(topic);
    e.cancel?.();
    e.local?.close();
    if (e.remote) {
      const key = `fonda:${this.roomId}:${topic}`;
      const removal = Promise.resolve(supabase().removeChannel(e.remote))
        .then(() => {})
        .catch(() => {})
        .finally(() => {
          if (removals.get(key) === removal) removals.delete(key);
        });
      removals.set(key, removal);
    }
  }
  close() {
    this.closed = true;
    for (const t of this.channels.keys()) this.remove(t);
  }
}
