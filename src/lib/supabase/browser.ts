'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
let sessionPromise: Promise<void> | undefined;
export function configured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export function supabase() {
  if (!configured())
    throw new Error('La sala online todavía no está configurada. Puedes revisar la demo.');
  return (client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ));
}
async function ensurePlayerSession() {
  const s = supabase();
  const {
    data: { session },
    error,
  } = await s.auth.getSession();
  if (error) throw error;
  if (!session) {
    const { error } = await s.auth.signInAnonymously();
    if (error)
      throw new Error(
        'No se pudo conectar el control. Verifica que estén habilitadas las sesiones anónimas.',
      );
  }
}
export function playerSession(): Promise<void> {
  return (sessionPromise ??= ensurePlayerSession().finally(() => {
    sessionPromise = undefined;
  }));
}
export async function api<T>(code: string | null, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase().auth.getSession();
  if (!session) throw new Error('Inicia sesión para continuar.');
  const r = await fetch(code ? `/api/rooms/${encodeURIComponent(code)}` : '/api/rooms', {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? 'No se pudo completar la solicitud.');
  return data;
}
