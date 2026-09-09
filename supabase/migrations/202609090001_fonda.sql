-- FondaVS. Run once in an isolated Supabase project / preview branch.
create table public.fonda_rooms (
  id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z2-9]{6}$'),
  owner_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  phase text not null default 'waiting' check(phase in ('waiting','playing')),
  host_instance text, host_epoch integer not null default 0, lease_until timestamptz,
  round_id text, round_game text check(round_game in ('penalties','sack-race','memory','rayuela')), practice boolean not null default false,
  last_finished_round text
);
create table public.fonda_members (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.fonda_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id), team text not null check(team in ('creative','lab','sports','media')),
  nickname text not null check(length(nickname) between 1 and 24), active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index fonda_one_team on public.fonda_members(room_id,team) where active;
create unique index fonda_one_player on public.fonda_members(room_id,user_id) where active;
create table public.fonda_results (
  id text primary key, room_id uuid not null references public.fonda_rooms(id) on delete cascade,
  game text not null check(game in ('penalties','sack-race','memory','rayuela')),
  placements jsonb not null, created_at timestamptz not null default now()
);
alter table public.fonda_rooms enable row level security;
alter table public.fonda_members enable row level security;
alter table public.fonda_results enable row level security;
-- All application data is accessed through verified API endpoints, not public SQL grants.
revoke all on public.fonda_rooms,public.fonda_members,public.fonda_results from anon,authenticated;
grant all on public.fonda_rooms,public.fonda_members,public.fonda_results to service_role;

create function public.fonda_join(p_room uuid,p_user uuid,p_team text,p_name text) returns public.fonda_members
language plpgsql security definer set search_path='' as $$
declare r public.fonda_rooms; m public.fonda_members;
begin
  select * into strict r from public.fonda_rooms where id=p_room for update;
  select * into m from public.fonda_members where room_id=p_room and user_id=p_user and active;
  if found then
    if m.team<>p_team then raise exception 'Ya tienes un equipo. Pide al operador que libere tu plaza.'; end if;
    return m;
  end if;
  if r.phase<>'waiting' then raise exception 'Espera a que termine la ronda para elegir equipo.'; end if;
  if exists(select 1 from public.fonda_members where room_id=p_room and team=p_team and active) then raise exception 'Este equipo ya tiene representante.'; end if;
  insert into public.fonda_members(room_id,user_id,team,nickname) values(p_room,p_user,p_team,p_name) returning * into m;
  return m;
end $$;

create function public.fonda_claim_host(p_room uuid,p_user uuid,p_instance text) returns public.fonda_rooms
language plpgsql security definer set search_path='' as $$
declare r public.fonda_rooms;
begin
  select * into strict r from public.fonda_rooms where id=p_room for update;
  if r.owner_id<>p_user then raise exception 'Solo el operador puede abrir el proyector.'; end if;
  if r.lease_until>now() and r.host_instance is distinct from p_instance then raise exception 'El proyector ya está abierto. Cierra la otra ventana y espera 6 segundos.'; end if;
  if r.host_instance is distinct from p_instance or r.lease_until is null or r.lease_until<=now() then
    update public.fonda_rooms set host_epoch=host_epoch+1,host_instance=p_instance,phase='waiting',round_id=null,round_game=null where id=p_room;
  end if;
  update public.fonda_rooms set lease_until=now()+interval '6 seconds' where id=p_room returning * into r;
  return r;
end $$;

