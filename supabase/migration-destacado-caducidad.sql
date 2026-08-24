-- Migración: fecha de caducidad opcional para "destacado" (featured).
-- Sin fecha = destacado permanente hasta que el admin lo desmarque (como
-- hasta ahora). Con fecha, deja de contar como destacado en la app en
-- cuanto pasa, sin necesidad de ningún job que lo desmarque.
-- Ejecútalo UNA VEZ en el SQL Editor de Supabase.

alter table public.events
  add column if not exists featured_until timestamptz;
