import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GAMES, TEAMS } from '@/game/types';
import {
  ApiError,
  database,
  errorResponse,
  identity,
  operator,
  roomRow,
  roomView,
} from '@/lib/supabase/server';
type Context = { params: Promise<{ code: string }> };
const ownerFields = { instance: z.string().uuid(), epoch: z.number().int().nonnegative() };
const placements = z
  .array(
    z.object({
      team: z.enum(TEAMS),
      rank: z.number().int().min(1).max(4),
      points: z.number().min(1).max(4).multipleOf(0.5),
      value: z.number().finite(),
    }),
  )
  .length(4)
  .refine((x) => new Set(x.map((p) => p.team)).size === 4);
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('watch') }),
  z.object({
    action: z.literal('join'),
    team: z.enum(TEAMS),
    nickname: z.string().trim().min(1).max(24),
  }),
  z.object({ action: z.literal('claim'), instance: z.string().uuid() }),
  z.object({ action: z.literal('release'), memberId: z.string().uuid() }),
  z.object({ action: z.literal('heartbeat'), ...ownerFields }),
  z.object({
    action: z.literal('begin'),
    ...ownerFields,
    roundId: z.string().uuid(),
    game: z.enum(GAMES),
    practice: z.boolean(),
  }),
  z.object({ action: z.literal('abort'), ...ownerFields }),
  z.object({ action: z.literal('finish'), ...ownerFields, roundId: z.string().uuid(), placements }),
]);
export async function GET(req: NextRequest, ctx: Context) {
  try {
    const user = await identity(req);
    const { code } = await ctx.params;
    return Response.json(await roomView(code, user), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: NextRequest, ctx: Context) {
  try {
    if (Number(req.headers.get('content-length') ?? 0) > 8192)
      throw new ApiError('Solicitud demasiado grande.', 413);
    const user = await identity(req);
    const { code } = await ctx.params;
    const text = await req.text();
    if (text.length > 8192) throw new ApiError('Solicitud demasiado grande.', 413);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError('Solicitud no válida.');
    }
    const parsed = input.safeParse(json);
    if (!parsed.success) throw new ApiError('Datos de solicitud no válidos.');
    const p = parsed.data;
    const db = database();
    const r = await roomRow(code);
    if (p.action !== 'join' && p.action !== 'watch') {
      operator(user);
      if (r.owner_id !== user.id)
        throw new ApiError('Solo el dueño de esta sala puede administrarla.', 403);
    }
    let error;
    if (p.action === 'join')
      ({ error } = await db.rpc('fonda_join', {
        p_room: r.id,
        p_user: user.id,
        p_team: p.team,
        p_name: p.nickname,
      }));
    else if (p.action === 'watch') {
      ({ error } = await db.from('fonda_spectators').upsert(
        { room_id: r.id, user_id: user.id },
        {
          onConflict: 'room_id,user_id',
        },
      ));
      if (error)
        throw new ApiError(
          'No se pudo abrir la pantalla compartida. El operador debe comprobar la migración de espectadores en Supabase.',
          503,
        );
    } else if (p.action === 'claim')
      ({ error } = await db.rpc('fonda_claim_host', {
        p_room: r.id,
        p_user: user.id,
        p_instance: p.instance,
      }));
    else if (p.action === 'release')
      ({ error } = await db.rpc('fonda_release_member', {
        p_room: r.id,
        p_user: user.id,
        p_member: p.memberId,
      }));
    else
      ({ error } = await db.rpc('fonda_host_action', {
        p_room: r.id,
        p_user: user.id,
        p_instance: p.instance,
        p_epoch: p.epoch,
        p_action: p.action,
        p_payload: p,
      }));
    if (error)
      throw new ApiError(
        error.code === 'P0001'
          ? error.message
          : 'No se pudo actualizar la sala. Revisa su configuración.',
        409,
      );
    return Response.json(await roomView(code, user), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
