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
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_name text,
  address text,
  city text not null default 'Madrid',
  lat double precision,
  lng double precision,
  price_eur numeric(8, 2) not null default 0, -- 0 = gratis
  image_url text,
  source_url text, -- web oficial del evento / venta de entradas
  created_at timestamptz not null default now()
);

-- Índices para las consultas de la app (próximos eventos + filtros).
create index events_starts_at_idx on public.events (starts_at);
create index events_category_idx on public.events (category);
create index events_city_idx on public.events (city);

-- Seguridad (Row Level Security): cualquiera puede LEER eventos desde la app,
-- pero nadie puede escribir con la clave pública (anon). Los eventos se cargan
-- desde el dashboard de Supabase, que usa permisos de administrador.
alter table public.events enable row level security;

create policy "Lectura pública de eventos"
  on public.events for select
  to anon, authenticated
  using (true);
