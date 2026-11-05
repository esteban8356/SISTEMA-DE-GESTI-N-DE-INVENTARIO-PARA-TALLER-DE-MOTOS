-- HU-13: Asociar repuestos a una orden de servicio y descontar stock
-- NO se aplica solo. Ejecútalo a mano en el SQL Editor de Supabase.
--
-- Cómo aplicarlo:
-- 1. Abre el proyecto en https://supabase.com/dashboard
-- 2. Entra a SQL Editor y pulsa New query
-- 3. Pega este archivo completo
-- 4. Pulsa Run (o Ctrl+Enter)
-- 5. Si no hay errores, la tabla, los índices, las funciones y las políticas ya quedaron activos
--
-- Se puede volver a ejecutar: reemplaza las funciones y recrea el trigger y la política.
--
-- La función corre como security definer (el dueño es postgres y omite RLS) para que
-- el descuento y el registro ocurran juntos y el cliente no pueda insertar repuestos
-- en la orden sin pasar por la validación de stock. Mitigaciones:
--   * search_path vacío y nombres con esquema
--   * exige auth.uid()
--   * execute solo para authenticated (ni public ni anon)
-- El acceso es de todo el taller autenticado, igual que el resto de servicios y repuestos.

-- 1. Tabla intermedia
create table if not exists public.orden_repuestos (
  id uuid primary key default extensions.gen_random_uuid(),
  servicio_id uuid not null references public.servicios (id) on delete cascade,
  repuesto_id uuid not null references public.repuestos (id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists orden_repuestos_servicio_id_idx
  on public.orden_repuestos (servicio_id);

create index if not exists orden_repuestos_repuesto_id_idx
  on public.orden_repuestos (repuesto_id);

-- 2. Al borrar una línea (o la orden, por cascade) se devuelve la cantidad al stock.
--    Así quitar_repuesto_de_orden y el delete de servicios no descuentan dos veces
--    ni dejan el inventario desfasado.
create or replace function public.devolver_stock_orden_repuesto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.repuestos
  set stock = stock + old.cantidad
  where id = old.repuesto_id;

  return old;
end;
$$;

revoke all on function public.devolver_stock_orden_repuesto() from public;
revoke all on function public.devolver_stock_orden_repuesto() from anon;
-- authenticated la necesita: al eliminar la orden, el cascade dispara este trigger.
grant execute on function public.devolver_stock_orden_repuesto() to authenticated;

drop trigger if exists orden_repuestos_devolver_stock on public.orden_repuestos;
create trigger orden_repuestos_devolver_stock
  before delete on public.orden_repuestos
  for each row
  execute function public.devolver_stock_orden_repuesto();

-- 3. Alta atómica: bloquea la fila del repuesto, valida, inserta y descuenta.
create or replace function public.agregar_repuesto_a_orden(
  p_servicio_id uuid,
  p_repuesto_id uuid,
  p_cantidad integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
  v_codigo text;
  v_stock numeric;
  v_precio numeric;
  v_minimo integer;
  v_nuevo numeric;
  v_id uuid;
  v_stock_txt text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para asociar repuestos';
  end if;

  if p_servicio_id is null or p_repuesto_id is null then
    raise exception 'La orden y el repuesto son obligatorios';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  if not exists (select 1 from public.servicios where id = p_servicio_id) then
    raise exception 'La orden de servicio no existe';
  end if;

  select
    nombre,
    codigo_fabricante,
    stock,
    coalesce(precio, 0),
    coalesce(stock_minimo, 5)
  into v_nombre, v_codigo, v_stock, v_precio, v_minimo
  from public.repuestos
  where id = p_repuesto_id
  for update;

  if not found then
    raise exception 'El repuesto no existe';
  end if;

  if coalesce(v_stock, 0) < p_cantidad then
    v_stock_txt := case
      when coalesce(v_stock, 0) = trunc(coalesce(v_stock, 0)) then trunc(coalesce(v_stock, 0))::text
      else coalesce(v_stock, 0)::text
    end;
    raise exception '%', format(
      'Stock insuficiente: solo hay %s unidades disponibles de %s',
      v_stock_txt,
      v_nombre
    );
  end if;

  v_nuevo := coalesce(v_stock, 0) - p_cantidad;

  update public.repuestos
  set stock = v_nuevo
  where id = p_repuesto_id;

  insert into public.orden_repuestos (servicio_id, repuesto_id, cantidad, precio_unitario)
  values (p_servicio_id, p_repuesto_id, p_cantidad, v_precio)
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'servicio_id', p_servicio_id,
    'repuesto_id', p_repuesto_id,
    'nombre', v_nombre,
    'codigo', v_codigo,
    'cantidad', p_cantidad,
    'precio_unitario', v_precio,
    'subtotal', v_precio * p_cantidad,
    'stock', v_nuevo,
    'stock_minimo', v_minimo,
    'stock_bajo', v_nuevo <= v_minimo
  );
end;
$$;

revoke all on function public.agregar_repuesto_a_orden(uuid, uuid, integer) from public;
revoke all on function public.agregar_repuesto_a_orden(uuid, uuid, integer) from anon;
grant execute on function public.agregar_repuesto_a_orden(uuid, uuid, integer) to authenticated;

-- 4. Quitar una línea. El trigger devuelve el stock en la misma transacción.
create or replace function public.quitar_repuesto_de_orden(p_orden_repuesto_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linea public.orden_repuestos%rowtype;
  v_nombre text;
  v_stock numeric;
  v_minimo integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para quitar repuestos';
  end if;

  select *
  into v_linea
  from public.orden_repuestos
  where id = p_orden_repuesto_id
  for update;

  if not found then
    raise exception 'El repuesto no está asociado a esta orden';
  end if;

  delete from public.orden_repuestos
  where id = p_orden_repuesto_id;

  select nombre, stock, coalesce(stock_minimo, 5)
  into v_nombre, v_stock, v_minimo
  from public.repuestos
  where id = v_linea.repuesto_id;

  return jsonb_build_object(
    'id', v_linea.id,
    'repuesto_id', v_linea.repuesto_id,
    'nombre', v_nombre,
    'cantidad', v_linea.cantidad,
    'stock', coalesce(v_stock, 0),
    'stock_minimo', coalesce(v_minimo, 5),
    'stock_bajo', coalesce(v_stock, 0) <= coalesce(v_minimo, 5)
  );
end;
$$;

revoke all on function public.quitar_repuesto_de_orden(uuid) from public;
revoke all on function public.quitar_repuesto_de_orden(uuid) from anon;
grant execute on function public.quitar_repuesto_de_orden(uuid) to authenticated;

-- 5. RLS: el taller autenticado solo lee. Las altas y bajas pasan por las funciones.
alter table public.orden_repuestos enable row level security;

drop policy if exists "taller_lee_orden_repuestos" on public.orden_repuestos;
create policy "taller_lee_orden_repuestos"
  on public.orden_repuestos
  for select
  to authenticated
  using (true);

grant select on public.orden_repuestos to authenticated;
revoke insert, update, delete on public.orden_repuestos from authenticated;
revoke all on public.orden_repuestos from anon;

-- HU-14 sigue igual: inventario y dashboard leen repuestos.stock contra
-- coalesce(stock_minimo, 5). Esta función deja ese stock ya descontado.
