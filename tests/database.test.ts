import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const owner = '11111111-1111-4111-8111-111111111111',
  a = '22222222-2222-4222-8222-222222222222',
  b = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
let room: string;
let member: string;
let rival: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
  create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
  create schema realtime;create table realtime.messages(id int,extension text);alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql as $$ select current_setting('realtime.topic',true) $$;
  grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;
  insert into auth.users values ('${owner}'),('${a}'),('${b}');
  `);
  await db.exec(
    readFileSync(new URL('../supabase/migrations/202609090001_fonda.sql', import.meta.url), 'utf8'),
  );
  const spectatorsSql = readFileSync(
    new URL('../supabase/migrations/202609090002_spectators.sql', import.meta.url),
    'utf8',
  );
  await db.exec(spectatorsSql);
  await db.exec(spectatorsSql); // The follow-up migration is safe to run again.
  const realtimeSql = readFileSync(
    new URL('../supabase/migrations/202609090003_realtime_permissions.sql', import.meta.url),
    'utf8',
  );
  await db.exec(realtimeSql);
  await db.exec(realtimeSql); // Restoring the policies is also idempotent.
  const r = await db.query<{ id: string }>(
    'insert into fonda_rooms(code,owner_id) values ($1,$2) returning id',
    ['ABC234', owner],
  );
  room = r.rows[0].id;
}, 20000);
afterAll(async () => {
  await db.close();
});
describe('Postgres room integrity and realtime permissions', () => {
  it('reserves one team per player and one player per team', async () => {
    const r = await db.query<{ id: string }>('select * from fonda_join($1,$2,$3,$4)', [
      room,
      a,
      'creative',
      'Ana',
    ]);
    member = r.rows[0].id;
    await expect(
      db.query('select * from fonda_join($1,$2,$3,$4)', [room, b, 'creative', 'Beto']),
    ).rejects.toThrow('ya tiene representante');
    await expect(
      db.query('select * from fonda_join($1,$2,$3,$4)', [room, a, 'lab', 'Ana']),
    ).rejects.toThrow('Ya tienes un equipo');
    const other = await db.query<{ id: string }>('select * from fonda_join($1,$2,$3,$4)', [
      room,
      b,
      'lab',
      'Beto',
    ]);
    rival = other.rows[0].id;
  });
  it('permits players to send their own input and receive only their own private response', async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    const allowed = async (topic: string, send: boolean) =>
      (
        await db.query<{ ok: boolean }>('select fonda_can_realtime($1,$2) as ok', [
          `fonda:${room}:${topic}`,
          send,
        ])
      ).rows[0].ok;
    expect(await allowed(`in:${member}`, true)).toBe(true);
    expect(await allowed(`in:${rival}`, true)).toBe(false);
    expect(await allowed(`in:${rival}`, false)).toBe(false);
    expect(await allowed(`out:${rival}`, false)).toBe(false);
    expect(await allowed(`out:${member}`, false)).toBe(true);
    expect(await allowed('state', false)).toBe(true);
    expect(await allowed('state', true)).toBe(false);
    expect(await allowed('control', true)).toBe(false);
  });
  it('denies direct player writes and privileged function execution', async () => {
    await db.exec('set role authenticated');
    try {
      await expect(db.query('select * from fonda_results')).rejects.toThrow('permission denied');
      await expect(
        db.query('select * from fonda_claim_host($1,$2,$3)', [room, owner, 'instance']),
      ).rejects.toThrow('permission denied');
    } finally {
      await db.exec('reset role');
    }
  });
  it('allows a single host lease and refuses a second instance', async () => {
    await db.query('select * from fonda_claim_host($1,$2,$3)', [room, owner, 'host-one']);
    await expect(
      db.query('select * from fonda_claim_host($1,$2,$3)', [room, owner, 'host-two']),
    ).rejects.toThrow('ya está abierto');
    await expect(
      db.query('select * from fonda_claim_host($1,$2,$3)', [room, a, 'host-one']),
    ).rejects.toThrow('Solo el operador');
  });
  it('locks membership during a round and confirms results idempotently', async () => {
    await db.query('select * from fonda_host_action($1,$2,$3,1,$4,$5)', [
      room,
      owner,
      'host-one',
      'begin',
      JSON.stringify({ roundId: 'test-round', game: 'penalties', practice: false }),
    ]);
    await expect(
      db.query('select fonda_release_member($1,$2,$3)', [room, owner, member]),
    ).rejects.toThrow('Termina o cancela');
    const payload = JSON.stringify({ roundId: 'test-round', placements: [] });
    for (let i = 0; i < 2; i++)
      await db.query('select * from fonda_host_action($1,$2,$3,1,$4,$5)', [
        room,
        owner,
        'host-one',
        'finish',
        payload,
      ]);
    expect((await db.query('select * from fonda_results')).rows).toHaveLength(1);
  });
  it('does not score practice rounds and handles a retried practice confirmation', async () => {
    await db.query('select * from fonda_host_action($1,$2,$3,1,$4,$5)', [
      room,
      owner,
      'host-one',
      'begin',
      JSON.stringify({ roundId: 'practice', game: 'memory', practice: true }),
    ]);
    for (let i = 0; i < 2; i++)
      await db.query('select * from fonda_host_action($1,$2,$3,1,$4,$5)', [
        room,
        owner,
        'host-one',
        'finish',
        JSON.stringify({ roundId: 'practice', placements: [] }),
      ]);
    expect((await db.query('select * from fonda_results')).rows).toHaveLength(1);
  });
  it('revokes old member channels and invalidates an expired host epoch', async () => {
    await db.query('select fonda_release_member($1,$2,$3)', [room, owner, member]);
    const allowed = await db.query<{ ok: boolean }>('select fonda_can_realtime($1,true) as ok', [
      `fonda:${room}:in:${member}`,
    ]);
    expect(allowed.rows[0].ok).toBe(false);
    await db.query("update fonda_rooms set lease_until=now()-interval '1 second' where id=$1", [
      room,
    ]);
    await db.query('select * from fonda_claim_host($1,$2,$3)', [room, owner, 'host-two']);
    await expect(
      db.query('select * from fonda_host_action($1,$2,$3,1,$4,$5)', [
        room,
        owner,
        'host-one',
        'heartbeat',
        '{}',
      ]),
    ).rejects.toThrow('venció');
  });
  it('allows spectators to receive only their room state without reserving a team', async () => {
    const viewer = '44444444-4444-4444-8444-444444444444';
    await db.query('insert into auth.users values ($1)', [viewer]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [viewer]);
    const allowed = async (topic: string, sending: boolean) =>
      (
        await db.query<{ ok: boolean }>('select fonda_can_realtime($1,$2) as ok', [
          `fonda:${room}:${topic}`,
          sending,
        ])
      ).rows[0].ok;
    expect(await allowed('state', false)).toBe(false);
    const before = (await db.query('select * from fonda_members')).rows.length;
    await db.query('insert into fonda_spectators(room_id,user_id) values($1,$2)', [room, viewer]);
    expect((await db.query('select * from fonda_members')).rows).toHaveLength(before);
    expect(await allowed('state', false)).toBe(true);
    expect(await allowed('state', true)).toBe(false);
    for (const sending of [true, false]) {
      for (const topic of ['control', `in:${rival}`, `out:${rival}`])
        expect(await allowed(topic, sending)).toBe(false);
    }
    const other = await db.query<{ id: string }>(
      'insert into fonda_rooms(code,owner_id) values ($1,$2) returning id',
      ['XYZ789', owner],
    );
    expect(
      (
        await db.query<{ ok: boolean }>('select fonda_can_realtime($1,false) as ok', [
          `fonda:${other.rows[0].id}:state`,
        ])
      ).rows[0].ok,
    ).toBe(false);
    await db.exec('set role authenticated');
    try {
      await expect(
        db.query('insert into fonda_spectators(room_id,user_id) values($1,$2)', [
          other.rows[0].id,
          viewer,
        ]),
      ).rejects.toThrow('permission denied');
    } finally {
      await db.exec('reset role');
    }
    await expect(
      db.query('select * from fonda_claim_host($1,$2,$3)', [room, viewer, 'watcher']),
    ).rejects.toThrow('Solo el operador');
  });
});
