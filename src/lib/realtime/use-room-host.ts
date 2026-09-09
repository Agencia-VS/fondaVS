'use client';
import { useEffect, useRef, useState } from 'react';
import type { ControlAction, LiveState, Room } from '@/lib/room-types';
import { Host } from './host';

/** The operator's room owns one engine; changing its view never remounts it. */
export function useRoomHost(room: Room | null) {
  const [state, setState] = useState<LiveState | null>(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const instance = useRef('');
  const engine = useRef<Host | null>(null);
  useEffect(() => {
    setState(null);
    setOnline(false);
    setError('');
    if (!room?.isOwner) return;
    let active = true;
    instance.current ||= crypto.randomUUID();
    const host = new Host(
      room.code,
      (next) => {
        if (!active) return;
        setState(next);
        setOnline(host.connected);
      },
      (message) => {
        if (active) setError(message);
      },
      instance.current,
    );
    engine.current = host;
    void host.start().catch((e) => {
      host.stop();
      if (active) {
        engine.current = null;
        setOnline(false);
        setError(
          e.message?.includes('proyector ya está abierto')
            ? 'Esta sala ya está abierta en otra ventana. Vuelve a esa ventana o ciérrala y espera 6 segundos antes de reconectar.'
            : e.message,
        );
      }
    });
    return () => {
      active = false;
      engine.current = null;
      host.stop();
    };
  }, [room?.id, room?.code, room?.isOwner, attempt]);
  return {
    state,
    online,
    error,
    reconnect: () => setAttempt((value) => value + 1),
    command: async (action: ControlAction) => {
      if (!engine.current) throw new Error('La sala no ha conectado. Pulsa «Reconectar sala».');
      await engine.current.control(action);
      setError('');
    },
    refresh: async () => {
      await engine.current?.refresh();
    },
  };
}
