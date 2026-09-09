'use client';
import { useEffect, useState } from 'react';
import type { LiveState, Room } from '@/lib/room-types';
import { isDemo } from '@/lib/rooms';
import { Bus } from './bus';
export function useLive(room: Room | null) {
  const [state, setState] = useState<LiveState | null>(null);
  const [online, setOnline] = useState(false);
  const [bus, setBus] = useState<Bus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setState(null);
    setOnline(false);
    setError('');
    if (!room) return;
    let active = true;
    let last = 0,
      epoch = -1,
      version = 0;
    const b = new Bus(room.id, isDemo(room.code), (message) => {
      if (!active) return;
      setOnline(false);
      if (message) setError(message);
    });
    setBus(b);
    void b
      .listen('state', (p) => {
        if (!active) return;
        const s = p as LiveState;
        if (
          typeof s.version !== 'number' ||
          s.hostEpoch < epoch ||
          (s.hostEpoch === epoch && s.version <= version)
        )
          return;
        last = Date.now();
        epoch = s.hostEpoch;
        version = s.version;
        setState(s);
        setOnline(true);
        setError('');
      })
      .catch((e) => {
        if (active) {
          setOnline(false);
          setError(e.message);
        }
      });
    const timer = setInterval(() => setOnline(Date.now() - last < 4000), 1000);
    return () => {
      active = false;
      clearInterval(timer);
      b.close();
      setBus(null);
    };
  }, [room?.id, room?.code]); // eslint-disable-line react-hooks/exhaustive-deps
  return { state, online, bus, error };
}
