-- HU-16: Consulta pública del estado de la orden
-- NO se aplica solo. Pégalo en el SQL Editor de Supabase y pulsa Run.
--
-- 1. Abre https://supabase.com/dashboard y entra al proyecto
-- 2. SQL Editor → New query
-- 3. Pega este archivo completo y pulsa Run
--
-- El visitante sin sesión no lee la tabla servicios. Solo puede llamar
-- consultar_estado_orden(texto), que devuelve una orden (la más reciente
-- si la placa se repite) y únicamente: id, created_at, placa, marca,
-- estado y problema_diagnostico. Nunca el nombre ni el teléfono.
--
-- La función es security definer para poder leer la tabla aunque el rol
-- anon no tenga SELECT. Mitigaciones: search_path vacío, nombres con
-- esquema, búsqueda exacta (no lista el taller) y execute solo para
-- anon y authenticated.
--
-- Si ya ejecutaste una versión anterior de este archivo, este script
-- quita la política y los grants de columnas del rol anon.

-- 1. El taller con sesión sigue administrando todas las órdenes
alter table public.servicios enable row level security;

drop policy if exists "taller_gestiona_servicios" on public.servicios;
create policy "taller_gestiona_servicios"
  on public.servicios
  for all
  to authenticated
  using (true)
  with check (true);

-- 2. Cerrar la lectura directa del visitante (también si ya se aplicó el grant por columnas)
drop policy if exists "publico_consulta_estado" on public.servicios;
revoke all on table public.servicios from anon;
revoke select (id, created_at, placa, marca, estado, problema_diagnostico)
  on public.servicios from anon;

-- 3. Consulta pública de una sola orden
create or replace function public.consultar_estado_orden(p_busqueda text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_busqueda text := btrim(coalesce(p_busqueda, ''));
  v_row record;
begin
  if v_busqueda = '' then
    return null;
  end if;

  if v_busqueda ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id, created_at, placa, marca, estado, problema_diagnostico
    into v_row
    from public.servicios
    where id = v_busqueda::uuid;
  else
    select id, created_at, placa, marca, estado, problema_diagnostico
    into v_row
    from public.servicios
    where upper(btrim(placa)) = upper(v_busqueda)
    order by created_at desc
    limit 1;
  end if;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'created_at', v_row.created_at,
    'placa', v_row.placa,
    'marca', v_row.marca,
    'estado', v_row.estado,
    'problema_diagnostico', v_row.problema_diagnostico
  );
end;
$$;

revoke all on function public.consultar_estado_orden(text) from public;
revoke all on function public.consultar_estado_orden(text) from anon, authenticated;
grant execute on function public.consultar_estado_orden(text) to anon, authenticated;
