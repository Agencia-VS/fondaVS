'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Action, GAME_INFO, TEAM_INFO, TEAMS, Team } from '@/game/types';
import { controlState } from '@/game/controls';
import { GamePad } from './GamePad';
import { getRoom, isDemo, joinRoom } from '@/lib/rooms';
import { Player } from '@/lib/realtime/player';
import { LiveState, Room } from '@/lib/room-types';
import { Brand, ErrorMessage, Loading } from './Brand';
export default function PlayerScreen({
  code,
  initialTeam,
}: {
  code: string;
  initialTeam?: string;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<Team>(
    TEAMS.includes(initialTeam as Team) ? (initialTeam as Team) : 'creative',
  );
  const [name, setName] = useState('');
  const [online, setOnline] = useState(false);
  const [ping, setPing] = useState(0);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const player = useRef<Player | null>(null);
  useEffect(() => {
    let active = true;
    void getRoom(code)
      .then((r) => {
        if (active) setRoom(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [code]);
  useEffect(() => {
    if (!room?.member) return;
    let active = true;
    const p = new Player(
      room,
      (s) => {
        if (active) setState(s);
      },
      (o, ms) => {
        if (active) {
          setOnline(o);
          setPing(ms);
        }
      },
      (s) => {
        if (active) setError(s);
      },
    );
    player.current = p;
    void p.start().catch((e) => {
      if (active) setError(e.message);
    });
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => {
      active = false;
      p.close();
      clearInterval(timer);
    };
  }, [room]);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setRoom(await joinRoom(code, team, name || TEAM_INFO[team].name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo elegir equipo.');
      setRoom(await getRoom(code).catch(() => room));
    } finally {
      setBusy(false);
    }
  }
  if (!room)
    return error ? (
      <main className="narrow-page">
        <Brand />
        <ErrorMessage message={error} />
        <Link href="/">Volver al inicio</Link>
      </main>
    ) : (
      <Loading />
    );
  if (!room.member)
    return (
      <main className="player-join">
        <Brand />
        <span className="eyebrow">
          SALA {code}
          {isDemo(code) ? ' · DEMO' : ''}
        </span>
        <h1>
          ¿Por quién
          <br />
          <em>la juegas?</em>
        </h1>
        <p>
          Un representante por equipo.
          <br />
          El resto pone los aplausos.
        </p>
        <form onSubmit={join}>
          <div className="team-options">
            {TEAMS.map((t) => {
              const occupied = room.members.some((m) => m.team === t);
              return (
                <button
                  type="button"
                  key={t}
                  disabled={occupied}
                  onClick={() => setTeam(t)}
                  className={`team-option ${team === t ? 'selected' : ''}`}
                  style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}
                >
                  <span>{TEAM_INFO[t].short}</span>
                  <strong>{TEAM_INFO[t].name}</strong>
                  <small>{occupied ? 'Ocupado' : team === t ? 'Elegido ✓' : 'Disponible'}</small>
                </button>
              );
            })}
          </div>
          <label className="name-field">
            Tu nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="¿Cómo te llamas?"
              autoComplete="given-name"
            />
          </label>
          <button
            className="button primary full-width"
            disabled={busy || room.members.some((m) => m.team === team)}
          >
            {busy ? 'Conectando…' : 'Entrar a la cancha →'}
          </button>
        </form>
        <ErrorMessage message={error} />
        {isDemo(code) && <p className="hint">Demo entre pestañas de este navegador.</p>}
      </main>
    );
  const member = room.member;
  const info = TEAM_INFO[member.team];
  const round = state?.round;
  const { canPlay, role, seconds } = controlState(round, member.team, now, online);
  function action(a: Action) {
    player.current?.action(a);
  }
  return (
    <main className="controller" style={{ '--team': info.color } as React.CSSProperties}>
      <header className="controller-header">
        <Link href="/" aria-label="Volver a FondaVS">
          VS<span>✦</span>
        </Link>
        <span>
          {info.name}
          <small>{member.nickname}</small>
        </span>
        <span className={`connection ${online ? 'connected' : ''}`}>
          <i />
          {online ? 'En línea' : 'Conectando'}
        </span>
      </header>
      <ErrorMessage message={error} />
      {!online && (
        <p className="connection-notice" role="status">
          Esperando al proyector. Los botones se activarán al reconectar.
        </p>
      )}
      {!round || round.phase === 'finished' ? (
        <section className="controller-wait">
          <span className="eyebrow">{round ? 'RONDA TERMINADA' : 'ESTÁS EN EL EQUIPO'}</span>
          <div className="player-emblem">
            {info.short}
            <span>✦</span>
          </div>
          <h1>{round ? '¡Bien jugado!' : 'Ya estás dentro.'}</h1>
          <p>
            {round
              ? round.practice
                ? 'Fue un ensayo. El marcador no cambia.'
                : state?.saving
                  ? 'Confirmando el resultado…'
                  : 'Mira el resultado en el proyector.'
              : 'Mira el proyector y espera la señal del operador.'}
          </p>
          <button
            className={`button ${ready ? 'ready-button' : 'primary'}`}
            disabled={!online}
            onClick={() => {
              player.current?.setReady(!ready);
              setReady(!ready);
            }}
          >
            {ready ? 'Listo para jugar ✓' : 'Estoy listo →'}
          </button>
          <small>{ready ? 'Tu equipo está preparado.' : 'Avísanos cuando estés preparado.'}</small>
        </section>
      ) : (
        <>
          <div className="controller-game-heading">
            <span className="eyebrow">{round.practice ? 'ENSAYO' : 'EN JUEGO'}</span>
            <h1>{GAME_INFO[round.game].name}</h1>
            <p aria-live="polite">{role}</p>
          </div>
          {round.pausedAt !== null ? (
            <div className="mobile-overlay">
              <strong>Ⅱ Pausa</strong>
              <p>Conserva tu control abierto. El operador reanudará la ronda.</p>
            </div>
          ) : round.phase === 'countdown' ? (
            <div className="mobile-countdown">
              <span>PREPÁRATE</span>
              <strong>{seconds}</strong>
            </div>
          ) : null}
          <GamePad round={round} team={member.team} canPlay={canPlay} onAction={action} />
          <div className="controller-game-footer">
            <strong>
              {String(seconds).padStart(2, '0')}
              <small> SEG</small>
            </strong>
            <span>MIRA EL PROYECTOR ↑</span>
          </div>
        </>
      )}
      <footer className="controller-footer">
        <span>
          SALA {code}
          {isDemo(code) ? ' · DEMO' : ''}
        </span>
        <span>{online ? `${ping} ms` : 'Sin señal'}</span>
      </footer>
    </main>
  );
}
