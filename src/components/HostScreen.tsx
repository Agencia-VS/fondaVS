'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { GAME_INFO, TEAM_INFO, TEAMS } from '@/game/types';
import { Host } from '@/lib/realtime/host';
import { LiveState } from '@/lib/room-types';
import { isDemo } from '@/lib/rooms';
import { Brand, ErrorMessage } from './Brand';
import { Scoreboard } from './Scoreboard';
import RoomQR from './RoomQR';
const Stage = dynamic(() => import('./stage/Stage'), { ssr: false });
export default function HostScreen({ code }: { code: string }) {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const instance = useRef<string>('');
  const [now, setNow] = useState(0);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lastCue = useRef('');
  useEffect(() => {
    instance.current ||= crypto.randomUUID();
    let active = true;
    const h = new Host(
      code,
      (s) => {
        if (active) setState(s);
      },
      (s) => {
        if (active) setError(s);
      },
      instance.current,
    );
    void h.start().catch((e) => {
      if (active) setError(e.message);
    });
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => {
      active = false;
      h.stop();
      clearInterval(timer);
    };
  }, [code, attempt]);
  const round = state?.round;
  const data = round?.data;
  const deadline =
    round?.phase === 'countdown'
      ? round.startsAt
      : data && 'phaseEndsAt' in data
        ? data.phaseEndsAt
        : round?.endsAt;
  const seconds = deadline
    ? Math.max(0, Math.ceil((deadline - (round?.pausedAt ?? now)) / 1000))
    : 0;
  useEffect(() => {
    if (!sound || !round) return;
    const cue =
      round.phase === 'countdown'
        ? `${round.id}:${seconds}`
        : round.data.kind === 'penalties' && round.data.lastShot
          ? `${round.id}:shot:${round.data.shotId}:${round.data.phase}`
          : round.phase === 'finished'
            ? `${round.id}:done`
            : '';
    if (!cue || cue === lastCue.current) return;
    lastCue.current = cue;
    const a = audio.current;
    if (!a || a.state !== 'running') return;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = 'square';
    o.frequency.value = round.phase === 'finished' ? 660 : round.phase === 'countdown' ? 440 : 330;
    g.gain.setValueAtTime(0.035, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.15);
  }, [sound, round, seconds]);
  return (
    <main className="host-page">
      <header className="host-header">
        <Brand />
        <span className="host-game-title">
          {round ? GAME_INFO[round.game].name : 'Bienvenidos a la FondaVS'}
        </span>
        <span className="host-room">
          SALA <b>{code}</b>
        </span>
      </header>
      <div className="host-actions">
        <button
          onClick={() =>
            void document.documentElement
              .requestFullscreen()
              .catch(() => setError('Usa la opción de pantalla completa de tu navegador.'))
          }
        >
          Pantalla completa ⛶
        </button>
        <button
          onClick={async () => {
            audio.current ??= new AudioContext();
            await audio.current.resume();
            setSound((s) => !s);
          }}
        >
          {sound ? 'Sonido activado ♪' : 'Activar sonido ♪'}
        </button>
        {isDemo(code) && <span>DEMO · ESTE NAVEGADOR</span>}
      </div>
      {error && (
        <div className="host-error">
          <ErrorMessage message={error} />
          <button
            className="button secondary"
            onClick={() => {
              setError('');
              setAttempt((x) => x + 1);
            }}
          >
            Reconectar proyector
          </button>
        </div>
      )}
      <div className="host-main">
        <section className="host-stage">
          <Stage round={round} />
          {round?.pausedAt !== null && round?.pausedAt !== undefined && (
            <div className="stage-overlay">
              <span>Ⅱ</span>
              <h2>Hacemos una pausa.</h2>
              <p>{state?.notice}</p>
            </div>
          )}
          {round?.phase === 'finished' && (
            <div className="stage-overlay result-overlay">
              <span className="eyebrow">
                {round.practice ? 'ENSAYO TERMINADO' : 'RESULTADO DE LA RONDA'}
              </span>
              <h2>
                ¡Bien jugado, <em>{TEAM_INFO[round.placements[0].team].name}!</em>
              </h2>
              <div className="results-list">
                {round.placements.map((p) => (
                  <div key={p.team}>
                    <span>
                      #{p.rank} {TEAM_INFO[p.team].name}
                    </span>
                    <strong>{round.practice ? '—' : `+${p.points} pts`}</strong>
                  </div>
                ))}
              </div>
              <p>{state?.saving ? 'Confirmando resultado…' : state?.notice}</p>
            </div>
          )}
        </section>
        <aside className="host-aside">
          {!round ? (
            <>
              <span className="eyebrow">SÚMATE AL JUEGO</span>
              {!isDemo(code) && <RoomQR code={code} />}
              <strong className="room-code">{code}</strong>
              <p>Escanea el QR y elige tu equipo.</p>
            </>
          ) : (
            <>
              <span className="eyebrow">
                {round.practice ? 'ENSAYO SIN PUNTOS' : 'RONDA EN JUEGO'}
              </span>
              <div className="timer">
                {round.phase === 'finished' ? 'FIN' : String(seconds).padStart(2, '0')}
                <small>{round.phase === 'finished' ? 'BIEN JUGADO' : 'SEGUNDOS'}</small>
              </div>
              <p>{GAME_INFO[round.game].how}</p>
            </>
          )}
          <div className="host-teams">
            {TEAMS.map((t) => {
              const m = state?.members.find((x) => x.team === t);
              return (
                <div key={t} style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}>
                  <i />
                  <strong>{TEAM_INFO[t].name}</strong>
                  <span>{m?.online ? (m.ready ? 'LISTO' : 'CONECTADO') : 'ESPERANDO'}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      <div className="host-score">
        <span className="eyebrow">MARCADOR GENERAL</span>
        <Scoreboard results={state?.results ?? []} compact />
      </div>
    </main>
  );
}
