-- Migración: flujo de ingesta con borradores.
--   status: 'draft' (importado/no visible) | 'published' (visible en la app)
--   source: 'manual' | 'madrid_opendata' | 'eventbrite'
--   external_id: id del evento en la fuente externa (evita duplicados al reimportar)
--   featured: eventos destacados (van arriba en la app con estrella)
-- Ejecútalo UNA VEZ en el SQL Editor de Supabase.

alter table public.events
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published')),
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text unique,
  add column if not exists featured boolean not null default false;

create index if not exists events_status_idx on public.events (status);

-- La lectura pública ahora solo ve eventos publicados. Los borradores solo
-- los ve el admin (su política "Admin escribe eventos" ya se lo permite).
drop policy if exists "Lectura pública de eventos" on public.events;

create policy "Lectura pública de eventos publicados"
  on public.events for select
  to anon, authenticated
  using (status = 'published');
