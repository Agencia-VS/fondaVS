'use client';
import { useEffect, useState } from 'react';
import type { LiveState, Room } from '@/lib/room-types';
import { isDemo } from '@/lib/rooms';
import { Bus } from './bus';
export function useLive(room: Room | null) {
  const [state, setState] = useState<LiveState | null>(null);
  const [online, setOnline] = useState(false);
  const [bus, setBus] = useState<Bus | null>(null);
  useEffect(() => {
    if (!room) return;
    let last = 0,
      epoch = -1,
      version = 0;
    const b = new Bus(room.id, isDemo(room.code), () => setOnline(false));
    setBus(b);
    void b
      .listen('state', (p) => {
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
      })
      .catch(() => setOnline(false));
    const timer = setInterval(() => setOnline(Date.now() - last < 4000), 1000);
    return () => {
      clearInterval(timer);
      b.close();
      setBus(null);
    };
  }, [room?.id, room?.code]); // eslint-disable-line react-hooks/exhaustive-deps
  return { state, online, bus };
}
