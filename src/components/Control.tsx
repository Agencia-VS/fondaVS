'use client';
import { useEffect, useState } from 'react';
import { Brand, ErrorMessage, Loading } from './Brand';
import { GAMES, GAME_INFO, Game, TEAM_INFO, TEAMS } from '@/game/types';
import { getRoom, isDemo, roomAction } from '@/lib/rooms';
import { useLive } from '@/lib/realtime/use-live';
import { ControlAction, Room } from '@/lib/room-types';
import RoomQR from './RoomQR';
import { Scoreboard } from './Scoreboard';
export default function Control({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [game, setGame] = useState<Game>('penalties');
  const [practice, setPractice] = useState(true);
  const [pending, setPending] = useState(false);
  const { state, online, bus } = useLive(room);
  const demo = isDemo(code);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      getRoom(code)
        .then((r) => {
          if (!active) return;
          if (!r.isOwner) throw new Error('Esta sala pertenece a otro operador.');
          setRoom(r);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void refresh();
    const interval = setInterval(refresh, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code]);
  async function command(action: ControlAction) {
    setError('');
    setPending(true);
    try {
      if (!online || !bus) throw new Error('Abre el proyector y espera a que se conecte.');
      await bus.send('control', { kind: 'control', action });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la instrucción.');
    } finally {
      setTimeout(() => setPending(false), 500);
    }
  }
  async function release(id: string) {
    try {
      const r = await roomAction(code, { action: 'release', memberId: id });
      setRoom(r);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo liberar el equipo.');
    }
  }
  if (!room)
    return error ? (
      <main className="narrow-page">
        <Brand />
        <ErrorMessage message={error} />
        <a href="/operator">Volver al panel</a>
      </main>
    ) : (
      <Loading />
    );
  const round = state?.round;
  const active = round && round.phase !== 'finished';
  const members =
    state?.members ?? room.members.map((m) => ({ ...m, online: false, ready: false }));
  const allReady = TEAMS.every((t) => members.some((m) => m.team === t && m.online && m.ready));
  return (
    <main className="control-page">
      <header className="topbar">
        <Brand />
        <span className="eyebrow">MESA DEL OPERADOR</span>
        <span className={`connection ${online ? 'connected' : ''}`}>
          <i />
          {online ? 'Proyector conectado' : 'Proyector sin conectar'}
        </span>
      </header>
      {demo && (
        <div className="demo-banner">
          DEMO · Funciona entre pestañas de este navegador. Los teléfonos necesitan una sala online.
        </div>
      )}
      <div className="control-heading">
        <div>
          <span className="eyebrow">BIENVENIDOS A LA CANCHA</span>
          <h1>
            Tu sala está <em>lista.</em>
          </h1>
        </div>
        <a
          className="button primary"
          href={`/host/${code}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir proyector ↗
        </a>
      </div>
      <ErrorMessage message={error} />
      {state?.notice && (
        <p className="info-message" role="status">
          {state.notice}
        </p>
      )}
      <div className="control-grid">
        <section className="games-panel">
          <div className="section-label">
            <h2>Elige el juego</h2>
            <span>01 — 04</span>
          </div>
          <div className="game-cards">
            {GAMES.map((g) => (
              <button
                key={g}
                className={`game-card ${game === g ? 'selected' : ''}`}
                disabled={!!active}
                onClick={() => setGame(g)}
              >
                <span className="game-card-number">{GAME_INFO[g].number}</span>
                <span className="game-card-name">{GAME_INFO[g].name}</span>
                <small>{GAME_INFO[g].subtitle}</small>
                <span className="game-card-arrow">↗</span>
              </button>
            ))}
          </div>
          <div className="game-instructions">
            <span className="eyebrow">ASÍ SE JUEGA</span>
            <p>{GAME_INFO[game].how}</p>
          </div>
          <div className="start-controls">
            <label className="practice-toggle">
              <input
                type="checkbox"
                checked={practice}
                disabled={!!active}
                onChange={(e) => setPractice(e.target.checked)}
              />
              <span>
                Ensayo sin puntos<small>Ideal para explicar los controles.</small>
              </span>
            </label>
            {!active ? (
              <button
                className="button primary"
                disabled={!online || !allReady || pending || state?.saving}
                onClick={() => void command({ type: 'start', game, practice })}
              >
                {state?.saving ? 'Guardando resultado…' : 'Iniciar juego →'}
              </button>
            ) : (
              <div className="action-row">
                <button
                  className="button primary"
                  disabled={pending}
                  onClick={() =>
                    void command({ type: round.pausedAt !== null ? 'resume' : 'pause' })
                  }
                >
                  {round.pausedAt !== null ? 'Reanudar' : 'Pausar'}
                </button>
                <button
                  className="button secondary"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm('¿Cancelar esta ronda? No sumará puntos.'))
                      void command({ type: 'abort' });
                  }}
                >
                  Cancelar ronda
                </button>
              </div>
            )}
          </div>
          {!active && !allReady && (
            <small className="hint">
              Los cuatro representantes deben tocar «Estoy listo» en sus controles.
            </small>
          )}
        </section>
        <aside className="room-sidebar">
          <section className="paper-panel room-card">
            <span className="eyebrow">CÓDIGO DE SALA</span>
            <strong className="room-code">{code}</strong>
            {!demo && <RoomQR code={code} />}
            <p>
              {demo
                ? 'Abre los cuatro controles para probar.'
                : 'Escanea, elige tu equipo y prepárate.'}
            </p>
          </section>
          <section className="roster">
            <div className="section-label">
              <h2>Los equipos</h2>
              <span>{members.length}/4</span>
            </div>
            {TEAMS.map((t) => {
              const m = members.find((x) => x.team === t);
              return (
                <div
                  className="roster-team"
                  key={t}
                  style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}
                >
                  <span className="team-avatar">{TEAM_INFO[t].short}</span>
                  <span>
                    <strong>{TEAM_INFO[t].name}</strong>
                    <small>
                      {m
                        ? `${m.nickname} · ${m.online ? (m.ready ? 'Listo' : 'Preparándose') : 'Sin conexión'}`
                        : 'Esperando representante'}
                    </small>
                  </span>
                  {m && !active ? (
                    <button
                      className="icon-button"
                      aria-label={`Liberar ${TEAM_INFO[t].name}`}
                      onClick={() => void release(m.id)}
                    >
                      ×
                    </button>
                  ) : null}
                  {demo && !m && (
                    <a
                      className="text-link"
                      href={`/play/${code}?team=${t}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir ↗
                    </a>
                  )}
                </div>
              );
            })}
          </section>
        </aside>
      </div>
      <section className="championship">
        <div className="section-label">
          <h2>Campeonato de la fonda</h2>
          <span>{(state?.results ?? room.results).length} RONDAS CONFIRMADAS</span>
        </div>
        <Scoreboard results={state?.results ?? room.results} />
      </section>
    </main>
  );
}
