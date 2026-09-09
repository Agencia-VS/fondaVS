'use client';
import { useEffect, useState } from 'react';
import { getRoom, roomAction } from '@/lib/rooms';
import type { Room } from '@/lib/room-types';
import { useLive } from '@/lib/realtime/use-live';
import ProjectorScreen from './ProjectorScreen';

/** Subscribes to public game state only; never creates a Host or runs a CPU. */
export default function WatchScreen({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { state, online } = useLive(room);
  useEffect(() => {
    let active = true;
    void (async () => {
      await getRoom(code); // Establish the anonymous session before joining as a spectator.
      const registered = await roomAction(code, { action: 'watch' });
      if (active) setRoom(registered);
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [code, attempt]);
  return (
    <ProjectorScreen
      code={code}
      state={state}
      error={error}
      spectator
      online={online}
      onReconnect={() => {
        setRoom(null);
        setError('');
        setAttempt((value) => value + 1);
      }}
    />
  );
}
