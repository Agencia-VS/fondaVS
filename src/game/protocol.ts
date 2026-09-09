import { z } from 'zod';
import { TEAMS, ZONES } from './types';
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tap'), side: z.enum(['left', 'right']) }),
  z.object({ type: z.literal('shoot'), zone: z.enum(ZONES) }),
  z.object({ type: z.literal('throw') }),
  z.object({ type: z.literal('move'), direction: z.enum(['up', 'down', 'left', 'right']) }),
  z.object({ type: z.literal('flip') }),
]);
export const commandSchema = z.object({
  version: z.literal(1),
  memberId: z.string().min(1).max(80),
  hostEpoch: z.number().int().nonnegative(),
  roundId: z.string().max(80),
  turnId: z.string().max(100),
  seq: z.number().int().positive(),
  action: actionSchema,
});
export type Command = z.infer<typeof commandSchema>;
export const teamSchema = z.enum(TEAMS);
/** Deduplicate before evaluating game rules; rejected inputs are acknowledged too. */
export class CommandGate {
  private last = new Map<string, number>();
  private windows = new Map<string, { at: number; count: number }>();
  check(memberId: string, seq: number, now: number): 'ok' | 'duplicate' | 'gap' | 'rate' {
    const last = this.last.get(memberId) ?? 0;
    if (seq <= last) return 'duplicate';
    if (seq !== last + 1) return 'gap';
    const w = this.windows.get(memberId);
    const window = !w || now - w.at >= 1000 ? { at: now, count: 0 } : w;
    window.count++;
    this.windows.set(memberId, window);
    this.last.set(memberId, seq);
    return window.count > 12 ? 'rate' : 'ok';
  }
  sequence(memberId: string) {
    return this.last.get(memberId) ?? 0;
  }
}
