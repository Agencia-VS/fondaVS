'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_INFO, Difficulty } from '@/game/cpu';
import { controlState, keyboardAction, KEYBOARD_HINT } from '@/game/controls';
import { SoloSession } from '@/game/solo';
import {
  Action,
  Game,
  GAME_INFO,
  GAMES,
  PublicRound,
  ResultRecord,
  Team,
  TEAM_INFO,
  TEAMS,
} from '@/game/types';
import { Brand, Bunting } from './Brand';
import { GamePad } from './GamePad';
import { Scoreboard } from './Scoreboard';

const Stage = dynamic(() => import('./stage/Stage'), { ssr: false });

export default function SoloScreen() {
  const [team, setTeam] = useState<Team>('creative');
  const [game, setGame] = useState<Game>('penalties');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [round, setRound] = useState<PublicRound | null>(null);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const session = useRef<SoloSession | null>(null);
  const recorded = useRef(new Set<string>());
  const arena = useRef<HTMLElement>(null);

  const publish = useCallback((view: PublicRound, time: number) => {
    setRound(view);
    setNow(time);
    if (view.phase === 'finished' && !recorded.current.has(view.id)) {
      recorded.current.add(view.id);
      const result = {
        id: view.id,
        game: view.game,
        placements: view.placements,
        createdAt: new Date(time).toISOString(),
      };
      setResults((previous) => [...previous, result]);
    }
  }, []);

  const act = useCallback(
    (action: Action) => {
      const s = session.current;
      if (!s || document.hidden) return;
      const time = Date.now();
      if (controlState(s.view, s.team, time).canPlay) publish(s.action(action, time), time);
    },
    [publish],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const s = session.current;
      if (!s || document.hidden) return;
      const time = Date.now();
      if (s.view.phase !== 'finished') publish(s.tick(time), time);
    }, 50);
    const visibility = () => {
      const s = session.current;
      if (document.hidden && s && s.view.phase !== 'finished') {
        const time = Date.now();
        publish(s.pause(time), time);
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, select, textarea, button, a, [contenteditable="true"]')) return;
      const s = session.current;
      if (!s) return;
      const action = keyboardAction(s.view.game, event.key);
      if (action) {
        event.preventDefault();
        act(action);
      }
    };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('keydown', keyboard);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('keydown', keyboard);
    };
  }, [act, publish]);

  function start() {
    const time = Date.now();
    const seeds = crypto.getRandomValues(new Uint32Array(4));
    const s = new SoloSession(team, game, difficulty, time, crypto.randomUUID(), [
      seeds[0],
      seeds[1],
      seeds[2],
      seeds[3],
    ]);
    session.current = s;
    publish(s.view, time);
    arena.current?.focus({ preventScroll: true });
    arena.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function pauseOrResume() {
    const s = session.current;
    if (!s) return;
    const time = Date.now();
    publish(s.view.pausedAt === null ? s.pause(time) : s.resume(time), time);
    arena.current?.focus({ preventScroll: true });
  }

  function chooseGame() {
    session.current = null;
    setRound(null);
  }

  const { canPlay, role, seconds } = controlState(round, team, now);
  const finished = round?.phase === 'finished';
  const active = !!round && !finished;
  const info = TEAM_INFO[team];
  const placement = round?.placements.find((p) => p.team === team);

  return (
    <main className="solo-page" style={{ '--team': info.color } as React.CSSProperties}>
      <Bunting />
      <header className="topbar">
        <Brand />
        <span className="edition">UNA PANTALLA · CUATRO EQUIPOS</span>
        <Link href="/" className="text-link">
          Volver al inicio ↗
        </Link>
      </header>
      <div className="solo-intro">
        <div>
          <span className="eyebrow">EL CALENTAMIENTO DIECIOCHERO</span>
          <h1>
            Tú contra <em>la CPU.</em>
          </h1>
        </div>
        <p>
          Elige tu área. Los otros tres equipos ponen los rivales.
          <br />
          Juega aquí mismo, con teclado o tocando los botones.
          <br />
          <Link href="/operator" className="text-link">
            Jugar con celulares y proyector →
          </Link>
        </p>
      </div>

      {!round && (
        <section className="solo-setup" aria-label="Preparar partida">
          <div>
            <h2>
              01 <span>Elige tu equipo</span>
            </h2>
            <div className="team-options">
              {TEAMS.map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={team === t}
                  aria-label={`Jugar con ${TEAM_INFO[t].name}`}
                  className={`team-option ${team === t ? 'selected' : ''}`}
                  style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}
                  onClick={() => setTeam(t)}
                >
                  <span>{TEAM_INFO[t].short}</span>
                  <strong>{TEAM_INFO[t].name}</strong>
                  <small>{team === t ? 'TÚ ✓' : 'CPU'}</small>
                </button>
              ))}
            </div>
            <label className="solo-difficulty" htmlFor="cpu-difficulty">
              Dificultad de la CPU
              <select
                id="cpu-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_INFO[d].name}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">{DIFFICULTY_INFO[difficulty].description}</p>
          </div>
          <div>
            <h2>
              02 <span>Elige la cancha</span>
            </h2>
            <div className="game-cards">
              {GAMES.map((g) => (
                <button
                  type="button"
                  key={g}
                  aria-pressed={game === g}
                  className={`game-card ${game === g ? 'selected' : ''}`}
                  onClick={() => setGame(g)}
                >
                  <span className="game-card-number">{GAME_INFO[g].number}</span>
                  <strong className="game-card-name">{GAME_INFO[g].name}</strong>
                  <small>{GAME_INFO[g].subtitle}</small>
                </button>
              ))}
            </div>
            <p className="solo-rules">{GAME_INFO[game].how}</p>
            <button type="button" className="button primary full-width" onClick={start}>
              Jugar contra la CPU →
            </button>
          </div>
        </section>
      )}

      <section
        ref={arena}
        tabIndex={-1}
        className={`solo-arena ${round ? 'is-playing' : ''}`}
        aria-label="Cancha y controles"
      >
        <div className="solo-field">
          <div className="stage-top">
            <span className="live-dot" />{' '}
            {round ? GAME_INFO[round.game].name : 'LA FONDA TE ESPERA'}
            <span className="pixel-label">
              {round ? DIFFICULTY_INFO[difficulty].name : '1 JUGADOR + 3 CPU'}
            </span>
          </div>
          <div className="solo-stage">
            <Stage round={round} />
            {round?.pausedAt !== null && round?.pausedAt !== undefined && (
              <div className="stage-overlay">
                <h2>Hacemos una pausa.</h2>
                <p>La partida también se pausa al cambiar de pestaña.</p>
                <button type="button" className="button primary" onClick={pauseOrResume}>
                  Reanudar partida →
                </button>
              </div>
            )}
          </div>
          <div className="solo-roster" aria-label="Equipos de esta partida">
            {TEAMS.map((t) => (
              <span
                key={t}
                className={team === t ? 'human' : ''}
                style={{ '--team': TEAM_INFO[t].color } as React.CSSProperties}
              >
                <i />
                {TEAM_INFO[t].name}
                <small>{team === t ? 'TÚ' : 'CPU'}</small>
              </span>
            ))}
          </div>
        </div>

        {active && round ? (
          <aside className="solo-controller" aria-label="Tu control">
            <div className="solo-control-heading">
              <div>
                <span className="eyebrow">JUEGAS CON</span>
                <h2>{info.name}</h2>
              </div>
              <strong className="solo-timer" aria-label={`${seconds} segundos`}>
                {String(seconds).padStart(2, '0')}
                <small>SEG</small>
              </strong>
            </div>
            <p className="solo-turn" aria-live="polite">
              {round.pausedAt !== null
                ? 'Partida en pausa'
                : round.phase === 'countdown'
                  ? 'Prepárate…'
                  : role}
            </p>
            <GamePad round={round} team={team} canPlay={canPlay} onAction={act} sameScreen />
            <p className="solo-keyboard">{KEYBOARD_HINT[round.game]}</p>
            <div className="solo-actions">
              <button type="button" onClick={pauseOrResume}>
                {round.pausedAt !== null ? 'Reanudar' : 'Pausar'}
              </button>
              <button type="button" onClick={chooseGame}>
                Elegir otro juego
              </button>
            </div>
          </aside>
        ) : finished && round ? (
          <aside className="solo-result" aria-label="Resultado de la partida">
            <span className="eyebrow">PRÁCTICA TERMINADA</span>
            <h2>{placement?.rank === 1 ? '¡Te llevas los aplausos!' : '¡Bien jugado!'}</h2>
            <p>
              {info.name}: puesto {placement?.rank}
              {round.placements.filter((p) => p.rank === placement?.rank).length > 1
                ? ' compartido'
                : ''}
              .
            </p>
            <div className="results-list">
              {round.placements.map((p) => (
                <div key={p.team}>
                  <span>
                    #{p.rank} {TEAM_INFO[p.team].name} {p.team === team ? '· TÚ' : '· CPU'}
                  </span>
                  <strong>+{p.points.toLocaleString('es-CL')}</strong>
                </div>
              ))}
            </div>
            <button type="button" className="button primary full-width" onClick={start}>
              Volver a jugar →
            </button>
            <button type="button" className="button secondary full-width" onClick={chooseGame}>
              Elegir otro juego
            </button>
          </aside>
        ) : (
          <aside className="solo-welcome">
            <span className="eyebrow">AQUÍ SE APRENDE JUGANDO</span>
            <h2>
              Ensaya.
              <br />
              Equivócate.
              <br />
              <em>Pide la revancha.</em>
            </h2>
            <p>
              Tres dificultades y las mismas reglas de la fonda. En penales, las cinco zonas son una
              elección ciega en todos los niveles.
            </p>
          </aside>
        )}
      </section>

      {results.length > 0 && (
        <section className="solo-score" aria-label="Marcador de práctica">
          <div>
            <span className="eyebrow">MARCADOR DE ESTA SESIÓN</span>
            <p>
              {results.length} {results.length === 1 ? 'partida terminada' : 'partidas terminadas'}{' '}
              · se reinicia al recargar
            </p>
          </div>
          <Scoreboard results={results} />
        </section>
      )}
      <footer className="home-footer">
        <span>PRÁCTICA LOCAL · SIN REGISTRO</span>
        <span>Estos resultados no suman al campeonato del evento.</span>
      </footer>
    </main>
  );
}
