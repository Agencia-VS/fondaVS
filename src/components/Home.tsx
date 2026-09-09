'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Brand, Bunting, ErrorMessage } from './Brand';
import { GAME_INFO, GAMES } from '@/game/types';
import { createDemo } from '@/lib/rooms';
const Stage = dynamic(() => import('./stage/Stage'), { ssr: false });
export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('Ingresa los 6 caracteres que ves en el proyector.');
      return;
    }
    router.push(`/play/${code}`);
  }
  return (
    <main className="home">
      <Bunting />
      <header className="topbar">
        <Brand />
        <span className="edition">
          18 DE SEPTIEMBRE <span>•</span> CUATRO EQUIPOS
        </span>
        <a href="/operator" className="text-link">
          Crear sala en el computador ↗
        </a>
      </header>
      <section className="home-main">
        <div className="home-copy">
          <span className="eyebrow">
            <i /> YA ESTAMOS EN MODO FONDA
          </span>
          <h1>
            Que gane
            <br />
            la mejor <em>área.</em>
          </h1>
          <p className="home-lead">
            El proyector es la cancha.
            <br />
            Tu celular, el control. ¿Estamos listos?
          </p>
          <form onSubmit={join} className="join-form">
            <label htmlFor="room-code">ENTRA A TU SALA</label>
            <div className="join-row">
              <input
                id="room-code"
                value={code}
                onChange={(e) => {
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 6),
                  );
                  setError('');
                }}
                placeholder="ABC234"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
              />
              <button className="button primary" type="submit">
                A jugar <span>→</span>
              </button>
            </div>
            <small>En tu celular: escanea el QR o escribe el código de la sala.</small>
            <ErrorMessage message={error} />
          </form>
          <Link href="/operator" className="button primary solo-home-link">
            Jugar con celulares + CPU <span>→</span>
          </Link>
          <span className="demo-note">Abre una sala en tu computador y conecta los celulares.</span>
          <Link href="/solo" className="button secondary solo-home-link">
            Jugar contra la CPU <span>→</span>
          </Link>
          <span className="demo-note">Tú + 3 rivales · una sola pantalla</span>
          <button
            className="demo-link"
            onClick={() => {
              const room = createDemo();
              router.push(`/control/${room.code}`);
            }}
          >
            Explorar la demo <span>↗</span>
          </button>
          <span className="demo-note">Sin registro · en este navegador</span>
        </div>
        <div className="home-visual">
          <div className="stage-top">
            <span className="live-dot" /> FONDA VS <span className="pixel-label">PLAYER 1–4</span>
          </div>
          <Stage />
          <div className="game-strip">
            {GAMES.map((g) => (
              <div key={g}>
                <span>{GAME_INFO[g].number}</span>
                <strong>{GAME_INFO[g].name}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="home-footer">
        <span>
          CREATIVE <b>✦</b> LAB <b>✦</b> SPORTS <b>✦</b> MEDIA
        </span>
        <span>Hecho para jugar juntos.</span>
      </footer>
    </main>
  );
}
