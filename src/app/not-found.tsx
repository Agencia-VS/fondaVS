import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="narrow-page">
      <h1>
        Esta cancha
        <br />
        no existe.
      </h1>
      <Link href="/" className="button primary">
        Volver a la fonda →
      </Link>
    </main>
  );
}
