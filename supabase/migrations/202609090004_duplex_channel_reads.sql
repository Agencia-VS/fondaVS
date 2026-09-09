-- FondaVS: ejecutar después de 202609090003_realtime_permissions.sql.
-- Supabase autoriza la lectura al suscribirse a un canal privado. El host y el
-- jugador deben poder unirse a ambos canales del miembro aunque cada uno solo
-- pueda enviar en una dirección. Conserva la escritura estrictamente dirigida.
begin;

create or replace function public.fonda_can_realtime(topic text,sending boolean) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]; r public.fonda_rooms; m public.fonda_members; uid uuid;
begin
  uid:=auth.uid(); if uid is null then return false; end if;
  parts:=string_to_array(topic,':');
  if array_length(parts,1) not in (3,4) or parts[1]<>'fonda' then return false; end if;
  if parts[2]!~'^[0-9a-f-]{36}$' then return false; end if;
  select * into r from public.fonda_rooms where id::text=parts[2];
  if not found then return false; end if;

  if parts[3]='state' and array_length(parts,1)=3 then
    if sending then return r.owner_id=uid; end if;
    return r.owner_id=uid
      or exists(select 1 from public.fonda_members where room_id=r.id and user_id=uid and active)
      or exists(select 1 from public.fonda_spectators where room_id=r.id and user_id=uid);
  elsif parts[3]='control' and array_length(parts,1)=3 then
    return r.owner_id=uid;
  elsif parts[3] in ('in','out') and array_length(parts,1)=4 then
    select * into m
      from public.fonda_members
      where id::text=parts[4] and room_id=r.id and active;
    if not found then return false; end if;

    -- Ambos extremos pueden suscribirse al canal privado del miembro.
    -- Solo el jugador escribe en `in`; solo el operador escribe en `out`.
    if not sending then return r.owner_id=uid or m.user_id=uid; end if;
    if parts[3]='in' then return m.user_id=uid; end if;
    return r.owner_id=uid;
  end if;
  return false;
end $$;

revoke all on function public.fonda_can_realtime(text,boolean) from public,anon;
grant execute on function public.fonda_can_realtime(text,boolean) to authenticated;

commit;
