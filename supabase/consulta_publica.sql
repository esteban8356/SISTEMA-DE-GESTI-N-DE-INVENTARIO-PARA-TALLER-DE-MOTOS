-- HU-16: Consulta pública del estado de la moto
-- Propuesta de seguridad para Supabase. NO se aplica automáticamente:
-- revísala y ejecútala a mano en el SQL Editor de tu proyecto de Supabase.
--
-- Objetivo: que un visitante sin sesión (rol "anon") solo pueda leer los
-- campos no sensibles de una orden (nunca el nombre ni el teléfono del cliente),
-- y que los usuarios con sesión (rol "authenticated") sigan trabajando igual.

-- 1. Activar RLS en la tabla de servicios
alter table public.servicios enable row level security;

-- 2. Usuarios del taller con sesión: acceso completo (como funciona hoy)
create policy "taller_gestiona_servicios"
  on public.servicios
  for all
  to authenticated
  using (true)
  with check (true);

-- 3. Visitantes sin sesión: solo lectura
create policy "publico_consulta_estado"
  on public.servicios
  for select
  to anon
  using (true);

-- 4. Limitar las columnas que puede leer el visitante sin sesión
revoke select on public.servicios from anon;
grant select (id, created_at, placa, marca, estado, problema_diagnostico)
  on public.servicios to anon;

-- Nota: si ya existen políticas en la tabla, revísalas antes de ejecutar esto
-- (Authentication > Policies) para no duplicarlas.