create function public.fonda_host_action(p_room uuid,p_user uuid,p_instance text,p_epoch integer,p_action text,p_payload jsonb default '{}') returns public.fonda_rooms
language plpgsql security definer set search_path='' as $$
declare r public.fonda_rooms;
begin
  select * into strict r from public.fonda_rooms where id=p_room for update;
  if r.owner_id<>p_user or r.host_instance is distinct from p_instance or r.host_epoch<>p_epoch or r.lease_until is null or r.lease_until<=now() then raise exception 'La sesión del proyector venció. Vuelve a abrirla.'; end if;
  if p_action='heartbeat' then
    update public.fonda_rooms set lease_until=now()+interval '6 seconds' where id=p_room returning * into r;
  elsif p_action='begin' then
    if r.phase<>'waiting' then raise exception 'Ya hay una ronda en curso.'; end if;
    update public.fonda_rooms set phase='playing',round_id=p_payload->>'roundId',round_game=p_payload->>'game',practice=coalesce((p_payload->>'practice')::boolean,false) where id=p_room returning * into r;
  elsif p_action='abort' then
    update public.fonda_rooms set phase='waiting',round_id=null,round_game=null where id=p_room returning * into r;
  elsif p_action='finish' then
    -- A retried confirmation can never score a round twice.
    if r.last_finished_round=p_payload->>'roundId' or exists(select 1 from public.fonda_results where id=p_payload->>'roundId' and room_id=p_room) then return r; end if;
    if r.round_id is distinct from p_payload->>'roundId' or r.phase<>'playing' then raise exception 'El resultado no corresponde a la ronda activa.'; end if;
    if not r.practice then
      insert into public.fonda_results(id,room_id,game,placements) values(r.round_id,p_room,r.round_game,p_payload->'placements') on conflict(id) do nothing;
    end if;
    update public.fonda_rooms set phase='waiting',round_id=null,round_game=null,last_finished_round=p_payload->>'roundId' where id=p_room returning * into r;
  else raise exception 'Acción no válida.';
  end if;
  return r;
end $$;

create function public.fonda_release_member(p_room uuid,p_user uuid,p_member uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.fonda_rooms;
begin
  select * into strict r from public.fonda_rooms where id=p_room for update;
  if r.owner_id<>p_user then raise exception 'Acceso denegado.'; end if;
  if r.phase<>'waiting' then raise exception 'Termina o cancela la ronda antes de cambiar representante.'; end if;
  update public.fonda_members set active=false where id=p_member and room_id=p_room and active;
end $$;

-- Broadcast topics: fonda:<room UUID>:state | control | in:<member UUID> | out:<member UUID>
create function public.fonda_can_realtime(topic text,sending boolean) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]; r public.fonda_rooms; m public.fonda_members; uid uuid;
begin
  uid:=auth.uid(); if uid is null then return false; end if;
  parts:=string_to_array(topic,':');
  if array_length(parts,1) not in (3,4) or parts[1]<>'fonda' then return false; end if;
  if parts[2]!~'^[0-9a-f-]{36}$' then return false; end if;
  select * into r from public.fonda_rooms where id::text=parts[2];if not found then return false; end if;
  if parts[3]='state' and array_length(parts,1)=3 then
    if sending then return r.owner_id=uid; end if;
    return r.owner_id=uid or exists(select 1 from public.fonda_members where room_id=r.id and user_id=uid and active);
  elsif parts[3]='control' and array_length(parts,1)=3 then return r.owner_id=uid;
  elsif parts[3] in ('in','out') and array_length(parts,1)=4 then
    select * into m from public.fonda_members where id::text=parts[4] and room_id=r.id and active;
    if not found then return false; end if;
    if parts[3]='in' then return case when sending then m.user_id=uid else r.owner_id=uid end; end if;
    return case when sending then r.owner_id=uid else m.user_id=uid end;
  end if;
  return false;
end $$;
revoke all on function public.fonda_join(uuid,uuid,text,text),public.fonda_claim_host(uuid,uuid,text),public.fonda_host_action(uuid,uuid,text,integer,text,jsonb),public.fonda_release_member(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fonda_join(uuid,uuid,text,text),public.fonda_claim_host(uuid,uuid,text),public.fonda_host_action(uuid,uuid,text,integer,text,jsonb),public.fonda_release_member(uuid,uuid,uuid) to service_role;
revoke all on function public.fonda_can_realtime(text,boolean) from public,anon;
grant execute on function public.fonda_can_realtime(text,boolean) to authenticated;
create policy fonda_broadcast_read on realtime.messages for select to authenticated using(extension='broadcast' and public.fonda_can_realtime(realtime.topic(),false));
create policy fonda_broadcast_send on realtime.messages for insert to authenticated with check(extension='broadcast' and public.fonda_can_realtime(realtime.topic(),true));
-- Also disable "Allow public access" in Realtime settings. No broad realtime policies should coexist.
