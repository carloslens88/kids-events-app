-- Migración: soporte de tres tipos de calendario por evento.
--   single   → un solo día (comportamiento actual)
--   multiple → varias fechas sueltas (7, 9 y 12 de julio)
--   range    → temporada continua (del 1 feb al 12 oct)
-- Ejecútalo UNA VEZ en el SQL Editor de Supabase (tu base de datos ya existente).

alter table public.events
  add column if not exists date_mode text not null default 'single'
    check (date_mode in ('single', 'multiple', 'range')),
  add column if not exists extra_dates timestamptz[] not null default '{}',
  add column if not exists last_date timestamptz;

-- last_date = última fecha relevante del evento, sea cual sea su tipo.
-- La app la usa para saber si el evento sigue vigente ("last_date >= ahora").
-- Se calcula sola con este trigger: ni la app ni tú tenéis que rellenarla.
create or replace function public.compute_event_last_date()
returns trigger
language plpgsql
as $$
declare
  max_extra timestamptz;
begin
  select max(d) into max_extra from unnest(new.extra_dates) as d;
  new.last_date := greatest(
    new.starts_at,
    coalesce(new.ends_at, new.starts_at),
    coalesce(max_extra, new.starts_at)
  );
  return new;
end;
$$;

drop trigger if exists events_compute_last_date on public.events;
create trigger events_compute_last_date
  before insert or update on public.events
  for each row execute function public.compute_event_last_date();

-- Rellenar last_date en los eventos que ya existen.
update public.events
set last_date = greatest(starts_at, coalesce(ends_at, starts_at));

create index if not exists events_last_date_idx on public.events (last_date);
