import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="FondaVS, inicio">
      <span className="brand-mark">
        VS<span>✦</span>
      </span>
      <span>
        FONDA<span className="brand-small">EDICIÓN DIECIOCHERA</span>
      </span>
    </Link>
  );
}
export function Bunting() {
  return (
    <div className="bunting" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="error-message" role="alert">
      {message}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <main className="loading">
      <span className="loading-pixel" />
      <p>Preparando la fonda…</p>
    </main>
  );
}
