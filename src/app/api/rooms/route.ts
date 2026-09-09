import { NextRequest } from 'next/server';
import {
  ApiError,
  database,
  errorResponse,
  identity,
  operator,
  roomView,
} from '@/lib/supabase/server';
export async function POST(req: NextRequest) {
  try {
    const user = await identity(req);
    operator(user);
    const db = database();
    const { count } = await db
      .from('fonda_rooms')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());
    if ((count ?? 0) >= 5) throw new ApiError('Espera un minuto antes de crear otra sala.', 429);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 4; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const { error } = await db.from('fonda_rooms').insert({ code, owner_id: user.id });
      if (!error) return Response.json(await roomView(code, user), { status: 201 });
      if (error.code !== '23505')
        throw new ApiError('No se pudo crear la sala. Revisa la migración de Supabase.', 503);
    }
    throw new ApiError('No se pudo generar un código. Inténtalo nuevamente.', 503);
  } catch (e) {
    return errorResponse(e);
  }
}
