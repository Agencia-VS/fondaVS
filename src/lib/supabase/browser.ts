'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
let sessionPromise: Promise<void> | undefined;
let realtimeSessionPromise: Promise<void> | undefined;
function publicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
export function configured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && !!publicKey();
}
export function supabase() {
  if (!configured())
    throw new Error('La sala online todavía no está configurada. Puedes revisar la demo.');
  return (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey()!));
}
type AuthFailure = { message?: string; code?: string; status?: number; name?: string };

export function authFailureMessage(error: unknown) {
  const failure = (error ?? {}) as AuthFailure;
  const message = failure.message?.toLowerCase() ?? '';
  const code = failure.code ?? failure.name ?? '';
  const suffix = code ? ` Código: ${code}.` : '';
  if (code === 'anonymous_provider_disabled' || message.includes('anonymous sign-ins are disabled'))
    return `Supabase rechazó la sesión anónima. Activa Anonymous Sign-Ins en Authentication → Sign In / Providers del mismo proyecto configurado en NEXT_PUBLIC_SUPABASE_URL y vuelve a desplegar.${suffix}`;
  if (code === 'captcha_failed' || message.includes('captcha'))
    return `Supabase está solicitando CAPTCHA para las sesiones anónimas. Desactiva CAPTCHA para este entorno de juego o configura su clave en Supabase.${suffix}`;
  if (failure.status === 429 || message.includes('rate limit'))
    return `Supabase limitó temporalmente las sesiones anónimas. Espera unos segundos y vuelve a intentarlo.${suffix}`;
  if (message.includes('failed to fetch') || message.includes('network'))
    return `No se pudo llegar a Supabase. Revisa la URL del proyecto, la conexión del teléfono y que el despliegue tenga las variables públicas correctas.${suffix}`;
  return `No se pudo conectar el control con Supabase.${suffix}${failure.message ? ` Detalle: ${failure.message}` : ''}`;
}

async function ensurePlayerSession() {
  try {
    const s = supabase();
    const {
      data: { session },
      error,
    } = await s.auth.getSession();
    if (error) throw error;
    if (!session) {
      const { error } = await s.auth.signInAnonymously();
      if (error) throw error;
    }
    await synchronizeRealtimeSession();
  } catch (error) {
    if (error instanceof Error && error.message.includes('sala online todavía')) throw error;
    throw new Error(authFailureMessage(error));
  }
}

async function synchronizeRealtimeSession() {
  const s = supabase();
  const {
    data: { session },
    error,
  } = await s.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Inicia sesión para conectar la sala.');
  // A private channel is authorized with the token included in its join
  // payload. Wait until Realtime has that exact session before creating it;
  // otherwise the HTTP API can recognize a member while its socket joins as
  // the public API key and remains unauthorized.
  await s.realtime.setAuth(session.access_token);
}

export function realtimeSession(): Promise<void> {
  return (realtimeSessionPromise ??= synchronizeRealtimeSession()
    .catch((error) => {
      if (error instanceof Error && error.message.includes('Inicia sesión')) throw error;
      throw new Error(authFailureMessage(error));
    })
    .finally(() => {
      realtimeSessionPromise = undefined;
    }));
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
