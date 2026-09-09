'use client';
import { useEffect, useState } from 'react';
import { Brand, ErrorMessage, Loading } from './Brand';
import { GAMES, GAME_INFO, Game, TEAM_INFO, TEAMS } from '@/game/types';
import { getRoom, isDemo, roomAction } from '@/lib/rooms';
import { useRoomHost } from '@/lib/realtime/use-room-host';
import { ControlAction, Room } from '@/lib/room-types';
import RoomQR from './RoomQR';
import { Scoreboard } from './Scoreboard';
import { DIFFICULTIES, DIFFICULTY_INFO, type Difficulty } from '@/game/cpu';
import ProjectorScreen from './ProjectorScreen';
export default function Control({ code }: { code: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [game, setGame] = useState<Game>('penalties');
  const [practice, setPractice] = useState(true);
  const [fillWithCpu, setFillWithCpu] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const session = useRoomHost(room);
  const { state, online } = session;
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
    return () => {
      active = false;
    };
  }, [code]);
  async function command(action: ControlAction) {
    setError('');
    setPending(true);
    try {
      if (action.type === 'start' && !online)
        throw new Error('Espera a que la sala conecte o pulsa «Reconectar sala».');
      await session.command(action);
      if (action.type === 'start') setShowGame(true);
      if (action.type === 'abort') setShowGame(false);
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
      await session.refresh();
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
  const usingCpu = active ? !!state?.cpuTeams?.length : fillWithCpu;
  const cpuTeams = active
    ? (state?.cpuTeams ?? [])
    : fillWithCpu
      ? TEAMS.filter((t) => !members.some((m) => m.team === t))
      : [];
  const allReady =
    members.length > 0 &&
    members.every((m) => m.online && m.ready) &&
    (fillWithCpu || TEAMS.every((t) => members.some((m) => m.team === t)));
  const displayError = error || session.error;
  const reconnect = () => {
    if (active && !window.confirm('Reconectar la sala descarta esta ronda incompleta. ¿Continuar?'))
      return;
    setError('');
    setShowGame(false);
    session.reconnect();
  };
  const cancel = () => {
    if (window.confirm('¿Cancelar esta ronda? No sumará puntos.')) void command({ type: 'abort' });
  };
  if (showGame)
    return (
      <>
        <nav className="room-game-toolbar" aria-label="Controles del operador">
          <button className="button secondary" onClick={() => setShowGame(false)}>
            {round?.phase === 'finished' ? 'Elegir otro juego' : 'Volver al panel'}
          </button>
          <span>Tu celular es el control. Esta pantalla mantiene la partida.</span>
          {active && (
            <>
              <button
                className="button primary"
                disabled={pending}
                onClick={() => void command({ type: round.pausedAt !== null ? 'resume' : 'pause' })}
              >
                {round.pausedAt !== null ? 'Reanudar' : 'Pausar'}
              </button>
              <button className="button secondary" disabled={pending} onClick={cancel}>
                Cancelar ronda
              </button>
            </>
          )}
        </nav>
        <ProjectorScreen code={code} state={state} error={displayError} onReconnect={reconnect} />
      </>
    );
  return (
    <main className="control-page">
      <header className="topbar">
        <Brand />
        <span className="eyebrow">MESA DEL OPERADOR</span>
        <span className={`connection ${online ? 'connected' : ''}`}>
          <i />
          {online ? 'Sala conectada' : 'Conectando sala'}
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
            Prepara tu <em>partida.</em>
          </h1>
        </div>
        <button className="button primary" onClick={() => setShowGame(true)}>
          Ver cancha en esta pantalla →
        </button>
      </div>
      <ol className="room-steps" aria-label="Pasos para jugar">
        <li>
          <b>1. Sala abierta</b>
          <span>
            {online ? 'Este computador ya está conectado.' : 'Conectando este computador…'}
          </span>
        </li>
        <li>
          <b>2. Conecta los celulares</b>
          <span>Escanea el QR, elige equipo y toca «Estoy listo».</span>
        </li>
        <li>
          <b>3. Inicia el juego</b>
          <span>La cancha aparecerá aquí. Mantén esta ventana visible.</span>
        </li>
      </ol>
      <ErrorMessage message={displayError} />
      {(!online || session.error) && (
        <div className="room-reconnect">
          <p>
            Esta sala se activa automáticamente. Si otra ventana ya la administra, vuelve a esa
            ventana o ciérrala y espera 6 segundos antes de reconectar.
          </p>
          <button className="button secondary" onClick={reconnect}>
            Reconectar sala
          </button>
        </div>
      )}
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
          <div className="cpu-settings">
            <label className="practice-toggle">
              <input
                type="checkbox"
                checked={usingCpu}
                disabled={!!active || pending}
                onChange={(e) => setFillWithCpu(e.target.checked)}
              />
              <span>
                Completar equipos libres con CPU
                <small>1 persona + 3 CPU · 2 personas + 2 CPU · 3 personas + 1 CPU.</small>
              </span>
            </label>
            {usingCpu && (
              <>
                <label className="cpu-difficulty">
                  Dificultad de la CPU
                  <select
                    value={active ? (state?.cpuDifficulty ?? difficulty) : difficulty}
                    disabled={!!active || pending}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_INFO[d].name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="hint">
                  Cada persona usa su celular y mira esta pantalla. La CPU ocupa solo las plazas
                  libres al iniciar; esta práctica no suma al campeonato.
                </p>
              </>
            )}
          </div>
          <div className="start-controls">
            <label className="practice-toggle">
              <input
                type="checkbox"
                checked={active ? !!round.practice : fillWithCpu || practice}
                disabled={!!active || fillWithCpu || pending}
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
                onClick={() =>
                  void command({
                    type: 'start',
                    game,
                    practice: fillWithCpu || practice,
                    ...(fillWithCpu ? { cpu: difficulty } : {}),
                  })
                }
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
                <button className="button secondary" disabled={pending} onClick={cancel}>
                  Cancelar ronda
                </button>
              </div>
            )}
          </div>
          {!active && !allReady && (
            <small className="hint">
              {fillWithCpu
                ? 'Conecta al menos un celular. Todos los representantes deben tocar «Estoy listo». Una plaza ocupada sin conexión no se reemplaza por CPU; puedes liberarla aquí.'
                : 'Los cuatro representantes deben tocar «Estoy listo» en sus controles.'}
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
                ? 'Abre tus controles en otras pestañas; puedes completar las plazas libres con CPU.'
                : 'Escanea, elige tu equipo y prepárate.'}
            </p>
          </section>
          <section className="paper-panel remote-screen-panel">
            <h2>Otra pantalla (opcional)</h2>
            <p>
              Para jugar desde casas distintas, comparte esta vista del proyector. La otra persona
              la abre en su computador y usa su celular como control.
            </p>
            <a
              className="text-link"
              href={`/watch/${code}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir pantalla compartida ↗
            </a>
            <button
              type="button"
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/watch/${code}`);
                  setCopied(true);
                } catch {
                  setError('Abre la pantalla compartida y copia su dirección para enviarla.');
                }
              }}
            >
              {copied ? 'Enlace copiado ✓' : 'Copiar enlace de pantalla'}
            </button>
            <small>Esta vista no ocupa un equipo ni necesita la cuenta del operador.</small>
          </section>
          <section className="roster">
            <div className="section-label">
              <h2>Los equipos</h2>
              <span>
                {members.length} {members.length === 1 ? 'persona' : 'personas'}
                {cpuTeams.length ? ` + ${cpuTeams.length} CPU` : ' / 4'}
              </span>
            </div>
            {TEAMS.map((t) => {
              const m = members.find((x) => x.team === t);
              const cpu = cpuTeams.includes(t);
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
                        : cpu
                          ? active
                            ? 'CPU · Jugando'
                            : 'CPU si sigue libre al iniciar'
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
