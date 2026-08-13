-- Migración: duración aproximada del evento (en minutos), opcional.
-- Ejecútalo UNA VEZ en el SQL Editor de Supabase.

alter table public.events
  add column if not exists duration_minutes integer;
