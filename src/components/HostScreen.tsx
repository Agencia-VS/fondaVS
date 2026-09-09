'use client';
import { useEffect, useRef, useState } from 'react';
import { Host } from '@/lib/realtime/host';
import type { LiveState } from '@/lib/room-types';
import ProjectorScreen from './ProjectorScreen';

export default function HostScreen({ code }: { code: string }) {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const instance = useRef('');
  useEffect(() => {
    instance.current ||= crypto.randomUUID();
    let active = true;
    const host = new Host(
      code,
      (value) => {
        if (active) setState(value);
      },
      (value) => {
        if (active) setError(value);
      },
      instance.current,
    );
    void host.start().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
      host.stop();
    };
  }, [code, attempt]);
  return (
    <ProjectorScreen
      code={code}
      state={state}
      error={error}
      onReconnect={() => {
        setError('');
        setAttempt((value) => value + 1);
      }}
    />
  );
}
