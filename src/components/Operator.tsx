'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand, ErrorMessage } from './Brand';
import { api, configured, supabase } from '@/lib/supabase/browser';
import type { Room } from '@/lib/room-types';
export default function Operator() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    if (configured())
      void supabase()
        .auth.getUser()
        .then(({ data }) => {
          if (data.user && !data.user.is_anonymous) {
            setSigned(true);
            setEmail(data.user.email ?? '');
          }
        });
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw new Error('Correo o contraseña incorrectos. Revisa tu acceso de operador.');
      setPassword('');
      setSigned(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError('');
    try {
      const room = await api<Room>(null, {});
      router.push(`/control/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la sala.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow-page">
      <Brand />
      <div className="paper-panel operator-panel">
        <span className="eyebrow">TRAS BAMBALINAS</span>
        <h1>
          Panel del
          <br />
          <em>operador.</em>
        </h1>
        <p>Abre esta página en tu computador. Los jugadores usarán sus celulares como controles.</p>
        <p className="hint">
          Crea una sala, conecta los celulares con el QR e inicia un juego. La cancha se mostrará en
          esta misma ventana. Los equipos libres se completan con CPU para practicar.
        </p>
        {!configured() ? (
          <div className="info-message">
            La sala online está pendiente de configuración. Mientras tanto puedes{' '}
            <Link href="/">explorar la demo</Link>.
          </div>
        ) : !signed ? (
          <form onSubmit={login} className="stack-form">
            <label>
              Correo
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Contraseña
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy} className="button primary">
              {busy ? 'Ingresando…' : 'Entrar al panel →'}
            </button>
          </form>
        ) : (
          <div className="stack-form">
            <p className="signed-in">Sesión: {email}</p>
            <button disabled={busy} className="button primary" onClick={create}>
              {busy ? 'Creando sala…' : 'Crear una sala →'}
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/control/${code}`);
              }}
            >
              <label>
                Volver a una sala
                <input
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 6),
                    )
                  }
                  placeholder="Código de 6 caracteres"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
              <button className="button secondary" type="submit">
                Abrir sala
              </button>
            </form>
            <button
              className="text-link"
              onClick={async () => {
                await supabase().auth.signOut();
                setSigned(false);
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
        <ErrorMessage message={error} />
      </div>
      <Link className="text-link" href="/">
        ← Volver a la fonda
      </Link>
    </main>
  );
}
