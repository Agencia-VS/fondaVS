'use client';
import { api, playerSession } from './supabase/browser';
import type { Member, Room } from './room-types';
import type { Team, ResultRecord } from '@/game/types';
export const isDemo = (code: string) => /^DEMO\d{2}$/.test(code);
type LocalRoom = Room & {
  players: Record<string, string>;
  hostInstance?: string;
  leaseUntil?: number;
};
function localId() {
  let id = sessionStorage.getItem('fonda-demo-player');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('fonda-demo-player', id);
  }
  return id;
}
function localRead(code: string): LocalRoom {
  const raw = localStorage.getItem(`fonda:${code}`);
  if (!raw) throw new Error('Esta demo no existe en este navegador. Crea una nueva.');
  return JSON.parse(raw);
}
function localWrite(r: LocalRoom) {
  localStorage.setItem(`fonda:${r.code}`, JSON.stringify(r));
  return r;
}
function localView(r: LocalRoom): Room {
  return {
    ...r,
    member: r.members.find((m) => m.id === r.players[localId()]) ?? null,
    isOwner: true,
  };
}
export function createDemo(): Room {
  let code = '';
  for (let i = 0; i < 100; i++) {
    code = `DEMO${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
    if (!localStorage.getItem(`fonda:${code}`)) break;
  }
  return localWrite({
    id: crypto.randomUUID(),
    code,
    phase: 'waiting',
    hostEpoch: 0,
    isOwner: true,
    member: null,
    members: [],
    results: [],
    players: {},
  });
}
export async function getRoom(code: string): Promise<Room> {
  if (isDemo(code)) return localView(localRead(code));
  await playerSession();
  return api(code);
}
export async function joinRoom(code: string, team: Team, nickname: string): Promise<Room> {
  if (!isDemo(code)) return api(code, { action: 'join', team, nickname });
  // Web Locks serialize demo joins across tabs. Demo data never reaches the online API.
  const run = () => {
    const r = localRead(code);
    if (r.phase !== 'waiting') throw new Error('Espera a que termine la ronda.');
    const existing = r.members.find((m) => m.id === r.players[localId()]);
    if (existing) {
      if (existing.team !== team) throw new Error('Ya tienes un equipo en esta demo.');
      return localView(r);
    }
    if (r.members.some((m) => m.team === team))
      throw new Error('Este equipo ya tiene representante.');
    const m: Member = { id: crypto.randomUUID(), team, nickname: nickname.trim().slice(0, 24) };
    r.members.push(m);
    r.players[localId()] = m.id;
    localWrite(r);
    return localView(r);
  };
  return navigator.locks ? navigator.locks.request(`fonda-join:${code}`, run) : run();
}
export async function roomAction(code: string, body: Record<string, unknown>): Promise<Room> {
  if (!isDemo(code)) return api(code, body);
  const run = () => {
    const r = localRead(code);
    const now = Date.now();
    const action = body.action;
    if (action === 'claim') {
      if (r.hostInstance !== body.instance && (r.leaseUntil ?? 0) > now)
        throw new Error(
          'El proyector ya está abierto. Cierra la otra ventana y espera 6 segundos.',
        );
      if (r.hostInstance !== body.instance || (r.leaseUntil ?? 0) <= now) {
        r.hostEpoch++;
        r.phase = 'waiting';
      }
      r.hostInstance = String(body.instance);
      r.leaseUntil = now + 6000;
    } else if (action === 'release') {
      if (r.phase === 'playing')
        throw new Error('Cancela la ronda antes de cambiar representante.');
      r.members = r.members.filter((m) => m.id !== body.memberId);
    } else {
      if (
        r.hostInstance !== body.instance ||
        r.hostEpoch !== body.epoch ||
        (r.leaseUntil ?? 0) <= now
      )
        throw new Error('La sesión del proyector venció.');
      if (action === 'heartbeat') r.leaseUntil = now + 6000;
      if (action === 'begin') r.phase = 'playing';
      if (action === 'abort') r.phase = 'waiting';
      if (action === 'finish') {
        const result = body.result as ResultRecord | undefined;
        if (result && !r.results.some((x) => x.id === result.id)) r.results.push(result);
        r.phase = 'waiting';
      }
    }
    localWrite(r);
    return localView(r);
  };
  return navigator.locks ? navigator.locks.request(`fonda-join:${code}`, run) : run();
}
