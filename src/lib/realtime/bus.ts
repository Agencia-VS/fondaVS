'use client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/browser';
type Listener = (payload: unknown) => void;
export class Bus {
  private channels = new Map<
    string,
    {
      local?: BroadcastChannel;
      remote?: RealtimeChannel;
      ready: Promise<void>;
      listeners: Set<Listener>;
    }
  >();
  private closed = false;
  constructor(
    private roomId: string,
    private demo: boolean,
    private onDisconnect: () => void = () => {},
  ) {}
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
      const ready = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(new Error('No se pudo conectar la sala. Revisa la configuración de Realtime.')),
          12000,
        );
        remote.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout);
            if (!this.closed) this.onDisconnect();
            reject(new Error('Se perdió la conexión de la sala.'));
          }
        });
      });
      entry = { remote, listeners, ready };
    }
    this.channels.set(topic, entry);
    return entry;
  }
  async listen(topic: string, fn: Listener) {
    if (this.closed) return;
    const e = this.ensure(topic);
    e.listeners.add(fn);
    await e.ready;
  }
  async send(topic: string, payload: unknown) {
    if (this.closed) throw new Error('Conexión cerrada.');
    const e = this.ensure(topic);
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
    e.local?.close();
    if (e.remote) void supabase().removeChannel(e.remote);
    this.channels.delete(topic);
  }
  close() {
    this.closed = true;
    for (const t of this.channels.keys()) this.remove(t);
  }
}
