'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="narrow-page">
      <h1>Hacemos una pausa.</h1>
      <p>No se pudo mostrar esta pantalla. Puedes volver a intentarlo.</p>
      <button className="button primary" onClick={reset}>
        Reintentar
      </button>
      <Link href="/">Volver al inicio</Link>
    </main>
  );
}
