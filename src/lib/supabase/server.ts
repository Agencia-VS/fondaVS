import { createClient, User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { Room } from '@/lib/room-types';
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError('La sala online aún no está configurada.', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function identity(request: NextRequest): Promise<User> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError('Inicia sesión para continuar.', 401);
  const { data, error } = await database().auth.getUser(token);
  if (error || !data.user) throw new ApiError('Tu sesión venció. Vuelve a ingresar.', 401);
  return data.user;
}
export function operator(user: User) {
  const allowed = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (
    user.is_anonymous ||
    !user.email ||
    !user.email_confirmed_at ||
    !allowed.includes(user.email.toLowerCase())
  )
    throw new ApiError('Esta cuenta no está habilitada como operador.', 403);
}
export async function roomRow(code: string) {
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new ApiError('Código de sala no válido.');
  const { data, error } = await database()
    .from('fonda_rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) throw new ApiError('No se pudo consultar la sala.', 503);
  if (!data) throw new ApiError('No encontramos esta sala. Revisa el código.', 404);
  return data;
}
export async function roomView(code: string, user: User): Promise<Room> {
  const db = database();
  const r = await roomRow(code);
  const [{ data: members, error: me }, { data: results, error: re }] = await Promise.all([
    db
      .from('fonda_members')
      .select('id,user_id,team,nickname')
      .eq('room_id', r.id)
      .eq('active', true)
      .order('created_at'),
    db
      .from('fonda_results')
      .select('id,game,placements,created_at')
      .eq('room_id', r.id)
      .order('created_at'),
  ]);
  if (me || re) throw new ApiError('No se pudo cargar la sala.', 503);
  const member = members?.find((m) => m.user_id === user.id);
  const isOwner = r.owner_id === user.id;
  return {
    id: r.id,
    code: r.code,
    phase: r.phase,
    hostEpoch: r.host_epoch,
    isOwner,
    member: member ? { id: member.id, team: member.team, nickname: member.nickname } : null,
    members: (members ?? []).map(({ id, team, nickname }) => ({ id, team, nickname })),
    results:
      isOwner || member
        ? (results ?? []).map((x) => ({
            id: x.id,
            game: x.game,
            placements: x.placements,
            createdAt: x.created_at,
          }))
        : [],
  };
}
export function errorResponse(error: unknown) {
  if (error instanceof ApiError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  return Response.json(
    { error: 'No se pudo completar la solicitud. Inténtalo de nuevo.' },
    { status: 500 },
  );
}
