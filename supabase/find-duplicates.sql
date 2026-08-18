-- Diagnóstico: encuentra posibles eventos duplicados ya existentes
-- (mismo título parecido + misma ciudad + fecha a menos de 2 días).
-- Es solo de LECTURA — no borra nada. Revisa la lista y borra a mano desde
-- el panel /admin los que confirmes que son duplicados reales.
--
-- Requiere la extensión pg_trgm (una vez, gratis, estándar de Postgres):
create extension if not exists pg_trgm;

select
  a.id as id_1,
  a.title as titulo_1,
  a.starts_at as fecha_1,
  a.status as estado_1,
  b.id as id_2,
  b.title as titulo_2,
  b.starts_at as fecha_2,
  b.status as estado_2,
  similarity(a.title, b.title) as parecido
from public.events a
join public.events b
  on a.city = b.city
  and a.id < b.id
  and abs(extract(epoch from (a.starts_at - b.starts_at))) <= 2 * 86400
  and similarity(a.title, b.title) > 0.5
order by parecido desc;
