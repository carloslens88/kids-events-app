-- Esquema de la base de datos para el catálogo de eventos infantiles.
-- Cómo usarlo: en tu proyecto de Supabase, ve a "SQL Editor", pega este
-- archivo completo y pulsa "Run".

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (
    category in ('teatro', 'musica', 'taller', 'aire_libre', 'deporte', 'museo', 'cuentacuentos', 'otros')
  ),
  age_min integer not null default 0 check (age_min >= 0),
  age_max integer not null default 12 check (age_max >= age_min),
  -- Calendario del evento:
  --   single   → un solo día: starts_at
  --   multiple → varias fechas sueltas: starts_at + extra_dates
  --   range    → temporada continua: de starts_at a ends_at
  date_mode text not null default 'single' check (date_mode in ('single', 'multiple', 'range')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  extra_dates timestamptz[] not null default '{}',
  last_date timestamptz, -- última fecha relevante; la calcula un trigger
  venue_name text,
  address text,
  city text not null default 'Madrid',
  lat double precision,
  lng double precision,
  price_eur numeric(8, 2) not null default 0, -- 0 = gratis
  duration_minutes integer, -- duración aproximada, opcional
  image_url text,
  source_url text, -- web oficial del evento / venta de entradas
  -- Flujo de ingesta: los eventos importados entran como borrador y solo
  -- aparecen en la app cuando el admin los publica.
  status text not null default 'published' check (status in ('draft', 'published')),
  source text not null default 'manual', -- manual | madrid_opendata | eventbrite
  external_id text unique, -- id en la fuente externa (dedupe de importaciones)
  featured boolean not null default false, -- destacado: arriba y con estrella
  created_at timestamptz not null default now()
);

-- last_date se calcula sola en cada insert/update.
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

create trigger events_compute_last_date
  before insert or update on public.events
  for each row execute function public.compute_event_last_date();

-- Índices para las consultas de la app (próximos eventos + filtros).
create index events_starts_at_idx on public.events (starts_at);
create index events_last_date_idx on public.events (last_date);
create index events_status_idx on public.events (status);
create index events_category_idx on public.events (category);
create index events_city_idx on public.events (city);

-- Seguridad (Row Level Security): cualquiera puede LEER eventos desde la app,
-- pero nadie puede escribir con la clave pública (anon). Los eventos se cargan
-- desde el dashboard de Supabase, que usa permisos de administrador.
alter table public.events enable row level security;

create policy "Lectura pública de eventos publicados"
  on public.events for select
  to anon, authenticated
  using (status = 'published');
