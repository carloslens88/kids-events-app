-- Permisos de administración: solo el usuario admin (por email) puede
-- crear, editar y borrar eventos, y subir imágenes.
-- Ejecútalo en el SQL Editor de Supabase.
--
-- ANTES de ejecutarlo, crea tu usuario admin:
--   Dashboard → Authentication → Users → Add user → Create new user
--   Email: jhenigc@gmail.com  +  una contraseña  +  marca "Auto Confirm User"

-- Escritura en la tabla de eventos, solo para el admin.
create policy "Admin escribe eventos"
  on public.events for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'jhenigc@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jhenigc@gmail.com');

-- Bucket público para las fotos de los eventos (1 GB gratis en Supabase).
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Cualquiera puede VER las imágenes; solo el admin puede subirlas/cambiarlas.
-- NOTA: si estas cuatro políticas fallan con "must be owner of table objects",
-- créalas desde el dashboard: Storage → event-images → Policies (mismo contenido).
create policy "Lectura pública de imágenes"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "Admin sube imágenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-images' and (auth.jwt() ->> 'email') = 'jhenigc@gmail.com');

create policy "Admin actualiza imágenes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-images' and (auth.jwt() ->> 'email') = 'jhenigc@gmail.com');

create policy "Admin borra imágenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-images' and (auth.jwt() ->> 'email') = 'jhenigc@gmail.com');
